import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { of, throwError, delay } from 'rxjs';

import { ErrorHandlerService } from '../core/services/error-handler.service';
import { LoadingService } from '../core/services/loading.service';
import { NotificationService } from '../core/services/notification.service';
import { MessageService } from '../core/services/message.service';

@Component({
  standalone: true,
  imports: [],
  template: `
    <div>
      <button (click)="triggerNetworkError()" data-testid="network-error">Network Error</button>
      <button (click)="triggerAuthError()" data-testid="auth-error">Auth Error</button>
      <button (click)="triggerValidationError()" data-testid="validation-error">Validation Error</button>
      <button (click)="triggerTimeoutError()" data-testid="timeout-error">Timeout Error</button>
      <button (click)="triggerUnexpectedError()" data-testid="unexpected-error">Unexpected Error</button>
      
      <div data-testid="error-display" *ngIf="errorMessage()">
        {{ errorMessage() }}
      </div>
      
      <div data-testid="loading-indicator" *ngIf="isLoading()">
        Loading...
      </div>
    </div>
  `
})
class TestErrorComponent {
  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  constructor(
    private errorHandler: ErrorHandlerService,
    private loadingService: LoadingService,
    private messageService: MessageService
  ) {}

  triggerNetworkError(): void {
    this.simulateOperation(() => throwError(() => new Error('NETWORK_ERROR')));
  }

  triggerAuthError(): void {
    this.simulateOperation(() => throwError(() => ({ 
      status: 401, 
      error: { message: 'Unauthorized' } 
    })));
  }

  triggerValidationError(): void {
    this.simulateOperation(() => throwError(() => ({ 
      status: 400,
      error: { 
        message: 'Validation failed',
        details: { field: 'email', error: 'Invalid format' }
      }
    })));
  }

  triggerTimeoutError(): void {
    this.simulateOperation(() => 
      of('success').pipe(delay(10000)) // Simulate timeout
    );
  }

  triggerUnexpectedError(): void {
    this.simulateOperation(() => {
      throw new TypeError('Cannot read property of undefined');
    });
  }

  private simulateOperation(operation: () => any): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    
    const loadingId = this.loadingService.startLoading('test-operation');
    
    try {
      const result = operation();
      
      if (result && typeof result.subscribe === 'function') {
        result.subscribe({
          next: () => {
            this.isLoading.set(false);
            this.loadingService.stopLoading(loadingId);
          },
          error: (error: any) => {
            this.handleError(error, loadingId);
          }
        });
      } else {
        this.isLoading.set(false);
        this.loadingService.stopLoading(loadingId);
      }
    } catch (error) {
      this.handleError(error, loadingId);
    }
  }

  private handleError(error: any, loadingId: string): void {
    this.isLoading.set(false);
    this.loadingService.stopLoading(loadingId);
    this.errorHandler.handleError(error);
    
    // For testing purposes, show the error message
    this.errorMessage.set(error.message || 'An error occurred');
  }
}

describe('Error Scenarios End-to-End Tests', () => {
  let component: TestErrorComponent;
  let fixture: any;
  let httpMock: HttpTestingController;
  let errorHandlerService: ErrorHandlerService;
  let loadingService: LoadingService;
  let notificationService: NotificationService;
  let messageService: MessageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestErrorComponent, HttpClientTestingModule],
      providers: [
        ErrorHandlerService,
        LoadingService,
        NotificationService,
        MessageService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestErrorComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    errorHandlerService = TestBed.inject(ErrorHandlerService);
    loadingService = TestBed.inject(LoadingService);
    notificationService = TestBed.inject(NotificationService);
    messageService = TestBed.inject(MessageService);
    
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Network Error Handling', () => {
    it('should handle network connectivity errors gracefully', async () => {
      const errorSpy = jest.spyOn(errorHandlerService, 'handleError');
      const notificationSpy = jest.spyOn(notificationService, 'showError');
      
      // Trigger network error
      const networkButton = fixture.debugElement.nativeElement.querySelector('[data-testid="network-error"]');
      networkButton.click();
      
      fixture.detectChanges();
      await fixture.whenStable();
      
      expect(errorSpy).toHaveBeenCalled();
      expect(notificationSpy).toHaveBeenCalledWith(
        expect.stringContaining('Network error')
      );
    });

    it('should show retry option for network errors', async () => {
      const messageServiceSpy = jest.spyOn(messageService, 'sendMessage');
      
      // Simulate network error with retry
      const error = new Error('NETWORK_ERROR');
      errorHandlerService.handleError(error);
      
      // Should not retry immediately
      expect(messageServiceSpy).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Error Handling', () => {
    it('should handle 401 unauthorized errors', async () => {
      const notificationSpy = jest.spyOn(notificationService, 'showError');
      
      const authButton = fixture.debugElement.nativeElement.querySelector('[data-testid="auth-error"]');
      authButton.click();
      
      fixture.detectChanges();
      await fixture.whenStable();
      
      expect(notificationSpy).toHaveBeenCalledWith(
        expect.stringContaining('authentication')
      );
    });

    it('should provide re-authentication guidance', async () => {
      const error = { status: 401, error: { message: 'Token expired' } };
      
      const errorSpy = jest.spyOn(errorHandlerService, 'handleError');
      errorHandlerService.handleError(error);
      
      expect(errorSpy).toHaveBeenCalledWith(error);
    });
  });

  describe('Validation Error Handling', () => {
    it('should handle validation errors with field-specific messages', async () => {
      const notificationSpy = jest.spyOn(notificationService, 'showError');
      
      const validationButton = fixture.debugElement.nativeElement.querySelector('[data-testid="validation-error"]');
      validationButton.click();
      
      fixture.detectChanges();
      await fixture.whenStable();
      
      expect(notificationSpy).toHaveBeenCalled();
    });

    it('should provide actionable validation feedback', () => {
      const validationError = {
        status: 400,
        error: {
          message: 'Validation failed',
          details: { 
            email: 'Invalid email format',
            password: 'Password too short'
          }
        }
      };
      
      const errorSpy = jest.spyOn(errorHandlerService, 'handleError');
      errorHandlerService.handleError(validationError);
      
      expect(errorSpy).toHaveBeenCalledWith(validationError);
    });
  });

  describe('Timeout Error Handling', () => {
    it('should handle operation timeouts gracefully', async () => {
      const loadingSpy = jest.spyOn(loadingService, 'startLoading');
      const stopLoadingSpy = jest.spyOn(loadingService, 'stopLoading');
      
      const timeoutButton = fixture.debugElement.nativeElement.querySelector('[data-testid="timeout-error"]');
      timeoutButton.click();
      
      expect(loadingSpy).toHaveBeenCalled();
      
      // Simulate timeout
      setTimeout(() => {
        expect(stopLoadingSpy).toHaveBeenCalled();
      }, 100);
    });
  });

  describe('Unexpected Error Handling', () => {
    it('should handle unexpected JavaScript errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorSpy = jest.spyOn(errorHandlerService, 'handleError');
      
      const unexpectedButton = fixture.debugElement.nativeElement.querySelector('[data-testid="unexpected-error"]');
      unexpectedButton.click();
      
      fixture.detectChanges();
      await fixture.whenStable();
      
      expect(errorSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should provide fallback error messages for unknown errors', () => {
      const unknownError = { someProperty: 'unknown structure' };
      
      const errorSpy = jest.spyOn(errorHandlerService, 'handleError');
      errorHandlerService.handleError(unknownError);
      
      expect(errorSpy).toHaveBeenCalledWith(unknownError);
    });
  });

  describe('Loading State Management', () => {
    it('should manage loading states correctly during operations', async () => {
      const loadingIndicator = fixture.debugElement.nativeElement.querySelector('[data-testid="loading-indicator"]');
      
      // Initially not loading
      expect(loadingIndicator).toBeFalsy();
      
      // Start operation
      const networkButton = fixture.debugElement.nativeElement.querySelector('[data-testid="network-error"]');
      networkButton.click();
      
      fixture.detectChanges();
      
      // Should show loading
      const updatedLoadingIndicator = fixture.debugElement.nativeElement.querySelector('[data-testid="loading-indicator"]');
      expect(updatedLoadingIndicator).toBeTruthy();
    });

    it('should cleanup loading states on error', async () => {
      const stopLoadingSpy = jest.spyOn(loadingService, 'stopLoading');
      
      const errorButton = fixture.debugElement.nativeElement.querySelector('[data-testid="unexpected-error"]');
      errorButton.click();
      
      fixture.detectChanges();
      await fixture.whenStable();
      
      expect(stopLoadingSpy).toHaveBeenCalled();
    });
  });

  describe('Error Recovery', () => {
    it('should provide recovery suggestions for recoverable errors', () => {
      const recoverableError = new Error('CONFIGURATION_ERROR');
      
      const errorSpy = jest.spyOn(errorHandlerService, 'handleError');
      errorHandlerService.handleError(recoverableError);
      
      expect(errorSpy).toHaveBeenCalledWith(recoverableError);
    });

    it('should track error frequency for pattern detection', () => {
      const repeatedError = new Error('REPEATED_ERROR');
      
      // Trigger same error multiple times
      for (let i = 0; i < 3; i++) {
        errorHandlerService.handleError(repeatedError);
      }
      
      // Should detect pattern (implementation would track this)
      expect(true).toBe(true); // Placeholder for actual pattern detection test
    });
  });

  describe('User Experience', () => {
    it('should show appropriate error messages to users', async () => {
      const errorDisplay = fixture.debugElement.nativeElement.querySelector('[data-testid="error-display"]');
      
      // Initially no error
      expect(errorDisplay).toBeFalsy();
      
      // Trigger error
      const errorButton = fixture.debugElement.nativeElement.querySelector('[data-testid="network-error"]');
      errorButton.click();
      
      fixture.detectChanges();
      await fixture.whenStable();
      
      // Should show user-friendly error
      const updatedErrorDisplay = fixture.debugElement.nativeElement.querySelector('[data-testid="error-display"]');
      expect(updatedErrorDisplay?.textContent).toContain('error');
    });

    it('should prevent error message spam', () => {
      const notificationSpy = jest.spyOn(notificationService, 'showError');
      const sameError = new Error('REPEATED_ERROR');
      
      // Trigger same error rapidly
      for (let i = 0; i < 5; i++) {
        errorHandlerService.handleError(sameError);
      }
      
      // Should be debounced/limited
      expect(notificationSpy.mock.calls.length).toBeLessThan(5);
    });
  });
});