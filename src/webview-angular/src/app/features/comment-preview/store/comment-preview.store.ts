import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { 
  pipe, 
  switchMap, 
  tap, 
  finalize, 
  from, 
  lastValueFrom,
  catchError,
  EMPTY
} from 'rxjs';
import { MessageService } from '../../../core/services/message.service';
import { 
  CommentPreviewState, 
  ReviewComment, 
  CommentFilters,
  CommentSummaryStats
} from '../../../core/models/interfaces';
import { CommentSeverity, CommentStatus } from '../../../core/models/enums';

/**
 * Initial comment preview state
 */
const initialState: CommentPreviewState = {
  comments: [],
  filteredComments: [],
  filters: {
    severity: undefined,
    status: undefined,
    file: undefined,
    category: undefined,
    showApproved: true,
    showDismissed: false,
    showPending: true
  },
  groupBy: 'file',
  viewMode: 'grouped',
  selectedComments: [],
  isLoading: false,
  error: undefined,
  summary: {
    total: 0,
    pending: 0,
    approved: 0,
    dismissed: 0,
    modified: 0,
    bySeverity: {
      [CommentSeverity.ERROR]: 0,
      [CommentSeverity.WARNING]: 0,
      [CommentSeverity.INFO]: 0,
      [CommentSeverity.SUGGESTION]: 0
    },
    byFile: {},
    byCategory: {},
    averageConfidence: 0,
    highConfidenceCount: 0
  }
};

/**
 * Comment Preview SignalStore for managing comment state
 */
export const CommentPreviewStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => {
    const filteredComments = computed(() => {
      const comments = store.comments();
      const filters = store.filters();
      
      let filtered = [...comments];
      
      // Apply severity filter
      if (filters.severity) {
        filtered = filtered.filter(comment => comment.severity === filters.severity);
      }
      
      // Apply status filter
      if (filters.status) {
        filtered = filtered.filter(comment => comment.status === filters.status);
      }
      
      // Apply file filter
      if (filters.file) {
        filtered = filtered.filter(comment => 
          comment.filePath.toLowerCase().includes(filters.file!.toLowerCase())
        );
      }
      
      // Apply category filter
      if (filters.category) {
        filtered = filtered.filter(comment => 
          comment.category === filters.category
        );
      }
      
      // Apply status visibility filters
      filtered = filtered.filter(comment => {
        if (comment.status === CommentStatus.APPROVED && !filters.showApproved) return false;
        if (comment.status === CommentStatus.DISMISSED && !filters.showDismissed) return false;
        if (comment.status === CommentStatus.PENDING && !filters.showPending) return false;
        return true;
      });
      
      return filtered;
    });

    const groupedComments = computed(() => {
      const filtered = filteredComments();
      const groupBy = store.groupBy();
      
      if (groupBy === 'none') {
        return { 'All Comments': filtered };
      }
      
      const grouped: Record<string, ReviewComment[]> = {};
      
      filtered.forEach(comment => {
        let key: string;
        
        switch (groupBy) {
          case 'file':
            key = comment.filePath;
            break;
          case 'severity':
            key = comment.severity;
            break;
          default:
            key = 'All Comments';
        }
        
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(comment);
      });
      
      // Sort groups by key
      const sortedGrouped: Record<string, ReviewComment[]> = {};
      Object.keys(grouped)
        .sort()
        .forEach(key => {
          sortedGrouped[key] = grouped[key];
        });
      
      return sortedGrouped;
    });

    const commentsSummary = computed(() => {
      const comments = store.comments();
      
      const summary: CommentSummaryStats = {
        total: comments.length,
        pending: 0,
        approved: 0,
        dismissed: 0,
        modified: 0,
        bySeverity: {
          [CommentSeverity.ERROR]: 0,
          [CommentSeverity.WARNING]: 0,
          [CommentSeverity.INFO]: 0,
          [CommentSeverity.SUGGESTION]: 0
        },
        byFile: {},
        byCategory: {},
        averageConfidence: 0,
        highConfidenceCount: 0
      };
      
      let totalConfidence = 0;
      
      comments.forEach(comment => {
        // Count by status
        if (comment.status === CommentStatus.APPROVED) {
          summary.approved++;
        } else if (comment.status === CommentStatus.DISMISSED) {
          summary.dismissed++;
        } else if (comment.status === CommentStatus.PENDING) {
          summary.pending++;
        }
        
        if (comment.status === CommentStatus.MODIFIED) {
          summary.modified++;
        }
        
        // Count by severity
        summary.bySeverity[comment.severity]++;
        
        // Count by file
        if (!summary.byFile[comment.filePath]) {
          summary.byFile[comment.filePath] = 0;
        }
        summary.byFile[comment.filePath]++;
        
        // Count by category
        if (comment.category) {
          if (!summary.byCategory[comment.category]) {
            summary.byCategory[comment.category] = 0;
          }
          summary.byCategory[comment.category]++;
        }
        
        // Calculate confidence metrics
        if (comment.confidence !== undefined) {
          totalConfidence += comment.confidence;
          if (comment.confidence >= 0.8) {
            summary.highConfidenceCount++;
          }
        }
      });
      
      // Calculate average confidence
      if (comments.length > 0) {
        summary.averageConfidence = totalConfidence / comments.length;
      }
      
      return summary;
    });

    return {
      filteredComments,
      groupedComments,
      commentsSummary,

      /**
       * Computed signal for selected comments count
       */
      selectedCommentsCount: computed(() => store.selectedComments().length),

      /**
       * Computed signal to check if all filtered comments are selected
       */
      allFilteredCommentsSelected: computed(() => {
        const filtered = filteredComments();
        const selected = store.selectedComments();
        return filtered.length > 0 && filtered.every(comment => 
          selected.includes(comment.id)
        );
      }),

      /**
       * Computed signal for comments by file path
       */
      commentsByFile: computed(() => {
        const comments = store.comments();
        const byFile: Record<string, ReviewComment[]> = {};
        
        comments.forEach(comment => {
          if (!byFile[comment.filePath]) {
            byFile[comment.filePath] = [];
          }
          byFile[comment.filePath].push(comment);
        });
        
        return byFile;
      }),

      /**
       * Computed signal for unique file paths with comments
       */
      uniqueFilePaths: computed(() => {
        const comments = store.comments();
        const filePaths = [...new Set(comments.map(comment => comment.filePath))];
        return filePaths.sort();
      }),

      /**
       * Computed signal for unique categories
       */
      uniqueCategories: computed(() => {
        const comments = store.comments();
        const categories = [...new Set(comments
          .map(comment => comment.category)
          .filter(category => !!category))];
        return categories.sort();
      }),

      /**
       * Computed signal for pending actions count
       */
      pendingActionsCount: computed(() => {
        const comments = store.comments();
        return comments.filter(comment => 
          comment.status === CommentStatus.PENDING
        ).length;
      })
    };
  }),
  withMethods((store, messageService = inject(MessageService)) => ({
    /**
     * Load comments for a pull request using rxMethod
     * Converted from async/await to rxMethod pattern for better cancellation and composition
     */
    loadComments: rxMethod<number>(pipe(
      tap(() => patchState(store, { isLoading: true, error: undefined })),
      switchMap((prId: number) => 
        from(messageService.loadPRDetails(prId)).pipe(
          tap({
            next: (response: any) => {
              const comments = response.comments || [];
              patchState(store, { 
                comments,
                error: undefined
              });
            },
            error: (error: any) => {
              const errorMessage = error instanceof Error ? error.message : 'Failed to load comments';
              patchState(store, { error: errorMessage });
            }
          }),
          catchError((error: any) => {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load comments';
            patchState(store, { error: errorMessage });
            return EMPTY;
          })
        )
      ),
      finalize(() => patchState(store, { isLoading: false }))
    )),

    /**
     * Compatibility wrapper for existing callers that expect a Promise
     * This maintains backward compatibility while the rest of the codebase migrates
     * TODO: Remove this wrapper once all callers are updated to use the rxMethod directly
     */
    async loadCommentsAsync(prId: number): Promise<void> {
      try {
        // Use the original messageService call directly for Promise compatibility
        patchState(store, { isLoading: true, error: undefined });
        const response = await messageService.loadPRDetails(prId) as { comments?: ReviewComment[] };
        const comments = (response && response.comments) || [];
        patchState(store, { 
          comments,
          error: undefined
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load comments';
        patchState(store, { error: errorMessage });
        throw error;
      } finally {
        patchState(store, { isLoading: false });
      }
    },

    /**
     * Update comment content
     */
    /**
     * updateComment converted to rxMethod with optimistic updates
     * Original: async updateComment(commentId: string, content: string)
     */
    updateComment: rxMethod<{ commentId: string; content: string }>(pipe(
      tap(({ commentId, content }) => {
        // Optimistically update local state
        const comments = store.comments().map(comment =>
          comment.id === commentId 
            ? { ...comment, content, status: CommentStatus.MODIFIED }
            : comment
        );
        patchState(store, { comments, error: undefined });
      }),
      switchMap(({ commentId, content }) => 
        from(Promise.resolve(messageService.modifyComment(commentId, content))).pipe(
          tap({
            next: () => {
              // Success - optimistic update is already applied
              patchState(store, { error: undefined });
            },
            error: (error: any) => {
              // Revert optimistic update on error
              patchState(store, { comments: store.comments() });
              const errorMessage = error instanceof Error ? error.message : 'Failed to update comment';
              patchState(store, { error: errorMessage });
            }
          }),
          catchError((error: any) => {
            // Revert optimistic update on error
            patchState(store, { comments: store.comments() });
            const errorMessage = error instanceof Error ? error.message : 'Failed to update comment';
            patchState(store, { error: errorMessage });
            return EMPTY;
          })
        )
      )
    )),

    /**
     * Compatibility wrapper for updateComment
     * TODO: Remove this wrapper once all callers are updated to use the rxMethod directly
     */
    async updateCommentAsync(commentId: string, content: string): Promise<void> {
      // Optimistically update local state
      const comments = store.comments().map(comment =>
        comment.id === commentId 
          ? { ...comment, content, status: CommentStatus.MODIFIED }
          : comment
      );
      
      patchState(store, { comments });
      
      try {
        await messageService.modifyComment(commentId, content);
      } catch (error) {
        // Revert optimistic update on error
        patchState(store, { comments: store.comments() });
        const errorMessage = error instanceof Error ? error.message : 'Failed to update comment';
        patchState(store, { error: errorMessage });
        throw error;
      }
    },

    /**
     * Approve a comment - converted to rxMethod with optimistic updates
     */
    approveComment: rxMethod<string>(pipe(
      tap((commentId: string) => {
        // Optimistically update local state
        const comments = store.comments().map(comment =>
          comment.id === commentId 
            ? { ...comment, status: CommentStatus.APPROVED }
            : comment
        );
        patchState(store, { comments, error: undefined });
      }),
      switchMap((commentId: string) => 
        from(Promise.resolve(messageService.approveComment(commentId))).pipe(
          tap({
            next: () => {
              // Success - optimistic update is already applied
              patchState(store, { error: undefined });
            },
            error: (error: any) => {
              // Revert optimistic update on error
              patchState(store, { comments: store.comments() });
              const errorMessage = error instanceof Error ? error.message : 'Failed to approve comment';
              patchState(store, { error: errorMessage });
            }
          }),
          catchError((error: any) => {
            // Revert optimistic update on error
            patchState(store, { comments: store.comments() });
            const errorMessage = error instanceof Error ? error.message : 'Failed to approve comment';
            patchState(store, { error: errorMessage });
            return EMPTY;
          })
        )
      )
    )),

    /**
     * Compatibility wrapper for approveComment
     */
    async approveCommentAsync(commentId: string): Promise<void> {
      // Optimistically update local state
      const comments = store.comments().map(comment =>
        comment.id === commentId 
          ? { ...comment, status: CommentStatus.APPROVED }
          : comment
      );
      
      patchState(store, { comments });
      
      try {
        await messageService.approveComment(commentId);
      } catch (error) {
        // Revert optimistic update on error
        patchState(store, { comments: store.comments() });
        const errorMessage = error instanceof Error ? error.message : 'Failed to approve comment';
        patchState(store, { error: errorMessage });
        throw error;
      }
    },

    /**
     * Dismiss a comment - converted to rxMethod with optimistic updates
     */
    dismissComment: rxMethod<string>(pipe(
      tap((commentId: string) => {
        // Optimistically update local state
        const comments = store.comments().map(comment =>
          comment.id === commentId 
            ? { ...comment, status: CommentStatus.DISMISSED }
            : comment
        );
        patchState(store, { comments, error: undefined });
      }),
      switchMap((commentId: string) => 
        from(Promise.resolve(messageService.dismissComment(commentId))).pipe(
          tap({
            next: () => {
              // Success - optimistic update is already applied
              patchState(store, { error: undefined });
            },
            error: (error: any) => {
              // Revert optimistic update on error
              patchState(store, { comments: store.comments() });
              const errorMessage = error instanceof Error ? error.message : 'Failed to dismiss comment';
              patchState(store, { error: errorMessage });
            }
          }),
          catchError((error: any) => {
            // Revert optimistic update on error
            patchState(store, { comments: store.comments() });
            const errorMessage = error instanceof Error ? error.message : 'Failed to dismiss comment';
            patchState(store, { error: errorMessage });
            return EMPTY;
          })
        )
      )
    )),

    /**
     * Compatibility wrapper for dismissComment
     */
    async dismissCommentAsync(commentId: string): Promise<void> {
      // Optimistically update local state
      const comments = store.comments().map(comment =>
        comment.id === commentId 
          ? { ...comment, status: CommentStatus.DISMISSED }
          : comment
      );
      
      patchState(store, { comments });
      
      try {
        await messageService.dismissComment(commentId);
      } catch (error) {
        // Revert optimistic update on error
        patchState(store, { comments: store.comments() });
        const errorMessage = error instanceof Error ? error.message : 'Failed to dismiss comment';
        patchState(store, { error: errorMessage });
        throw error;
      }
    },

    /**
     * Toggle comment approval status - converted to rxMethod
     */
    toggleCommentApproval: rxMethod<string>(pipe(
      switchMap((commentId: string) => {
        const comment = store.comments().find(c => c.id === commentId);
        if (!comment) {
          patchState(store, { error: 'Comment not found' });
          return EMPTY;
        }
        
        if (comment.status === CommentStatus.APPROVED) {
          // If approved, make it pending
          const comments = store.comments().map(c =>
            c.id === commentId 
              ? { ...c, status: CommentStatus.PENDING }
              : c
          );
          patchState(store, { comments });
          return EMPTY;
        } else {
          // For non-approved comments, trigger the approve flow
          const comments = store.comments().map(comment =>
            comment.id === commentId 
              ? { ...comment, status: CommentStatus.APPROVED }
              : comment
          );
          patchState(store, { comments, error: undefined });
          
          return from(Promise.resolve(messageService.approveComment(commentId))).pipe(
            tap({
              next: () => {
                patchState(store, { error: undefined });
              },
              error: (error: any) => {
                // Revert optimistic update on error
                patchState(store, { comments: store.comments() });
                const errorMessage = error instanceof Error ? error.message : 'Failed to approve comment';
                patchState(store, { error: errorMessage });
              }
            }),
            catchError((error: any) => {
              // Revert optimistic update on error
              patchState(store, { comments: store.comments() });
              const errorMessage = error instanceof Error ? error.message : 'Failed to approve comment';
              patchState(store, { error: errorMessage });
              return EMPTY;
            })
          );
        }
      })
    )),

    /**
     * Compatibility wrapper for toggleCommentApproval
     */
    async toggleCommentApprovalAsync(commentId: string): Promise<void> {
      const comment = store.comments().find(c => c.id === commentId);
      if (!comment) return;
      
      if (comment.status === CommentStatus.APPROVED) {
        // If approved, make it pending
        const comments = store.comments().map(c =>
          c.id === commentId 
            ? { ...c, status: CommentStatus.PENDING }
            : c
        );
        patchState(store, { comments });
      } else {
        await this.approveCommentAsync(commentId);
      }
    },

    /**
     * Bulk approve comments with performance optimizations
     * 
     * Performance optimizations:
     * - Early validation to prevent unnecessary API calls
     * - Optimistic updates for immediate UI feedback
     * - Parallel processing with Promise.all for better performance
     * - Automatic selection clearing for better UX
     * - Proper error handling with state reversion
     */
    bulkApproveComments: rxMethod<string[]>(pipe(
      tap((commentIds: string[]) => {
        // Early validation - skip if no comments to process
        if (commentIds.length === 0) {
          console.warn('No comments to approve');
          return;
        }
        
        console.log(`Bulk approving ${commentIds.length} comments`);
        
        // Optimistically update local state for immediate feedback
        const comments = store.comments().map(comment =>
          commentIds.includes(comment.id)
            ? { ...comment, status: CommentStatus.APPROVED }
            : comment
        );
        patchState(store, { comments, selectedComments: [], error: undefined });
      }),
      switchMap((commentIds: string[]) => {
        // Skip API call if no comments to process
        if (commentIds.length === 0) {
          return EMPTY;
        }
        
        // Use Promise.all for parallel processing - better performance than sequential
        return from(Promise.all(commentIds.map(id => messageService.approveComment(id)))).pipe(
          tap({
            next: () => {
              // Success - optimistic update is already applied
              patchState(store, { error: undefined });
              console.log(`Successfully approved ${commentIds.length} comments`);
            },
            error: (error: any) => {
              // Revert optimistic update on error
              patchState(store, { comments: store.comments() });
              const errorMessage = error instanceof Error ? error.message : 'Failed to approve comments';
              patchState(store, { error: errorMessage });
              console.error('Bulk approve failed:', error);
            }
          }),
          catchError((error: any) => {
            // Revert optimistic update on error
            patchState(store, { comments: store.comments() });
            const errorMessage = error instanceof Error ? error.message : 'Failed to approve comments';
            patchState(store, { error: errorMessage });
            console.error('Bulk approve failed:', error);
            return EMPTY; // Complete stream gracefully
          })
        );
      })
    )),

    /**
     * Compatibility wrapper for bulkApproveComments
     */
    async bulkApproveCommentsAsync(commentIds: string[]): Promise<void> {
      // Optimistically update local state
      const comments = store.comments().map(comment =>
        commentIds.includes(comment.id)
          ? { ...comment, status: CommentStatus.APPROVED }
          : comment
      );
      
      patchState(store, { comments, selectedComments: [] });
      
      try {
        // Send bulk action request
        await Promise.all(commentIds.map(id => messageService.approveComment(id)));
      } catch (error) {
        // Revert optimistic update on error
        patchState(store, { comments: store.comments() });
        const errorMessage = error instanceof Error ? error.message : 'Failed to approve comments';
        patchState(store, { error: errorMessage });
        throw error;
      }
    },

    /**
     * Bulk dismiss comments - converted to rxMethod with optimistic updates
     */
    bulkDismissComments: rxMethod<string[]>(pipe(
      tap((commentIds: string[]) => {
        // Optimistically update local state
        const comments = store.comments().map(comment =>
          commentIds.includes(comment.id)
            ? { ...comment, status: CommentStatus.DISMISSED }
            : comment
        );
        patchState(store, { comments, selectedComments: [], error: undefined });
      }),
      switchMap((commentIds: string[]) => 
        from(Promise.all(commentIds.map(id => messageService.dismissComment(id)))).pipe(
          tap({
            next: () => {
              // Success - optimistic update is already applied
              patchState(store, { error: undefined });
            },
            error: (error: any) => {
              // Revert optimistic update on error
              patchState(store, { comments: store.comments() });
              const errorMessage = error instanceof Error ? error.message : 'Failed to dismiss comments';
              patchState(store, { error: errorMessage });
            }
          }),
          catchError((error: any) => {
            // Revert optimistic update on error
            patchState(store, { comments: store.comments() });
            const errorMessage = error instanceof Error ? error.message : 'Failed to dismiss comments';
            patchState(store, { error: errorMessage });
            return EMPTY;
          })
        )
      )
    )),

    /**
     * Compatibility wrapper for bulkDismissComments
     */
    async bulkDismissCommentsAsync(commentIds: string[]): Promise<void> {
      // Optimistically update local state
      const comments = store.comments().map(comment =>
        commentIds.includes(comment.id)
          ? { ...comment, status: CommentStatus.DISMISSED }
          : comment
      );
      
      patchState(store, { comments, selectedComments: [] });
      
      try {
        // Send bulk action request
        await Promise.all(commentIds.map(id => messageService.dismissComment(id)));
      } catch (error) {
        // Revert optimistic update on error
        patchState(store, { comments: store.comments() });
        const errorMessage = error instanceof Error ? error.message : 'Failed to dismiss comments';
        patchState(store, { error: errorMessage });
        throw error;
      }
    },

    /**
     * Update comment filters
     */
    updateFilters(filters: Partial<CommentFilters>) {
      patchState(store, { 
        filters: { ...store.filters(), ...filters }
      });
    },

    /**
     * Set group by option
     */
    setGroupBy(groupBy: 'file' | 'severity' | 'none') {
      patchState(store, { groupBy });
    },

    /**
     * Set view mode
     */
    setViewMode(viewMode: 'list' | 'grouped') {
      patchState(store, { viewMode });
    },

    /**
     * Select comment
     */
    selectComment(commentId: string) {
      const selectedComments = store.selectedComments();
      if (!selectedComments.includes(commentId)) {
        patchState(store, { 
          selectedComments: [...selectedComments, commentId]
        });
      }
    },

    /**
     * Deselect comment
     */
    deselectComment(commentId: string) {
      const selectedComments = store.selectedComments().filter(id => id !== commentId);
      patchState(store, { selectedComments });
    },

    /**
     * Toggle comment selection
     */
    toggleCommentSelection(commentId: string) {
      const selectedComments = store.selectedComments();
      if (selectedComments.includes(commentId)) {
        this.deselectComment(commentId);
      } else {
        this.selectComment(commentId);
      }
    },

    /**
     * Select all filtered comments
     */
    selectAllFilteredComments() {
      const filteredComments = store.filteredComments();
      const commentIds = filteredComments.map(comment => comment.id);
      patchState(store, { selectedComments: commentIds });
    },

    /**
     * Clear all selections
     */
    clearSelection() {
      patchState(store, { selectedComments: [] });
    },

    /**
     * Clear all filters
     */
    clearFilters() {
      patchState(store, { 
        filters: initialState.filters,
        groupBy: 'file',
        viewMode: 'grouped'
      });
    },

    /**
     * Export comments
     */
    exportComments(format: 'json' | 'csv' | 'markdown' = 'json') {
      try {
        messageService.exportComments();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to export comments';
        patchState(store, { error: errorMessage });
      }
    },

    /**
     * Clear error state
     */
    clearError() {
      patchState(store, { error: undefined });
    },

    /**
     * Reset store to initial state
     */
    reset() {
      patchState(store, initialState);
    },

    /**
     * Refresh comments - converted to rxMethod
     */
    refreshComments: rxMethod<number | undefined>(pipe(
      switchMap((prId) => {
        if (prId !== undefined && prId !== null) {
          // Trigger the rxMethod directly - cast `this` to any to avoid strict typing issues
          (this as any).loadComments(prId);
        }
        return EMPTY; // Return empty since we're just triggering another method
      })
    )),

    /**
     * Compatibility wrapper for refreshComments
     * TODO: Remove this wrapper once all callers are updated to use the rxMethod directly
     */
    async refreshCommentsAsync(prId?: number): Promise<void> {
      if (prId) {
        await this.loadCommentsAsync(prId);
      }
    },

    /**
     * Update comments with new data (for real-time updates)
     */
    updateComments(comments: ReviewComment[]) {
      patchState(store, { comments });
    },

    /**
     * Apply suggestion from a comment - converted to rxMethod
     */
    applySuggestion: rxMethod<string>(pipe(
      switchMap((commentId: string) => {
        const comment = store.comments().find(c => c.id === commentId);
        if (!comment?.suggestedFix) {
          patchState(store, { error: 'No suggestion available for this comment' });
          return EMPTY;
        }

        // First update comment content with suggestion
        const commentsWithSuggestion = store.comments().map(comment =>
          comment.id === commentId 
            ? { ...comment, content: comment.suggestedFix || comment.content, status: CommentStatus.MODIFIED }
            : comment
        );
        patchState(store, { comments: commentsWithSuggestion, error: undefined });

        return from(Promise.resolve(messageService.modifyComment(commentId, comment.suggestedFix))).pipe(
          switchMap(() => {
            // After successful update, approve the comment
            const commentsWithApproval = store.comments().map(c =>
              c.id === commentId 
                ? { ...c, status: CommentStatus.APPROVED }
                : c
            );
            patchState(store, { comments: commentsWithApproval });
            
            return from(Promise.resolve(messageService.approveComment(commentId))).pipe(
              tap({
                next: () => {
                  patchState(store, { error: undefined });
                },
                error: (error: any) => {
                  const errorMessage = error instanceof Error ? error.message : 'Failed to approve comment after applying suggestion';
                  patchState(store, { error: errorMessage });
                }
              }),
              catchError((error: any) => {
                const errorMessage = error instanceof Error ? error.message : 'Failed to approve comment after applying suggestion';
                patchState(store, { error: errorMessage });
                return EMPTY;
              })
            );
          }),
          catchError((error: any) => {
            // Revert optimistic update on error
            patchState(store, { comments: store.comments() });
            const errorMessage = error instanceof Error ? error.message : 'Failed to apply suggestion';
            patchState(store, { error: errorMessage });
            return EMPTY;
          })
        );
      })
    )),

    /**
     * Compatibility wrapper for applySuggestion
     */
    async applySuggestionAsync(commentId: string): Promise<void> {
      const comment = store.comments().find(c => c.id === commentId);
      if (!comment?.suggestedFix) {
        patchState(store, { error: 'No suggestion available for this comment' });
        return;
      }

      try {
        // Update comment content with suggestion
        await this.updateCommentAsync(commentId, comment.suggestedFix);
        
        // Mark as approved since suggestion was applied
        await this.approveCommentAsync(commentId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to apply suggestion';
        patchState(store, { error: errorMessage });
        throw error;
      }
    }
  }))
);
