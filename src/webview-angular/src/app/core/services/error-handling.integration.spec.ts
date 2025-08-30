import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ErrorHandler } from '@angular/core';
import { GlobalErrorHandler } from '../../core/services/global-error-handler.service';
import { ErrorMessageService } from '../../core/services/error-message.service';
import { NotificationService } from '../../core/services/notification.service';
import { LoadingService } from '../../core/services/loading.service';

describe('Error Handling Integration Tests', () => {
  let errorHandler: GlobalErrorHandler;
  let errorMessageService: ErrorMessageService;
  let notificationService: NotificationService;
  let loadingService: LoadingService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: ErrorHandler, useClass: GlobalErrorHandler },
        GlobalErrorHandler,
        ErrorMessageService,
        NotificationService,
        LoadingService
      ]
    });

    errorHandler = TestBed.inject(GlobalErrorHandler);
    errorMessageService = TestBed.inject(ErrorMessageService);
    notificationService = TestBed.inject(NotificationService);
    loadingService = TestBed.inject(LoadingService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  describe('Network Error Scenarios', () => {
    it('should handle network timeout errors', () => {
      const error = new Error('Network timeout');
      const spy = spyOn(notificationService, 'showError');
      
      errorHandler.handleError(error);
      
      expect(spy).toHaveBeenCalledWith(
        jasmine.stringContaining('network'),
        jasmine.any(Object)
      );
    });

    it('should handle connection refused errors', () => {
      const error = new Error('Connection refused');
      const spy = spyOn(notificationService, 'showError');
      
      errorHandler.handleError(error);
      
      expect(spy).toHaveBeenCalledWith(
        jasmine.stringContaining('connection'),
        jasmine.any(Object)
      );
    });

    it('should handle offline scenarios', () => {
      // Simulate offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const error = new Error('Failed to fetch');
      const spy = spyOn(notificationService, 'showError');
      
      errorHandler.handleError(error);
      
      expect(spy).toHaveBeenCalledWith(
        jasmine.stringContaining('offline'),
        jasmine.any(Object)
      );
    });
  });

  describe('Authentication Error Scenarios', () => {
    it('should handle 401 unauthorized errors', () => {
      const error = { status: 401, message: 'Unauthorized' };
      const spy = spyOn(notificationService, 'showError');
      
      errorHandler.handleError(error);
      
      expect(spy).toHaveBeenCalledWith(
        jasmine.stringContaining('authentication'),
        jasmine.objectContaining({
          actions: jasmine.arrayContaining([
            jasmine.objectContaining({ label: jasmine.stringContaining('login') })
          ])
        })
      );
    });

    it('should handle 403 forbidden errors', () => {
      const error = { status: 403, message: 'Forbidden' };
      const spy = spyOn(notificationService, 'showError');
      
      errorHandler.handleError(error);
      
      expect(spy).toHaveBeenCalledWith(
        jasmine.stringContaining('permission'),
        jasmine.objectContaining({
          actions: jasmine.arrayContaining([
            jasmine.objectContaining({ label: jasmine.stringContaining('contact') })
          ])
        })
      );
    });

    it('should handle token expiration', () => {
      const error = { 
        status: 401, 
        error: { message: 'Token expired' }
      };
      const spy = spyOn(notificationService, 'showError');
      
      errorHandler.handleError(error);
      
      expect(spy).toHaveBeenCalledWith(
        jasmine.stringContaining('session'),
        jasmine.objectContaining({
          actions: jasmine.arrayContaining([
            jasmine.objectContaining({ label: jasmine.stringContaining('refresh') })
          ])
        })
      );
    });
  });

  describe('Validation Error Scenarios', () => {
    it('should handle form validation errors', () => {
      const validationErrors = {
        title: ['Title is required', 'Title must be at least 5 characters'],
        email: ['Email format is invalid']
      };
      
      const spy = spyOn(notificationService, 'showError');
      
      errorHandler.handleError({ validationErrors });
      
      expect(spy).toHaveBeenCalledWith(
        jasmine.stringContaining('validation'),
        jasmine.objectContaining({
          details: jasmine.arrayContaining([
            jasmine.stringContaining('Title'),
            jasmine.stringContaining('Email')
          ])
        })
      );
    });

    it('should handle server-side validation errors', () => {
      const error = {
        status: 400,
        error: {
          errors: {
            'model.Title': ['The Title field is required.'],
            'model.Description': ['Description cannot exceed 500 characters.']
          }
        }
      };
      
      const spy = spyOn(notificationService, 'showError');
      
      errorHandler.handleError(error);
      
      expect(spy).toHaveBeenCalledWith(
        jasmine.stringContaining('validation'),
        jasmine.any(Object)
      );
    });
  });

  describe('Loading State Error Integration', () => {
    it('should fail loading operations on errors', () => {
      const loadingId = loadingService.startLoading('Test Operation', {
        category: 'api'
      });
      
      const error = new Error('API call failed');
      
      errorHandler.handleError(error);
      loadingService.failLoading(loadingId, error.message);
      
      const operation = loadingService.getOperation(loadingId);
      expect(operation?.status).toBe('failed');
    });

    it('should handle multiple concurrent loading failures', () => {
      const loadingIds = [
        loadingService.startLoading('Operation 1', { category: 'api' }),
        loadingService.startLoading('Operation 2', { category: 'api' }),
        loadingService.startLoading('Operation 3', { category: 'api' })
      ];
      
      loadingIds.forEach((id, index) => {
        loadingService.failLoading(id, `Error ${index + 1}`);
      });
      
      const failedOps = loadingIds
        .map(id => loadingService.getOperation(id))
        .filter(op => op?.status === 'failed');
      
      expect(failedOps.length).toBe(3);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should provide retry actions for recoverable errors', () => {
      const error = { status: 500, message: 'Internal server error' };
      const spy = spyOn(notificationService, 'showError');
      
      errorHandler.handleError(error);
      
      expect(spy).toHaveBeenCalledWith(
        jasmine.any(String),
        jasmine.objectContaining({
          actions: jasmine.arrayContaining([
            jasmine.objectContaining({ 
              label: jasmine.stringContaining('retry'),
              action: jasmine.any(Function)
            })
          ])
        })
      );
    });

    it('should handle error escalation', () => {
      const criticalError = new Error('Critical system failure');
      const spy = spyOn(console, 'error');
      
      errorHandler.handleError(criticalError);
      
      expect(spy).toHaveBeenCalledWith(
        jasmine.stringContaining('Critical error'),
        criticalError
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined errors', () => {
      expect(() => errorHandler.handleError(null)).not.toThrow();
      expect(() => errorHandler.handleError(undefined)).not.toThrow();
    });

    it('should handle circular reference errors', () => {
      const circularError: any = { message: 'Circular reference error' };
      circularError.self = circularError;
      
      expect(() => errorHandler.handleError(circularError)).not.toThrow();
    });

    it('should handle very large error objects', () => {
      const largeError = {
        message: 'Large error',
        data: new Array(10000).fill('large data chunk').join('')
      };
      
      expect(() => errorHandler.handleError(largeError)).not.toThrow();
    });

    it('should handle rapid consecutive errors', async () => {
      const spy = spyOn(notificationService, 'showError');
      const errors = Array.from({ length: 100 }, (_, i) => new Error(`Error ${i}`));
      
      errors.forEach(error => errorHandler.handleError(error));
      
      // Should not crash and should handle all errors
      expect(spy).toHaveBeenCalledTimes(100);
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory with many errors', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize;
      
      // Generate many errors
      for (let i = 0; i < 1000; i++) {
        errorHandler.handleError(new Error(`Test error ${i}`));
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize;
      
      // Memory should not have grown significantly (allowing for some variance)
      if (initialMemory && finalMemory) {
        const growth = finalMemory - initialMemory;
        expect(growth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
      }
    });

    it('should handle errors efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        errorHandler.handleError(new Error(`Performance test ${i}`));
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should handle 100 errors in less than 1 second
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Error Message Generation', () => {
    it('should generate appropriate messages for different error types', () => {
      const testCases = [
        { error: { status: 404 }, expectedPattern: /not found/i },
        { error: { status: 429 }, expectedPattern: /rate limit/i },
        { error: { status: 503 }, expectedPattern: /service unavailable/i },
        { error: new TypeError('Invalid type'), expectedPattern: /type error/i },
        { error: new ReferenceError('Undefined reference'), expectedPattern: /reference error/i }
      ];
      
      testCases.forEach(({ error, expectedPattern }) => {
        const result = errorMessageService.getErrorPattern(error);
        expect(result.message).toMatch(expectedPattern);
      });
    });

    it('should provide context-aware error messages', () => {
      const prError = { status: 404, url: '/api/pullrequests/123' };
      const result = errorMessageService.getFriendlyErrorMessage(prError, 'api');
      
      expect(result.message).toContain('pull request');
    });
  });
});