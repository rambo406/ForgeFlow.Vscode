import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
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
 * Dashboard view enum
 */
export enum DashboardView {
  CONFIGURATION = 'configuration',
  PULL_REQUEST_LIST = 'pullRequestList',
  PULL_REQUEST_DETAIL = 'pullRequestDetail'
}

/**
 * Initial dashboard state
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
  sortDirection: 'desc'
};

/**
 * Dashboard SignalStore for managing dashboard state
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
      
      // Apply author filter
      if (filters.author) {
        filtered = filtered.filter(pr => 
          pr.author.toLowerCase().includes(filters.author!.toLowerCase())
        );
      }
      
      // Apply repository filter
      if (filters.repository) {
        filtered = filtered.filter(pr => 
          pr.repository.toLowerCase().includes(filters.repository!.toLowerCase())
        );
      }
      
      // Apply status filter
      if (filters.status) {
        filtered = filtered.filter(pr => pr.status === filters.status);
      }
      
      // Apply date range filter
      if (filters.dateRange) {
        filtered = filtered.filter(pr => {
          const prDate = new Date(pr.createdDate);
          const fromDate = new Date(filters.dateRange!.from);
          const toDate = new Date(filters.dateRange!.to);
          return prDate >= fromDate && prDate <= toDate;
        });
      }
      
      // Apply search term filter
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
      
      if (!sortBy) return filtered;
      
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
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;
        
        return sortDirection === 'desc' ? -comparison : comparison;
      });
    });

    return {
      filteredPullRequests,
      sortedPullRequests,

      /**
       * Computed signal to check if configuration is valid
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
       */
      analysisProgressPercentage: computed(() => {
        const progress = store.currentAnalysis?.();
        return progress ? Math.round(progress.percentage) : 0;
      }),

      /**
       * Computed signal to check if analysis is running
       */
      isAnalysisRunning: computed(() => {
        const progress = store.currentAnalysis?.();
        return !!progress && progress.percentage < 100;
      }),

      /**
       * Computed signal for dashboard statistics
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
      })
    };
  }),
  withMethods((store, messageService = inject(MessageService)) => ({
    /**
     * Load pull requests from the extension host
     */
    async loadPullRequests(filters?: Partial<DashboardFilters>) {
      patchState(store, { isLoading: true, error: undefined });
      
      try {
        const response = await messageService.loadPullRequests();
        patchState(store, { 
          pullRequests: response.pullRequests || [],
          isLoading: false,
          error: undefined
        });
        
        // Apply filters if provided
        if (filters) {
          patchState(store, { 
            filters: { ...store.filters(), ...filters }
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load pull requests';
        patchState(store, { 
          isLoading: false, 
          error: errorMessage 
        });
      }
    },

    /**
     * Select a pull request and load its details
     */
    async selectPullRequest(prId: number) {
      const pullRequest = store.pullRequests().find(pr => pr.id === prId);
      if (!pullRequest) {
        patchState(store, { error: 'Pull request not found' });
        return;
      }

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
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load pull request details';
        patchState(store, { 
          isLoading: false, 
          error: errorMessage 
        });
      }
    },

    /**
     * Update configuration
     */
    async updateConfiguration(config: Partial<ConfigurationData>) {
      const updatedConfig = { ...store.configuration(), ...config };
      
      patchState(store, { 
        configuration: updatedConfig,
        isLoading: true,
        error: undefined
      });

      try {
        await messageService.saveConfiguration(updatedConfig);
        patchState(store, { isLoading: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration';
        patchState(store, { 
          isLoading: false, 
          error: errorMessage 
        });
      }
    },

    /**
     * Load configuration from extension host
     */
    async loadConfiguration() {
      patchState(store, { isLoading: true, error: undefined });

      try {
        const response = await messageService.loadConfiguration();
        patchState(store, { 
          configuration: response.config || store.configuration(),
          isLoading: false
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load configuration';
        patchState(store, { 
          isLoading: false, 
          error: errorMessage 
        });
      }
    },

    /**
     * Test connection with current configuration
     */
    async testConnection() {
      const config = store.configuration();
      patchState(store, { isLoading: true, error: undefined });

      try {
        const response = await messageService.testConnection(config);
        patchState(store, { isLoading: false });
        
        if (response.success) {
          messageService.showSuccess('Connection test successful');
        } else {
          messageService.showError('Connection test failed', response.message);
        }
        
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
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
     */
    setActiveView(view: DashboardView) {
      patchState(store, { activeView: view });
      messageService.updateView(view);
    },

    /**
     * Start AI analysis for selected pull request
     */
    startAIAnalysis() {
      const selectedPR = store.selectedPR?.();
      if (!selectedPR) {
        patchState(store, { error: 'No pull request selected for analysis' });
        return;
      }

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
     */
    cancelAIAnalysis() {
      const currentAnalysis = store.currentAnalysis?.();
      if (!currentAnalysis) return;

      messageService.cancelAIAnalysis(currentAnalysis.prId);
      patchState(store, { currentAnalysis: undefined });
    },

    /**
     * Update analysis progress
     */
    updateAnalysisProgress(progress: AnalysisProgress) {
      patchState(store, { currentAnalysis: progress });
    },

    /**
     * Complete analysis and store results
     */
    completeAnalysis(results: any) {
      patchState(store, { 
        currentAnalysis: undefined,
        analysisResults: results
      });
    },

    /**
     * Update search filters
     */
    updateFilters(filters: Partial<DashboardFilters>) {
      patchState(store, { 
        filters: { ...store.filters(), ...filters }
      });
    },

    /**
     * Update search term
     */
    updateSearchTerm(searchTerm: string) {
      patchState(store, { searchTerm: searchTerm || undefined });
    },

    /**
     * Update sorting
     */
    updateSorting(sortBy: string, sortDirection?: 'asc' | 'desc') {
      const currentDirection = store.sortDirection?.() || 'asc';
      const currentSortBy = store.sortBy?.();
      const newDirection = sortDirection || 
        (currentSortBy === sortBy && currentDirection === 'asc' ? 'desc' : 'asc');
      
      patchState(store, { sortBy, sortDirection: newDirection });
    },

    /**
     * Clear filters and search
     */
    clearFilters() {
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
      patchState(store, initialState);
    },

    /**
     * Refresh current view data
     */
    async refresh() {
      const activeView = store.activeView();
      
      switch (activeView) {
        case DashboardView.CONFIGURATION:
          await this.loadConfiguration();
          break;
        case DashboardView.PULL_REQUEST_LIST:
          await this.loadPullRequests();
          break;
        case DashboardView.PULL_REQUEST_DETAIL:
          const selectedPR = store.selectedPR?.();
          if (selectedPR) {
            await this.selectPullRequest(selectedPR.id);
          }
          break;
      }
    }
  }))
);