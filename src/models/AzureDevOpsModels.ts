/**
 * Azure DevOps data models and interfaces
 */

export interface IdentityRef {
    displayName: string;
    url: string;
    id: string;
    uniqueName: string;
    imageUrl?: string;
    descriptor?: string;
}

export interface PullRequest {
    pullRequestId: number;
    title: string;
    description: string;
    sourceRefName: string;
    targetRefName: string;
    createdBy: IdentityRef;
    creationDate: Date;
    status: 'active' | 'abandoned' | 'completed';
    isDraft: boolean;
    repository: {
        id: string;
        name: string;
        url: string;
    };
    _links: {
        web: {
            href: string;
        };
    };
}

export interface GitItem {
    objectId: string;
    originalObjectId?: string;
    gitObjectType: 'blob' | 'tree' | 'commit' | 'tag';
    commitId: string;
    path: string;
    isFolder: boolean;
    url: string;
}

export interface FileChange {
    item: GitItem;
    changeType: 'add' | 'edit' | 'delete' | 'rename';
    sourceServerItem?: string;
    url: string;
    originalPath?: string;
    // Additional fields for detailed diff analysis
    addedLines?: number;
    deletedLines?: number;
    modifiedLines?: number;
    isBinary?: boolean;
    isLargeFile?: boolean;
    content?: string;
    diff?: string;
}

export interface DiffLine {
    lineNumber: number;
    type: 'added' | 'deleted' | 'modified' | 'context';
    content: string;
    originalLineNumber?: number;
}

export interface FileDiff {
    filePath: string;
    changeType: 'add' | 'edit' | 'delete' | 'rename';
    oldFilePath?: string;
    lines: DiffLine[];
    addedLines: number;
    deletedLines: number;
    isBinary: boolean;
    isLargeFile: boolean;
    encoding?: string;
}

export interface PullRequestIteration {
    id: number;
    description?: string;
    author: IdentityRef;
    createdDate: Date;
    updatedDate: Date;
    commonRefCommit: {
        commitId: string;
    };
    sourceRefCommit: {
        commitId: string;
    };
    targetRefCommit: {
        commitId: string;
    };
}

export interface CommentPosition {
    line: number;
    offset: number;
}

export interface CommentThreadContext {
    filePath: string;
    rightFileStart?: CommentPosition;
    rightFileEnd?: CommentPosition;
    leftFileStart?: CommentPosition;
    leftFileEnd?: CommentPosition;
}

export interface Comment {
    id?: number;
    parentCommentId?: number;
    author?: IdentityRef;
    content: string;
    publishedDate?: Date;
    lastUpdatedDate?: Date;
    lastContentUpdatedDate?: Date;
    commentType: 'text' | 'codeChange' | 'system';
}

export interface CommentThread {
    id?: number;
    comments: Comment[];
    status: 'active' | 'fixed' | 'wontFix' | 'closed' | 'byDesign' | 'pending';
    threadContext?: CommentThreadContext;
    pullRequestThreadContext?: {
        changeTrackingId: number;
        iterationContext: {
            firstComparingIteration: number;
            secondComparingIteration: number;
        };
    };
    properties?: { [key: string]: any };
}

export interface ReviewComment {
    id: string;
    fileName: string;
    lineNumber: number;
    content: string;
    severity: 'info' | 'warning' | 'error';
    suggestion?: string;
    isApproved: boolean;
    originalContent?: string;
}

export interface ExtensionConfig {
    organizationUrl: string;
    defaultProject?: string;
    selectedModel: string;
    customInstructions: string;
    batchSize: number;
    enableTelemetry: boolean;
}

export interface ValidationResult {
    isValid: boolean;
    error?: string;
    details?: string;
}

export interface AzureDevOpsError {
    message: string;
    typeKey: string;
    errorCode: number;
    eventId: number;
}

export interface AzureDevOpsApiResponse<T> {
    count: number;
    value: T[];
}

export interface Profile {
    displayName: string;
    publicAlias: string;
    emailAddress: string;
    coreRevision: number;
    timeStamp: Date;
    id: string;
    revision: number;
}

export interface AccountInfo {
    accountId: string;
    accountUri: string;
    accountName: string;
    properties: { [key: string]: any };
}