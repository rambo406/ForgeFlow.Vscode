import { MessageType, AnalysisStage } from './enums';
import { 
  ConfigurationData,
  PullRequest,
  FileChange,
  PullRequestStats,
  ReviewComment,
  AnalysisOptions,
  AnalysisResult,
  ModelInfo
} from './interfaces';

/**
 * Base interface for all webview messages
 */
export interface WebviewMessage<T = unknown> {
  type: MessageType;
  payload: T;
  requestId?: string;
  timestamp?: string;
  error?: string;
}

/**
 * Configuration message payloads
 */
export interface LoadConfigRequest {
  // No payload needed
}

export interface LoadConfigResponse {
  config: ConfigurationData;
}

export interface SaveConfigRequest {
  config: ConfigurationData;
}

export interface SaveConfigResponse {
  success: boolean;
  message?: string;
}

export interface TestConnectionRequest {
  config: ConfigurationData;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  details?: unknown;
}

/**
 * Pull request message payloads
 */
export interface LoadPullRequestsRequest {
  project?: string;
  repository?: string;
  author?: string;
  status?: string;
}

export interface LoadPullRequestsResponse {
  pullRequests: PullRequest[];
  projectName: string;
  totalCount: number;
}

export interface SelectPullRequestRequest {
  prId: number;
}

export interface SelectPullRequestResponse {
  pullRequest: PullRequest;
  fileChanges: FileChange[];
  stats: PullRequestStats;
}

export interface LoadPRDetailsRequest {
  prId: number;
}

export interface LoadPRDetailsResponse {
  pullRequest: PullRequest;
  fileChanges: FileChange[];
  stats: PullRequestStats;
  comments?: ReviewComment[];
}

/**
 * AI Analysis message payloads
 */
export interface StartAIAnalysisRequest {
  prId: number;
  options?: AnalysisOptions;
}

export interface AIAnalysisProgressPayload {
  prId: number;
  stage: AnalysisStage;
  currentFileName?: string;
  completed: number;
  total: number;
  percentage: number;
  message?: string;
}

export interface AIAnalysisCompletePayload {
  prId: number;
  result: AnalysisResult;
}

export interface AIAnalysisCancelRequest {
  prId: number;
}

/**
 * Comment management message payloads
 */
export interface ApproveCommentRequest {
  commentId: string;
}

export interface DismissCommentRequest {
  commentId: string;
}

export interface ModifyCommentRequest {
  commentId: string;
  content: string;
}

export interface ExportCommentsRequest {
  format?: 'json' | 'csv' | 'markdown';
  includeApproved?: boolean;
  includeDismissed?: boolean;
}

export interface BulkCommentActionRequest {
  commentIds: string[];
  action: 'approve' | 'dismiss';
}

/**
 * Settings message payloads
 */
export interface ValidateSettingRequest {
  key: string;
  value: unknown;
}

export interface ValidateSettingResponse {
  valid: boolean;
  message?: string;
  suggestions?: string[];
}

export interface SaveSettingsRequest {
  settings: Record<string, unknown>;
}

export interface LoadAvailableModelsResponse {
  models: ModelInfo[];
  currentModel: string;
}

/**
 * UI state message payloads
 */
export interface UpdateViewRequest {
  view: string;
  data?: unknown;
}

/**
 * Notification message payloads
 */
export interface NotificationPayload {
  message: string;
  details?: string;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: string;
  primary?: boolean;
}

/**
 * Error report payload
 */
export interface ErrorReportPayload {
  id: string;
  error: {
    message: string;
    stack?: string;
    name?: string;
  };
  context: string;
  timestamp: string;
  severity: string;
  userAgent: string;
  url: string;
}
