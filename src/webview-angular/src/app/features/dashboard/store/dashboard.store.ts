import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, finalize, from, lastValueFrom, EMPTY } from 'rxjs';
import { MessageService } from '../../../core/services/message.service';
import { 
  DashboardState, 
  PullRequest, 
  ConfigurationData, 
  AnalysisProgress,
  DashboardFilters
} from '../../../core/models/interfaces';
import { PullRequestStatus } from '../../../core/models/enums';

/**
 * Dashboard view enum - matches legacy DashboardView constants
 */
export enum DashboardView {
  CONFIGURATION = 'configuration',
  PULL_REQUEST_LIST = 'pullRequestList', 
  PULL_REQUEST_DETAIL = 'pullRequestDetail'
}

/**
 * Initial dashboard state - matches legacy global state variables
 */
const initialState: DashboardState = {
  activeView: DashboardView.PULL_REQUEST_LIST,
  selectedPR: undefined,
  pullRequests: [],
  configuration: {
    organizationUrl: '',
    personalAccessToken: '',
    defaultProject: '',
    selectedModel: 'gpt-4' as any,
    batchSize: 10,
    enableTelemetry: false,
    theme: 'auto',
    compactMode: false,
    showLineNumbers: true,
    notificationLevel: 'all',
    soundEnabled: false
  } as ConfigurationData,
  isLoading: false,
  error: undefined,
  currentAnalysis: undefined,
  analysisResults: undefined,
  filters: {
    author: undefined,
    repository: undefined,
    status: undefined,
    dateRange: undefined,
    labels: []
  },
  searchTerm: '',
  sortBy: 'createdDate',
  sortDirection: 'desc',
  // Additional state for enhanced functionality
  loadingMessage: ''
};

/**
 * Dashboard SignalStore for managing dashboard state
 * Replaces legacy global state variables and provides reactive state management
 * Matches functionality from dashboard.js including:
 * - currentView, currentPR, currentAnalysis, analysisResults state
 * - Pull request loading and filtering
 * - Configuration management
 * - AI analysis workflow
 */
export const DashboardStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => {
    const filteredPullRequests = computed(() => {
      const pullRequests = store.pullRequests();
      const filters = store.filters();
      const searchTerm = store.searchTerm?.() || '';
      
      let filtered = [...pullRequests];
      
      // Apply author filter - matches legacy filterPRsByAuthor functionality
      if (filters.author) {
        filtered = filtered.filter(pr => 
          pr.author.toLowerCase().includes(filters.author!.toLowerCase())
        );
      }
      
      // Apply repository filter - matches legacy filterPRsByRepository
      if (filters.repository) {
        filtered = filtered.filter(pr => 
          pr.repository.toLowerCase().includes(filters.repository!.toLowerCase())
        );
      }
      
      // Apply status filter - matches legacy filterPRsByStatus
      if (filters.status) {
        filtered = filtered.filter(pr => pr.status === filters.status);
      }
      
      // Apply date range filter - matches legacy filterPRsByDateRange
      if (filters.dateRange) {
        filtered = filtered.filter(pr => {
          const prDate = new Date(pr.createdDate);
          const fromDate = new Date(filters.dateRange!.from);
          const toDate = new Date(filters.dateRange!.to);
          return prDate >= fromDate && prDate <= toDate;
        });
      }
      
      // Apply search term filter - matches legacy performSearch functionality
      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(pr => 
          pr.title.toLowerCase().includes(term) ||
          pr.author.toLowerCase().includes(term) ||
          pr.repository.toLowerCase().includes(term) ||
          (pr.description && pr.description.toLowerCase().includes(term))
        );
      }
      
      return filtered;
    });

    const sortedPullRequests = computed(() => {
      const filtered = filteredPullRequests();
      const sortBy = store.sortBy?.() || 'createdDate';
      const sortDirection = store.sortDirection?.() || 'desc';
      
      if (!sortBy) {return filtered;}
      
      // Matches legacy sorting functionality from dashboard.js
      return [...filtered].sort((a, b) => {
        let aValue: any = a[sortBy as keyof PullRequest];
        let bValue: any = b[sortBy as keyof PullRequest];
        
        // Handle date sorting
        if (sortBy === 'createdDate' || sortBy === 'lastMergeCommitDate') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }
        
        // Handle string sorting
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        let comparison = 0;
        if (aValue < bValue) {comparison = -1;}
        if (aValue > bValue) {comparison = 1;}
        
        return sortDirection === 'desc' ? -comparison : comparison;
      });
    });

    return {
      filteredPullRequests,
      sortedPullRequests,

      /**
       * Computed signal to check if configuration is valid
       * Matches legacy hasValidConfiguration check
       */
      hasValidConfiguration: computed(() => {
        const config = store.configuration();
        return !!(
          config.organizationUrl && 
          config.personalAccessToken && 
          config.selectedModel
        );
      }),

      /**
       * Computed signal for configuration validation errors
       * Matches legacy validation functionality
       */
      configurationErrors: computed(() => {
        const config = store.configuration();
        const errors: string[] = [];
        
        if (!config.organizationUrl) {
          errors.push('Organization URL is required');
        }
        
        if (!config.personalAccessToken) {
          errors.push('Personal Access Token is required');
        }
        
        if (!config.selectedModel) {
          errors.push('Language model selection is required');
        }
        
        if (config.batchSize < 1 || config.batchSize > 100) {
          errors.push('Batch size must be between 1 and 100');
        }
        
        return errors;
      }),

      /**
       * Computed signal for analysis progress percentage
       * Matches legacy analysisProgress calculations
       */
      analysisProgressPercentage: computed(() => {
        const progress = store.currentAnalysis?.();
        return progress ? Math.round(progress.percentage) : 0;
      }),

      /**
       * Computed signal to check if analysis is running
       * Matches legacy isAnalysisRunning checks
       */
      isAnalysisRunning: computed(() => {
        const progress = store.currentAnalysis?.();
        return !!progress && progress.percentage < 100;
      }),

      /**
       * Computed signal for dashboard statistics
       * Matches legacy dashboard stats calculations
       */
      dashboardStats: computed(() => {
        const pullRequests = store.pullRequests();
        const filtered = filteredPullRequests();
        
        return {
          totalPRs: pullRequests.length,
          filteredPRs: filtered.length,
          activePRs: pullRequests.filter(pr => pr.status === PullRequestStatus.ACTIVE).length,
          completedPRs: pullRequests.filter(pr => pr.status === PullRequestStatus.COMPLETED).length,
          draftPRs: pullRequests.filter(pr => pr.isDraft).length
        };
      }),
      
      /**
       * Computed signal for virtual scrolling needs
       * Matches legacy virtual scrolling logic
       */
      shouldUseVirtualScrolling: computed(() => {
        return store.pullRequests().length > 50; // Matches legacy threshold
      }),
      
      /**
       * Computed signal for loading message based on current operation
       * Matches legacy loading state messages
       */
      loadingMessage: computed(() => {
        if (!store.isLoading()) {return '';}
        
        const activeView = store.activeView();
        switch (activeView) {
          case DashboardView.CONFIGURATION:
            return 'Loading configuration...';
          case DashboardView.PULL_REQUEST_LIST:
            return 'Loading pull requests22...';
          case DashboardView.PULL_REQUEST_DETAIL:
            return 'Loading pull request details...';
          default:
            return 'Loading...';
        }
      })
    };
  }),
  withMethods((store, messageService = inject(MessageService)) => ({
    /**
     * Load pull requests from the extension host
     * Replaces legacy loadPullRequests function
     */
    // Observable-based implementation for loadPullRequests (compat approach)
    loadPullRequestsRx(filters?: Partial<DashboardFilters>) {
      // return an Observable that performs the load and updates state
      return from((async () => {
        patchState(store, { isLoading: true, error: undefined });
        try {
          console.log('Loading pull requests...');
          const response = await messageService.loadPullRequests();
          patchState(store, { pullRequests: response.pullRequests || [] });
          console.log('Pull requests loaded:', response.pullRequests?.length || 0);
          if (filters) {
            patchState(store, { filters: { ...store.filters(), ...filters } });
          }
          return response;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load pull requests';
          console.error('Pull requests load error:', err);
          patchState(store, { error: errorMessage });
          throw err;
        } finally {
          patchState(store, { isLoading: false });
        }
      })());
    },

    // Compatibility wrapper for callers that expect a Promise
    async loadPullRequests(filters?: Partial<DashboardFilters>) {
      try {
        const res = await lastValueFrom(this.loadPullRequestsRx(filters));
        return res;
      } catch (err) {
        throw err;
      }
    },

    /**
     * Select a pull request and load its details
     * Replaces legacy selectPullRequest function
     */
    /**
     * Select a pull request by ID and load its details
     * 
     * Performance optimizations:
     * - Early validation to avoid unnecessary API calls
     * - Optimistic UI updates for better perceived performance  
     * - switchMap cancels previous requests automatically
     * - Consistent error handling with proper state cleanup
     * 
     * Original: async selectPullRequest(prId: number)
     * Replaces legacy selectPullRequest function
     */
    selectPullRequest: rxMethod<number>(pipe(
      tap((prId: number) => {
        // Early validation prevents unnecessary API calls
        const pullRequest = store.pullRequests().find(pr => pr.id === prId);
        if (!pullRequest) {
          patchState(store, { error: 'Pull request not found' });
          return;
        }

        console.log('Selecting pull request:', prId);
        // Optimistic UI update for immediate feedback
        patchState(store, { 
          selectedPR: pullRequest,
          activeView: DashboardView.PULL_REQUEST_DETAIL,
          isLoading: true,
          error: undefined
        });
      }),
      // switchMap automatically cancels previous requests
      switchMap((prId: number) => 
        from(messageService.selectPullRequest(prId)).pipe(
          tap({
            next: (response: any) => {
              patchState(store, { 
                selectedPR: response.pullRequest,
                isLoading: false
              });
              console.log('Pull request details loaded successfully');
            },
            error: (error: any) => {
              const errorMessage = error instanceof Error ? error.message : 'Failed to load pull request details';
              console.error('Pull request details load error:', error);
              patchState(store, { 
                isLoading: false, 
                error: errorMessage 
              });
            }
          }),
          catchError((error: any) => {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load pull request details';
            console.error('Pull request details load error:', error);
            patchState(store, { 
              isLoading: false, 
              error: errorMessage 
            });
            return EMPTY; // Complete stream gracefully
          })
        )
      )
    )),

    /**
     * Compatibility wrapper for selectPullRequest
     * TODO: Remove this wrapper once all callers are updated to use the rxMethod directly
     */
    async selectPullRequestAsync(prId: number): Promise<void> {
      const pullRequest = store.pullRequests().find(pr => pr.id === prId);
      if (!pullRequest) {
        patchState(store, { error: 'Pull request not found' });
        return;
      }

      console.log('Selecting pull request:', prId);
      patchState(store, { 
        selectedPR: pullRequest,
        activeView: DashboardView.PULL_REQUEST_DETAIL,
        isLoading: true,
        error: undefined
      });

      try {
        const response = await messageService.selectPullRequest(prId);
        patchState(store, { 
          selectedPR: response.pullRequest,
          isLoading: false
        });
        console.log('Pull request details loaded');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load pull request details';
        console.error('Pull request details load error:', error);
        patchState(store, { 
          isLoading: false, 
          error: errorMessage 
        });
      }
    },

    /**
     * Update configuration
    /**
     * Update configuration with optimistic updates and validation
     * 
     * Performance optimizations:
     * - Optimistic UI update for immediate feedback
     * - Efficient object merging with spread operator
     * - Proper state management with cleanup
     * - Validation could be added here for better UX
     * 
     * Original: async updateConfiguration(config: Partial<ConfigurationData>)
     * Replaces legacy saveConfiguration function
     */
    updateConfiguration: rxMethod<Partial<ConfigurationData>>(pipe(
      tap((config: Partial<ConfigurationData>) => {
        // Optimistic update with merged configuration
        const updatedConfig = { ...store.configuration(), ...config };
        console.log('Updating configuration...', Object.keys(config));
        patchState(store, { 
          configuration: updatedConfig,
          isLoading: true,
          error: undefined
        });
      }),
      switchMap((config: Partial<ConfigurationData>) => {
        // Recompute updated config for API call (ensures consistency)
        const updatedConfig = { ...store.configuration(), ...config };
        return from(messageService.saveConfiguration(updatedConfig)).pipe(
          tap({
            next: () => {
              patchState(store, { isLoading: false });
              console.log('Configuration saved successfully');
            },
            error: (error: any) => {
              // Revert optimistic update on failure
              const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration';
              console.error('Configuration save error:', error);
              patchState(store, { 
                isLoading: false, 
                error: errorMessage
                // Note: Consider reverting config here if save fails
              });
            }
          }),
          catchError((error: any) => {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration';
            console.error('Configuration save error:', error);
            patchState(store, { 
              isLoading: false, 
              error: errorMessage
            });
            return EMPTY; // Complete stream gracefully
          })
        );
      })
    )),

    /**
     * Compatibility wrapper for updateConfiguration
     * TODO: Remove this wrapper once all callers are updated to use the rxMethod directly
     */
    async updateConfigurationAsync(config: Partial<ConfigurationData>): Promise<void> {
      const updatedConfig = { ...store.configuration(), ...config };
      
      console.log('Updating configuration...');
      patchState(store, { 
        configuration: updatedConfig,
        isLoading: true,
        error: undefined
      });

      try {
        await messageService.saveConfiguration(updatedConfig);
        patchState(store, { isLoading: false });
        console.log('Configuration saved successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration';
        console.error('Configuration save error:', error);
        patchState(store, { 
          isLoading: false, 
          error: errorMessage 
        });
      }
    },

    /**
     * loadConfiguration converted to rxMethod
     * Original: async loadConfiguration()
     * Load configuration from extension host
     * Replaces legacy loadConfiguration function
     */
    loadConfiguration: rxMethod<void>(pipe(
      tap(() => {
        console.log('Loading configuration...');
        patchState(store, { isLoading: true, error: undefined });
      }),
      switchMap(() => 
        from(messageService.loadConfiguration()).pipe(
          tap({
            next: (response: any) => {
              patchState(store, { 
                configuration: response.config || store.configuration(),
                isLoading: false
              });
              console.log('Configuration loaded');
            },
            error: (error: any) => {
              const errorMessage = error instanceof Error ? error.message : 'Failed to load configuration';
              console.error('Configuration load error:', error);
              patchState(store, { 
                isLoading: false, 
                error: errorMessage 
              });
            }
          }),
          catchError((error: any) => {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load configuration';
            console.error('Configuration load error:', error);
            patchState(store, { 
              isLoading: false, 
              error: errorMessage 
            });
            return EMPTY;
          })
        )
      )
    )),

    /**
     * Compatibility wrapper for loadConfiguration
     * TODO: Remove this wrapper once all callers are updated to use the rxMethod directly
     */
    async loadConfigurationAsync(): Promise<void> {
      patchState(store, { isLoading: true, error: undefined });

      try {
        console.log('Loading configuration...');
        const response = await messageService.loadConfiguration();
        patchState(store, { 
          configuration: response.config || store.configuration(),
          isLoading: false
        });
        console.log('Configuration loaded');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load configuration';
        console.error('Configuration load error:', error);
        patchState(store, { 
          isLoading: false, 
          error: errorMessage 
        });
      }
    },

    /**
     * testConnection converted to rxMethod
     * Original: async testConnection()
     * Test connection with current configuration
     * Replaces legacy testConnection function
     */
    testConnection: rxMethod<void>(pipe(
      switchMap(() => {
        const config = store.configuration();
        console.log('Testing connection...');
        patchState(store, { isLoading: true, error: undefined });
        
        return from(messageService.testConnection(config)).pipe(
          tap({
            next: (response: any) => {
              patchState(store, { isLoading: false });
              
              if (response.success) {
                console.log('Connection test successful');
                messageService.showSuccess('Connection test successful');
              } else {
                console.warn('Connection test failed:', response.message);
                messageService.showError('Connection test failed', response.message);
              }
            },
            error: (error: any) => {
              const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
              console.error('Connection test error:', error);
              patchState(store, { 
                isLoading: false, 
                error: errorMessage 
              });
              messageService.showError('Connection test failed', errorMessage);
            }
          }),
          catchError((error: any) => {
            const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
            console.error('Connection test error:', error);
            patchState(store, { 
              isLoading: false, 
              error: errorMessage 
            });
            messageService.showError('Connection test failed', errorMessage);
            return EMPTY;
          })
        );
      })
    )),

    /**
     * Compatibility wrapper for testConnection
     * TODO: Remove this wrapper once all callers are updated to use the rxMethod directly
     */
    async testConnectionAsync(): Promise<any> {
      const config = store.configuration();
      patchState(store, { isLoading: true, error: undefined });

      try {
        console.log('Testing connection...');
        const response = await messageService.testConnection(config);
        patchState(store, { isLoading: false });
        
        if (response.success) {
          console.log('Connection test successful');
          messageService.showSuccess('Connection test successful');
        } else {
          console.warn('Connection test failed:', response.message);
          messageService.showError('Connection test failed', response.message);
        }
        
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
        console.error('Connection test error:', error);
        patchState(store, { 
          isLoading: false, 
          error: errorMessage 
        });
        messageService.showError('Connection test failed', errorMessage);
        throw error;
      }
    },

    /**
     * Set active dashboard view
     * Replaces legacy showView function
     */
    setActiveView(view: DashboardView) {
      console.log('Setting active view:', view);
      patchState(store, { activeView: view });
      messageService.updateView(view);
    },

    /**
     * Start AI analysis for selected pull request
     * Replaces legacy startAIAnalysis function
     */
    startAIAnalysis() {
      const selectedPR = store.selectedPR?.();
      if (!selectedPR) {
        patchState(store, { error: 'No pull request selected for analysis' });
        return;
      }

      console.log('Starting AI analysis for PR:', selectedPR.id);
      const progress: AnalysisProgress = {
        prId: selectedPR.id,
        stage: 'initializing' as any,
        completed: 0,
        total: 100,
        percentage: 0,
        message: 'Starting analysis...',
        startTime: new Date().toISOString()
      };

      patchState(store, { 
        currentAnalysis: progress,
        error: undefined
      });

      messageService.startAIAnalysis(selectedPR.id);
    },

    /**
     * Cancel running AI analysis
     * Replaces legacy cancelAIAnalysis functionality
     */
    cancelAIAnalysis() {
      const currentAnalysis = store.currentAnalysis?.();
      if (!currentAnalysis) {return;}

      console.log('Cancelling AI analysis for PR:', currentAnalysis.prId);
      messageService.cancelAIAnalysis(currentAnalysis.prId);
      patchState(store, { currentAnalysis: undefined });
    },

    /**
     * Update analysis progress
     * Called from message handlers
     */
    updateAnalysisProgress(progress: AnalysisProgress) {
      console.log('Analysis progress update:', progress.percentage + '%');
      patchState(store, { currentAnalysis: progress });
    },

    /**
     * Complete analysis and store results
     * Called when analysis finishes
     */
    completeAnalysis(results: any) {
      console.log('Analysis completed');
      patchState(store, { 
        currentAnalysis: undefined,
        analysisResults: results
      });
    },

    /**
     * Update search filters
     * Replaces legacy filter application functions
     */
    updateFilters(filters: Partial<DashboardFilters>) {
      console.log('Updating filters:', filters);
      patchState(store, { 
        filters: { ...store.filters(), ...filters }
      });
    },

    /**
     * Update search term  
     * Replaces legacy performSearch function
     */
    updateSearchTerm(searchTerm: string) {
      console.log('Updating search term:', searchTerm);
      patchState(store, { searchTerm: searchTerm || undefined });
    },

    /**
     * Update sorting
     * Replaces legacy sorting functionality
     */
    updateSorting(sortBy: string, sortDirection?: 'asc' | 'desc') {
      const currentDirection = store.sortDirection?.() || 'asc';
      const currentSortBy = store.sortBy?.();
      const newDirection = sortDirection || 
        (currentSortBy === sortBy && currentDirection === 'asc' ? 'desc' : 'asc');
      
      console.log('Updating sort:', sortBy, newDirection);
      patchState(store, { sortBy, sortDirection: newDirection });
    },

    /**
     * Clear filters and search
     * Replaces legacy clearAllFilters function
     */
    clearFilters() {
      console.log('Clearing all filters');
      patchState(store, { 
        filters: initialState.filters,
        searchTerm: undefined
      });
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
      console.log('Resetting dashboard store');
      patchState(store, initialState);
    },

    /**
     * Refresh current view data
     * Replaces legacy refresh functionality
     */
    /**
     * refresh converted to rxMethod
     * Original: async refresh()
     * Refresh current view data
     * Replaces legacy refresh functionality
     */
    refresh: rxMethod<void>(pipe(
      switchMap(() => {
        const activeView = store.activeView();
        console.log('Refreshing view:', activeView);
        
        switch (activeView) {
          case DashboardView.CONFIGURATION:
            // Trigger loadConfiguration rxMethod
            return from(messageService.loadConfiguration()).pipe(
              tap(response => {
                patchState(store, { 
                  configuration: response,
                  error: undefined 
                });
              })
            );
          case DashboardView.PULL_REQUEST_LIST:
            return from(messageService.loadPullRequests()).pipe(
              tap(response => {
                patchState(store, { 
                  pullRequests: response.pullRequests || [],
                  error: undefined 
                });
              })
            );
          case DashboardView.PULL_REQUEST_DETAIL:
            const selectedPR = store.selectedPR?.();
            if (selectedPR) {
              return from(messageService.selectPullRequest(selectedPR.id)).pipe(
                tap(response => {
                  patchState(store, { 
                    selectedPR: response,
                    error: undefined 
                  });
                })
              );
            }
            return EMPTY;
          default:
            return EMPTY;
        }
      }),
      catchError((error: any) => {
        const errorMessage = error instanceof Error ? error.message : 'Failed to refresh view';
        console.error('Refresh error:', error);
        patchState(store, { error: errorMessage });
        return EMPTY;
      })
    )),
    
    /**
     * Set loading state with optional message
     * Replaces legacy showLoading function
     */
    setLoading(isLoading: boolean, message?: string) {
      patchState(store, { 
        isLoading,
        loadingMessage: message 
      });
    },
    
    /**
     * Set error state
     * Replaces legacy showError function
     */
    setError(errorMessage: string) {
      console.error('Dashboard error:', errorMessage);
      patchState(store, { error: errorMessage });
    },
    
    /**
     * Set pull requests data
     * Used internally for data updates
     */
    setPullRequests(pullRequests: PullRequest[]) {
      patchState(store, { pullRequests });
    }
  }))
);