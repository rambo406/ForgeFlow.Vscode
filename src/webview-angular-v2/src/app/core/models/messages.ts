export enum MessageType {
    LOAD_CONFIG = 'loadConfig',
    SAVE_CONFIG = 'saveConfig',
    TEST_CONNECTION = 'testConnection',

    SEARCH_PULL_REQUESTS = 'searchPullRequests',
    FILTER_PULL_REQUESTS = 'filterPullRequests',
    REFRESH_PULL_REQUESTS = 'refreshPullRequests',
    LOAD_PULL_REQUESTS = 'loadPullRequests',
    LOAD_REPOSITORIES = 'loadRepositories',
    LOAD_PROJECTS = 'loadProjects',
    SELECT_PULL_REQUEST = 'selectPullRequest',
    LOAD_PR_DETAILS = 'loadPRDetails',

    START_AI_ANALYSIS = 'startAIAnalysis',
    AI_ANALYSIS_PROGRESS = 'aiAnalysisProgress',
    AI_ANALYSIS_COMPLETE = 'aiAnalysisComplete',
    AI_ANALYSIS_CANCEL = 'aiAnalysisCancel',

    APPROVE_COMMENT = 'approveComment',
    DISMISS_COMMENT = 'dismissComment',
    MODIFY_COMMENT = 'modifyComment',
    EXPORT_COMMENTS = 'exportComments',

    UPDATE_VIEW = 'updateView',
    SHOW_ERROR = 'showError',
    SHOW_SUCCESS = 'showSuccess',

    OPEN_SETTINGS = 'openSettings',
    CLOSE_SETTINGS = 'closeSettings',
    VALIDATE_SETTING = 'validateSetting',
    SAVE_SETTINGS = 'saveSettings',
    RESET_SETTINGS = 'resetSettings',
    EXPORT_SETTINGS = 'exportSettings',
    IMPORT_SETTINGS = 'importSettings',
    SETTINGS_CHANGED = 'settingsChanged',
    LOAD_AVAILABLE_MODELS = 'loadAvailableModels',
    NAVIGATE = 'navigate'
}

export interface WebviewMessage<T = unknown> {
    type: MessageType | string;
    payload?: T;
    requestId?: string;
}

export interface ConfigPayload {
    config?: {
        organizationUrl?: string;
        personalAccessToken?: string;
        defaultProject?: string;
        selectedModel?: string;
        customInstructions?: string;
        batchSize?: number;
        enableTelemetry?: boolean;
    };
    success?: boolean;
}

export interface RepositoryInfo { id: string; name: string; url: string; }

export interface PullRequestItem {
    id: number;
    title: string;
    author: string;
    createdDate: string;
    status: 'active' | 'abandoned' | 'completed';
    sourceRefName: string;
    targetRefName: string;
    description?: string;
    repository: string;
    isDraft: boolean;
    url: string;
}

export interface FilterParams {
    query?: string;
    repositoryId?: string;
    author?: string;
    status?: 'active' | 'abandoned' | 'completed';
}

