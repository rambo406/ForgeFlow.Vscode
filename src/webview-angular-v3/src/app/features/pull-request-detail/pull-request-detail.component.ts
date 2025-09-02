import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WebviewMessagingService, WebviewMessage } from '../../core/services/webview-messaging.service';
import { MonacoDiffViewerComponent } from '../../shared/monaco-diff-viewer/monaco-diff-viewer.component';

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
    imports: [CommonModule, MonacoDiffViewerComponent],
    templateUrl: './pull-request-detail.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PullRequestDetailComponent implements OnInit, OnDestroy {
    loading = signal<boolean>(true);
    pr = signal<UIPullRequestDetail | null>(null);
    fileChanges = signal<UIFileChange[]>([]);
    stats = signal<{ totalFiles: number; totalAdditions: number; totalDeletions: number } | null>(null);
    selectedFiles = signal<Set<string>>(new Set<string>());
    activeFile = signal<UIFileChange | null>(null);
    showOnlyChanges = signal<boolean>(false);
    visibleLines = computed(() => {
        const af = this.activeFile();
        if (!af || !af.lines) { return []; }
        const only = this.showOnlyChanges();
        return only ? af.lines.filter(l => l.type !== 'context') : af.lines;
    });
    fileText = signal<Record<string, { left: string; right: string; leftPath?: string; rightPath?: string }>>({});

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
                    const first = (files && files.length > 0) ? files[0] : null;
                    this.activeFile.set(first);
                    // Auto-load diff content for the initially active file
                    if (first && pr) {
                        const cache = this.fileText();
                        if (!cache[first.filePath]) {
                            this.bus.postMessage({
                                type: 'loadFileDiff',
                                payload: {
                                    prId: pr.id,
                                    filePath: first.filePath,
                                    oldFilePath: first.oldFilePath
                                }
                            });
                        }
                    }
                    this.stats.set(p.stats || null);
                    this.loading.set(false);
                    break;
                }
                case 'loadFileDiff': {
                    const p = (msg.payload as any) || {}; // eslint-disable-line
                    const map = { ...this.fileText() };
                    const key = String(p.filePath || p.rightPath || '');
                    map[key] = { left: String(p.leftContent || ''), right: String(p.rightContent || ''), leftPath: p.leftPath, rightPath: p.rightPath };
                    this.fileText.set(map);
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

    toggleFileSelection(fc: UIFileChange): void {
        const next = new Set(this.selectedFiles());
        if (next.has(fc.filePath)) {
            next.delete(fc.filePath);
        } else {
            next.add(fc.filePath);
        }
        this.selectedFiles.set(next);
    }

    isSelected(fc: UIFileChange): boolean {
        return this.selectedFiles().has(fc.filePath);
    }

    selectAll(checked: boolean): void {
        if (checked) {
            const all = new Set(this.fileChanges().map(f => f.filePath));
            this.selectedFiles.set(all);
        } else {
            this.selectedFiles.set(new Set());
        }
    }

    showDiff(fc: UIFileChange): void {
        this.activeFile.set(fc);
        const cache = this.fileText();
        if (!cache[fc.filePath]) {
            const currentPr = this.pr();
            if (currentPr) {
                this.bus.postMessage({ type: 'loadFileDiff', payload: { prId: currentPr.id, filePath: fc.filePath, oldFilePath: fc.oldFilePath } });
            }
        }
    }

    analyzeSelected(): void {
        const currentPr = this.pr();
        if (!currentPr) { return; }
        const selected = Array.from(this.selectedFiles());
        this.bus.postMessage({
            type: 'startAIAnalysis',
            payload: {
                prId: currentPr.id,
                selectedFiles: selected
            }
        });
    }
}
