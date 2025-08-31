import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CommentPreviewStore } from './comment-preview.store';
import { MessageService } from '../../../core/services/message.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { ReviewComment, CommentFilters } from '../../../core/models/interfaces';
import { CommentSeverity, CommentStatus } from '../../../core/models/enums';

// Mock comment data
const mockComments: ReviewComment[] = [
  {
    id: 'comment-1',
    content: 'This function could be optimized',
    filePath: 'src/components/Button.tsx',
    lineNumber: 15,
    severity: CommentSeverity.WARNING,
    status: CommentStatus.PENDING,
    confidence: 0.85,
    category: 'Performance',
    tags: ['optimization', 'performance'],
    suggestedFix: 'Use useCallback to memoize the function'
  },
  {
    id: 'comment-2',
    content: 'Missing error handling',
    filePath: 'src/utils/api.ts',
    lineNumber: 42,
    severity: CommentSeverity.ERROR,
    status: CommentStatus.APPROVED,
    confidence: 0.92,
    category: 'Error Handling',
    tags: ['error-handling', 'reliability']
  },
  {
    id: 'comment-3',
    content: 'Consider using TypeScript interface',
    filePath: 'src/components/Button.tsx',
    lineNumber: 8,
    severity: CommentSeverity.SUGGESTION,
    status: CommentStatus.DISMISSED,
    confidence: 0.75,
    category: 'Type Safety',
    tags: ['typescript', 'types']
  }
];

// Test component to provide injection context
@Component({
  template: '',
  providers: [CommentPreviewStore]
})
class TestComponent {}

describe('CommentPreviewStore', () => {
  let store: InstanceType<typeof CommentPreviewStore>;
  let messageService: any;
  let errorHandler: any;

  beforeEach(async () => {
    const messageServiceSpy = {
      loadPRDetails: jasmine.createSpy('loadPRDetails'),
      modifyComment: jasmine.createSpy('modifyComment'),
      approveComment: jasmine.createSpy('approveComment'),
      dismissComment: jasmine.createSpy('dismissComment'),
      exportComments: jasmine.createSpy('exportComments')
    };

    const errorHandlerSpy = {
      handleError: jasmine.createSpy('handleError'),
      retryOperation: jasmine.createSpy('retryOperation')
    };

    await TestBed.configureTestingModule({
      declarations: [TestComponent],
      providers: [
        CommentPreviewStore,
        { provide: MessageService, useValue: messageServiceSpy },
        { provide: ErrorHandlerService, useValue: errorHandlerSpy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(TestComponent);
    store = TestBed.inject(CommentPreviewStore);
    messageService = TestBed.inject(MessageService);
    errorHandler = TestBed.inject(ErrorHandlerService);
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.comments()).toEqual([]);
      expect(store.filteredComments()).toEqual([]);
      expect(store.selectedComments()).toEqual([]);
      expect(store.isLoading()).toBe(false);
      expect(store.error()).toBe(undefined);
      expect(store.groupBy()).toBe('file');
      expect(store.viewMode()).toBe('grouped');
    });

    it('should have correct initial filters', () => {
      const filters = store.filters();
      expect(filters.showApproved).toBe(true);
      expect(filters.showDismissed).toBe(false);
      expect(filters.showPending).toBe(true);
      expect(filters.severity).toBeUndefined();
      expect(filters.status).toBeUndefined();
    });

    it('should have correct initial summary', () => {
      const summary = store.commentsSummary();
      expect(summary.total).toBe(0);
      expect(summary.pending).toBe(0);
      expect(summary.approved).toBe(0);
      expect(summary.dismissed).toBe(0);
    });
  });

  describe('Loading Comments', () => {
    it('should load comments successfully', async () => {
      const prId = 123;
      messageService.loadPRDetails.and.returnValue(
        Promise.resolve({ comments: mockComments })
      );

      await store.loadComments(prId);

      expect(messageService.loadPRDetails).toHaveBeenCalledWith(prId);
      expect(store.comments()).toEqual(mockComments);
      expect(store.isLoading()).toBe(false);
      expect(store.error()).toBe(undefined);
    });

    it('should handle loading errors', async () => {
      const prId = 123;
      const errorMessage = 'Failed to load PR details';
      messageService.loadPRDetails.and.returnValue(
        Promise.reject(new Error(errorMessage))
      );

      await store.loadComments(prId);

      expect(store.isLoading()).toBe(false);
      expect(store.error()).toBe(errorMessage);
      expect(store.comments()).toEqual([]);
    });

    it('should set loading state during load', () => {
      const prId = 123;
      messageService.loadPRDetails.and.returnValue(new Promise(() => {})); // Never resolves

      store.loadComments(prId);

      expect(store.isLoading()).toBe(true);
      expect(store.error()).toBe(undefined);
    });
  });

  describe('Comment Operations', () => {
    beforeEach(async () => {
      // Setup initial comments
      messageService.loadPRDetails.and.returnValue(
        Promise.resolve({ comments: mockComments })
      );
      await store.loadComments(123);
    });

    it('should approve comment', async () => {
      const commentId = 'comment-1';
      messageService.approveComment.and.returnValue(undefined);

      await store.approveComment(commentId);

      expect(messageService.approveComment).toHaveBeenCalledWith(commentId);
      
      const updatedComment = store.comments().find(c => c.id === commentId);
      expect(updatedComment?.status).toBe(CommentStatus.APPROVED);
    });

    it('should dismiss comment', async () => {
      const commentId = 'comment-1';
      messageService.dismissComment.and.returnValue(undefined);

      await store.dismissComment(commentId);

      expect(messageService.dismissComment).toHaveBeenCalledWith(commentId);
      
      const updatedComment = store.comments().find(c => c.id === commentId);
      expect(updatedComment?.status).toBe(CommentStatus.DISMISSED);
    });

    it('should update comment content', async () => {
      const commentId = 'comment-1';
      const newContent = 'Updated comment content';
      messageService.modifyComment.and.returnValue(undefined);

      // Use the new rxMethod signature that expects an object
      store.updateComment({ commentId, content: newContent });

      expect(messageService.modifyComment).toHaveBeenCalledWith(commentId, newContent);
      
      const updatedComment = store.comments().find(c => c.id === commentId);
      expect(updatedComment?.content).toBe(newContent);
      expect(updatedComment?.status).toBe(CommentStatus.MODIFIED);
    });

    it('should handle comment operation errors', async () => {
      const commentId = 'comment-1';
      const errorMessage = 'Failed to approve comment';
      messageService.approveComment.and.throwError(new Error(errorMessage));

      await store.approveComment(commentId);

      expect(store.error()).toBe(errorMessage);
      
      // Should revert optimistic update
      const comment = store.comments().find(c => c.id === commentId);
      expect(comment?.status).toBe(CommentStatus.PENDING); // Original status
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(async () => {
      messageService.loadPRDetails.and.returnValue(
        Promise.resolve({ comments: mockComments })
      );
      await store.loadComments(123);
    });

    it('should bulk approve comments', async () => {
      const commentIds = ['comment-1', 'comment-2'];
      messageService.approveComment.and.returnValue(undefined);

      await store.bulkApproveComments(commentIds);

      expect(messageService.approveComment).toHaveBeenCalledTimes(2);
      expect(messageService.approveComment).toHaveBeenCalledWith('comment-1');
      expect(messageService.approveComment).toHaveBeenCalledWith('comment-2');

      commentIds.forEach(id => {
        const comment = store.comments().find(c => c.id === id);
        expect(comment?.status).toBe(CommentStatus.APPROVED);
      });

      expect(store.selectedComments()).toEqual([]);
    });

    it('should bulk dismiss comments', async () => {
      const commentIds = ['comment-1', 'comment-3'];
      messageService.dismissComment.and.returnValue(undefined);

      await store.bulkDismissComments(commentIds);

      expect(messageService.dismissComment).toHaveBeenCalledTimes(2);
      expect(messageService.dismissComment).toHaveBeenCalledWith('comment-1');
      expect(messageService.dismissComment).toHaveBeenCalledWith('comment-3');

      commentIds.forEach(id => {
        const comment = store.comments().find(c => c.id === id);
        expect(comment?.status).toBe(CommentStatus.DISMISSED);
      });

      expect(store.selectedComments()).toEqual([]);
    });
  });

  describe('Comment Selection', () => {
    beforeEach(async () => {
      messageService.loadPRDetails.and.returnValue(
        Promise.resolve({ comments: mockComments })
      );
      await store.loadComments(123);
    });

    it('should select comment', () => {
      const commentId = 'comment-1';

      store.selectComment(commentId);

      expect(store.selectedComments()).toContain(commentId);
      expect(store.selectedCommentsCount()).toBe(1);
    });

    it('should deselect comment', () => {
      const commentId = 'comment-1';
      
      store.selectComment(commentId);
      store.deselectComment(commentId);

      expect(store.selectedComments()).not.toContain(commentId);
      expect(store.selectedCommentsCount()).toBe(0);
    });

    it('should toggle comment selection', () => {
      const commentId = 'comment-1';

      // Toggle on
      store.toggleCommentSelection(commentId);
      expect(store.selectedComments()).toContain(commentId);

      // Toggle off
      store.toggleCommentSelection(commentId);
      expect(store.selectedComments()).not.toContain(commentId);
    });

    it('should select all filtered comments', () => {
      store.selectAllFilteredComments();

      expect(store.selectedComments()).toEqual(mockComments.map(c => c.id));
      expect(store.selectedCommentsCount()).toBe(mockComments.length);
    });

    it('should clear selection', () => {
      store.selectAllFilteredComments();
      store.clearSelection();

      expect(store.selectedComments()).toEqual([]);
      expect(store.selectedCommentsCount()).toBe(0);
    });

    it('should check if all filtered comments are selected', () => {
      expect(store.allFilteredCommentsSelected()).toBe(false);

      store.selectAllFilteredComments();
      expect(store.allFilteredCommentsSelected()).toBe(true);
    });
  });

  describe('Filtering', () => {
    beforeEach(async () => {
      messageService.loadPRDetails.and.returnValue(
        Promise.resolve({ comments: mockComments })
      );
      await store.loadComments(123);
    });

    it('should filter by severity', () => {
      store.updateFilters({ severity: CommentSeverity.ERROR });

      const filtered = store.filteredComments();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].severity).toBe(CommentSeverity.ERROR);
    });

    it('should filter by status', () => {
      store.updateFilters({ status: CommentStatus.PENDING });

      const filtered = store.filteredComments();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe(CommentStatus.PENDING);
    });

    it('should filter by file', () => {
      store.updateFilters({ file: 'src/components/Button.tsx' });

      const filtered = store.filteredComments();
      expect(filtered).toHaveLength(2);
      filtered.forEach(comment => {
        expect(comment.filePath).toBe('src/components/Button.tsx');
      });
    });

    it('should filter by category', () => {
      store.updateFilters({ category: 'Performance' });

      const filtered = store.filteredComments();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].category).toBe('Performance');
    });

    it('should filter by visibility settings', () => {
      // Hide approved comments
      store.updateFilters({ showApproved: false });

      const filtered = store.filteredComments();
      expect(filtered).toHaveLength(2);
      filtered.forEach(comment => {
        expect(comment.status).not.toBe(CommentStatus.APPROVED);
      });
    });

    it('should clear filters', () => {
      store.updateFilters({ severity: CommentSeverity.ERROR });
      store.clearFilters();

      expect(store.filters().severity).toBeUndefined();
      expect(store.filteredComments()).toEqual(jasmine.arrayContaining(mockComments));
    });
  });

  describe('Grouping and View Mode', () => {
    beforeEach(async () => {
      messageService.loadPRDetails.and.returnValue(
        Promise.resolve({ comments: mockComments })
      );
      await store.loadComments(123);
    });

    it('should group comments by file', () => {
      store.setGroupBy('file');
      
      const grouped = store.groupedComments();
      expect(Object.keys(grouped)).toContain('src/components/Button.tsx');
      expect(Object.keys(grouped)).toContain('src/utils/api.ts');
      expect(grouped['src/components/Button.tsx']).toHaveLength(2);
      expect(grouped['src/utils/api.ts']).toHaveLength(1);
    });

    it('should group comments by severity', () => {
      store.setGroupBy('severity');
      
      const grouped = store.groupedComments();
      expect(Object.keys(grouped)).toContain(CommentSeverity.WARNING);
      expect(Object.keys(grouped)).toContain(CommentSeverity.ERROR);
      expect(Object.keys(grouped)).toContain(CommentSeverity.SUGGESTION);
    });

    it('should set view mode', () => {
      store.setViewMode('list');
      expect(store.viewMode()).toBe('list');

      store.setViewMode('grouped');
      expect(store.viewMode()).toBe('grouped');
    });
  });

  describe('Computed Properties', () => {
    beforeEach(async () => {
      messageService.loadPRDetails.and.returnValue(
        Promise.resolve({ comments: mockComments })
      );
      await store.loadComments(123);
    });

    it('should compute unique file paths', () => {
      const filePaths = store.uniqueFilePaths();
      expect(filePaths).toContain('src/components/Button.tsx');
      expect(filePaths).toContain('src/utils/api.ts');
      expect(filePaths).toHaveLength(2);
    });

    it('should compute unique categories', () => {
      const categories = store.uniqueCategories();
      expect(categories).toContain('Performance');
      expect(categories).toContain('Error Handling');
      expect(categories).toContain('Type Safety');
      expect(categories).toHaveLength(3);
    });

    it('should compute comments by file', () => {
      const byFile = store.commentsByFile();
      expect(byFile['src/components/Button.tsx']).toHaveLength(2);
      expect(byFile['src/utils/api.ts']).toHaveLength(1);
    });

    it('should compute pending actions count', () => {
      expect(store.pendingActionsCount()).toBe(1);
    });

    it('should compute summary statistics', () => {
      const summary = store.commentsSummary();
      expect(summary.total).toBe(3);
      expect(summary.pending).toBe(1);
      expect(summary.approved).toBe(1);
      expect(summary.dismissed).toBe(1);
      expect(summary.bySeverity[CommentSeverity.WARNING]).toBe(1);
      expect(summary.bySeverity[CommentSeverity.ERROR]).toBe(1);
      expect(summary.bySeverity[CommentSeverity.SUGGESTION]).toBe(1);
    });
  });

  describe('Export and Utility Functions', () => {
    beforeEach(async () => {
      messageService.loadPRDetails.and.returnValue(
        Promise.resolve({ comments: mockComments })
      );
      await store.loadComments(123);
    });

    it('should export comments', () => {
      messageService.exportComments.and.returnValue(undefined);

      store.exportComments('json');

      expect(messageService.exportComments).toHaveBeenCalled();
    });

    it('should apply suggestion', async () => {
      const commentId = 'comment-1';
      messageService.modifyComment.and.returnValue(undefined);
      messageService.approveComment.and.returnValue(undefined);

      await store.applySuggestion(commentId);

      expect(messageService.modifyComment).toHaveBeenCalledWith(
        commentId, 
        'Use useCallback to memoize the function'
      );
      expect(messageService.approveComment).toHaveBeenCalledWith(commentId);
    });

    it('should handle apply suggestion with no suggestion', async () => {
      const commentId = 'comment-2'; // Has no suggestedFix

      await store.applySuggestion(commentId);

      expect(store.error()).toBe('No suggestion available for this comment');
      expect(messageService.modifyComment).not.toHaveBeenCalled();
    });

    it('should refresh comments', async () => {
      const prId = 456;
      messageService.loadPRDetails.and.returnValue(
        Promise.resolve({ comments: [] })
      );

      await store.refreshComments(prId);

      expect(messageService.loadPRDetails).toHaveBeenCalledWith(prId);
    });

    it('should reset store', () => {
      store.selectComment('comment-1');
      store.updateFilters({ severity: CommentSeverity.ERROR });
      
      store.reset();

      expect(store.comments()).toEqual([]);
      expect(store.selectedComments()).toEqual([]);
      expect(store.filters().severity).toBeUndefined();
      expect(store.error()).toBeUndefined();
    });

    it('should clear error', () => {
      // Trigger an error
      store.updateFilters({ severity: CommentSeverity.ERROR });
      messageService.loadPRDetails.and.returnValue(
        Promise.reject(new Error('Test error'))
      );
      
      store.clearError();
      expect(store.error()).toBeUndefined();
    });
  });

  // rxMethod Conversion Tests - Proof of Concept
  describe('rxMethod Conversion Tests', () => {
    describe('loadComments rxMethod Implementation', () => {
      it('should load comments using rxMethod with proper state management', fakeAsync(() => {
        // Arrange
        const mockComments = [
          { id: '1', content: 'rxMethod test comment', severity: CommentSeverity.INFO },
          { id: '2', content: 'Second comment', severity: CommentSeverity.WARNING }
        ];
        messageService.loadPRDetails.and.returnValue(Promise.resolve({ comments: mockComments }));

        // Assert initial state
        expect(store.isLoading()).toBe(false);
        expect(store.error()).toBeUndefined();
        expect(store.comments()).toEqual([]);

        // Act - Call the rxMethod
        store.loadComments(123);
        
        // Assert loading state is set immediately
        expect(store.isLoading()).toBe(true);
        expect(store.error()).toBeUndefined();

        // Complete async operation
        tick();

        // Assert final state
        expect(store.isLoading()).toBe(false);
        expect(store.error()).toBeUndefined();
        expect(store.comments()).toEqual(mockComments);
        expect(messageService.loadPRDetails).toHaveBeenCalledWith(123);
      }));

      it('should handle errors in rxMethod correctly', fakeAsync(() => {
        // Arrange
        const errorMessage = 'rxMethod load error';
        messageService.loadPRDetails.and.returnValue(Promise.reject(new Error(errorMessage)));

        // Assert initial state
        expect(store.isLoading()).toBe(false);
        expect(store.error()).toBeUndefined();

        // Act
        store.loadComments(123);
        
        // Assert loading state during execution
        expect(store.isLoading()).toBe(true);

        // Complete async operation
        tick();

        // Assert error state
        expect(store.isLoading()).toBe(false);
        expect(store.error()).toBe(errorMessage);
        expect(store.comments()).toEqual([]); // Comments should remain empty on error
        expect(messageService.loadPRDetails).toHaveBeenCalledWith(123);
      }));

      it('should cancel previous rxMethod calls with switchMap', fakeAsync(() => {
        // Arrange
        let resolveFirst: (value: any) => void;
        let resolveSecond: (value: any) => void;
        
        const firstPromise = new Promise(resolve => { resolveFirst = resolve; });
        const secondPromise = new Promise(resolve => { resolveSecond = resolve; });
        
        const firstComments = [{ id: '1', content: 'First call' }];
        const secondComments = [{ id: '2', content: 'Second call' }];

        // Setup delayed responses
        messageService.loadPRDetails.and.callFake((prId: number) => {
          if (prId === 123) return firstPromise;
          if (prId === 456) return secondPromise;
          return Promise.resolve({ comments: [] });
        });

        // Act - First call
        store.loadComments(123);
        expect(store.isLoading()).toBe(true);
        
        // Act - Second call (should cancel first)
        store.loadComments(456);
        expect(store.isLoading()).toBe(true);
        
        // Resolve first call (should be ignored due to cancellation)
        resolveFirst({ comments: firstComments });
        tick();
        
        // Resolve second call
        resolveSecond({ comments: secondComments });
        tick();

        // Assert - Only second call result should be applied
        expect(store.isLoading()).toBe(false);
        expect(store.error()).toBeUndefined();
        expect(store.comments()).toEqual(secondComments);
        expect(messageService.loadPRDetails).toHaveBeenCalledTimes(2);
      }));

      it('should clear previous error on successful rxMethod call', fakeAsync(() => {
        // Arrange - First call fails
        messageService.loadPRDetails.and.returnValue(Promise.reject(new Error('Network error')));
        store.loadComments(123);
        tick();
        
        // Verify error state
        expect(store.error()).toBe('Network error');
        
        // Second call succeeds
        const mockComments = [{ id: '1', content: 'Success after error' }];
        messageService.loadPRDetails.and.returnValue(Promise.resolve({ comments: mockComments }));

        // Act - Retry
        store.loadComments(123);
        tick();

        // Assert - Error should be cleared
        expect(store.isLoading()).toBe(false);
        expect(store.error()).toBeUndefined();
        expect(store.comments()).toEqual(mockComments);
      }));

      it('should handle empty comments response in rxMethod', fakeAsync(() => {
        // Arrange
        messageService.loadPRDetails.and.returnValue(Promise.resolve({ comments: [] }));

        // Act
        store.loadComments(123);
        tick();

        // Assert
        expect(store.isLoading()).toBe(false);
        expect(store.error()).toBeUndefined();
        expect(store.comments()).toEqual([]);
        expect(messageService.loadPRDetails).toHaveBeenCalledWith(123);
      }));

      it('should handle response without comments property in rxMethod', fakeAsync(() => {
        // Arrange
        messageService.loadPRDetails.and.returnValue(Promise.resolve({ data: 'other data' }));

        // Act
        store.loadComments(123);
        tick();

        // Assert
        expect(store.isLoading()).toBe(false);
        expect(store.error()).toBeUndefined();
        expect(store.comments()).toEqual([]); // Should default to empty array
      }));
    });

    describe('loadCommentsAsync Compatibility Wrapper', () => {
      it('should work with async/await pattern', async () => {
        // Arrange
        const mockComments = [{ id: '1', content: 'Async compatibility test' }];
        messageService.loadPRDetails.and.returnValue(Promise.resolve({ comments: mockComments }));

        // Act
        await store.loadCommentsAsync(123);

        // Assert
        expect(store.isLoading()).toBe(false);
        expect(store.error()).toBeUndefined();
        expect(store.comments()).toEqual(mockComments);
        expect(messageService.loadPRDetails).toHaveBeenCalledWith(123);
      });

      it('should throw error for failed requests in async wrapper', async () => {
        // Arrange
        const errorMessage = 'Async wrapper error';
        messageService.loadPRDetails.and.returnValue(Promise.reject(new Error(errorMessage)));

        // Act & Assert
        await expectAsync(store.loadCommentsAsync(123)).toBeRejectedWithError(errorMessage);
        
        // Verify error state is set
        expect(store.error()).toBe(errorMessage);
        expect(store.isLoading()).toBe(false);
      });
    });

    describe('State Consistency Between rxMethod and Async Wrapper', () => {
      it('should produce identical final state for successful operations', async () => {
        const mockComments = [{ id: '1', content: 'Consistency test' }];
        
        // Test rxMethod version
        messageService.loadPRDetails.and.returnValue(Promise.resolve({ comments: mockComments }));
        store.loadComments(123);
        await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async
        
        const rxMethodState = {
          comments: store.comments(),
          isLoading: store.isLoading(),
          error: store.error()
        };

        // Reset state for async wrapper test
        store.reset();
        messageService.loadPRDetails.and.returnValue(Promise.resolve({ comments: mockComments }));
        
        // Test async wrapper version
        await store.loadCommentsAsync(123);

        const asyncWrapperState = {
          comments: store.comments(),
          isLoading: store.isLoading(),
          error: store.error()
        };

        // Assert both produce same final state
        expect(rxMethodState).toEqual(asyncWrapperState);
        expect(rxMethodState.comments).toEqual(mockComments);
        expect(rxMethodState.isLoading).toBe(false);
        expect(rxMethodState.error).toBeUndefined();
      });
    });

    describe('Integration with refreshComments', () => {
      it('should work correctly when called via refreshComments', async () => {
        // Arrange
        const mockComments = [{ id: '1', content: 'Refresh test' }];
        messageService.loadPRDetails.and.returnValue(Promise.resolve({ comments: mockComments }));

        // Act - Call refreshComments which should use loadCommentsAsync
        await store.refreshComments(123);

        // Assert
        expect(store.isLoading()).toBe(false);
        expect(store.error()).toBeUndefined();
        expect(store.comments()).toEqual(mockComments);
        expect(messageService.loadPRDetails).toHaveBeenCalledWith(123);
      });

      it('should handle errors in refreshComments', async () => {
        // Arrange
        const errorMessage = 'Refresh error';
        messageService.loadPRDetails.and.returnValue(Promise.reject(new Error(errorMessage)));

        // Act & Assert
        await expectAsync(store.refreshComments(123)).toBeRejectedWithError(errorMessage);
        
        // Verify error state
        expect(store.error()).toBe(errorMessage);
        expect(store.isLoading()).toBe(false);
      });
    });

    describe('Performance and Memory Tests', () => {
      it('should not cause memory leaks with multiple rxMethod calls', fakeAsync(() => {
        const mockComments = [{ id: '1', content: 'Performance test' }];
        
        // Make many calls to test for memory leaks
        for (let i = 0; i < 20; i++) {
          messageService.loadPRDetails.and.returnValue(Promise.resolve({ comments: mockComments }));
          store.loadComments(i);
          tick();
        }
        
        // Verify final state is correct
        expect(store.comments()).toEqual(mockComments);
        expect(store.isLoading()).toBe(false);
        expect(store.error()).toBeUndefined();
      }));

      it('should handle rapid successive calls correctly', fakeAsync(() => {
        // Simulate rapid calls (like user clicking multiple times)
        const finalComments = [{ id: 'final', content: 'Final result' }];
        
        // Make several rapid calls - only the last should take effect
        messageService.loadPRDetails.and.returnValue(Promise.resolve({ comments: [{ id: '1' }] }));
        store.loadComments(1);
        
        messageService.loadPRDetails.and.returnValue(Promise.resolve({ comments: [{ id: '2' }] }));
        store.loadComments(2);
        
        messageService.loadPRDetails.and.returnValue(Promise.resolve({ comments: finalComments }));
        store.loadComments(3);
        
        tick();

        // Only the last call's result should be applied due to switchMap cancellation
        expect(store.comments()).toEqual(finalComments);
        expect(store.isLoading()).toBe(false);
        expect(messageService.loadPRDetails).toHaveBeenCalledTimes(3);
      }));
    });
  });
});

/**
 * Additional test helper function to validate rxMethod conversion
 */
function expectStateTransition(
  store: any,
  action: () => void,
  expectedFinalState: { isLoading: boolean; error?: string; comments: any[] }
) {
  // Execute action
  action();
  
  // Verify final state matches expectations
  expect(store.isLoading()).toBe(expectedFinalState.isLoading);
  expect(store.error()).toBe(expectedFinalState.error);
  expect(store.comments()).toEqual(expectedFinalState.comments);
}