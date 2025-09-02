import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { DashboardStore } from '../../core/state/dashboard.store';
import { computed } from '@angular/core';

@Component({
    selector: 'connections-root',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, HlmButton],
    templateUrl: './connections.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConnectionsComponent {
    private readonly store = inject(DashboardStore);
    private readonly fb = inject(FormBuilder);

    configured = computed(() => this.store.configured());
    error = computed(() => this.store.error?.() || null);
    success = computed(() => this.store.success?.() || null);
    availableModels = computed(() => this.store.availableModels?.() || []);

    // Configuration form (values will be loaded from store)
    configForm = this.fb.group({
        organizationUrl: [''],
        personalAccessToken: [''],
        defaultProject: ['']
    });

    // Model test form
    modelForm = this.fb.group({
        modelName: ['']
    });

    constructor() {
        // Load current config into form when it changes
        effect(() => {
            const cfg = this.store.config();
            this.configForm.patchValue({
                organizationUrl: cfg.organizationUrl || '',
                defaultProject: cfg.defaultProject || ''
            }, { emitEvent: false });
        });

        // On page init, load config
        this.store.loadConfig();
    }

    // Actions
    saveConfig(): void {
        const v = this.configForm.value;
        this.store.saveConfig({
            organizationUrl: String(v.organizationUrl || ''),
            personalAccessToken: String(v.personalAccessToken || ''),
            defaultProject: String(v.defaultProject || '')
        });
    }

    testOrganization(): void {
        const { organizationUrl } = this.configForm.value;
        this.store.testOrganization(String(organizationUrl || ''));
    }

    testPat(): void {
        const { personalAccessToken } = this.configForm.value;
        this.store.testPat(String(personalAccessToken || ''));
    }

    testProject(): void {
        const { organizationUrl, personalAccessToken, defaultProject } = this.configForm.value;
        this.store.testProject(
            String(defaultProject || ''),
            String(organizationUrl || ''),
            String(personalAccessToken || '')
        );
    }

    loadModels(): void {
        this.store.loadAvailableModels();
    }

    pickModel(name: string): void {
        this.modelForm.patchValue({ modelName: name });
    }

    testModel(): void {
        const { modelName } = this.modelForm.value;
        this.store.testModel(String(modelName || ''));
    }
}

