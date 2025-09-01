import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MessageService, MessageType } from '../../../core/services/message.service';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 space-y-4">
      <h1 class="text-xl font-semibold">Azure DevOps PR Reviewer</h1>
      <p class="text-sm text-muted-foreground">AI-powered PR reviews for Azure DevOps</p>

      <div class="border border-vscode-panel-border rounded-md p-4 bg-vscode-panel-background">
        <h2 class="text-base font-medium mb-2">Getting Started</h2>
        <div class="flex gap-2 flex-wrap">
          <button class="px-3 py-1.5 rounded bg-vscode-button-background text-vscode-button-foreground" (click)="openDashboard()">Open Dashboard</button>
          <button class="px-3 py-1.5 rounded bg-transparent border border-vscode-panel-border" (click)="openSettings()">Configure</button>
          <button class="px-3 py-1.5 rounded bg-transparent border border-vscode-panel-border" (click)="testConnection()">Test Connection</button>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-3">
        <div class="p-3 rounded border border-dashed border-vscode-panel-border">• Analyze PRs and generate review comments automatically.</div>
        <div class="p-3 rounded border border-dashed border-vscode-panel-border">• Fine-tune with custom review instructions.</div>
        <div class="p-3 rounded border border-dashed border-vscode-panel-border">• Browse and filter PRs in the Dashboard.</div>
        <div class="p-3 rounded border border-dashed border-vscode-panel-border">• Validate settings and test connectivity.</div>
      </div>
    </div>
  `
})
export class OverviewComponent implements OnInit {
  private router = inject(Router);
  private messages = inject(MessageService);

  ngOnInit(): void {
    // Preload config so Overview can later render smarter content if needed
    this.messages.loadConfiguration().catch(() => void 0);
  }

  openDashboard(): void {
    this.router.navigateByUrl('/dashboard').catch(err => console.error(err));
  }

  openSettings(): void {
    this.messages.openSettings();
  }

  testConnection(): void {
    this.messages.testConnection({});
  }
}
