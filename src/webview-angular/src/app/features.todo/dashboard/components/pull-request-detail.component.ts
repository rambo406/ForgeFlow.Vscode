import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PullRequest, AnalysisProgress } from '@core/models';
import { 
  AppButtonComponent,
  AppCardComponent,
  AppBadgeComponent
} from '@shared/components';

@Component({
  selector: 'app-pull-request-detail',
  standalone: true,
  imports: [
    CommonModule,
    AppButtonComponent,
    AppCardComponent,
    AppBadgeComponent
  ],
  template: `
    <div class="h-full flex flex-col">
      <!-- Header -->
      <div class="border-b border-border bg-card p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <app-button 
              variant="outline" 
              size="sm"
              (onClick)="onBack()"
            >
              ← Back to List
            </app-button>
            
            @if (pullRequest) {
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-semibold">{{ pullRequest.title }}</h2>
                <app-badge [variant]="getStatusVariant(pullRequest.status)">
                  {{ getStatusLabel(pullRequest.status) }}
                </app-badge>
                @if (pullRequest.isDraft) {
                  <app-badge variant="secondary">Draft</app-badge>
                }
              </div>
            }
          </div>
          
          <div class="flex gap-2">
            @if (!isAnalysisRunning) {
              <app-button 
                variant="outline"
                (onClick)="onStartAnalysis()"
                [disabled]="!pullRequest"
              >
                Start AI Analysis
              </app-button>
            } @else {
              <app-button 
                variant="destructive"
                (onClick)="onCancelAnalysis()"
              >
                Cancel Analysis
              </app-button>
            }
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto p-4">
        @if (isLoading) {
          <div class="flex items-center justify-center h-full">
            <div class="text-muted-foreground">Loading pull request details...</div>
          </div>
        } @else if (!pullRequest) {
          <div class="flex items-center justify-center h-full">
            <div class="text-muted-foreground">No pull request selected</div>
          </div>
        } @else {
          <div class="space-y-6">
            <!-- Pull Request Info -->
            <app-card title="Pull Request Information">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-sm font-medium text-muted-foreground">Author</label>
                  <div class="flex items-center gap-2 mt-1">
                    @if (pullRequest.authorImageUrl) {
                      <img 
                        [src]="pullRequest.authorImageUrl" 
                        [alt]="pullRequest.author"
                        class="w-6 h-6 rounded-full"
                      />
                    }
                    <span>{{ pullRequest.author }}</span>
                  </div>
                </div>
                
                <div>
                  <label class="text-sm font-medium text-muted-foreground">Repository</label>
                  <div class="mt-1">{{ pullRequest.repository }}</div>
                </div>
                
                <div>
                  <label class="text-sm font-medium text-muted-foreground">Created</label>
                  <div class="mt-1">{{ formatDate(pullRequest.createdDate) }}</div>
                </div>
                
                <div>
                  <label class="text-sm font-medium text-muted-foreground">Branches</label>
                  <div class="mt-1 text-sm">
                    {{ pullRequest.sourceRefName }} → {{ pullRequest.targetRefName }}
                  </div>
                </div>
              </div>
              
              @if (pullRequest.description) {
                <div class="mt-4">
                  <label class="text-sm font-medium text-muted-foreground">Description</label>
                  <div class="mt-1 p-3 bg-muted rounded-md text-sm">
                    {{ pullRequest.description }}
                  </div>
                </div>
              }
            </app-card>

            <!-- Analysis Progress -->
            @if (isAnalysisRunning && analysisProgress) {
              <app-card title="AI Analysis Progress">
                <div class="space-y-3">
                  <div class="flex justify-between text-sm">
                    <span>{{ analysisProgress.message || 'Analyzing...' }}</span>
                    <span>{{ analysisProgress.percentage }}%</span>
                  </div>
                  <div class="w-full bg-muted rounded-full h-2">
                    <div 
                      class="bg-primary h-2 rounded-full transition-all duration-300"
                      [style.width.%]="analysisProgress.percentage"
                    ></div>
                  </div>
                  <div class="text-xs text-muted-foreground">
                    Stage: {{ analysisProgress.stage }}
                  </div>
                </div>
              </app-card>
            }

            <!-- Analysis Results -->
            @if (analysisResults && !isAnalysisRunning) {
              <app-card title="AI Analysis Results">
                <div class="space-y-4">
                  @if (analysisResults.summary) {
                    <div>
                      <h4 class="font-medium mb-2">Summary</h4>
                      <div class="p-3 bg-muted rounded-md text-sm">
                        {{ analysisResults.summary }}
                      </div>
                    </div>
                  }
                  
                  @if (analysisResults.comments && analysisResults.comments.length > 0) {
                    <div>
                      <h4 class="font-medium mb-2">
                        Comments ({{ analysisResults.comments.length }})
                      </h4>
                      <div class="space-y-2">
                        @for (comment of analysisResults.comments.slice(0, 5); track comment.id) {
                          <div class="p-3 border border-border rounded-md">
                            <div class="flex justify-between items-start mb-2">
                              <span class="text-sm font-medium">{{ comment.filePath }}</span>
                              <app-badge 
                                [variant]="getSeverityVariant(comment.severity)"
                                additionalClasses="text-xs"
                              >
                                {{ comment.severity }}
                              </app-badge>
                            </div>
                            <div class="text-sm text-muted-foreground">
                              {{ comment.content }}
                            </div>
                          </div>
                        }
                        @if (analysisResults.comments.length > 5) {
                          <div class="text-sm text-muted-foreground text-center py-2">
                            And {{ analysisResults.comments.length - 5 }} more comments...
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </app-card>
            }
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PullRequestDetailComponent {
  @Input() pullRequest: PullRequest | undefined = undefined;
  @Input() isLoading = false;
  @Input() analysisResults: any = null;
  @Input() analysisProgress: AnalysisProgress | undefined = undefined;
  @Input() isAnalysisRunning = false;
  
  @Output() back = new EventEmitter<void>();
  @Output() startAnalysis = new EventEmitter<void>();
  @Output() cancelAnalysis = new EventEmitter<void>();

  onBack(): void {
    this.back.emit();
  }

  onStartAnalysis(): void {
    this.startAnalysis.emit();
  }

  onCancelAnalysis(): void {
    this.cancelAnalysis.emit();
  }

  getStatusVariant(status: any): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'abandoned': return 'destructive';
      default: return 'outline';
    }
  }

  getStatusLabel(status: any): string {
    switch (status) {
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      case 'abandoned': return 'Abandoned';
      default: return 'Unknown';
    }
  }

  getSeverityVariant(severity: any): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}