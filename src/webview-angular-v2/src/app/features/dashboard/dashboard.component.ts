import { Component, OnInit, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { HlmButton } from "@spartan-ng/helm/button";
import { DashboardStore } from '../../core/state/dashboard.store';

@Component({
    selector: 'dashboard-root',
    standalone: true,
    imports: [CommonModule, HlmButton, FormsModule, ReactiveFormsModule],
    templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
    private readonly store = inject(DashboardStore);
    private readonly fb = inject(FormBuilder);

    // Config form
    configForm = this.fb.group({
        organizationUrl: [''],
        personalAccessToken: [''],
        defaultProject: ['']
    });

    // Filters form
    filterForm = this.fb.group({
        query: [''],
        repositoryId: [''],
        author: [''],
        status: ['active']
    });

    // Store signals for template
    configured = computed(() => this.store.configured());
    loading = computed(() => this.store.loading());
    repositories = computed(() => this.store.repositories());
    pullRequests = computed(() => this.store.pullRequests());
    totalCount = computed(() => this.store.totalCount());
    error = computed(() => this.store.error?.() || null);
    success = computed(() => this.store.success?.() || null);
    analysis = computed(() => this.store.analysis());

    ngOnInit(): void {
        // Load configuration on init
        this.store.loadConfig();

        // React to config changes to sync the form
        effect(() => {
            const cfg = this.store.config();
            this.configForm.patchValue({
                organizationUrl: cfg.organizationUrl || '',
                defaultProject: cfg.defaultProject || ''
            }, { emitEvent: false });
        });

        // Load repositories whenever defaultProject changes and we are configured
        effect(() => {
            const project = this.store.config().defaultProject;
            if (this.store.configured() && project) {
                this.store.loadRepositories(project);
            }
        });
    }

    // UI actions
    testOrganization(): void {
        const { organizationUrl } = this.configForm.value;
        this.store.testOrganization(String(organizationUrl || ''));
    }

    testPat(): void {
        const { personalAccessToken } = this.configForm.value;
        this.store.testPat(String(personalAccessToken || ''));
    }

    saveConfig(): void {
        const value = this.configForm.value;
        this.store.saveConfig({
            organizationUrl: String(value.organizationUrl || ''),
            personalAccessToken: String(value.personalAccessToken || ''),
            defaultProject: String(value.defaultProject || '')
        });
    }

    loadPullRequests(): void {
        const f = this.filterForm.value;
        this.store.loadPullRequests({
            query: String(f.query || ''),
            repositoryId: String(f.repositoryId || ''),
            author: String(f.author || ''),
            status: String(f.status || 'active') as any
        });
    }

    applySearch(): void {
        const f = this.filterForm.value;
        this.store.searchPullRequests({
            query: String(f.query || ''),
            repositoryId: String(f.repositoryId || ''),
            author: String(f.author || ''),
            status: String(f.status || 'active') as any
        });
    }

    selectRepository(repoId: string): void {
        this.filterForm.patchValue({ repositoryId: repoId });
        this.applySearch();
    }

    reviewPR(prId: number): void {
        this.store.startAIAnalysis(prId);
    }
}

