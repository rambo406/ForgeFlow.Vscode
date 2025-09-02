import { AfterViewInit, Component, DestroyRef, ElementRef, Input, OnDestroy, ViewChild, effect } from '@angular/core';

@Component({
  selector: 'ff-monaco-diff-viewer',
  standalone: true,
  template: `
    <div #container style="width:100%; height:100%;"></div>
  `
})
export class MonacoDiffViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;

  @Input() leftText: string = '';
  @Input() rightText: string = '';
  @Input() leftLabel: string = 'Original';
  @Input() rightLabel: string = 'Modified';
  @Input() filePath: string = '';

  private editor: any | undefined;
  private monaco: any | undefined;
  private leftModel: any | undefined;
  private rightModel: any | undefined;

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

    const language = this.getLanguageFromPath(this.filePath);
    this.leftModel = monaco.editor.createModel(this.leftText ?? '', language, monaco.Uri.parse(`inmemory://model/left/${this.filePath}`));
    this.rightModel = monaco.editor.createModel(this.rightText ?? '', language, monaco.Uri.parse(`inmemory://model/right/${this.filePath}`));

    this.editor = monaco.editor.createDiffEditor(this.container.nativeElement, {
      readOnly: true,
      renderSideBySide: true,
      automaticLayout: true,
      originalEditable: false,
      minimap: { enabled: false },
      glyphMargin: false,
      scrollBeyondLastLine: false,
      wordWrap: 'off',
      'semanticHighlighting.enabled': false
    });
    this.editor.setModel({ original: this.leftModel, modified: this.rightModel });
  }
}
