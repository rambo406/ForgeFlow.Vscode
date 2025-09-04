/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { VsCodeApiService } from './vscode-api.service';

export type MessageType =
  | 'loadConfig'
  | 'saveConfig'
  | 'testConnection'
  | 'loadAvailableModels'
  | 'showError'
  | 'showSuccess'
  | 'navigate'
  | 'loadPullRequests'
  | 'loadRepositories'
  | 'loadProjects'
  | 'searchPullRequests'
  | 'filterPullRequests'
  | 'refreshPullRequests'
  | 'selectPullRequest'
  | 'loadFileDiff'
  | 'updateFileComments'
  | 'startAIAnalysis'
  | 'aiAnalysisProgress'
  | 'aiAnalysisComplete'
  | 'suggestComment'
  | 'suggestCommentResult'
  | 'createCommentThread'
  | 'replyToCommentThread';

export interface WebviewMessage<TPayload = any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  type: MessageType;
  payload?: TPayload;
  requestId?: string;
}

@Injectable({ providedIn: 'root' })
export class WebviewMessagingService implements OnDestroy {
  private readonly message$ = new Subject<WebviewMessage>();
  private boundHandler?: (event: MessageEvent) => void;

  constructor(private readonly vscode: VsCodeApiService) {
    this.boundHandler = (event: MessageEvent) => {
      const data = event?.data as WebviewMessage | undefined;
      if (!data || typeof data !== 'object' || !('type' in data)) return;
      this.message$.next(data as WebviewMessage);
    };
    window.addEventListener('message', this.boundHandler);
  }

  onMessage(): Observable<WebviewMessage> {
    return this.message$.asObservable();
  }

  postMessage<TPayload = any>(message: WebviewMessage<TPayload>): void { // eslint-disable-line @typescript-eslint/no-explicit-any
    this.vscode.postMessage(message);
  }

  ngOnDestroy(): void {
    if (this.boundHandler) {
      window.removeEventListener('message', this.boundHandler);
    }
    this.message$.complete();
  }
}
