/**
 * Message types enum for webview-extension communication
 */
export enum MessageType {
  // Configuration messages
  LOAD_CONFIG = 'loadConfig',
  SAVE_CONFIG = 'saveConfig',
  TEST_CONNECTION = 'testConnection',
  
  // Pull request messages
  LOAD_PULL_REQUESTS = 'loadPullRequests',
  SELECT_PULL_REQUEST = 'selectPullRequest',
  LOAD_PR_DETAILS = 'loadPRDetails',
  SEARCH_PULL_REQUESTS = 'searchPullRequests',
  FILTER_PULL_REQUESTS = 'filterPullRequests',
  REFRESH_PULL_REQUESTS = 'refreshPullRequests',
  
  // AI Analysis messages
  START_AI_ANALYSIS = 'startAIAnalysis',
  AI_ANALYSIS_PROGRESS = 'aiAnalysisProgress',
  AI_ANALYSIS_COMPLETE = 'aiAnalysisComplete',
  AI_ANALYSIS_CANCEL = 'aiAnalysisCancel',
  
  // Comment management messages
  APPROVE_COMMENT = 'approveComment',
  DISMISS_COMMENT = 'dismissComment',
  MODIFY_COMMENT = 'modifyComment',
  EXPORT_COMMENTS = 'exportComments',
  RESET_COMMENT = 'resetComment',
  BULK_APPROVE_COMMENTS = 'bulkApproveComments',
  BULK_DISMISS_COMMENTS = 'bulkDismissComments',
  
  // Repository and project messages
  LOAD_REPOSITORIES = 'loadRepositories',
  LOAD_PROJECTS = 'loadProjects',
  
  // UI state messages
  UPDATE_VIEW = 'updateView',
  
  // Notification messages
  SHOW_ERROR = 'showError',
  SHOW_SUCCESS = 'showSuccess',
  SHOW_WARNING = 'showWarning',
  SHOW_INFO = 'showInfo',
  
  // Settings messages
  OPEN_SETTINGS = 'openSettings',
  CLOSE_SETTINGS = 'closeSettings',
  VALIDATE_SETTING = 'validateSetting',
  SAVE_SETTINGS = 'saveSettings',
  RESET_SETTINGS = 'resetSettings',
  EXPORT_SETTINGS = 'exportSettings',
  IMPORT_SETTINGS = 'importSettings',
  SETTINGS_CHANGED = 'settingsChanged',
  LOAD_AVAILABLE_MODELS = 'loadAvailableModels',
  
  // Error handling
  ERROR_REPORT = 'errorReport'
}

/**
 * Dashboard view enum
 */
export enum DashboardView {
  CONFIGURATION = 'configuration',
  PULL_REQUEST_LIST = 'pullRequestList',
  PULL_REQUEST_DETAIL = 'pullRequestDetail',
  AI_REVIEW = 'aiReview',
  SETTINGS = 'settings'
}

/**
 * Comment severity levels
 */
export enum CommentSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  SUGGESTION = 'suggestion'
}

/**
 * Comment status
 */
export enum CommentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DISMISSED = 'dismissed',
  MODIFIED = 'modified'
}

/**
 * File change type
 */
export enum FileChangeType {
  ADD = 'add',
  DELETE = 'delete',
  EDIT = 'edit',
  RENAME = 'rename'
}

/**
 * PR status
 */
export enum PullRequestStatus {
  ACTIVE = 'active',
  ABANDONED = 'abandoned',
  COMPLETED = 'completed',
  DRAFT = 'draft'
}

/**
 * Analysis progress stage
 */
export enum AnalysisStage {
  INITIALIZING = 'initializing',
  LOADING_FILES = 'loading_files',
  ANALYZING = 'analyzing',
  GENERATING_COMMENTS = 'generating_comments',
  FINALIZING = 'finalizing',
  COMPLETE = 'complete',
  ERROR = 'error'
}

/**
 * Language model providers
 */
export enum ModelProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  AZURE_OPENAI = 'azure_openai'
}

/**
 * Available models
 */
export enum LanguageModel {
  GPT_4 = 'gpt-4',
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_3_5_TURBO = 'gpt-3.5-turbo',
  CLAUDE_3_OPUS = 'claude-3-opus',
  CLAUDE_3_SONNET = 'claude-3-sonnet',
  CLAUDE_3_HAIKU = 'claude-3-haiku'
}