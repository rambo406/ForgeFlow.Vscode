import { 
  PullRequestStatus, 
  CommentSeverity, 
  CommentStatus, 
  FileChangeType,
  LanguageModel,
  ModelProvider,
  AnalysisStage
} from './enums';

/**
 * Configuration data interface
 */
export interface ConfigurationData {
  // Azure DevOps connection settings
  organizationUrl: string;
  personalAccessToken: string;
  defaultProject?: string;
  
  // AI Model settings
  selectedModel: LanguageModel;
  customInstructions?: string;
  
  // Processing settings
  batchSize: number;
  
  // Feature flags
  enableTelemetry: boolean;
  enableAdvancedAnalysis?: boolean;
  enableAutoReview?: boolean;
  
  // UI preferences
  theme?: 'auto' | 'light' | 'dark';
  compactMode?: boolean;
  showLineNumbers?: boolean;
  
  // Notification settings
  notificationLevel?: 'all' | 'errors' | 'none';
  soundEnabled?: boolean;
}

/**
 * Pull request interface
 */
export interface PullRequest {
  id: number;
  title: string;
  description?: string;
  author: string;
  authorDisplayName?: string;
  authorEmail?: string;
  authorImageUrl?: string;
  createdDate: string;
  updatedDate?: string;
  status: PullRequestStatus;
  isDraft: boolean;
  repository: string;
  repositoryId: string;
  project: string;
  projectId: string;
  sourceRefName: string;
  targetRefName: string;
  url?: string;
  webUrl?: string;
  
  // Additional metadata
  labels?: string[];
  reviewers?: PullRequestReviewer[];
  workItems?: WorkItem[];
  mergeStatus?: MergeStatus;
  conflicts?: boolean;
  
  // Computed fields
  branchInfo?: string;
  ageInDays?: number;
}

/**
 * Pull request reviewer
 */
export interface PullRequestReviewer {
  id: string;
  displayName: string;
  email?: string;
  imageUrl?: string;
  vote: ReviewerVote;
  isRequired: boolean;
  isFlagged?: boolean;
}

/**
 * Reviewer vote enum
 */
export enum ReviewerVote {
  APPROVED = 10,
  APPROVED_WITH_SUGGESTIONS = 5,
  NO_VOTE = 0,
  WAITING_FOR_AUTHOR = -5,
  REJECTED = -10
}

/**
 * Work item reference
 */
export interface WorkItem {
  id: number;
  title: string;
  type: string;
  state: string;
  url?: string;
}

/**
 * Merge status
 */
export interface MergeStatus {
  canMerge: boolean;
  reason?: string;
  conflictedFiles?: string[];
}

/**
 * File change interface
 */
export interface FileChange {
  filePath: string;
  oldFilePath?: string;
  changeType: FileChangeType;
  isBinary: boolean;
  addedLines: number;
  deletedLines: number;
  modifiedLines?: number;
  
  // Diff content
  lines?: DiffLine[];
  
  // File metadata
  fileSize?: number;
  encoding?: string;
  language?: string;
  
  // Analysis metadata
  complexity?: number;
  hasTests?: boolean;
  isGenerated?: boolean;
}

/**
 * Diff line interface
 */
export interface DiffLine {
  lineNumber?: number;
  originalLineNumber?: number;
  content: string;
  type: 'added' | 'deleted' | 'modified' | 'unchanged';
  isContextLine?: boolean;
}

/**
 * Pull request statistics
 */
export interface PullRequestStats {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  totalModifications?: number;
  
  // File type breakdown
  filesByType?: Record<string, number>;
  
  // Complexity metrics
  averageComplexity?: number;
  highComplexityFiles?: number;
  
  // Test coverage
  testFiles?: number;
  testCoverage?: number;
}

/**
 * Review comment interface
 */
export interface ReviewComment {
  id: string;
  content: string;
  filePath: string;
  lineNumber: number;
  originalContent?: string;
  severity: CommentSeverity;
  status: CommentStatus;
  
  // AI metadata
  confidence?: number;
  category?: string;
  tags?: string[];
  
  // Context
  codeContext?: string;
  surroundingCode?: string;
  
  // User interaction
  isEditing?: boolean;
  lastModified?: string;
  modifiedBy?: string;
  
  // Suggested fix
  suggestedFix?: string;
  fixApplied?: boolean;
  
  // Threading
  threadId?: string;
  parentCommentId?: string;
  replies?: ReviewComment[];
}

/**
 * Analysis options interface
 */
export interface AnalysisOptions {
  includeTests?: boolean;
  includeDocumentation?: boolean;
  focusAreas?: string[];
  excludePatterns?: string[];
  customPrompt?: string;
  maxCommentsPerFile?: number;
  minimumSeverity?: CommentSeverity;
}

/**
 * Analysis result interface
 */
export interface AnalysisResult {
  prId: number;
  timestamp: string;
  duration: number;
  
  // Comments generated
  comments: ReviewComment[];
  
  // Summary statistics
  summary: AnalysisSummary;
  
  // Errors encountered
  errors: AnalysisError[];
  
  // Metadata
  model: string;
  version: string;
  options: AnalysisOptions;
}

/**
 * Analysis summary interface
 */
export interface AnalysisSummary {
  totalComments: number;
  commentsBySeverity: Record<CommentSeverity, number>;
  commentsByFile: Record<string, number>;
  commentsByCategory: Record<string, number>;
  
  // File analysis stats
  analyzedFiles: number;
  skippedFiles: number;
  errorFiles: number;
  
  // Performance metrics
  averageTimePerFile: number;
  totalTokensUsed?: number;
  
  // Quality metrics
  averageConfidence: number;
  highConfidenceComments: number;
}

/**
 * Analysis error interface
 */
export interface AnalysisError {
  fileName: string;
  error: string;
  severity: 'warning' | 'error';
  recoverable: boolean;
}

/**
 * Analysis progress interface
 */
export interface AnalysisProgress {
  prId: number;
  stage: AnalysisStage;
  currentFileName?: string;
  completed: number;
  total: number;
  percentage: number;
  message?: string;
  startTime: string;
  estimatedCompletion?: string;
}

/**
 * Model information interface
 */
export interface ModelInfo {
  id: LanguageModel;
  name: string;
  provider: ModelProvider;
  description: string;
  capabilities: string[];
  maxTokens: number;
  costPerToken?: number;
  available: boolean;
  deprecated?: boolean;
  
  // Performance characteristics
  speedRating?: number; // 1-5
  qualityRating?: number; // 1-5
  
  // Specializations
  goodFor?: string[];
  limitations?: string[];
}

/**
 * Repository interface
 */
export interface Repository {
  id: string;
  name: string;
  project: string;
  url?: string;
  defaultBranch: string;
  size?: number;
  lastUpdate?: string;
}

/**
 * Project interface
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  url?: string;
  visibility: 'private' | 'public';
  state: 'wellFormed' | 'createPending' | 'deleting' | 'new';
}

/**
 * User interface
 */
export interface User {
  id: string;
  displayName: string;
  email?: string;
  imageUrl?: string;
  isActive: boolean;
}

/**
 * Dashboard state interface
 */
export interface DashboardState {
  activeView: string;
  selectedPR?: PullRequest;
  pullRequests: PullRequest[];
  configuration: ConfigurationData;
  isLoading: boolean;
  error?: string;
  loadingMessage?: string;
  
  // Analysis state
  currentAnalysis?: AnalysisProgress;
  analysisResults?: AnalysisResult;
  
  // Filters and search
  filters: DashboardFilters;
  searchTerm?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Dashboard filters interface
 */
export interface DashboardFilters {
  author?: string;
  repository?: string;
  status?: PullRequestStatus;
  dateRange?: {
    from: string;
    to: string;
  };
  labels?: string[];
}

/**
 * Comment preview state interface
 */
export interface CommentPreviewState {
  comments: ReviewComment[];
  filteredComments: ReviewComment[];
  filters: CommentFilters;
  groupBy: 'file' | 'severity' | 'none';
  viewMode: 'list' | 'grouped';
  selectedComments: string[];
  isLoading: boolean;
  error?: string;
  
  // Summary statistics
  summary: CommentSummaryStats;
}

/**
 * Comment filters interface
 */
export interface CommentFilters {
  severity?: CommentSeverity;
  status?: CommentStatus;
  file?: string;
  category?: string;
  showApproved: boolean;
  showDismissed: boolean;
  showPending: boolean;
}

/**
 * Comment summary statistics
 */
export interface CommentSummaryStats {
  total: number;
  pending: number;
  approved: number;
  dismissed: number;
  modified: number;
  
  bySeverity: Record<CommentSeverity, number>;
  byFile: Record<string, number>;
  byCategory: Record<string, number>;
  
  averageConfidence: number;
  highConfidenceCount: number;
}