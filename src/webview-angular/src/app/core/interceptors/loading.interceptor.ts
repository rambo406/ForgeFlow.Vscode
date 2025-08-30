import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, finalize, tap } from 'rxjs';
import { LoadingService } from '../services/loading.service';

/**
 * HTTP interceptor that automatically manages loading states for API requests
 */
@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private loadingService = inject(LoadingService);
  private activeRequests = new Set<string>();

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip loading for background requests or specific headers
    if (req.headers.has('X-Skip-Loading') || req.method === 'GET' && req.headers.has('X-Background')) {
      return next.handle(req);
    }

    // Create a unique identifier for this request
    const requestId = this.generateRequestId(req);
    const operationName = this.getOperationName(req);
    
    // Start loading
    const loadingId = this.loadingService.startLoading(operationName, {
      description: `${req.method} ${this.getSimplifiedUrl(req.url)}`,
      category: 'api',
      isIndeterminate: true,
      estimatedDuration: this.getEstimatedDuration(req),
      cancellable: false
    });

    this.activeRequests.add(requestId);

    return next.handle(req).pipe(
      tap({
        next: (event) => {
          if (event instanceof HttpResponse) {
            // Request completed successfully
            this.loadingService.updateOperationStatus(loadingId, 'completing');
          }
        },
        error: (error: HttpErrorResponse) => {
          // Request failed
          const errorMessage = this.getErrorMessage(error);
          this.loadingService.failLoading(loadingId, errorMessage);
        }
      }),
      finalize(() => {
        // Clean up
        this.activeRequests.delete(requestId);
        
        // If request was successful, complete the loading
        // (error case is handled in the error callback above)
        if (this.loadingService.getOperation(loadingId)?.status !== 'failed') {
          this.loadingService.completeLoading(loadingId);
        }
      })
    );
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(req: HttpRequest<any>): string {
    return `${req.method}_${req.url}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get a user-friendly operation name
   */
  private getOperationName(req: HttpRequest<any>): string {
    const url = req.url.toLowerCase();
    const method = req.method.toUpperCase();

    // Azure DevOps specific operations
    if (url.includes('/pullrequests')) {
      switch (method) {
        case 'GET': return 'Loading pull requests';
        case 'POST': return 'Creating pull request';
        case 'PUT': 
        case 'PATCH': return 'Updating pull request';
        case 'DELETE': return 'Deleting pull request';
      }
    }

    if (url.includes('/workitems')) {
      switch (method) {
        case 'GET': return 'Loading work items';
        case 'POST': return 'Creating work item';
        case 'PUT':
        case 'PATCH': return 'Updating work item';
        case 'DELETE': return 'Deleting work item';
      }
    }

    if (url.includes('/comments')) {
      switch (method) {
        case 'GET': return 'Loading comments';
        case 'POST': return 'Adding comment';
        case 'PUT':
        case 'PATCH': return 'Updating comment';
        case 'DELETE': return 'Deleting comment';
      }
    }

    if (url.includes('/repositories')) {
      switch (method) {
        case 'GET': return 'Loading repositories';
        case 'POST': return 'Creating repository';
      }
    }

    if (url.includes('/projects')) {
      switch (method) {
        case 'GET': return 'Loading projects';
        case 'POST': return 'Creating project';
      }
    }

    // Generic fallbacks
    switch (method) {
      case 'GET': return 'Loading data';
      case 'POST': return 'Creating resource';
      case 'PUT':
      case 'PATCH': return 'Updating resource';
      case 'DELETE': return 'Deleting resource';
      default: return 'Processing request';
    }
  }

  /**
   * Get simplified URL for display
   */
  private getSimplifiedUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      
      // Show last 2-3 meaningful segments
      if (pathSegments.length > 3) {
        return `.../${pathSegments.slice(-2).join('/')}`;
      }
      
      return urlObj.pathname;
    } catch {
      // If URL parsing fails, just return the last part
      const parts = url.split('/');
      return parts.length > 1 ? `.../${parts.slice(-1)[0]}` : url;
    }
  }

  /**
   * Get estimated duration based on request type
   */
  private getEstimatedDuration(req: HttpRequest<any>): number {
    const url = req.url.toLowerCase();
    const method = req.method.toUpperCase();

    // Different operations have different expected durations
    if (method === 'GET') {
      if (url.includes('/pullrequests') && !url.includes('?')) {
        return 3000; // List operations might take longer
      }
      return 1500; // Regular GET requests
    }

    if (method === 'POST') {
      return 2500; // Create operations
    }

    if (method === 'PUT' || method === 'PATCH') {
      return 2000; // Update operations
    }

    if (method === 'DELETE') {
      return 1000; // Delete operations are usually quick
    }

    return 2000; // Default
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Network connection failed';
    }

    if (error.status >= 400 && error.status < 500) {
      return `Request error (${error.status})`;
    }

    if (error.status >= 500) {
      return `Server error (${error.status})`;
    }

    return `Request failed (${error.status})`;
  }

  /**
   * Get the number of active requests
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Check if there are any active requests
   */
  hasActiveRequests(): boolean {
    return this.activeRequests.size > 0;
  }
}