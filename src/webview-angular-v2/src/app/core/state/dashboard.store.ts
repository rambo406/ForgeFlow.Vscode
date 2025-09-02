import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { signalStore, withComputed, withMethods, withState, patchState } from '@ngrx/signals';
import { MessageBusService } from '../services/message-bus.service';
import {
    ConfigPayload,
    FilterParams,
    MessageType,
    PullRequestItem,
    RepositoryInfo,
    WebviewMessage,
    LanguageModelInfo
} from '../models/messages';

type ConfigState = {
    organizationUrl?: string;
    defaultProject?: string;
};

type AnalysisState = {
    inProgress: boolean;
    progress: number; // 0..100
    message?: string;
};

type DashboardState = {
    config: ConfigState;
    configured: boolean;
    repositories: RepositoryInfo[];
    pullRequests: PullRequestItem[];
    totalCount: number;
    loading: boolean;
    error?: string;
    success?: string;
    analysis: AnalysisState;
    availableModels: LanguageModelInfo[];
};

const initialState: DashboardState = {
    config: {},
    configured: false,
    repositories: [],
    pullRequests: [],
    totalCount: 0,
    loading: false,
    error: undefined,
    success: undefined,
    analysis: { inProgress: false, progress: 0 },
    availableModels: []
};

export const DashboardStore = signalStore(
        { providedIn: 'root' },
        withState(initialState),
        withMethods((store, bus = inject(MessageBusService)) => {
            const methods = {
                // Outgoing actions
                loadConfig() {
                    bus.post(MessageType.LOAD_CONFIG);
                    patchState(store, { loading: true, error: undefined, success: undefined });
                },
                saveConfig(input: { organizationUrl: string; personalAccessToken: string; defaultProject: string }) {
                    bus.post(MessageType.SAVE_CONFIG, { config: input });
                    // optimistic: wait for success message
                    patchState(store, { loading: true, error: undefined, success: undefined });
                },
                testOrganization(organizationUrl: string) {
                    bus.post(MessageType.TEST_CONNECTION, { testType: 'organization', organizationUrl });
                },
                testPat(personalAccessToken: string) {
                    bus.post(MessageType.TEST_CONNECTION, { testType: 'patToken', personalAccessToken });
                },
                testProject(projectName: string, organizationUrl: string, personalAccessToken: string) {
                    bus.post(MessageType.TEST_CONNECTION, { testType: 'project', projectName, organizationUrl, patToken: personalAccessToken });
                },
                testModel(modelName: string) {
                    bus.post(MessageType.TEST_CONNECTION, { testType: 'model', modelName });
                },
                loadRepositories(project?: string) {
                    bus.post(MessageType.LOAD_REPOSITORIES, { project });
                },
                loadPullRequests(filters?: FilterParams) {
                    patchState(store, { loading: true, error: undefined });
                    bus.post(MessageType.LOAD_PULL_REQUESTS, { filters });
                },
                searchPullRequests(filters?: FilterParams) {
                    patchState(store, { loading: true, error: undefined });
                    const payload: any = {
                        query: filters?.query,
                        projectName: store.config().defaultProject,
                        repositoryId: filters?.repositoryId
                    };
                    bus.post(MessageType.SEARCH_PULL_REQUESTS, payload);
                },
                loadAvailableModels() {
                    bus.post(MessageType.LOAD_AVAILABLE_MODELS);
                },
                startAIAnalysis(prId: number) {
                    patchState(store, {
                        analysis: { inProgress: true, progress: 0, message: 'Starting' },
                        success: undefined,
                        error: undefined
                    });
                    bus.post(MessageType.START_AI_ANALYSIS, { prId });
                }
            };

            // Initialize message subscription
            bus.onMessage().subscribe((msg) => handleMessage(msg));

            // Also handle NAVIGATE messages explicitly to perform router navigation
            // (this keeps navigation logic in the webview and protects against missing payloads)
            bus.onMessage().subscribe((msg) => {
                if (msg && msg.type === MessageType.NAVIGATE) {
                    const path = (msg.payload && (msg.payload as any).path) || '';
                    if (path) {
                        try {
                            // Router is injected lazily to avoid circular deps during store creation
                            const router = inject(Router, { optional: true });
                            if (router && typeof router.navigateByUrl === 'function') {
                                // navigate without adding history entry if desired — but initial navigation should be fine
                                router.navigateByUrl(path).catch((e) => {
                                    // swallow navigation errors to avoid surfacing during boot
                                    // eslint-disable-next-line no-console
                                    console.warn('Navigation failed:', e);
                                });
                            }
                        } catch (e) {
                            // ignore errors; navigation is best-effort
                        }
                    }
                }
            });

            function handleMessage(message: WebviewMessage<any>) {
                switch (message.type) {
                    case MessageType.TEST_CONNECTION: {
                        const ok = (message.payload as any)?.success === true;
                        const m = (message.payload as any)?.message || (message.payload as any)?.error;
                        patchState(store, {
                            success: ok ? m || 'Connection OK' : undefined,
                            error: ok ? undefined : (m || 'Connection failed')
                        });
                        break;
                    }
                    case MessageType.LOAD_CONFIG: {
                        const payload = message.payload as ConfigPayload;
                        const cfg = payload?.config || {};
                        const configured = !!cfg.organizationUrl && !!cfg.defaultProject;
                        patchState(store, {
                            config: {
                                organizationUrl: cfg.organizationUrl,
                                defaultProject: cfg.defaultProject
                            },
                            configured,
                            loading: false
                        });
                        if (configured) {
                            // auto-load PRs on first load
                            methods.loadPullRequests();
                        }
                        break;
                    }
                    case MessageType.SAVE_CONFIG: {
                        const ok = (message.payload as any)?.success === true;
                        patchState(store, {
                            success: ok ? 'Configuration saved successfully' : undefined,
                            loading: false
                        });
                        // Ask to reload config to reflect defaults
                        methods.loadConfig();
                        break;
                    }
                    case MessageType.SHOW_ERROR: {
                        const msg = (message.payload as any)?.message || 'An error occurred';
                        patchState(store, {
                            error: msg,
                            loading: false,
                            analysis: { ...store.analysis(), inProgress: false }
                        });
                        break;
                    }
                    case MessageType.SHOW_SUCCESS: {
                        const msg = (message.payload as any)?.message || 'Success';
                        patchState(store, { success: msg, loading: false });
                        break;
                    }
                    case MessageType.LOAD_REPOSITORIES: {
                        const repos = (message.payload as any)?.repositories as RepositoryInfo[] || [];
                        patchState(store, { repositories: repos });
                        break;
                    }
                    case MessageType.LOAD_AVAILABLE_MODELS: {
                        const models = (message.payload as any)?.models as LanguageModelInfo[] || [];
                        patchState(store, { availableModels: models });
                        break;
                    }
                    case MessageType.LOAD_PULL_REQUESTS:
                    case MessageType.SEARCH_PULL_REQUESTS:
                    case MessageType.FILTER_PULL_REQUESTS: {
                        // Normalize payloads from extension
                        const prs = (message.payload as any)?.pullRequests as PullRequestItem[] || [];
                        const total = (message.payload as any)?.total || (message.payload as any)?.totalCount || prs.length;
                        patchState(store, { pullRequests: prs, totalCount: total, loading: false });
                        break;
                    }
                    case MessageType.AI_ANALYSIS_PROGRESS: {
                        const p = (message.payload as any)?.progress;
                        if (p) {
                            patchState(store, {
                                analysis: {
                                    inProgress: true,
                                    progress: Number(p.percentage) || 0,
                                    message: p.message || p.currentFileName
                                }
                            });
                        }
                        break;
                    }
                    case MessageType.AI_ANALYSIS_COMPLETE: {
                        patchState(store, { analysis: { inProgress: false, progress: 100, message: 'Complete' } });
                        break;
                    }
                }
            }

            return methods;
        })
);
