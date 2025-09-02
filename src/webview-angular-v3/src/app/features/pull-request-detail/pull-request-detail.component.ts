import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WebviewMessagingService, WebviewMessage } from '../../core/services/webview-messaging.service';

interface UIPullRequestDetail {
    id: number;
    title: string;
    description: string;
    author: string;
    createdDate: string;
    status: string;
    sourceRefName: string;
    targetRefName: string;
    repository: string;
    isDraft: boolean;
    url: string;
}

interface UIFileChange {
    filePath: string;
    changeType: string;
    oldFilePath?: string;
    addedLines: number;
    deletedLines: number;
    isBinary: boolean;
    isLargeFile: boolean;
    lines?: Array<{ lineNumber: number; type: string; content: string; originalLineNumber?: number }>;
}

@Component({
    selector: 'ff-pull-request-detail',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './pull-request-detail.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PullRequestDetailComponent implements OnInit, OnDestroy {
    loading = signal<boolean>(true);
    pr = signal<UIPullRequestDetail | null>(null);
    fileChanges = signal<UIFileChange[]>([]);
    stats = signal<{ totalFiles: number; totalAdditions: number; totalDeletions: number } | null>(null);

    branchSummary = computed(() => {
        const v = this.pr();
        if (!v) return '';
        const s = v.sourceRefName?.replace('refs/heads/', '') || '';
        const t = v.targetRefName?.replace('refs/heads/', '') || '';
        return `${s} → ${t}`;
    });

    private sub?: any; // subscription handle

    constructor(
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly bus: WebviewMessagingService
    ) {}

    ngOnInit(): void {
        // Listen for PR details from extension
        this.sub = this.bus.onMessage().subscribe((msg: WebviewMessage) => {
            switch (msg.type) {
                case 'selectPullRequest': {
                    const p = (msg.payload as any) || {}; // eslint-disable-line
                    const pr = p.pullRequest as UIPullRequestDetail | undefined;
                    const files = p.fileChanges as UIFileChange[] | undefined;
                    this.pr.set(pr || null);
                    this.fileChanges.set(files || []);
                    this.stats.set(p.stats || null);
                    this.loading.set(false);
                    break;
                }
                case 'showError':
                    this.loading.set(false);
                    break;
            }
        });

        // If navigated directly, ensure id triggers load
        const idParam = Number(this.route.snapshot.paramMap.get('id'));
        if (idParam) {
            this.loading.set(true);
            this.bus.postMessage({ type: 'selectPullRequest', payload: { prId: idParam } });
        }
    }

    ngOnDestroy(): void {
        if (this.sub?.unsubscribe) this.sub.unsubscribe();
    }

    backToDashboard(): void {
        this.router.navigateByUrl('/dashboard');
    }
}

