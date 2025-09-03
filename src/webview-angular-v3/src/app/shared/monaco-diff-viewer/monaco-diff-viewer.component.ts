import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';

@Component({
  selector: 'ff-monaco-diff-viewer',
  standalone: true,
  template: `
    <div #container style="width:100%; height:100%;"></div>
  `,
  styles: [
    `
    /* Glyph icon styling for AI analyze action */
    :host ::ng-deep .monaco-editor .glyph-margin .ai-glyph {
      width: 16px;
      height: 16px;
      background-color: var(--vscode-editorCodeLens-foreground, #999);
      -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"black\" d=\"M9 21h6v-1H9v1zm3-19C7.49 2 4 5.49 4 10c0 3.53 2.61 6.43 6 6.92V19h4v-2.08c3.39-.49 6-3.39 6-6.92 0-4.51-3.49-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z\"/></svg>') center / 16px 16px no-repeat;
      mask: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"black\" d=\"M9 21h6v-1H9v1zm3-19C7.49 2 4 5.49 4 10c0 3.53 2.61 6.43 6 6.92V19h4v-2.08c3.39-.49 6-3.39 6-6.92 0-4.51-3.49-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z\"/></svg>') center / 16px 16px no-repeat;
      opacity: 0.85;
    }

    /* Inline AI comment widget */
    .ff-ai-comment {
      max-width: 520px;
      background: var(--vscode-editorHoverWidget-background, #1f1f1f);
      color: var(--vscode-foreground, #ddd);
      border: 1px solid var(--vscode-editorHoverWidget-border, #3f3f46);
      border-radius: 6px;
      padding: 6px 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      font-size: 12px;
      line-height: 1.4;
      white-space: pre-wrap;
      pointer-events: auto;
    }
    .ff-ai-comment .ff-ai-comment-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .ff-ai-comment .ff-ai-severity { font-weight: 600; text-transform: uppercase; opacity: 0.8; }

    /* Line highlight decoration */
    :host ::ng-deep .monaco-editor .view-overlays .current-line ~ .ff-ai-highlight-line,
    :host ::ng-deep .monaco-editor .ff-ai-highlight-line {
      background: rgba(255, 255, 0, 0.18);
      outline: 1px solid rgba(255, 255, 0, 0.35);
    }
    `
  ]
})
export class MonacoDiffViewerComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;

  @Input() leftText: string = '';
  @Input() rightText: string = '';
  @Input() leftLabel: string = 'Original';
  @Input() rightLabel: string = 'Modified';
  @Input() filePath: string = '';
  @Input() lineComments: Array<{ id: string; lineNumber: number; content: string; severity: 'info'|'warning'|'error'; suggestion?: string; }>|null = null;
  @Input() revealLine: number | null = null;

  @Output() requestAnalyzeLine = new EventEmitter<{ lineNumber: number }>();

  private editor: any | undefined;
  private monaco: any | undefined;
  private leftModel: any | undefined;
  private rightModel: any | undefined;
  private glyphDecorationIds: string[] = [];
  private commentWidgets = new Map<string, any>();
  private mouseDownDisposable: any | undefined;
  private highlightDecorationIds: string[] = [];
  private pendingRevealLine: number | null = null;

  async ngAfterViewInit(): Promise<void> {
    await this.initMonaco();
    this.render();
  }

  ngOnDestroy(): void {
    try {
      this.leftModel?.dispose?.();
      this.rightModel?.dispose?.();
      this.editor?.dispose?.();
    } catch { /* noop */ }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.monaco) { return; }
    if (changes['leftText'] || changes['rightText'] || changes['filePath']) {
      this.render();
    }
    if (changes['lineComments']) {
      this.applyInlineComments();
    }
    if (changes['revealLine']) {
      const ln: number | null = this.revealLine ?? null;
      if (typeof ln === 'number' && ln > 0) {
        this.revealAndHighlightLine(ln);
      } else {
        this.clearHighlight();
      }
    }
  }

  private getLanguageFromPath(path: string): string {
    const ext = (path.split('.').pop() || '').toLowerCase();
    switch (ext) {
      case 'ts': return 'typescript';
      case 'tsx': return 'typescript';
      case 'js': return 'javascript';
      case 'jsx': return 'javascript';
      case 'json': return 'json';
      case 'css': return 'css';
      case 'scss': return 'scss';
      case 'html': return 'html';
      case 'md': return 'markdown';
      case 'py': return 'python';
      case 'java': return 'java';
      case 'cs': return 'csharp';
      case 'go': return 'go';
      case 'rs': return 'rust';
      case 'rb': return 'ruby';
      case 'cpp':
      case 'cc':
      case 'cxx':
      case 'hpp':
      case 'hh':
      case 'hxx':
      case 'h':
      case 'c': return 'cpp';
      case 'xml': return 'xml';
      case 'yml':
      case 'yaml': return 'yaml';
      case 'sh': return 'shell';
      default: return 'plaintext';
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).monaco) { return resolve(); }
      const globalUrl = (window as any).__monacoLoaderUrl as string | undefined;
      const resolvedSrc = globalUrl || src;
      const existing = document.querySelector(`script[src="${resolvedSrc}"]`);
      if (existing) {
        (existing as HTMLScriptElement).addEventListener('load', () => resolve());
        (existing as HTMLScriptElement).addEventListener('error', () => reject(new Error('Failed to load ' + src)));
        return;
      }
      const script = document.createElement('script');
      script.src = resolvedSrc;
      // Attach CSP nonce if available from meta tag or global variable
      try {
        const meta = document.querySelector('meta[name="csp-nonce"]') as HTMLMetaElement | null;
        const nonce = meta?.content || (window as any).__webviewCspNonce;
        if (nonce) { (script as any).nonce = nonce; }
      } catch { /* noop */ }
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load ' + src));
      document.body.appendChild(script);
    });
  }

  private async initMonaco(): Promise<void> {
    if (this.monaco) { return; }

    // If Monaco was loaded globally (e.g., from index.html assets), use it.
    if ((window as any).monaco) {
      this.monaco = (window as any).monaco;
      return;
    }

    // Load the AMD loader first and then require the editor main module.
    await this.loadScript('assets/monaco/vs/loader.js');

    const baseUrl = (window as any).__monacoBaseUrl || 'assets/monaco/vs/';
    const req: any = (window as any).require;
    if (req && typeof req.config === 'function') {
      try {
        req.config({ paths: { 'vs': baseUrl.replace(/\/$/, '') } });
      } catch { /* noop */ }
    }

    await new Promise<void>((resolve, reject) => {
      try {
        req(['vs/editor/editor.main'], () => {
          this.monaco = (window as any).monaco;
          // Configure worker resolution
          (self as any).MonacoEnvironment = (self as any).MonacoEnvironment || {};
          try {
            const globalWorker = (window as any).__monacoWorkerUrl as string | undefined;
            if (globalWorker) {
              (self as any).MonacoEnvironment.getWorkerUrl = function () { return globalWorker; };
            } else {
              (self as any).MonacoEnvironment.baseUrl = baseUrl;
            }
          } catch { /* noop */ }
          resolve();
        }, (err: any) => reject(err));
      } catch (err) {
        reject(err);
      }
    });
  }

  private render(): void {
    if (!this.monaco) { return; }
    const monaco = this.monaco;

    // Dispose old editor/models
    this.leftModel?.dispose?.();
    this.rightModel?.dispose?.();
    this.editor?.dispose?.();
    this.glyphDecorationIds = [];
    this.commentWidgets.forEach(widget => {
      try { this.editor?.removeContentWidget(widget); } catch { /* noop */ }
    });
    this.commentWidgets.clear();
    try { this.mouseDownDisposable?.dispose?.(); } catch { /* noop */ }

    const language = this.getLanguageFromPath(this.filePath);
    this.leftModel = monaco.editor.createModel(this.leftText ?? '', language, monaco.Uri.parse(`inmemory://model/left/${this.filePath}`));
    this.rightModel = monaco.editor.createModel(this.rightText ?? '', language, monaco.Uri.parse(`inmemory://model/right/${this.filePath}`));

    this.editor = monaco.editor.createDiffEditor(this.container.nativeElement, {
      readOnly: true,
      renderSideBySide: true,
      automaticLayout: true,
      originalEditable: false,
      minimap: { enabled: false },
      glyphMargin: true,
      scrollBeyondLastLine: false,
      wordWrap: 'off',
      'semanticHighlighting.enabled': false
    });
    this.editor.setModel({ original: this.leftModel, modified: this.rightModel });

    // Apply glyph decorations for changed lines on modified editor
    this.applyChangedLineGlyphs();
    // Re-apply when diff updates
    try {
      this.editor.onDidUpdateDiff?.(() => this.applyChangedLineGlyphs());
    } catch { /* noop */ }

    // Wire click handler for glyphs
    const modifiedEditor = this.editor.getModifiedEditor?.();
    if (modifiedEditor && modifiedEditor.onMouseDown) {
      this.mouseDownDisposable = modifiedEditor.onMouseDown((e: any) => {
        const targetType = e?.target?.type;
        const el: HTMLElement | undefined = e?.target?.element as HTMLElement | undefined;
        if (targetType === this.monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
          const isBulb = !!(el && (el.classList?.contains('ai-glyph') || el.closest?.('.ai-glyph')));
          if (!isBulb) { return; }
          const lineNumber = e?.target?.position?.lineNumber;
          if (typeof lineNumber === 'number' && lineNumber > 0) {
            this.requestAnalyzeLine.emit({ lineNumber });
          }
        }
      });
    }

    // Apply any existing inline comments
    this.applyInlineComments();

    // Apply pending reveal
    if (typeof this.revealLine === 'number' && this.revealLine > 0) {
      this.revealAndHighlightLine(this.revealLine);
    } else if (this.pendingRevealLine && this.pendingRevealLine > 0) {
      this.revealAndHighlightLine(this.pendingRevealLine);
      this.pendingRevealLine = null;
    }
  }

  private applyChangedLineGlyphs(): void {
    if (!this.editor || !this.monaco) { return; }
    const monaco = this.monaco;
    const modified = this.editor.getModifiedEditor?.();
    if (!modified) { return; }

    const changes = this.editor.getLineChanges?.() || [];
    const decorations: any[] = [];
    for (const change of changes) {
      const start = Math.max(1, change.modifiedStartLineNumber || 0);
      const end = Math.max(start, change.modifiedEndLineNumber || start);
      for (let line = start; line <= end; line++) {
        decorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            glyphMarginClassName: 'ai-glyph',
            glyphMarginHoverMessage: { value: 'Analyze changes on this line (AI)' }
          }
        });
      }
    }

    this.glyphDecorationIds = modified.deltaDecorations(this.glyphDecorationIds, decorations);
  }

  private applyInlineComments(): void {
    if (!this.editor || !this.monaco) { return; }
    const modified = this.editor.getModifiedEditor?.();
    if (!modified) { return; }
    const comments = this.lineComments || [];

    // Remove widgets no longer present
    const ids = new Set(comments.map(c => c.id));
    for (const [id, widget] of Array.from(this.commentWidgets.entries())) {
      if (!ids.has(id)) {
        try { this.editor.removeContentWidget(widget); } catch { /* noop */ }
        this.commentWidgets.delete(id);
      }
    }

    // Add/update widgets for each comment
    for (const c of comments) {
      if (this.commentWidgets.has(c.id)) { continue; }
      const dom = document.createElement('div');
      dom.className = 'ff-ai-comment';
      dom.innerHTML = `
        <div class="ff-ai-comment-header">
          <span class="codicon codicon-lightbulb"></span>
          <span class="ff-ai-severity">${c.severity}</span>
          <span style="opacity:.7;">Line ${c.lineNumber}</span>
        </div>
        <div>${this.escapeHtml(c.content)}</div>
        ${c.suggestion ? `<pre style="margin:6px 0 0; padding:6px; background: var(--vscode-textBlockQuote-background, #2a2a2a); border-radius:4px;">${this.escapeHtml(c.suggestion)}</pre>` : ''}
      `;

      const widget: any = {
        getId: () => `ff-ai-comment-${c.id}`,
        getDomNode: () => dom,
        getPosition: () => ({
          position: { lineNumber: Math.max(1, c.lineNumber), column: 1 },
          preference: [this.monaco.editor.ContentWidgetPositionPreference.BELOW]
        })
      };
      try {
        this.editor.addContentWidget(widget);
        this.commentWidgets.set(c.id, widget);
      } catch { /* noop */ }
    }
  }

  private escapeHtml(input: string): string {
    return (input || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private revealAndHighlightLine(line: number): void {
    if (!this.editor || !this.monaco) { this.pendingRevealLine = line; return; }
    const modified = this.editor.getModifiedEditor?.();
    if (!modified) { this.pendingRevealLine = line; return; }

    try {
      const range = new this.monaco.Range(line, 1, Math.max(line, 1), 1);
      modified.revealRangeInCenter?.(range);
      this.highlightDecorationIds = modified.deltaDecorations(
        this.highlightDecorationIds,
        [{
          range,
          options: { isWholeLine: true, className: 'ff-ai-highlight-line' }
        }]
      );
    } catch { /* noop */ }
  }

  private clearHighlight(): void {
    try {
      const modified = this.editor?.getModifiedEditor?.();
      if (modified && this.highlightDecorationIds.length > 0) {
        this.highlightDecorationIds = modified.deltaDecorations(this.highlightDecorationIds, []);
      }
    } catch { /* noop */ }
  }
}
