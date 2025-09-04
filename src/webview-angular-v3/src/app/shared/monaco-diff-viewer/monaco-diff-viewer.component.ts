import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { WebviewMessagingService } from '../../core/services/webview-messaging.service';

type ThreadSide = 'left' | 'right';

export interface MonacoDiffCommentThread {
  threadId: number;
  side: ThreadSide;
  line: number;
  status: string;
  messages: Array<{ id: number; author: string; content: string; publishedDate?: string; isSystem?: boolean }>;
}
@Component({
  selector: 'ff-monaco-diff-viewer',
  standalone: true,
  template: `
    <div #container style="width:100%; height:100%;"></div>
  `
})
export class MonacoDiffViewerComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;

  @Input() leftText: string = '';
  @Input() rightText: string = '';
  @Input() leftLabel: string = 'Original';
  @Input() rightLabel: string = 'Modified';
  @Input() filePath: string = '';
  @Input() prId: number = 0;
  @Input() oldFilePath?: string;
  @Input() comments: MonacoDiffCommentThread[] = [];

  private editor: any | undefined;
  private monaco: any | undefined;
  private leftModel: any | undefined;
  private rightModel: any | undefined;
  private decorationsOriginal: string[] = [];
  private decorationsModified: string[] = [];
  private openWidgetId: string | null = null;
  private openWidgetTextarea: HTMLTextAreaElement | null = null;
  private openAnalyzeBtn: HTMLButtonElement | null = null;
  private messageSub: any;

  constructor(private readonly bus: WebviewMessagingService) {
    this.messageSub = this.bus.onMessage().subscribe((msg: any) => {
      try {
        if (!msg || msg.type !== 'suggestCommentResult') return;
        const p = msg.payload || {};
        if (String(p.filePath || '') !== this.filePath) return;
        if (!this.openWidgetId) return;
        const parts = this.openWidgetId.split('-');
        const side = parts[3];
        const line = Number(parts[4]);
        if (p.side !== side || Number(p.line) !== line) return;
        if (this.openWidgetTextarea) {
          this.openWidgetTextarea.value = String(p.text || '');
          try { this.openWidgetTextarea.focus(); } catch { /* noop */ }
        }
        if (this.openAnalyzeBtn) {
          this.openAnalyzeBtn.disabled = false;
          this.openAnalyzeBtn.textContent = 'Analyze with Copilot';
        }
      } catch { /* noop */ }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initMonaco();
    this.ensureStyles();
    this.render();
  }

  ngOnDestroy(): void {
    try {
      this.leftModel?.dispose?.();
      this.rightModel?.dispose?.();
      this.editor?.dispose?.();
    } catch { /* noop */ }
    try { this.messageSub?.unsubscribe?.(); } catch { /* noop */ }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.monaco || !this.editor) { return; }
    const fileChanged = !!(changes['filePath']);
    const textChanged = !!(changes['leftText'] || changes['rightText']);
    if (fileChanged) {
      this.render();
      return;
    }
    if (textChanged) {
      try {
        this.leftModel?.setValue?.(this.leftText ?? '');
        this.rightModel?.setValue?.(this.rightText ?? '');
      } catch { /* noop */ }
    }
    if (changes['comments']) {
      this.applyComments();
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
    if ((window as any).monaco) {
      this.monaco = (window as any).monaco;
      return;
    }
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
    this.leftModel?.dispose?.();
    this.rightModel?.dispose?.();
    this.editor?.dispose?.();
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
    this.applyComments();
    this.installClickHandlers();
  }

  private ensureStyles(): void {
    const id = 'ff-monaco-comment-styles';
    if (document.getElementById(id)) { return; }
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .ff-comment-glyph {
        background: url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21 15a3 3 0 0 1-3 3H8l-5 4V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v9z' stroke='%23c5e1ff' stroke-width='1.5' fill='%234ea1ff'/%3E%3Ccircle cx='8' cy='11' r='1.2' fill='white'/%3E%3Ccircle cx='12' cy='11' r='1.2' fill='white'/%3E%3Ccircle cx='16' cy='11' r='1.2' fill='white'/%3E%3C/svg%3E") no-repeat center center;
      }
      .ff-comment-widget {
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        border: 1px solid var(--vscode-panel-border, #333);
        border-radius: 6px;
        background: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        max-width: 520px;
        z-index: 50;
      }
      .ff-comment-widget header {
        padding: 6px 8px;
        border-bottom: 1px solid var(--vscode-panel-border, #333);
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
      }
      .ff-comment-widget .body {
        padding: 8px;
        max-height: 220px;
        overflow: auto;
      }
      .ff-comment-msg { margin-bottom: 8px; }
      .ff-comment-author { font-size: 12px; color: var(--vscode-descriptionForeground); }
      .ff-comment-content { white-space: pre-wrap; }
      .ff-comment-close { margin-left:auto; cursor:pointer; opacity:0.8; }
      .ff-actions { display:flex; gap:8px; align-items:center; }
      .ff-actions button { padding: 4px 10px; border: 1px solid var(--vscode-panel-border,#444); background: var(--vscode-button-secondaryBackground,#2a2a2a); color: var(--vscode-button-foreground,#fff); border-radius: 4px; cursor: pointer; }
      .ff-actions button:disabled { opacity: 0.6; cursor: default; }
      .ff-comment-widget textarea { background: var(--vscode-editorWidget-background); color: var(--vscode-editor-foreground); border: 1px solid var(--vscode-panel-border,#333); border-radius: 4px; padding: 6px; font-family: var(--vscode-editor-font-family, Consolas, monospace); }
    `;
    document.head.appendChild(style);
  }

  private applyComments(): void {
    if (!this.monaco || !this.editor) { return; }
    const monaco = this.monaco;
    const original = this.editor.getOriginalEditor();
    const modified = this.editor.getModifiedEditor();
    const rightDecs = [] as any[];
    const leftDecs = [] as any[];
    for (const t of this.comments || []) {
      const line = Math.max(1, Number(t.line || 1));
      const hoverLines = (t.messages || []).slice(0, 5).map(m => `- ${this.escapeMarkdown(m.author)}: ${this.escapeMarkdown(m.content)}`).join('\n');
      const hover = { value: `Thread #${t.threadId} (${t.status})\n${hoverLines}` } as any;
      const dec = {
        range: new monaco.Range(line, 1, line, 1),
        options: { isWholeLine: true, glyphMarginClassName: 'ff-comment-glyph', glyphMarginHoverMessage: hover }
      };
      if (t.side === 'right') rightDecs.push(dec); else leftDecs.push(dec);
    }
    try {
      this.decorationsOriginal = original.deltaDecorations(this.decorationsOriginal, leftDecs);
      this.decorationsModified = modified.deltaDecorations(this.decorationsModified, rightDecs);
    } catch { /* noop */ }
  }

  private installClickHandlers(): void {
    if (!this.editor || !this.monaco) { return; }
    const monaco = this.monaco;
    const original = this.editor.getOriginalEditor();
    const modified = this.editor.getModifiedEditor();
    const onMouse = (side: ThreadSide) => (e: any) => {
      try {
        if (e?.target?.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) return;
        const lineNumber = e.target.position?.lineNumber ? Number(e.target.position.lineNumber) : 1;
        const threads = (this.comments || []).filter(t => t.side === side && Number(t.line) === lineNumber);
        this.toggleThreadWidget(side, lineNumber, threads);
      } catch { /* noop */ }
    };
    original.onMouseDown(onMouse('left'));
    modified.onMouseDown(onMouse('right'));
  }

  private toggleThreadWidget(side: ThreadSide, lineNumber: number, threads: MonacoDiffCommentThread[]): void {
    if (!this.monaco || !this.editor) return;
    const editor = side === 'left' ? this.editor.getOriginalEditor() : this.editor.getModifiedEditor();
    const id = `ff-comment-thread-${side}-${lineNumber}`;
    if (this.openWidgetId === id) {
      try { editor.removeContentWidget({ getId: () => id, getDomNode: () => document.createElement('div'), getPosition: () => null }); } catch { /* noop */ }
      this.openWidgetId = null;
      return;
    }
    if (this.openWidgetId) {
      try {
        const [prevSide] = this.openWidgetId.split('-').slice(-2);
        const prevEditor = prevSide === 'right' ? this.editor.getModifiedEditor() : this.editor.getOriginalEditor();
        prevEditor.removeContentWidget({ getId: () => this.openWidgetId!, getDomNode: () => document.createElement('div'), getPosition: () => null });
      } catch { /* noop */ }
    }
    const widgetEl = this.buildThreadWidget(side, lineNumber, threads);
    const widget = {
      getId: () => id,
      getDomNode: () => widgetEl,
      getPosition: () => ({ position: { lineNumber, column: 1 }, preference: [this.monaco.editor.ContentWidgetPositionPreference.BELOW] })
    } as any;
    try {
      editor.addContentWidget(widget);
      this.openWidgetId = id;
    } catch { /* noop */ }
  }

  private buildThreadWidget(side: ThreadSide, lineNumber: number, threads: MonacoDiffCommentThread[]): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'ff-comment-widget';
    const header = document.createElement('div');
    header.className = 'header';
    header.innerText = threads.length ? `Comment thread (${threads[0]?.status || 'active'})` : 'New comment';
    const close = document.createElement('span');
    close.className = 'ff-comment-close';
    close.innerText = '✕';
    close.title = 'Close';
    close.onclick = () => {
      if (!this.openWidgetId || !this.editor) return;
      try {
        const [s] = this.openWidgetId.split('-').slice(-2);
        const ed = s === 'right' ? this.editor.getModifiedEditor() : this.editor.getOriginalEditor();
        ed.removeContentWidget({ getId: () => this.openWidgetId!, getDomNode: () => el, getPosition: () => null } as any);
      } catch { /* noop */ }
      this.openWidgetId = null;
    };
    header.appendChild(close);
    el.appendChild(header);
    const body = document.createElement('div');
    body.className = 'body';
    if (threads.length) {
      for (const t of threads) {
        for (const m of t.messages) {
          const msg = document.createElement('div');
          msg.className = 'ff-comment-msg';
          const who = document.createElement('div');
          who.className = 'ff-comment-author';
          who.innerText = `${m.author}${m.publishedDate ? ' • ' + new Date(m.publishedDate).toLocaleString() : ''}`;
          const content = document.createElement('div');
          content.className = 'ff-comment-content';
          content.innerText = m.content || '';
          msg.appendChild(who);
          msg.appendChild(content);
          body.appendChild(msg);
        }
      }
    } else {
      const hint = document.createElement('div');
      hint.className = 'ff-comment-author';
      hint.innerText = `Add a comment at line ${lineNumber} (${side})`;
      body.appendChild(hint);
    }
    // Reply / New Comment form
    const form = document.createElement('div');
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
    form.style.gap = '8px';
    form.style.marginTop = '8px';
    const textarea = document.createElement('textarea');
    textarea.style.width = '100%';
    textarea.style.minHeight = '60px';
    textarea.placeholder = threads.length ? 'Write a reply…' : 'Write a new comment…';
    const actions = document.createElement('div');
    actions.className = 'ff-actions';
    const submit = document.createElement('button');
    submit.textContent = threads.length ? 'Reply' : 'Comment';
    submit.onclick = () => {
      const text = textarea.value.trim();
      if (!text) return;
      if (threads.length) {
        const t = threads[0];
        this.bus.postMessage({ type: 'replyToCommentThread', payload: { prId: this.prId, threadId: t.threadId, content: text, filePath: this.filePath, oldFilePath: this.oldFilePath, side: t.side, line: t.line } });
      } else {
        this.bus.postMessage({ type: 'createCommentThread', payload: { prId: this.prId, filePath: this.filePath, oldFilePath: this.oldFilePath, side, line: lineNumber, content: text } });
      }
      if (this.openWidgetId && this.editor) {
        const [s] = this.openWidgetId.split('-').slice(-2);
        const ed = s === 'right' ? this.editor.getModifiedEditor() : this.editor.getOriginalEditor();
        try { ed.removeContentWidget({ getId: () => this.openWidgetId!, getDomNode: () => el, getPosition: () => null } as any); } catch { /* noop */ }
        this.openWidgetId = null;
      }
    };
    const analyze = document.createElement('button');
    analyze.textContent = 'Analyze with Copilot';
    analyze.onclick = () => {
      try {
        (analyze as HTMLButtonElement).disabled = true;
        (analyze as HTMLButtonElement).textContent = 'Analyzing…';
        this.bus.postMessage({ type: 'suggestComment', payload: { prId: this.prId, filePath: this.filePath, oldFilePath: this.oldFilePath, side, line: lineNumber } });
      } catch { /* noop */ } finally {
        this.openAnalyzeBtn = analyze as HTMLButtonElement;
      }
    };
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.onclick = () => {
      if (!this.openWidgetId || !this.editor) return;
      const [s] = this.openWidgetId.split('-').slice(-2);
      const ed = s === 'right' ? this.editor.getModifiedEditor() : this.editor.getOriginalEditor();
      try { ed.removeContentWidget({ getId: () => this.openWidgetId!, getDomNode: () => el, getPosition: () => null } as any); } catch { /* noop */ }
      this.openWidgetId = null;
    };
    actions.appendChild(submit);
    actions.appendChild(analyze);
    actions.appendChild(cancel);
    form.appendChild(textarea);
    form.appendChild(actions);
    el.appendChild(body);
    el.appendChild(form);
    this.openWidgetTextarea = textarea as HTMLTextAreaElement;
    return el;
  }

  private escapeMarkdown(value: string): string {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/`/g, '\\`')
      .replace(/\|/g, '\\|');
  }
}
