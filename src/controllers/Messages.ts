import * as vscode from 'vscode';

/**
 * Message types for webview communication
 */
export enum MessageType {
    // Configuration
    LOAD_CONFIG = 'loadConfig',
    SAVE_CONFIG = 'saveConfig',
    TEST_CONNECTION = 'testConnection',

    // Search and Filtering
    SEARCH_PULL_REQUESTS = 'searchPullRequests',
    FILTER_PULL_REQUESTS = 'filterPullRequests',
    REFRESH_PULL_REQUESTS = 'refreshPullRequests',
    LOAD_PULL_REQUESTS = 'loadPullRequests',
    LOAD_REPOSITORIES = 'loadRepositories',
    LOAD_PROJECTS = 'loadProjects',
    SELECT_PULL_REQUEST = 'selectPullRequest',
    LOAD_PR_DETAILS = 'loadPRDetails',
    LOAD_FILE_DIFF = 'loadFileDiff',
    UPDATE_FILE_COMMENTS = 'updateFileComments',

    // AI Analysis
    START_AI_ANALYSIS = 'startAIAnalysis',
    AI_ANALYSIS_PROGRESS = 'aiAnalysisProgress',
    AI_ANALYSIS_COMPLETE = 'aiAnalysisComplete',
    AI_ANALYSIS_CANCEL = 'aiAnalysisCancel',
    // Inline AI Suggestion
    SUGGEST_COMMENT = 'suggestComment',
    SUGGEST_COMMENT_RESULT = 'suggestCommentResult',

    // AI Comments
    APPROVE_COMMENT = 'approveComment',
    DISMISS_COMMENT = 'dismissComment',
    MODIFY_COMMENT = 'modifyComment',
    EXPORT_COMMENTS = 'exportComments',
<<<<<<< HEAD
    CREATE_COMMENT_THREAD = 'createCommentThread',
    REPLY_TO_COMMENT_THREAD = 'replyToCommentThread',
=======
    POST_COMMENTS = 'postComments',
>>>>>>> 8a6ed91dc61cc80c455d4c05f74d458aee5842a1

    // UI Updates
    UPDATE_VIEW = 'updateView',
    SHOW_ERROR = 'showError',
    SHOW_SUCCESS = 'showSuccess',

    // Settings
    OPEN_SETTINGS = 'openSettings',
    CLOSE_SETTINGS = 'closeSettings',
    VALIDATE_SETTING = 'validateSetting',
    SAVE_SETTINGS = 'saveSettings',
    RESET_SETTINGS = 'resetSettings',
    EXPORT_SETTINGS = 'exportSettings',
    IMPORT_SETTINGS = 'importSettings',
    SETTINGS_CHANGED = 'settingsChanged',
    LOAD_AVAILABLE_MODELS = 'loadAvailableModels',
    // Navigation
    NAVIGATE = 'navigate'
}

/**
 * Message interface for webview communication
 */
export interface WebviewMessage {
    type: MessageType;
    payload?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    requestId?: string;
}

/**
 * Dashboard view states
 */
export enum DashboardView {
    CONFIGURATION = 'configuration',
    PULL_REQUEST_LIST = 'pullRequestList',
    PULL_REQUEST_DETAIL = 'pullRequestDetail'
}

export interface CurrentAnalysisState {
    cancellationTokenSource: vscode.CancellationTokenSource;
    prId: number;
}
