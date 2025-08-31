import { patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { 
  pipe, 
  switchMap, 
  exhaustMap,
  tap, 
  finalize, 
  from, 
  lastValueFrom,
  Observable,
  catchError,
  EMPTY,
  map
} from 'rxjs';

/**
 * Custom tapResponse-like function using standard rxjs operators
 * Provides success/error handling similar to @ngrx/operators tapResponse
 */
function tapResponse<T>(config: { 
  next: (value: T) => void; 
  error: (error: any) => void; 
}) {
  return pipe(
    tap({
      next: config.next,
      error: config.error
    }),
    catchError((error: any) => {
      config.error(error);
      return EMPTY;
    })
  );
}
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface AsyncMethodOptions {
  strategy?: 'switch' | 'exhaust';
  loadingKey?: string;
  errorKey?: string;
}

export interface RxMethodResult<T> {
  (input: T): void;
  (input: Observable<T>): void;
}

/**
 * Creates a standard loading/error state management pattern for rxMethod
 * This utility encapsulates the common pattern of setting loading state,
 * executing an async operation, and handling success/error scenarios.
 * 
 * @param store - The signal store instance
 * @param asyncOperation - Function that returns a Promise or Observable
 * @param options - Configuration options for the pattern
 * @returns Configured rxMethod with standard state management
 * 
 * @example
 * ```typescript
 * loadData: createLoadingStatePattern(
 *   store,
 *   (params: LoadParams) => messageService.loadData(params),
 *   { strategy: 'switch' }
 * )
 * ```
 */
export function createLoadingStatePattern<TInput, TOutput>(
  store: any,
  asyncOperation: (input: TInput) => Promise<TOutput> | Observable<TOutput>,
  options: AsyncMethodOptions = {}
): any {
  const {
    strategy = 'switch',
    loadingKey = 'isLoading',
    errorKey = 'error'
  } = options;

  const mapOperator = strategy === 'switch' ? switchMap : exhaustMap;

  return rxMethod<TInput>(pipe(
    tap(() => patchState(store, { 
      [loadingKey]: true, 
      [errorKey]: undefined 
    } as any)),
    mapOperator((input: TInput) => {
      const result = asyncOperation(input);
      const observable = result instanceof Promise ? from(result) : result;
      
      return observable.pipe(
        tapResponse({
          next: (data: TOutput) => {
            // The next callback will be handled by the specific implementation
            return data;
          },
          error: (error: any) => {
            const errorMessage = error instanceof Error ? error.message : 'Operation failed';
            patchState(store, { [errorKey]: errorMessage } as any);
          }
        }),
        catchError(() => EMPTY)
      );
    }),
    finalize(() => patchState(store, { [loadingKey]: false } as any))
  ));
}

/**
 * Creates a Promise-to-Observable wrapper using from()
 * This utility converts Promise-based operations to Observable streams
 * for use in rxMethod implementations.
 * 
 * @param promiseFactory - Function that returns a Promise
 * @returns Function that returns an Observable
 * 
 * @example
 * ```typescript
 * const observableOperation = createPromiseWrapper(
 *   (params: LoadParams) => messageService.loadData(params)
 * );
 * ```
 */
export function createPromiseWrapper<TInput, TOutput>(
  promiseFactory: (input: TInput) => Promise<TOutput>
): (input: TInput) => Observable<TOutput> {
  return (input: TInput) => from(promiseFactory(input));
}

/**
 * Creates a compatibility wrapper using lastValueFrom()
 * This utility provides backward compatibility for existing callers
 * that expect Promise return values from store methods.
 * 
 * @param rxMethodFn - The rxMethod function that returns an Observable
 * @returns Async function that returns a Promise
 * 
 * @example
 * ```typescript
 * // In store methods
 * loadData: rxMethod<LoadParams>(...),
 * 
 * // Compatibility wrapper
 * async loadDataAsync(params: LoadParams): Promise<Data> {
 *   return createCompatibilityWrapper(this.loadData)(params);
 * }
 * ```
 */
export function createCompatibilityWrapper<TInput, TOutput>(
  rxMethodFn: (input: TInput) => Observable<TOutput>
): (input: TInput) => Promise<TOutput> {
  return async (input: TInput) => {
    try {
      return await lastValueFrom(rxMethodFn(input));
    } catch (error) {
      console.error('rxMethod compatibility wrapper error:', error);
      throw error;
    }
  };
}

/**
 * Creates an rxMethod with optimistic updates pattern
 * This utility handles operations that update state optimistically
 * and rollback on error.
 * 
 * @param store - The signal store instance
 * @param optimisticUpdate - Function to apply optimistic state changes
 * @param asyncOperation - Function that performs the actual operation
 * @param rollbackUpdate - Function to rollback optimistic changes on error
 * @returns Configured rxMethod with optimistic update pattern
 * 
 * @example
 * ```typescript
 * updateComment: createOptimisticUpdatePattern(
 *   store,
 *   (params) => patchState(store, { comments: optimisticComments }),
 *   (params) => messageService.updateComment(params.id, params.content),
 *   () => patchState(store, { comments: originalComments })
 * )
 * ```
 */
export function createOptimisticUpdatePattern<TInput>(
  store: any,
  optimisticUpdate: (input: TInput) => void,
  asyncOperation: (input: TInput) => Promise<any> | Observable<any>,
  rollbackUpdate: (input: TInput) => void
): any {
  return rxMethod<TInput>(pipe(
    tap((input: TInput) => {
      // Apply optimistic update
      optimisticUpdate(input);
    }),
    switchMap((input: TInput) => {
      const result = asyncOperation(input);
      const observable = result instanceof Promise ? from(result) : result;
      
      return observable.pipe(
        tapResponse({
          next: () => {
            // Success - optimistic update stands
          },
          error: (error: any) => {
            // Error - rollback optimistic update
            rollbackUpdate(input);
            const errorMessage = error instanceof Error ? error.message : 'Update failed';
            patchState(store, { error: errorMessage });
          }
        }),
        catchError(() => EMPTY)
      );
    })
  ));
}

/**
 * Creates an rxMethod for bulk operations
 * This utility handles operations that work on multiple items
 * with proper progress tracking and error handling.
 * 
 * @param store - The signal store instance
 * @param bulkOperation - Function that performs operations on multiple items
 * @param progressCallback - Optional callback for progress updates
 * @returns Configured rxMethod for bulk operations
 * 
 * @example
 * ```typescript
 * bulkApproveComments: createBulkOperationPattern(
 *   store,
 *   (commentIds: string[]) => Promise.all(
 *     commentIds.map(id => messageService.approveComment(id))
 *   ),
 *   (completed, total) => console.log(`Progress: ${completed}/${total}`)
 * )
 * ```
 */
export function createBulkOperationPattern<TInput extends any[]>(
  store: any,
  bulkOperation: (items: TInput) => Promise<any> | Observable<any>,
  progressCallback?: (completed: number, total: number) => void
): any {
  return rxMethod<TInput>(pipe(
    tap(() => patchState(store, { isLoading: true, error: undefined })),
    switchMap((items: TInput) => {
      const result = bulkOperation(items);
      const observable = result instanceof Promise ? from(result) : result;
      
      return observable.pipe(
        tap(() => {
          if (progressCallback) {
            progressCallback(items.length, items.length);
          }
        }),
        tapResponse({
          next: () => {
            // Bulk operation completed successfully
          },
          error: (error: any) => {
            const errorMessage = error instanceof Error ? error.message : 'Bulk operation failed';
            patchState(store, { error: errorMessage });
          }
        }),
        catchError(() => EMPTY)
      );
    }),
    finalize(() => patchState(store, { isLoading: false }))
  ));
}

/**
 * Creates TypeScript types for consistent rxMethod signatures
 * These types help ensure consistent patterns across store implementations.
 */
export type StandardRxMethodOptions = {
  loadingStateKey?: string;
  errorStateKey?: string;
  strategy?: 'switch' | 'exhaust';
};

export type RxMethodPattern<TInput, TOutput> = {
  execute: (input: TInput) => Observable<TOutput>;
  executeAsync?: (input: TInput) => Promise<TOutput>;
};

/**
 * Validation utility for rxMethod inputs
 * Helps ensure consistent input validation across methods.
 * 
 * @param input - The input to validate
 * @param validators - Array of validation functions
 * @throws Error if validation fails
 * 
 * @example
 * ```typescript
 * validateRxMethodInput(params, [
 *   (p) => p.id ? null : 'ID is required',
 *   (p) => p.id > 0 ? null : 'ID must be positive'
 * ]);
 * ```
 */
export function validateRxMethodInput<T>(
  input: T,
  validators: Array<(input: T) => string | null>
): void {
  for (const validator of validators) {
    const error = validator(input);
    if (error) {
      throw new Error(`Validation failed: ${error}`);
    }
  }
}

/**
 * Common validation functions for reuse
 */
export const validators = {
  required: <T>(value: T, fieldName: string) => 
    value ? null : `${fieldName} is required`,
    
  positiveNumber: (value: number, fieldName: string) =>
    value > 0 ? null : `${fieldName} must be positive`,
    
  nonEmptyString: (value: string, fieldName: string) =>
    value && value.trim() ? null : `${fieldName} cannot be empty`,
    
  validId: (id: string | number, fieldName: string = 'ID') =>
    (typeof id === 'string' && id.trim()) || (typeof id === 'number' && id > 0)
      ? null : `${fieldName} must be a valid identifier`
};