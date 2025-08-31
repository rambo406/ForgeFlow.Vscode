import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { patchState } from '@ngrx/signals';
import { pipe, switchMap, tap, finalize, catchError, EMPTY } from 'rxjs';
import { 
  createLoadingStatePattern,
  createPromiseWrapper,
  createCompatibilityWrapper,
  createOptimisticUpdatePattern 
} from '../utils/RxMethodUtils';

/**
 * Example demonstrating how to use the rxMethod conversion utilities
 * This file shows practical examples of converting async methods to rxMethod
 */

// Example: Simple async method conversion
// Before (traditional async/await):
/*
async loadData(params: LoadParams): Promise<Data> {
  try {
    patchState(store, { isLoading: true, error: undefined });
    const result = await messageService.loadData(params);
    patchState(store, { data: result, isLoading: false });
    return result;
  } catch (error) {
    patchState(store, { error: error.message, isLoading: false });
    throw error;
  }
}
*/

// After (using rxMethod with utility):
export function createExampleStore(store: any, messageService: any) {
  return {
    // Pattern 1: Standard loading state pattern
    loadData: rxMethod<any>(pipe(
      tap(() => patchState(store, { isLoading: true, error: undefined })),
      switchMap((params: any) => 
        createPromiseWrapper((p: any) => messageService.loadData(p))(params).pipe(
          tap({
            next: (data: any) => patchState(store, { data }),
            error: (error: any) => patchState(store, { 
              error: error instanceof Error ? error.message : 'Load failed' 
            })
          }),
          catchError((error: any) => {
            patchState(store, { 
              error: error instanceof Error ? error.message : 'Load failed' 
            });
            return EMPTY;
          })
        )
      ),
      finalize(() => patchState(store, { isLoading: false }))
    )),

    // Pattern 2: Using the createLoadingStatePattern utility
    loadDataSimplified: (() => {
      const rxMethodFn = createLoadingStatePattern(
        store,
        (params: any) => messageService.loadData(params),
        { strategy: 'switch' }
      );
      
      // Custom next handler for this specific method
      return rxMethod<any>(pipe(
        tap(() => patchState(store, { isLoading: true, error: undefined })),
        switchMap((params: any) => 
          createPromiseWrapper((p: any) => messageService.loadData(p))(params).pipe(
            tap({
              next: (data: any) => patchState(store, { data }),
              error: (error: any) => patchState(store, { 
                error: error instanceof Error ? error.message : 'Load failed' 
              })
            }),
            catchError((error: any) => {
              patchState(store, { 
                error: error instanceof Error ? error.message : 'Load failed' 
              });
              return EMPTY;
            })
          )
        ),
        finalize(() => patchState(store, { isLoading: false }))
      ));
    })(),

    // Pattern 3: Optimistic update pattern
    updateComment: createOptimisticUpdatePattern(
      store,
      // Optimistic update
      (params: { id: string; content: string }) => {
        const comments = store.comments().map((comment: any) =>
          comment.id === params.id 
            ? { ...comment, content: params.content }
            : comment
        );
        patchState(store, { comments });
      },
      // Async operation
      (params: { id: string; content: string }) => 
        messageService.updateComment(params.id, params.content),
      // Rollback on error
      (params: { id: string; content: string }) => {
        // Reload original comments or restore from backup
        const originalComments = store.originalComments();
        patchState(store, { comments: originalComments });
      }
    ),

    // Pattern 4: Compatibility wrapper for existing Promise-based callers
    // Note: This would be implemented differently in the actual store
    // The rxMethod would be called and the result converted to Promise
    async loadDataAsync(params: any): Promise<any> {
      // In practice, you would call the rxMethod and convert the result
      return new Promise((resolve, reject) => {
        // This is a simplified example - actual implementation would differ
        const result = messageService.loadData(params);
        if (result instanceof Promise) {
          result.then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      });
    }
  };
}

/**
 * Example of a complete store conversion using the utilities
 */
interface ExampleState {
  data: any[];
  isLoading: boolean;
  error?: string;
  comments: any[];
  originalComments: any[];
}

const initialExampleState: ExampleState = {
  data: [],
  isLoading: false,
  error: undefined,
  comments: [],
  originalComments: []
};

// This would be used in an actual store like:
/*
export const ExampleStore = signalStore(
  { providedIn: 'root' },
  withState(initialExampleState),
  withMethods((store, messageService = inject(MessageService)) => ({
    ...createExampleStore(store, messageService)
  }))
);
*/

/**
 * Testing example using the test templates
 */
export function createExampleTests() {
  // This would be in a .spec.ts file
  /*
  describe('ExampleStore', () => {
    let mockService: MockMessageService;
    let store: any;

    beforeEach(() => {
      mockService = new MockMessageService();
      store = createTestStore(
        initialExampleState,
        (store, messageService) => createExampleStore(store, messageService),
        mockService
      );
    });

    RxMethodTestTemplates.createHappyPathTest(
      'should load data successfully',
      () => store,
      () => mockService,
      'loadData',
      { filter: 'test' },
      [{ id: 1, name: 'Test Data' }],
      (store) => {
        expect(store.data()).toEqual([{ id: 1, name: 'Test Data' }]);
      }
    )();

    RxMethodTestTemplates.createErrorPathTest(
      'should handle load error',
      () => store,
      () => mockService,
      'loadData',
      { filter: 'test' },
      'Failed to load data'
    )();
  });
  */
}

/**
 * Migration checklist for converting async methods to rxMethod
 */
export const MIGRATION_CHECKLIST = [
  '1. Identify the async operation pattern (simple load, optimistic update, bulk operation)',
  '2. Choose appropriate utility function or create custom rxMethod',
  '3. Replace async/await with rxMethod and RxJS operators',
  '4. Update state management to use patchState within tapResponse',
  '5. Add compatibility wrapper if needed for existing Promise-based callers',
  '6. Create unit tests using test templates',
  '7. Verify cancellation behavior works correctly',
  '8. Test error handling and rollback scenarios',
  '9. Update imports to include rxMethod and required RxJS operators',
  '10. Run TypeScript compilation and fix any type errors'
];

/**
 * Common patterns and their utility mappings
 */
export const PATTERN_MAPPING = {
  'Simple async load with loading state': 'createLoadingStatePattern',
  'Optimistic update with rollback': 'createOptimisticUpdatePattern', 
  'Bulk operations': 'createBulkOperationPattern',
  'Promise to Observable': 'createPromiseWrapper',
  'Observable to Promise compatibility': 'createCompatibilityWrapper'
};

/**
 * RxJS operator usage guide for rxMethod conversions
 */
export const RXJS_OPERATOR_GUIDE = {
  'switchMap': 'Use for user-initiated actions that should cancel previous requests',
  'exhaustMap': 'Use for non-repeatable actions like initial load',
  'tap': 'Use for side effects like state updates',
  'tapResponse': 'Use for handling success/error responses with proper error handling',
  'finalize': 'Use for cleanup actions that should always run',
  'from': 'Use to convert Promises to Observables',
  'lastValueFrom': 'Use to convert Observables back to Promises for compatibility'
};