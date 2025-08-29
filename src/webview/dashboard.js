(function() {
    'use strict';

    // VS Code API
    const vscode = acquireVsCodeApi();
    
    // Message types
    const MessageType = {
        LOAD_CONFIG: 'loadConfig',
        SAVE_CONFIG: 'saveConfig',
        TEST_CONNECTION: 'testConnection',
        LOAD_PULL_REQUESTS: 'loadPullRequests',
        LOAD_REPOSITORIES: 'loadRepositories',
        LOAD_PROJECTS: 'loadProjects',
        SELECT_PULL_REQUEST: 'selectPullRequest',
        LOAD_PR_DETAILS: 'loadPRDetails',
        START_AI_ANALYSIS: 'startAIAnalysis',
        AI_ANALYSIS_PROGRESS: 'aiAnalysisProgress',
        AI_ANALYSIS_COMPLETE: 'aiAnalysisComplete',
        APPROVE_COMMENT: 'approveComment',
        DISMISS_COMMENT: 'dismissComment',
        MODIFY_COMMENT: 'modifyComment',
        EXPORT_COMMENTS: 'exportComments',
        UPDATE_VIEW: 'updateView',
        SHOW_ERROR: 'showError',
        SHOW_SUCCESS: 'showSuccess'
    };

    // Dashboard views
    const DashboardView = {
        CONFIGURATION: 'configuration',
        PULL_REQUEST_LIST: 'pullRequestList',
        PULL_REQUEST_DETAIL: 'pullRequestDetail'
    };

    // Current state
    let currentView = DashboardView.PULL_REQUEST_LIST;
    let currentPR = null;
    let currentAnalysis = null;
    let analysisResults = [];
    let requestCounter = 0;
    let pendingRequests = {};
    
    // Performance optimization state
    let virtualScrollOffset = 0;
    let virtualScrollItemHeight = 80;
    let virtualScrollVisibleCount = 10;
    let performanceCache = new Map();
    let imageCache = new Map();

    // DOM elements
    let elements = {};

    /**
     * Initialize the dashboard
     */
    function initialize() {
        // Cache DOM elements
        elements = {
            configBtn: document.getElementById('configBtn'),
            prListBtn: document.getElementById('prListBtn'),
            prDetailBtn: document.getElementById('prDetailBtn'),
            backBtn: document.getElementById('backBtn'),
            refreshBtn: document.getElementById('refreshBtn'),
            configurationView: document.getElementById('configurationView'),
            pullRequestListView: document.getElementById('pullRequestListView'),
            pullRequestDetailView: document.getElementById('pullRequestDetailView'),
            configContent: document.getElementById('configContent'),
            prListContent: document.getElementById('prListContent'),
            prDetailContent: document.getElementById('prDetailContent'),
            prTitle: document.getElementById('prTitle'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            errorToast: document.getElementById('errorToast'),
            successToast: document.getElementById('successToast')
        };

        // Setup event listeners
        setupEventListeners();

        // Setup VS Code message listener
        window.addEventListener('message', handleMessage);

        // Load initial data
        loadPullRequests();
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Navigation
        elements.configBtn.addEventListener('click', () => showView(DashboardView.CONFIGURATION));
        elements.prListBtn.addEventListener('click', () => showView(DashboardView.PULL_REQUEST_LIST));
        elements.backBtn.addEventListener('click', () => showView(DashboardView.PULL_REQUEST_LIST));
        
        // Actions
        elements.refreshBtn.addEventListener('click', loadPullRequests);

        // Toast close buttons
        document.querySelectorAll('.toast-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.toast').style.display = 'none';
            });
        });
    }

    /**
     * Handle messages from VS Code extension
     */
    function handleMessage(event) {
        const message = event.data;
        
        switch (message.type) {
            case MessageType.LOAD_CONFIG:
                handleLoadConfigResponse(message);
                break;
            case MessageType.SAVE_CONFIG:
                handleSaveConfigResponse(message);
                break;
            case MessageType.TEST_CONNECTION:
                handleTestConnectionResponse(message);
                break;
            case MessageType.LOAD_PULL_REQUESTS:
                handleLoadPullRequestsResponse(message);
                break;
            case MessageType.SEARCH_PULL_REQUESTS:
                handleSearchResponse(message);
                break;
            case MessageType.FILTER_PULL_REQUESTS:
                handleFilterResponse(message);
                break;
            case MessageType.REFRESH_PULL_REQUESTS:
                handleRefreshResponse(message);
                break;
            case MessageType.LOAD_REPOSITORIES:
                handleLoadRepositoriesResponse(message);
                break;
            case MessageType.LOAD_PROJECTS:
                handleLoadProjectsResponse(message);
                break;
            case MessageType.SELECT_PULL_REQUEST:
                handleSelectPullRequestResponse(message);
                break;
            case MessageType.AI_ANALYSIS_PROGRESS:
                handleAIAnalysisProgress(message);
                break;
            case MessageType.AI_ANALYSIS_COMPLETE:
                handleAIAnalysisComplete(message);
                break;
            case MessageType.APPROVE_COMMENT:
                handleCommentAction(message);
                break;
            case MessageType.DISMISS_COMMENT:
                handleCommentAction(message);
                break;
            case MessageType.MODIFY_COMMENT:
                handleCommentAction(message);
                break;
            case MessageType.EXPORT_COMMENTS:
                handleExportResponse(message);
                break;
            case MessageType.SHOW_ERROR:
                showError(message.payload.message);
                break;
            case MessageType.SHOW_SUCCESS:
                showSuccess(message.payload.message);
                break;
            default:
                console.log('Unhandled message type:', message.type);
        }
    }

    /**
     * Send message to VS Code extension
     */
    function sendMessage(type, payload = {}) {
        const requestId = `req_${++requestCounter}`;
        vscode.postMessage({
            type: type,
            payload: payload,
            requestId: requestId
        });
        return requestId;
    }

    /**
     * Show/hide views
     */
    function showView(view) {
        // Hide all views
        Object.values(elements).forEach(el => {
            if (el && el.classList && el.classList.contains('view-container')) {
                el.style.display = 'none';
            }
        });

        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected view
        switch (view) {
            case DashboardView.CONFIGURATION:
                elements.configurationView.style.display = 'block';
                loadConfiguration();
                break;
            case DashboardView.PULL_REQUEST_LIST:
                elements.pullRequestListView.style.display = 'block';
                elements.prListBtn.classList.add('active');
                elements.prDetailBtn.style.display = 'none';
                if (!elements.pullRequestListView.hasAttribute('data-initialized')) {
                    initializePullRequestListView();
                    elements.pullRequestListView.setAttribute('data-initialized', 'true');
                }
                break;
            case DashboardView.PULL_REQUEST_DETAIL:
                elements.pullRequestDetailView.style.display = 'block';
                elements.prDetailBtn.style.display = 'inline-block';
                elements.prDetailBtn.classList.add('active');
                break;
        }

        currentView = view;
        sendMessage(MessageType.UPDATE_VIEW, { view: view });
    }

    /**
     * Load configuration
     */
    function loadConfiguration() {
        showLoading(true);
        sendMessage(MessageType.LOAD_CONFIG);
    }

    /**
     * Handle load configuration response
     */
    function handleLoadConfigResponse(message) {
        showLoading(false);
        
        const config = message.payload.config || {};
        
        // Render configuration form
        elements.configContent.innerHTML = `
            <form id="configForm" class="config-form">
                <div class="form-group">
                    <label for="organizationUrl">Organization URL *</label>
                    <input type="url" id="organizationUrl" name="organizationUrl" 
                           value="${config.organizationUrl || ''}"
                           placeholder="https://dev.azure.com/myorg"
                           required>
                    <small>Your Azure DevOps organization URL</small>
                </div>
                
                <div class="form-group">
                    <label for="personalAccessToken">Personal Access Token *</label>
                    <input type="password" id="personalAccessToken" name="personalAccessToken"
                           value="${config.personalAccessToken || ''}"
                           placeholder="Enter your PAT token"
                           required>
                    <small>Token with Code (read) and Pull Request (read/write) permissions</small>
                </div>
                
                <div class="form-group">
                    <label for="defaultProject">Default Project (Optional)</label>
                    <input type="text" id="defaultProject" name="defaultProject"
                           value="${config.defaultProject || ''}"
                           placeholder="Project name">
                    <small>Default project to filter pull requests</small>
                </div>
                
                <div class="form-group">
                    <label for="selectedModel">Language Model</label>
                    <select id="selectedModel" name="selectedModel">
                        <option value="gpt-4" ${config.selectedModel === 'gpt-4' ? 'selected' : ''}>GPT-4</option>
                        <option value="gpt-4-turbo" ${config.selectedModel === 'gpt-4-turbo' ? 'selected' : ''}>GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo" ${config.selectedModel === 'gpt-3.5-turbo' ? 'selected' : ''}>GPT-3.5 Turbo</option>
                        <option value="claude-3-opus" ${config.selectedModel === 'claude-3-opus' ? 'selected' : ''}>Claude 3 Opus</option>
                        <option value="claude-3-sonnet" ${config.selectedModel === 'claude-3-sonnet' ? 'selected' : ''}>Claude 3 Sonnet</option>
                    </select>
                    <small>Choose the AI model for code analysis</small>
                </div>
                
                <div class="form-group">
                    <label for="customInstructions">Custom Instructions</label>
                    <textarea id="customInstructions" name="customInstructions" rows="4"
                              placeholder="Enter custom instructions for the AI reviewer...">${config.customInstructions || ''}</textarea>
                    <small>Specific instructions to guide the AI code review process</small>
                </div>
                
                <div class="form-group">
                    <label for="batchSize">Batch Size</label>
                    <input type="number" id="batchSize" name="batchSize" min="1" max="50"
                           value="${config.batchSize || 10}">
                    <small>Number of files to process in parallel (1-50)</small>
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="enableTelemetry" name="enableTelemetry"
                               ${config.enableTelemetry !== false ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        Enable Telemetry
                    </label>
                    <small>Help improve the extension by sharing anonymous usage data</small>
                </div>
                
                <div class="form-actions">
                    <button type="button" id="testConnectionBtn" class="btn btn-secondary">
                        <span class="codicon codicon-plug"></span>
                        Test Connection
                    </button>
                    <button type="button" id="resetConfigBtn" class="btn btn-secondary">
                        <span class="codicon codicon-refresh"></span>
                        Reset to Defaults
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <span class="codicon codicon-save"></span>
                        Save Configuration
                    </button>
                </div>
            </form>
        `;

        // Setup form handlers
        const form = document.getElementById('configForm');
        const testBtn = document.getElementById('testConnectionBtn');
        const resetBtn = document.getElementById('resetConfigBtn');

        form.addEventListener('submit', saveConfiguration);
        testBtn.addEventListener('click', testConnection);
        resetBtn.addEventListener('click', resetConfiguration);

        // Add real-time validation
        setupFormValidation();
    }

    /**
     * Save configuration
     */
    function saveConfiguration(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const config = Object.fromEntries(formData.entries());
        
        // Handle checkbox
        config.enableTelemetry = document.getElementById('enableTelemetry').checked;
        
        // Convert numeric fields
        config.batchSize = parseInt(config.batchSize) || 10;
        
        // Validate required fields
        if (!config.organizationUrl || !config.personalAccessToken) {
            showError('Organization URL and Personal Access Token are required');
            return;
        }
        
        showLoading(true);
        sendMessage(MessageType.SAVE_CONFIG, { config });
    }

    /**
     * Test connection
     */
    function testConnection() {
        const form = document.getElementById('configForm');
        const formData = new FormData(form);
        const config = Object.fromEntries(formData.entries());
        
        // Handle checkbox
        config.enableTelemetry = document.getElementById('enableTelemetry').checked;
        
        showLoading(true);
        sendMessage(MessageType.TEST_CONNECTION, { config });
    }

    /**
     * Reset configuration to defaults
     */
    function resetConfiguration() {
        if (confirm('Are you sure you want to reset all configuration to defaults? This action cannot be undone.')) {
            // Reset form to defaults
            const defaultConfig = {
                organizationUrl: '',
                personalAccessToken: '',
                defaultProject: '',
                selectedModel: 'gpt-4',
                customInstructions: 'Focus on code quality, security vulnerabilities, performance issues, and maintainability. Provide specific suggestions for improvement.',
                batchSize: 10,
                enableTelemetry: true
            };

            // Re-render form with defaults
            const message = { payload: { config: defaultConfig } };
            handleLoadConfigResponse(message);
            
            showSuccess('Configuration reset to defaults. Remember to save your changes.');
        }
    }

    /**
     * Setup form validation
     */
    function setupFormValidation() {
        const orgUrlInput = document.getElementById('organizationUrl');
        const tokenInput = document.getElementById('personalAccessToken');
        const batchSizeInput = document.getElementById('batchSize');

        // Organization URL validation
        orgUrlInput.addEventListener('blur', function() {
            const value = this.value.trim();
            if (value && !/^https:\/\/dev\.azure\.com\/[^\/]+\/?$/.test(value)) {
                this.setCustomValidity('Please enter a valid Azure DevOps organization URL (e.g., https://dev.azure.com/myorg)');
                this.classList.add('invalid');
            } else {
                this.setCustomValidity('');
                this.classList.remove('invalid');
            }
        });

        // Token validation
        tokenInput.addEventListener('blur', function() {
            const value = this.value.trim();
            if (value && value.length < 20) {
                this.setCustomValidity('Personal Access Token seems too short');
                this.classList.add('invalid');
            } else {
                this.setCustomValidity('');
                this.classList.remove('invalid');
            }
        });

        // Batch size validation
        batchSizeInput.addEventListener('blur', function() {
            const value = parseInt(this.value);
            if (isNaN(value) || value < 1 || value > 50) {
                this.setCustomValidity('Batch size must be between 1 and 50');
                this.classList.add('invalid');
            } else {
                this.setCustomValidity('');
                this.classList.remove('invalid');
            }
        });

        // Real-time feedback
        [orgUrlInput, tokenInput, batchSizeInput].forEach(input => {
            input.addEventListener('input', function() {
                if (this.classList.contains('invalid')) {
                    // Re-validate on input
                    this.dispatchEvent(new Event('blur'));
                }
            });
        });
    }

    /**
     * Load pull requests
     */
    function loadPullRequests() {
        showLoading(true);
        sendMessage(MessageType.LOAD_PULL_REQUESTS);
    }

    /**
     * Handle load pull requests response
     */
    function handleLoadPullRequestsResponse(message) {
        showLoading(false);
        
        const { pullRequests = [], projectName = '', totalCount = 0 } = message.payload;
        
        if (pullRequests.length === 0) {
            elements.prListContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <span class="codicon codicon-git-pull-request"></span>
                    </div>
                    <h3>No Open Pull Requests</h3>
                    <p>There are no open pull requests in project "${projectName}".</p>
                    <div class="empty-actions">
                        <button onclick="loadPullRequests()" class="btn btn-primary">
                            <span class="codicon codicon-refresh"></span>
                            Refresh
                        </button>
                        <button onclick="showView('${DashboardView.CONFIGURATION}')" class="btn btn-secondary">
                            <span class="codicon codicon-gear"></span>
                            Configure
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        // Create filter section
        const filterSection = `
            <div class="pr-filters">
                <div class="filter-group">
                    <label for="authorFilter">Author:</label>
                    <select id="authorFilter" class="filter-select">
                        <option value="">All Authors</option>
                        ${[...new Set(pullRequests.map(pr => pr.author))].map(author => 
                            `<option value="${author}">${author}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="statusFilter">Status:</label>
                    <select id="statusFilter" class="filter-select">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="repositoryFilter">Repository:</label>
                    <select id="repositoryFilter" class="filter-select">
                        <option value="">All Repositories</option>
                        ${[...new Set(pullRequests.map(pr => pr.repository))].map(repo => 
                            `<option value="${repo}">${repo}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="filter-group">
                    <button id="clearFiltersBtn" class="btn btn-secondary btn-sm">
                        <span class="codicon codicon-clear-all"></span>
                        Clear Filters
                    </button>
                </div>
            </div>
        `;

        // Create PR table
        const tableHTML = `
            <div class="pr-list-summary">
                <span class="pr-count">${totalCount} pull request${totalCount !== 1 ? 's' : ''} in "${projectName}"</span>
            </div>
            
            ${filterSection}
            
            <div class="pr-table-container">
                <table class="pr-table" id="prTable">
                    <thead>
                        <tr>
                            <th class="sortable" data-sort="id">
                                ID <span class="sort-indicator"></span>
                            </th>
                            <th class="sortable" data-sort="title">
                                Title <span class="sort-indicator"></span>
                            </th>
                            <th class="sortable" data-sort="author">
                                Author <span class="sort-indicator"></span>
                            </th>
                            <th class="sortable" data-sort="repository">
                                Repository <span class="sort-indicator"></span>
                            </th>
                            <th class="sortable" data-sort="createdDate">
                                Created <span class="sort-indicator"></span>
                            </th>
                            <th class="sortable" data-sort="status">
                                Status <span class="sort-indicator"></span>
                            </th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="prTableBody">
                        ${pullRequests.map(pr => createPRRow(pr)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        elements.prListContent.innerHTML = tableHTML;

        // Setup event listeners for filtering and sorting
        setupPRListEventListeners(pullRequests);
    }

    /**
     * Create a PR table row
     */
    function createPRRow(pr) {
        const statusClass = pr.isDraft ? 'draft' : pr.status.toLowerCase();
        const statusText = pr.isDraft ? 'Draft' : pr.status;
        const createdDate = formatDate(pr.createdDate);
        const branchInfo = `${pr.sourceRefName.replace('refs/heads/', '')} → ${pr.targetRefName.replace('refs/heads/', '')}`;
        
        return `
            <tr class="pr-row" data-pr-id="${pr.id}" data-author="${pr.author}" data-status="${statusClass}" data-repository="${pr.repository}">
                <td class="pr-id">
                    <span class="pr-number">#${pr.id}</span>
                </td>
                <td class="pr-title-cell">
                    <div class="pr-title-container">
                        <span class="pr-title" title="${pr.title}">${pr.title}</span>
                        <div class="pr-branches" title="${branchInfo}">
                            <span class="codicon codicon-git-branch"></span>
                            ${branchInfo}
                        </div>
                    </div>
                </td>
                <td class="pr-author">
                    <span class="author-name">${pr.author}</span>
                </td>
                <td class="pr-repository">
                    <span class="repo-name">${pr.repository}</span>
                </td>
                <td class="pr-created">
                    <span class="created-date" title="${createdDate}">${formatRelativeTime(pr.createdDate)}</span>
                </td>
                <td class="pr-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td class="pr-actions">
                    <button onclick="selectPullRequest(${pr.id})" class="btn btn-sm btn-primary" title="View Details">
                        <span class="codicon codicon-eye"></span>
                        View
                    </button>
                    ${pr.url ? `
                        <button onclick="openExternalLink('${pr.url}')" class="btn btn-sm btn-secondary" title="Open in Azure DevOps">
                            <span class="codicon codicon-link-external"></span>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }

    /**
     * Setup event listeners for PR list
     */
    function setupPRListEventListeners(pullRequests) {
        // Filter event listeners
        const authorFilter = document.getElementById('authorFilter');
        const statusFilter = document.getElementById('statusFilter');
        const repositoryFilter = document.getElementById('repositoryFilter');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        
        [authorFilter, statusFilter, repositoryFilter].forEach(filter => {
            filter.addEventListener('change', () => applyFilters(pullRequests));
        });
        
        clearFiltersBtn.addEventListener('click', () => {
            authorFilter.value = '';
            statusFilter.value = '';
            repositoryFilter.value = '';
            applyFilters(pullRequests);
        });

        // Sort event listeners
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const sortKey = header.dataset.sort;
                sortPRTable(pullRequests, sortKey);
            });
        });
    }

    /**
     * Apply filters to PR table
     */
    function applyFilters(pullRequests) {
        const authorFilter = document.getElementById('authorFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        const repositoryFilter = document.getElementById('repositoryFilter').value;

        const filteredPRs = pullRequests.filter(pr => {
            const matchesAuthor = !authorFilter || pr.author === authorFilter;
            const matchesStatus = !statusFilter || 
                (statusFilter === 'draft' && pr.isDraft) ||
                (statusFilter === 'active' && !pr.isDraft && pr.status === 'active');
            const matchesRepo = !repositoryFilter || pr.repository === repositoryFilter;
            
            return matchesAuthor && matchesStatus && matchesRepo;
        });

        // Update table body
        const tableBody = document.getElementById('prTableBody');
        tableBody.innerHTML = filteredPRs.map(pr => createPRRow(pr)).join('');
        
        // Update count
        const countElement = document.querySelector('.pr-count');
        if (countElement) {
            const total = pullRequests.length;
            const filtered = filteredPRs.length;
            if (filtered !== total) {
                countElement.textContent = `${filtered} of ${total} pull requests shown`;
            } else {
                countElement.textContent = `${total} pull request${total !== 1 ? 's' : ''}`;
            }
        }
    }

    /**
     * Sort PR table
     */
    function sortPRTable(pullRequests, sortKey) {
        // Remove previous sort indicators
        document.querySelectorAll('.sort-indicator').forEach(indicator => {
            indicator.textContent = '';
        });

        // Determine sort direction
        const header = document.querySelector(`[data-sort="${sortKey}"]`);
        const indicator = header.querySelector('.sort-indicator');
        const currentDirection = header.dataset.sortDirection || 'asc';
        const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
        
        header.dataset.sortDirection = newDirection;
        indicator.textContent = newDirection === 'asc' ? '↑' : '↓';

        // Sort the data
        const sortedPRs = [...pullRequests].sort((a, b) => {
            let valueA = a[sortKey];
            let valueB = b[sortKey];

            // Handle special cases
            if (sortKey === 'createdDate') {
                valueA = new Date(valueA);
                valueB = new Date(valueB);
            } else if (sortKey === 'id') {
                valueA = parseInt(valueA);
                valueB = parseInt(valueB);
            } else if (typeof valueA === 'string') {
                valueA = valueA.toLowerCase();
                valueB = valueB.toLowerCase();
            }

            if (valueA < valueB) return newDirection === 'asc' ? -1 : 1;
            if (valueA > valueB) return newDirection === 'asc' ? 1 : -1;
            return 0;
        });

        // Update table body
        const tableBody = document.getElementById('prTableBody');
        tableBody.innerHTML = sortedPRs.map(pr => createPRRow(pr)).join('');
    }

    /**
     * Select pull request
     */
    function selectPullRequest(prId) {
        showLoading(true);
        sendMessage(MessageType.SELECT_PULL_REQUEST, { prId });
    }

    /**
     * Handle select pull request response
     */
    function handleSelectPullRequestResponse(message) {
        showLoading(false);
        
        const { pullRequest, fileChanges = [], stats = {} } = message.payload;
        currentPR = pullRequest;
        
        if (pullRequest) {
            elements.prTitle.textContent = `PR #${pullRequest.id}: ${pullRequest.title}`;
            showView(DashboardView.PULL_REQUEST_DETAIL);
            
            // Render PR details
            elements.prDetailContent.innerHTML = `
                <div class="pr-detail-container">
                    <!-- PR Header Info -->
                    <div class="pr-header-info">
                        <div class="pr-meta">
                            <div class="pr-meta-item">
                                <span class="meta-label">Author:</span>
                                <span class="meta-value">${pullRequest.author}</span>
                            </div>
                            <div class="pr-meta-item">
                                <span class="meta-label">Status:</span>
                                <span class="status-badge ${pullRequest.isDraft ? 'draft' : pullRequest.status.toLowerCase()}">
                                    ${pullRequest.isDraft ? 'Draft' : pullRequest.status}
                                </span>
                            </div>
                            <div class="pr-meta-item">
                                <span class="meta-label">Created:</span>
                                <span class="meta-value">${formatDate(pullRequest.createdDate)}</span>
                            </div>
                            <div class="pr-meta-item">
                                <span class="meta-label">Repository:</span>
                                <span class="repo-name">${pullRequest.repository}</span>
                            </div>
                        </div>
                        
                        <div class="pr-branches">
                            <span class="codicon codicon-git-branch"></span>
                            <span class="branch-info">
                                ${pullRequest.sourceRefName.replace('refs/heads/', '')} → ${pullRequest.targetRefName.replace('refs/heads/', '')}
                            </span>
                        </div>
                        
                        ${pullRequest.description ? `
                            <div class="pr-description">
                                <h4>Description</h4>
                                <div class="description-content">${formatDescription(pullRequest.description)}</div>
                            </div>
                        ` : ''}
                        
                        <div class="pr-stats">
                            <div class="stat-item">
                                <span class="stat-number">${stats.totalFiles || 0}</span>
                                <span class="stat-label">files changed</span>
                            </div>
                            <div class="stat-item additions">
                                <span class="stat-number">+${stats.totalAdditions || 0}</span>
                                <span class="stat-label">additions</span>
                            </div>
                            <div class="stat-item deletions">
                                <span class="stat-number">-${stats.totalDeletions || 0}</span>
                                <span class="stat-label">deletions</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="pr-actions">
                        <button id="analyzeBtn" class="btn btn-primary">
                            <span class="codicon codicon-search"></span>
                            Start AI Analysis
                        </button>
                        ${pullRequest.url ? `
                            <button onclick="openExternalLink('${pullRequest.url}')" class="btn btn-secondary">
                                <span class="codicon codicon-link-external"></span>
                                Open in Azure DevOps
                            </button>
                        ` : ''}
                        <button id="refreshPRBtn" class="btn btn-secondary">
                            <span class="codicon codicon-refresh"></span>
                            Refresh
                        </button>
                    </div>
                    
                    <!-- File Changes Section -->
                    <div class="file-changes-section">
                        <div class="file-changes-header">
                            <h3>File Changes</h3>
                            <div class="file-changes-controls">
                                <button id="expandAllBtn" class="btn btn-sm btn-secondary">
                                    <span class="codicon codicon-expand-all"></span>
                                    Expand All
                                </button>
                                <button id="collapseAllBtn" class="btn btn-sm btn-secondary">
                                    <span class="codicon codicon-collapse-all"></span>
                                    Collapse All
                                </button>
                            </div>
                        </div>
                        
                        <div id="fileChanges" class="file-changes-container">
                            ${renderFileChanges(fileChanges)}
                        </div>
                    </div>
                </div>
            `;
            
            // Setup event listeners for PR detail view
            setupPRDetailEventListeners();
        }
    }

    /**
     * Format description text with basic markdown-like formatting
     */
    function formatDescription(description) {
        if (!description) return '';
        
        return description
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }

    /**
     * Render file changes
     */
    function renderFileChanges(fileChanges) {
        if (!fileChanges || fileChanges.length === 0) {
            return `
                <div class="no-file-changes">
                    <p>No file changes to display.</p>
                </div>
            `;
        }

        return fileChanges.map((fileChange, index) => {
            const changeTypeIcon = getChangeTypeIcon(fileChange.changeType);
            const changeTypeClass = fileChange.changeType.toLowerCase();
            const fileExtension = getFileExtension(fileChange.filePath);
            const languageClass = getLanguageClass(fileExtension);
            
            return `
                <div class="file-change-item" data-file-index="${index}">
                    <div class="file-change-header" onclick="toggleFileChange(${index})">
                        <div class="file-info">
                            <span class="change-type-icon ${changeTypeClass}" title="${fileChange.changeType}">
                                ${changeTypeIcon}
                            </span>
                            <span class="file-path" title="${fileChange.filePath}">
                                ${fileChange.filePath}
                            </span>
                            ${fileChange.oldFilePath && fileChange.oldFilePath !== fileChange.filePath ? `
                                <span class="renamed-from">
                                    (renamed from ${fileChange.oldFilePath})
                                </span>
                            ` : ''}
                        </div>
                        
                        <div class="file-stats">
                            ${fileChange.isBinary ? `
                                <span class="binary-indicator">Binary file</span>
                            ` : `
                                <span class="additions">+${fileChange.addedLines}</span>
                                <span class="deletions">-${fileChange.deletedLines}</span>
                            `}
                            <span class="expand-indicator codicon codicon-chevron-right"></span>
                        </div>
                    </div>
                    
                    <div class="file-change-content" id="file-content-${index}" style="display: none;">
                        ${fileChange.isBinary ? `
                            <div class="binary-file-notice">
                                <span class="codicon codicon-file-binary"></span>
                                <p>Binary file not shown</p>
                            </div>
                        ` : `
                            <div class="diff-viewer ${languageClass}">
                                ${renderDiffLines(fileChange.lines)}
                            </div>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render diff lines
     */
    function renderDiffLines(lines) {
        if (!lines || lines.length === 0) {
            return '<div class="no-diff">No diff content available</div>';
        }

        let html = '<table class="diff-table">';
        
        lines.forEach(line => {
            const lineClass = `diff-line diff-${line.type}`;
            const lineNumber = line.lineNumber || '';
            const originalLineNumber = line.originalLineNumber || '';
            const content = escapeHtml(line.content || '');
            
            html += `
                <tr class="${lineClass}">
                    <td class="line-number original">${originalLineNumber}</td>
                    <td class="line-number new">${lineNumber}</td>
                    <td class="line-content">
                        <span class="line-prefix">${getLinePrefix(line.type)}</span>
                        <span class="line-text">${content}</span>
                    </td>
                </tr>
            `;
        });
        
        html += '</table>';
        return html;
    }

    /**
     * Get change type icon
     */
    function getChangeTypeIcon(changeType) {
        switch (changeType) {
            case 'add': return '+';
            case 'delete': return '−';
            case 'edit': return '~';
            case 'rename': return '→';
            default: return '?';
        }
    }

    /**
     * Get file extension
     */
    function getFileExtension(filePath) {
        const match = filePath.match(/\.([^.]+)$/);
        return match ? match[1].toLowerCase() : '';
    }

    /**
     * Get language class for syntax highlighting
     */
    function getLanguageClass(extension) {
        const languageMap = {
            'js': 'javascript',
            'ts': 'typescript',
            'cs': 'csharp',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'json': 'json',
            'xml': 'xml',
            'md': 'markdown',
            'yml': 'yaml',
            'yaml': 'yaml'
        };
        
        return `language-${languageMap[extension] || 'text'}`;
    }

    /**
     * Get line prefix for diff
     */
    function getLinePrefix(type) {
        switch (type) {
            case 'added': return '+';
            case 'deleted': return '-';
            case 'modified': return '~';
            default: return ' ';
        }
    }

    /**
     * Escape HTML characters
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Toggle file change visibility
     */
    function toggleFileChange(index) {
        const content = document.getElementById(`file-content-${index}`);
        const header = document.querySelector(`[data-file-index="${index}"] .file-change-header`);
        const expandIndicator = header.querySelector('.expand-indicator');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            expandIndicator.classList.remove('codicon-chevron-right');
            expandIndicator.classList.add('codicon-chevron-down');
        } else {
            content.style.display = 'none';
            expandIndicator.classList.remove('codicon-chevron-down');
            expandIndicator.classList.add('codicon-chevron-right');
        }
    }

    /**
     * Setup event listeners for PR detail view
     */
    function setupPRDetailEventListeners() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        const refreshPRBtn = document.getElementById('refreshPRBtn');
        const expandAllBtn = document.getElementById('expandAllBtn');
        const collapseAllBtn = document.getElementById('collapseAllBtn');
        
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => {
                if (currentPR) {
                    startAIAnalysis(currentPR.id);
                }
            });
        }
        
        if (refreshPRBtn) {
            refreshPRBtn.addEventListener('click', () => {
                if (currentPR) {
                    selectPullRequest(currentPR.id);
                }
            });
        }
        
        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', () => {
                document.querySelectorAll('.file-change-content').forEach(content => {
                    content.style.display = 'block';
                });
                document.querySelectorAll('.expand-indicator').forEach(indicator => {
                    indicator.classList.remove('codicon-chevron-right');
                    indicator.classList.add('codicon-chevron-down');
                });
            });
        }
        
        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', () => {
                document.querySelectorAll('.file-change-content').forEach(content => {
                    content.style.display = 'none';
                });
                document.querySelectorAll('.expand-indicator').forEach(indicator => {
                    indicator.classList.remove('codicon-chevron-down');
                    indicator.classList.add('codicon-chevron-right');
                });
            });
        }
    }

    /**
     * Start AI Analysis (placeholder for task 5)
     */
    function startAIAnalysis(prId) {
        currentAnalysis = {
            prId: prId,
            stage: 'initializing'
        };
        
        showLoading(true, 'Initializing AI analysis...');
        sendMessage(MessageType.START_AI_ANALYSIS, { prId });
        
        // Update analyze button to show cancel option
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.innerHTML = `
                <span class="codicon codicon-stop-circle"></span>
                Cancel Analysis
            `;
            analyzeBtn.onclick = () => cancelAIAnalysis();
            analyzeBtn.classList.remove('btn-primary');
            analyzeBtn.classList.add('btn-secondary');
        }
    }

    /**
     * Cancel AI Analysis
     */
    function cancelAIAnalysis() {
        if (currentAnalysis) {
            sendMessage(MessageType.AI_ANALYSIS_CANCEL, { prId: currentAnalysis.prId });
            currentAnalysis = null;
            showLoading(false);
            
            // Reset analyze button
            const analyzeBtn = document.getElementById('analyzeBtn');
            if (analyzeBtn) {
                analyzeBtn.innerHTML = `
                    <span class="codicon codicon-search"></span>
                    Start AI Analysis
                `;
                analyzeBtn.onclick = () => startAIAnalysis(currentPR.id);
                analyzeBtn.classList.remove('btn-secondary');
                analyzeBtn.classList.add('btn-primary');
            }
        }
    }

    /**
     * Handle AI analysis progress
     */
    function handleAIAnalysisProgress(message) {
        const { progress } = message.payload;
        currentAnalysis = { ...currentAnalysis, ...progress };
        
        // Update progress in UI
        const progressMessage = `${progress.stage === 'analyzing' ? 'Analyzing' : 'Processing'} ${progress.currentFileName} (${progress.completed}/${progress.total})`;
        showLoading(true, progressMessage);
        
        // Show progress bar if it exists
        const progressBar = document.getElementById('analysisProgressBar');
        if (progressBar) {
            progressBar.style.width = `${progress.percentage || 0}%`;
        }
        
        // Add progress indicator to the PR actions section
        let progressSection = document.getElementById('analysisProgress');
        if (!progressSection) {
            progressSection = document.createElement('div');
            progressSection.id = 'analysisProgress';
            progressSection.className = 'analysis-progress';
            
            const prActions = document.querySelector('.pr-actions');
            if (prActions) {
                prActions.appendChild(progressSection);
            }
        }
        
        progressSection.innerHTML = `
            <div class="progress-header">
                <span class="progress-title">AI Analysis in Progress</span>
                <span class="progress-stats">${progress.completed}/${progress.total} files</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progress.percentage || 0}%"></div>
            </div>
            <div class="progress-message">${progressMessage}</div>
        `;
    }

    /**
     * Handle AI analysis completion
     */
    function handleAIAnalysisComplete(message) {
        const { result, prId } = message.payload;
        currentAnalysis = null;
        analysisResults = result.comments || [];
        
        showLoading(false);
        showSuccess(`Analysis complete! Found ${result.summary.totalComments} review comments.`);
        
        // Remove progress indicator
        const progressSection = document.getElementById('analysisProgress');
        if (progressSection) {
            progressSection.remove();
        }
        
        // Reset analyze button
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.innerHTML = `
                <span class="codicon codicon-search"></span>
                Re-run Analysis
            `;
            analyzeBtn.onclick = () => startAIAnalysis(prId);
            analyzeBtn.classList.remove('btn-secondary');
            analyzeBtn.classList.add('btn-primary');
        }
        
        // Switch to AI review view
        if (analysisResults.length > 0) {
            showView(DashboardView.AI_REVIEW);
            renderAIReviewInterface(result);
        } else {
            showSuccess('Analysis complete, but no review comments were generated.');
        }
    }

    /**
     * Render AI Review Interface
     */
    function renderAIReviewInterface(analysisResult) {
        const { comments = [], summary = {}, errors = [] } = analysisResult;
        
        // Update the AI review content
        elements.aiReviewContent.innerHTML = `
            <div class="ai-review-container">
                <!-- Summary Section -->
                <div class="review-summary">
                    <div class="summary-header">
                        <h3>AI Analysis Summary</h3>
                        <div class="summary-actions">
                            <button id="exportCommentsBtn" class="btn btn-secondary btn-sm">
                                <span class="codicon codicon-export"></span>
                                Export Comments
                            </button>
                            <button id="bulkActionBtn" class="btn btn-secondary btn-sm">
                                <span class="codicon codicon-checklist"></span>
                                Bulk Actions
                            </button>
                        </div>
                    </div>
                    
                    <div class="summary-stats">
                        <div class="stat-card">
                            <div class="stat-number">${summary.totalComments || 0}</div>
                            <div class="stat-label">Total Comments</div>
                        </div>
                        <div class="stat-card severity-error">
                            <div class="stat-number">${summary.commentsBySeverity?.error || 0}</div>
                            <div class="stat-label">Errors</div>
                        </div>
                        <div class="stat-card severity-warning">
                            <div class="stat-number">${summary.commentsBySeverity?.warning || 0}</div>
                            <div class="stat-label">Warnings</div>
                        </div>
                        <div class="stat-card severity-info">
                            <div class="stat-number">${summary.commentsBySeverity?.info || 0}</div>
                            <div class="stat-label">Info</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${summary.analyzedFiles || 0}</div>
                            <div class="stat-label">Files Analyzed</div>
                        </div>
                    </div>
                    
                    ${errors.length > 0 ? `
                        <div class="analysis-errors">
                            <h4>Analysis Errors (${errors.length})</h4>
                            ${errors.map(error => `
                                <div class="error-item ${error.severity}">
                                    <span class="error-file">${error.fileName}</span>
                                    <span class="error-message">${error.error}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <!-- Filters Section -->
                <div class="comment-filters">
                    <div class="filter-group">
                        <label for="severityFilter">Severity:</label>
                        <select id="severityFilter" class="filter-select">
                            <option value="">All Severities</option>
                            <option value="error">Error</option>
                            <option value="warning">Warning</option>
                            <option value="info">Info</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="statusFilter">Status:</label>
                        <select id="statusFilter" class="filter-select">
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="dismissed">Dismissed</option>
                            <option value="modified">Modified</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="fileFilter">File:</label>
                        <select id="fileFilter" class="filter-select">
                            <option value="">All Files</option>
                            ${[...new Set(comments.map(c => c.filePath))].map(file => 
                                `<option value="${file}">${file}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <button id="clearFiltersBtn" class="btn btn-secondary btn-sm">
                            <span class="codicon codicon-clear-all"></span>
                            Clear
                        </button>
                    </div>
                </div>
                
                <!-- Comments Section -->
                <div class="comments-section">
                    <div class="comments-header">
                        <h3>Review Comments (${comments.length})</h3>
                        <div class="view-options">
                            <button id="groupByFileBtn" class="btn btn-sm btn-secondary active">
                                <span class="codicon codicon-group-by-ref-type"></span>
                                Group by File
                            </button>
                            <button id="listViewBtn" class="btn btn-sm btn-secondary">
                                <span class="codicon codicon-list-unordered"></span>
                                List View
                            </button>
                        </div>
                    </div>
                    
                    <div id="commentsContainer" class="comments-container">
                        ${renderComments(comments, 'grouped')}
                    </div>
                </div>
            </div>
        `;
        
        // Setup event listeners for AI review interface
        setupAIReviewEventListeners(comments);
    }

    /**
     * Render comments in different views
     */
    function renderComments(comments, viewMode = 'grouped') {
        if (!comments || comments.length === 0) {
            return `
                <div class="no-comments">
                    <div class="no-comments-icon">
                        <span class="codicon codicon-comment"></span>
                    </div>
                    <h4>No Comments</h4>
                    <p>No review comments were generated by the AI analysis.</p>
                </div>
            `;
        }

        if (viewMode === 'grouped') {
            return renderCommentsGroupedByFile(comments);
        } else {
            return renderCommentsList(comments);
        }
    }

    /**
     * Render comments grouped by file
     */
    function renderCommentsGroupedByFile(comments) {
        const groupedComments = comments.reduce((groups, comment) => {
            const file = comment.filePath || 'Unknown';
            if (!groups[file]) {
                groups[file] = [];
            }
            groups[file].push(comment);
            return groups;
        }, {});

        return Object.keys(groupedComments).map(filePath => {
            const fileComments = groupedComments[filePath];
            const severityCounts = fileComments.reduce((counts, comment) => {
                counts[comment.severity] = (counts[comment.severity] || 0) + 1;
                return counts;
            }, {});

            return `
                <div class="comment-file-group">
                    <div class="file-group-header" onclick="toggleFileComments('${filePath}')">
                        <div class="file-info">
                            <span class="codicon codicon-file"></span>
                            <span class="file-path">${filePath}</span>
                            <span class="comment-count">(${fileComments.length} comments)</span>
                        </div>
                        <div class="severity-badges">
                            ${severityCounts.error ? `<span class="severity-badge error">${severityCounts.error} errors</span>` : ''}
                            ${severityCounts.warning ? `<span class="severity-badge warning">${severityCounts.warning} warnings</span>` : ''}
                            ${severityCounts.info ? `<span class="severity-badge info">${severityCounts.info} info</span>` : ''}
                        </div>
                        <span class="expand-indicator codicon codicon-chevron-down"></span>
                    </div>
                    <div class="file-comments" id="file-comments-${encodeURIComponent(filePath)}">
                        ${fileComments.map(comment => renderCommentItem(comment)).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render comments as a list
     */
    function renderCommentsList(comments) {
        return `
            <div class="comments-list">
                ${comments.map(comment => renderCommentItem(comment)).join('')}
            </div>
        `;
    }

    /**
     * Render individual comment item
     */
    function renderCommentItem(comment) {
        const statusClass = comment.status || 'pending';
        const severityClass = comment.severity || 'info';
        const isEditing = comment.isEditing || false;
        
        return `
            <div class="comment-item ${statusClass}" data-comment-id="${comment.id}" data-severity="${severityClass}" data-file="${comment.filePath}">
                <div class="comment-header">
                    <div class="comment-meta">
                        <span class="severity-badge ${severityClass}">${comment.severity}</span>
                        <span class="line-number">Line ${comment.lineNumber}</span>
                        <span class="status-badge ${statusClass}">${(comment.status || 'pending').toUpperCase()}</span>
                    </div>
                    <div class="comment-actions">
                        ${statusClass === 'pending' ? `
                            <button onclick="editComment('${comment.id}')" class="btn btn-xs btn-secondary" title="Edit">
                                <span class="codicon codicon-edit"></span>
                            </button>
                            <button onclick="approveComment('${comment.id}')" class="btn btn-xs btn-success" title="Approve">
                                <span class="codicon codicon-check"></span>
                            </button>
                            <button onclick="dismissComment('${comment.id}')" class="btn btn-xs btn-danger" title="Dismiss">
                                <span class="codicon codicon-x"></span>
                            </button>
                        ` : `
                            <button onclick="resetComment('${comment.id}')" class="btn btn-xs btn-secondary" title="Reset to Pending">
                                <span class="codicon codicon-undo"></span>
                            </button>
                        `}
                    </div>
                </div>
                
                <div class="comment-content">
                    ${isEditing ? `
                        <div class="comment-editor">
                            <textarea id="comment-editor-${comment.id}" class="comment-textarea">${comment.content}</textarea>
                            <div class="editor-actions">
                                <button onclick="saveCommentEdit('${comment.id}')" class="btn btn-xs btn-primary">
                                    <span class="codicon codicon-save"></span>
                                    Save
                                </button>
                                <button onclick="cancelCommentEdit('${comment.id}')" class="btn btn-xs btn-secondary">
                                    <span class="codicon codicon-discard"></span>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ` : `
                        <div class="comment-text">${comment.content}</div>
                    `}
                </div>
                
                ${comment.codeContext ? `
                    <div class="comment-context">
                        <div class="context-header">
                            <span class="codicon codicon-code"></span>
                            Code Context
                        </div>
                        <pre class="code-snippet"><code>${escapeHtml(comment.codeContext)}</code></pre>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Show/hide loading overlay
     */
    function showLoading(show) {
        elements.loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    /**
     * Show error toast
     */
    function showError(message, details = null) {
        showEnhancedToast('error', message, details);
    }

    /**
     * Show success toast
     */
    function showSuccess(message, details = null) {
        showEnhancedToast('success', message, details);
    }

    /**
     * Show warning toast
     */
    function showWarning(message, details = null) {
        showEnhancedToast('warning', message, details);
    }

    /**
     * Show info toast
     */
    function showInfo(message, details = null) {
        showEnhancedToast('info', message, details);
    }

    /**
     * Show enhanced toast notification
     */
    function showEnhancedToast(type, message, details = null) {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        // Remove any existing toasts of the same type
        const existingToasts = toastContainer.querySelectorAll(`.toast-${type}`);
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const iconMap = {
            'error': 'error',
            'success': 'check',
            'warning': 'warning',
            'info': 'info'
        };
        
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon codicon codicon-${iconMap[type]}"></span>
                <div class="toast-message">
                    <div class="toast-title">${message}</div>
                    ${details ? `<div class="toast-details">${details}</div>` : ''}
                </div>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                    <span class="codicon codicon-close"></span>
                </button>
            </div>
            ${type === 'error' && details ? `
                <div class="toast-actions">
                    <button class="btn btn-sm btn-secondary" onclick="copyToClipboard('${escapeForAttribute(message + (details ? '\\n' + details : ''))}')">
                        <span class="codicon codicon-copy"></span>
                        Copy Error
                    </button>
                </div>
            ` : ''}
        `;

        toastContainer.appendChild(toast);

        // Auto-remove after delay (except for errors which stay longer)
        const delay = type === 'error' ? 10000 : (type === 'success' ? 3000 : 5000);
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, delay);

        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
    }

    /**
     * Escape string for HTML attribute
     */
    function escapeForAttribute(str) {
        return str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    }

    /**
     * Copy text to clipboard
     */
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showSuccess('Copied to clipboard');
        }).catch(() => {
            showWarning('Failed to copy to clipboard');
        });
    }

    /**
     * Enhanced error handler for API operations
     */
    function handleApiError(error, operation = 'operation', context = {}) {
        console.error(`API Error during ${operation}:`, error, context);
        
        let message = `Failed to ${operation}`;
        let details = null;
        
        if (error instanceof Error) {
            if (error.message.includes('Network') || error.message.includes('fetch')) {
                message = 'Network connection failed';
                details = 'Please check your internet connection and Azure DevOps server availability.';
            } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                message = 'Authentication failed';
                details = 'Your personal access token may be invalid or expired. Please check your configuration.';
            } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
                message = 'Permission denied';
                details = 'You may not have sufficient permissions to access this resource.';
            } else if (error.message.includes('404') || error.message.includes('Not Found')) {
                message = 'Resource not found';
                details = 'The requested project, repository, or pull request could not be found.';
            } else if (error.message.includes('429') || error.message.includes('Rate limit')) {
                message = 'Rate limit exceeded';
                details = 'Too many requests. Please wait a moment before trying again.';
            } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
                message = 'Server error';
                details = 'Azure DevOps server encountered an internal error. Please try again later.';
            } else if (error.message.includes('timeout')) {
                message = 'Request timeout';
                details = 'The operation took too long to complete. Please try again.';
            } else {
                details = error.message;
            }
        } else if (typeof error === 'string') {
            details = error;
        } else {
            details = 'An unexpected error occurred. Please check your configuration and try again.';
        }
        
        showError(message, details);
        
        // Log additional context for debugging
        if (Object.keys(context).length > 0) {
            console.error('Error context:', context);
        }
    }

    /**
     * Retry mechanism for failed operations
     */
    async function retryOperation(operation, options = {}) {
        const { 
            maxAttempts = 3, 
            baseDelay = 1000,
            backoffMultiplier = 2,
            showProgress = true 
        } = options;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                console.warn(`Attempt ${attempt}/${maxAttempts} failed:`, error);
                
                if (attempt === maxAttempts) {
                    throw error;
                }
                
                // Calculate delay with exponential backoff
                const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
                
                if (showProgress) {
                    showWarning(`Attempt ${attempt} failed, retrying in ${Math.ceil(delay / 1000)}s...`);
                }
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Safe message sending with error handling and timeout
     */
    function safeSendMessage(type, payload = {}, options = {}) {
        const { timeout = 30000, retries = 1 } = options;
        
        return retryOperation(async () => {
            return new Promise((resolve, reject) => {
                const requestId = ++requestCounter;
                
                // Set up timeout
                const timeoutId = setTimeout(() => {
                    delete pendingRequests[requestId];
                    reject(new Error(`Request timeout after ${timeout}ms`));
                }, timeout);
                
                // Store pending request
                pendingRequests[requestId] = {
                    resolve: (response) => {
                        clearTimeout(timeoutId);
                        delete pendingRequests[requestId];
                        resolve(response);
                    },
                    reject: (error) => {
                        clearTimeout(timeoutId);
                        delete pendingRequests[requestId];
                        reject(error);
                    }
                };
                
                try {
                    sendMessage(type, payload, requestId);
                } catch (error) {
                    clearTimeout(timeoutId);
                    delete pendingRequests[requestId];
                    reject(error);
                }
            });
        }, { maxAttempts: retries + 1, showProgress: false });
    }

    /**
     * Validate configuration before operations
     */
    function validateConfiguration() {
        // This would typically check if required configuration is present
        // For now, we'll do a basic check
        return true; // Placeholder
    }

    /**
     * Safe operation wrapper with error handling
     */
    async function safeOperation(operation, operationName, context = {}) {
        try {
            if (!validateConfiguration()) {
                throw new Error('Configuration validation failed');
            }
            
            return await operation();
        } catch (error) {
            handleApiError(error, operationName, context);
            throw error; // Re-throw so callers can handle if needed
        }
    }

    /**
     * Performance optimization utilities
     */
    const PerformanceOptimizer = {
        // Debounce function calls
        debounce(func, wait, immediate = false) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    timeout = null;
                    if (!immediate) func(...args);
                };
                const callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func(...args);
            };
        },

        // Throttle function calls
        throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        // Cache with TTL
        cache: {
            set(key, value, ttl = 300000) { // 5 minutes default
                performanceCache.set(key, {
                    value,
                    expiry: Date.now() + ttl
                });
            },

            get(key) {
                const item = performanceCache.get(key);
                if (!item) return null;
                
                if (Date.now() > item.expiry) {
                    performanceCache.delete(key);
                    return null;
                }
                
                return item.value;
            },

            clear() {
                performanceCache.clear();
            }
        },

        // Lazy image loading
        lazyLoadImage(imgElement, src) {
            if (imageCache.has(src)) {
                imgElement.src = imageCache.get(src);
                return;
            }

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = src;
                        img.onload = () => imageCache.set(src, src);
                        observer.unobserve(img);
                    }
                });
            });

            observer.observe(imgElement);
        },

        // Virtual scrolling for large lists
        createVirtualScroll(container, items, renderItem) {
            const scrollContainer = document.createElement('div');
            scrollContainer.className = 'virtual-scroll-container';
            scrollContainer.style.height = '400px';
            scrollContainer.style.overflow = 'auto';

            const content = document.createElement('div');
            content.className = 'virtual-scroll-content';
            content.style.height = `${items.length * virtualScrollItemHeight}px`;

            const viewport = document.createElement('div');
            viewport.className = 'virtual-scroll-viewport';
            viewport.style.position = 'relative';

            let startIndex = 0;
            let endIndex = Math.min(virtualScrollVisibleCount, items.length);

            const renderVisibleItems = () => {
                viewport.innerHTML = '';
                
                for (let i = startIndex; i < endIndex; i++) {
                    const item = items[i];
                    const element = renderItem(item, i);
                    element.style.position = 'absolute';
                    element.style.top = `${i * virtualScrollItemHeight}px`;
                    element.style.width = '100%';
                    element.style.height = `${virtualScrollItemHeight}px`;
                    viewport.appendChild(element);
                }
            };

            const handleScroll = PerformanceOptimizer.throttle(() => {
                const scrollTop = scrollContainer.scrollTop;
                const newStartIndex = Math.floor(scrollTop / virtualScrollItemHeight);
                const newEndIndex = Math.min(
                    newStartIndex + virtualScrollVisibleCount + 2, // Buffer
                    items.length
                );

                if (newStartIndex !== startIndex || newEndIndex !== endIndex) {
                    startIndex = newStartIndex;
                    endIndex = newEndIndex;
                    renderVisibleItems();
                }
            }, 16); // ~60fps

            scrollContainer.addEventListener('scroll', handleScroll);
            
            content.appendChild(viewport);
            scrollContainer.appendChild(content);
            renderVisibleItems();

            return scrollContainer;
        },

        // Batch DOM updates
        batchDOMUpdates(updates) {
            return new Promise(resolve => {
                requestAnimationFrame(() => {
                    updates.forEach(update => update());
                    resolve();
                });
            });
        },

        // Memory cleanup
        cleanup() {
            performanceCache.clear();
            imageCache.clear();
        }
    };

    /**
     * Optimized pull request rendering with virtual scrolling
     */
    function renderPullRequestsOptimized(pullRequests) {
        const container = document.getElementById('pullRequestsContainer');
        
        if (!pullRequests || pullRequests.length === 0) {
            container.innerHTML = `
                <div class="no-pull-requests">
                    <div class="no-pr-icon">
                        <span class="codicon codicon-git-pull-request"></span>
                    </div>
                    <h4>No Pull Requests</h4>
                    <p>No open pull requests found.</p>
                </div>
            `;
            return;
        }

        // Use virtual scrolling for large lists
        if (pullRequests.length > 50) {
            const virtualScroll = PerformanceOptimizer.createVirtualScroll(
                container,
                pullRequests,
                (pr, index) => {
                    const element = document.createElement('div');
                    element.className = 'pr-item virtual';
                    element.setAttribute('data-pr', JSON.stringify(pr));
                    element.innerHTML = renderPullRequestItemContent(pr);
                    return element;
                }
            );
            
            container.innerHTML = '';
            container.appendChild(virtualScroll);
        } else {
            // Regular rendering for smaller lists
            const fragment = document.createDocumentFragment();
            
            pullRequests.forEach(pr => {
                const prElement = document.createElement('div');
                prElement.className = 'pr-item';
                prElement.setAttribute('data-pr', JSON.stringify(pr));
                prElement.innerHTML = renderPullRequestItemContent(pr);
                fragment.appendChild(prElement);
            });
            
            container.innerHTML = '';
            container.appendChild(fragment);
        }
    }

    /**
     * Generate optimized PR item content
     */
    function renderPullRequestItemContent(pr) {
        const avatarUrl = pr.createdBy?.imageUrl;
        const createdDate = new Date(pr.creationDate);
        const isToday = createdDate.toDateString() === new Date().toDateString();
        const dateStr = isToday ? 
            `Today at ${createdDate.toLocaleTimeString()}` : 
            createdDate.toLocaleDateString();

        return `
            <div class="pr-header">
                <div class="pr-avatar">
                    ${avatarUrl ? 
                        `<img class="lazy-avatar" data-src="${avatarUrl}" alt="${pr.createdBy?.displayName || 'Unknown'}" />` : 
                        `<span class="codicon codicon-account"></span>`
                    }
                </div>
                <div class="pr-info">
                    <div class="pr-title-row">
                        <h3 class="pr-title" onclick="selectPullRequest(${pr.id})">${pr.title}</h3>
                        <div class="pr-badges">
                            <span class="pr-id-badge">#${pr.id}</span>
                            <span class="pr-status-badge ${pr.status}">${pr.status}</span>
                        </div>
                    </div>
                    <div class="pr-meta">
                        <span class="pr-author">${pr.createdBy?.displayName || 'Unknown'}</span>
                        <span class="pr-separator">•</span>
                        <span class="pr-repo">${pr.repository?.name || 'Unknown'}</span>
                        <span class="pr-separator">•</span>
                        <span class="pr-date">${dateStr}</span>
                    </div>
                    <div class="pr-description">${(pr.description || '').substring(0, 150)}${pr.description && pr.description.length > 150 ? '...' : ''}</div>
                </div>
            </div>
        `;
    }

    /**
     * Optimized file content loading with lazy loading
     */
    function loadFileContentOptimized(filePath, prId, repositoryId) {
        const cacheKey = `file-${repositoryId}-${prId}-${filePath}`;
        const cached = PerformanceOptimizer.cache.get(cacheKey);
        
        if (cached) {
            return Promise.resolve(cached);
        }

        return safeSendMessage(MessageType.LOAD_FILE_CONTENT, {
            filePath,
            prId,
            repositoryId
        }).then(response => {
            PerformanceOptimizer.cache.set(cacheKey, response.payload.content);
            return response.payload.content;
        });
    }

    /**
     * Setup performance monitoring
     */
    function setupPerformanceMonitoring() {
        // Monitor memory usage
        if (performance.memory) {
            setInterval(() => {
                const memInfo = performance.memory;
                if (memInfo.usedJSHeapSize > memInfo.jsHeapSizeLimit * 0.9) {
                    console.warn('High memory usage detected, cleaning up...');
                    PerformanceOptimizer.cleanup();
                }
            }, 30000); // Check every 30 seconds
        }

        // Monitor slow operations
        const originalSendMessage = sendMessage;
        sendMessage = function(type, payload, requestId) {
            const start = performance.now();
            const result = originalSendMessage.call(this, type, payload, requestId);
            const duration = performance.now() - start;
            
            if (duration > 100) {
                console.warn(`Slow operation detected: ${type} took ${duration.toFixed(2)}ms`);
            }
            
            return result;
        };
    }

    /**
     * Show toast notification
     */
    function showToast(toastElement, message) {
        const messageElement = toastElement.querySelector('.toast-message');
        messageElement.textContent = message;
        toastElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            toastElement.style.display = 'none';
        }, 5000);
    }

    /**
     * Format date string
     */
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    /**
     * Handle save configuration response
     */
    function handleSaveConfigResponse(message) {
        showLoading(false);
        
        if (message.payload.success) {
            showSuccess('Configuration saved successfully');
            
            // Optionally switch back to PR list view after successful save
            setTimeout(() => {
                if (currentView === DashboardView.CONFIGURATION) {
                    showView(DashboardView.PULL_REQUEST_LIST);
                }
            }, 2000);
        }
    }

    /**
     * Handle test connection response
     */
    function handleTestConnectionResponse(message) {
        showLoading(false);
        
        const payload = message.payload;
        if (payload.success) {
            showSuccess(`Connection test successful: ${payload.message || 'Connected to Azure DevOps'}`);
        } else {
            showError(`Connection test failed: ${payload.error || 'Unknown error'}`);
        }
    }

    /**
     * Handle load repositories response
     */
    function handleLoadRepositoriesResponse(message) {
        const { repositories = [], projectName = '' } = message.payload;
        // This could be used to populate repository filters or selectors
        console.log(`Loaded ${repositories.length} repositories for project ${projectName}:`, repositories);
    }

    /**
     * Handle load projects response
     */
    function handleLoadProjectsResponse(message) {
        const { projects = [] } = message.payload;
        // This could be used to populate project selectors
        console.log(`Loaded ${projects.length} projects:`, projects);
    }

    /**
     * Format relative time (e.g., "2 hours ago")
     */
    function formatRelativeTime(dateString) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMinutes < 60) {
            return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
        } else if (diffHours < 24) {
            return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        } else if (diffDays < 7) {
            return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    /**
     * Open external link
     */
    function openExternalLink(url) {
        // VS Code will handle this through a command
        vscode.postMessage({
            type: 'openExternal',
            payload: { url: url }
        });
    }

    // Make functions globally available
    window.loadPullRequests = loadPullRequests;
    window.selectPullRequest = selectPullRequest;
    window.toggleFileChange = toggleFileChange;
    window.toggleFileComments = toggleFileComments;
    window.editComment = editComment;
    window.approveComment = approveComment;
    window.dismissComment = dismissComment;
    window.resetComment = resetComment;
    window.saveCommentEdit = saveCommentEdit;
    window.cancelCommentEdit = cancelCommentEdit;

    /**
     * Initialize Pull Request List View with search functionality
     */
    function initializePullRequestListView() {
        elements.prListContent.innerHTML = `
            <div class="pr-list-container">
                <!-- Search and Filter Controls -->
                <div class="pr-search-controls">
                    <div class="search-bar">
                        <div class="search-input-group">
                            <span class="codicon codicon-search search-icon"></span>
                            <input type="text" id="prSearchInput" placeholder="Search pull requests..." class="search-input">
                            <button id="clearSearchBtn" class="btn btn-icon" title="Clear search">
                                <span class="codicon codicon-close"></span>
                            </button>
                        </div>
                        <button id="advancedFiltersBtn" class="btn btn-secondary">
                            <span class="codicon codicon-filter"></span>
                            Filters
                        </button>
                        <button id="refreshPRsBtn" class="btn btn-secondary" title="Refresh">
                            <span class="codicon codicon-refresh"></span>
                        </button>
                    </div>
                    
                    <!-- Advanced Filters Panel (Initially Hidden) -->
                    <div id="advancedFiltersPanel" class="advanced-filters" style="display: none;">
                        <div class="filters-row">
                            <div class="filter-group">
                                <label for="repositoryFilter">Repository:</label>
                                <select id="repositoryFilter" class="filter-select">
                                    <option value="">All Repositories</option>
                                </select>
                            </div>
                            
                            <div class="filter-group">
                                <label for="authorFilter">Author:</label>
                                <input type="text" id="authorFilter" placeholder="Author name..." class="filter-input">
                            </div>
                            
                            <div class="filter-group">
                                <label for="statusFilter">Status:</label>
                                <select id="statusFilter" class="filter-select">
                                    <option value="">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                    <option value="abandoned">Abandoned</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="filters-row">
                            <div class="filter-group">
                                <label for="dateFromFilter">Date From:</label>
                                <input type="date" id="dateFromFilter" class="filter-input">
                            </div>
                            
                            <div class="filter-group">
                                <label for="dateToFilter">Date To:</label>
                                <input type="date" id="dateToFilter" class="filter-input">
                            </div>
                            
                            <div class="filter-actions">
                                <button id="applyFiltersBtn" class="btn btn-primary btn-sm">
                                    Apply Filters
                                </button>
                                <button id="clearFiltersBtn" class="btn btn-secondary btn-sm">
                                    Clear All
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Results Summary -->
                <div id="prResultsSummary" class="results-summary" style="display: none;">
                    <span id="resultsCount">0 pull requests</span>
                    <span id="resultsQuery"></span>
                    <button id="clearResultsBtn" class="btn btn-link btn-sm">Clear</button>
                </div>
                
                <!-- Sort Controls -->
                <div class="pr-sort-controls">
                    <label for="sortBy">Sort by:</label>
                    <select id="sortBy" class="sort-select">
                        <option value="created-desc">Created (Newest)</option>
                        <option value="created-asc">Created (Oldest)</option>
                        <option value="updated-desc">Updated (Newest)</option>
                        <option value="updated-asc">Updated (Oldest)</option>
                        <option value="title-asc">Title (A-Z)</option>
                        <option value="title-desc">Title (Z-A)</option>
                        <option value="author-asc">Author (A-Z)</option>
                        <option value="author-desc">Author (Z-A)</option>
                    </select>
                    
                    <div class="view-mode-controls">
                        <button id="listViewMode" class="btn btn-sm btn-icon active" title="List View">
                            <span class="codicon codicon-list-unordered"></span>
                        </button>
                        <button id="cardViewMode" class="btn btn-sm btn-icon" title="Card View">
                            <span class="codicon codicon-grid-view"></span>
                        </button>
                    </div>
                </div>

                <!-- Pull Requests Container -->
                <div id="pullRequestsContainer" class="pr-container">
                    <div class="loading-state">
                        <div class="loading-spinner"></div>
                        <p>Loading pull requests...</p>
                    </div>
                </div>
                
                <!-- Pagination Controls -->
                <div id="paginationControls" class="pagination-controls" style="display: none;">
                    <button id="prevPageBtn" class="btn btn-secondary btn-sm">
                        <span class="codicon codicon-chevron-left"></span>
                        Previous
                    </button>
                    
                    <div class="page-info">
                        <span id="pageInfo">Page 1 of 1</span>
                        <select id="pageSizeSelect" class="page-size-select">
                            <option value="10">10 per page</option>
                            <option value="25" selected>25 per page</option>
                            <option value="50">50 per page</option>
                            <option value="100">100 per page</option>
                        </select>
                    </div>
                    
                    <button id="nextPageBtn" class="btn btn-secondary btn-sm">
                        Next
                        <span class="codicon codicon-chevron-right"></span>
                    </button>
                </div>
            </div>
        `;
        
        // Setup event listeners for search and filtering
        setupSearchAndFilterListeners();
        
        // Load initial data
        loadPullRequests();
    }

    /**
     * Setup search and filter event listeners
     */
    function setupSearchAndFilterListeners() {
        const searchInput = document.getElementById('prSearchInput');
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        const advancedFiltersBtn = document.getElementById('advancedFiltersBtn');
        const refreshBtn = document.getElementById('refreshPRsBtn');
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        const clearResultsBtn = document.getElementById('clearResultsBtn');
        const sortSelect = document.getElementById('sortBy');
        
        // Search input with debouncing
        let searchTimeout;
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    performSearch(e.target.value);
                }, 300);
            });
        }
        
        // Clear search
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearSearchResults();
            });
        }
        
        // Toggle advanced filters
        if (advancedFiltersBtn) {
            advancedFiltersBtn.addEventListener('click', () => {
                const panel = document.getElementById('advancedFiltersPanel');
                const isVisible = panel.style.display !== 'none';
                panel.style.display = isVisible ? 'none' : 'block';
            });
        }
        
        // Refresh
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                sendMessage(MessageType.REFRESH_PULL_REQUESTS, {});
            });
        }
        
        // Apply filters
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                applyAdvancedFilters();
            });
        }
        
        // Clear filters
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                clearAllFilters();
            });
        }
        
        // Clear results
        if (clearResultsBtn) {
            clearResultsBtn.addEventListener('click', () => {
                clearSearchResults();
            });
        }
        
        // Sort change
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                sortCurrentResults(sortSelect.value);
            });
        }
    }

    /**
     * Perform search
     */
    function performSearch(query) {
        if (!query || query.trim() === '') {
            clearSearchResults();
            return;
        }
        
        showLoading(true, 'Searching pull requests...');
        sendMessage(MessageType.SEARCH_PULL_REQUESTS, { query: query.trim() });
    }

    /**
     * Apply advanced filters
     */
    function applyAdvancedFilters() {
        const filters = {
            repositoryId: document.getElementById('repositoryFilter').value,
            author: document.getElementById('authorFilter').value,
            status: document.getElementById('statusFilter').value,
            dateRange: {
                startDate: document.getElementById('dateFromFilter').value,
                endDate: document.getElementById('dateToFilter').value
            }
        };
        
        // Remove empty filters
        Object.keys(filters).forEach(key => {
            if (key === 'dateRange') {
                if (!filters[key].startDate && !filters[key].endDate) {
                    delete filters[key];
                }
            } else if (!filters[key]) {
                delete filters[key];
            }
        });
        
        if (Object.keys(filters).length === 0) {
            clearSearchResults();
            return;
        }
        
        showLoading(true, 'Applying filters...');
        sendMessage(MessageType.FILTER_PULL_REQUESTS, { filters });
    }

    /**
     * Clear all filters
     */
    function clearAllFilters() {
        document.getElementById('repositoryFilter').value = '';
        document.getElementById('authorFilter').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('dateFromFilter').value = '';
        document.getElementById('dateToFilter').value = '';
        document.getElementById('prSearchInput').value = '';
        
        clearSearchResults();
    }

    /**
     * Clear search results and show all PRs
     */
    function clearSearchResults() {
        const resultsSummary = document.getElementById('prResultsSummary');
        if (resultsSummary) {
            resultsSummary.style.display = 'none';
        }
        
        loadPullRequests();
    }

    /**
     * Sort current results
     */
    function sortCurrentResults(sortBy) {
        const container = document.getElementById('pullRequestsContainer');
        const prItems = Array.from(container.querySelectorAll('.pr-item'));
        
        if (prItems.length === 0) return;
        
        prItems.sort((a, b) => {
            const aData = JSON.parse(a.getAttribute('data-pr') || '{}');
            const bData = JSON.parse(b.getAttribute('data-pr') || '{}');
            
            switch (sortBy) {
                case 'created-desc':
                    return new Date(bData.creationDate) - new Date(aData.creationDate);
                case 'created-asc':
                    return new Date(aData.creationDate) - new Date(bData.creationDate);
                case 'updated-desc':
                    return new Date(bData.lastUpdateDate || bData.creationDate) - new Date(aData.lastUpdateDate || aData.creationDate);
                case 'updated-asc':
                    return new Date(aData.lastUpdateDate || aData.creationDate) - new Date(bData.lastUpdateDate || bData.creationDate);
                case 'title-asc':
                    return aData.title.localeCompare(bData.title);
                case 'title-desc':
                    return bData.title.localeCompare(aData.title);
                case 'author-asc':
                    return (aData.createdBy?.displayName || '').localeCompare(bData.createdBy?.displayName || '');
                case 'author-desc':
                    return (bData.createdBy?.displayName || '').localeCompare(aData.createdBy?.displayName || '');
                default:
                    return 0;
            }
        });
        
        // Re-append sorted items
        prItems.forEach(item => container.appendChild(item));
    }

    /**
     * Handle search response
     */
    function handleSearchResponse(message) {
        const { pullRequests, query, total } = message.payload;
        
        displayPullRequests(pullRequests);
        showSearchResults(total, `Search: "${query}"`);
        showLoading(false);
    }

    /**
     * Handle filter response
     */
    function handleFilterResponse(message) {
        const { pullRequests, total } = message.payload;
        
        displayPullRequests(pullRequests);
        showSearchResults(total, 'Filtered results');
        showLoading(false);
    }

    /**
     * Handle refresh response
     */
    function handleRefreshResponse(message) {
        const { pullRequests } = message.payload;
        
        displayPullRequests(pullRequests);
        showLoading(false);
        showSuccess('Pull requests refreshed successfully');
    }

    /**
     * Show search results summary
     */
    function showSearchResults(count, queryText) {
        const resultsSummary = document.getElementById('prResultsSummary');
        const resultsCount = document.getElementById('resultsCount');
        const resultsQuery = document.getElementById('resultsQuery');
        
        if (resultsSummary && resultsCount && resultsQuery) {
            resultsCount.textContent = `${count} pull request${count !== 1 ? 's' : ''}`;
            resultsQuery.textContent = queryText;
            resultsSummary.style.display = 'block';
        }
    }

    /**
     * Setup event listeners for AI review interface
     */
    function setupAIReviewEventListeners(comments) {
        // Filter controls
        const severityFilter = document.getElementById('severityFilter');
        const statusFilter = document.getElementById('statusFilter');
        const fileFilter = document.getElementById('fileFilter');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        
        // View controls
        const groupByFileBtn = document.getElementById('groupByFileBtn');
        const listViewBtn = document.getElementById('listViewBtn');
        
        // Action buttons
        const exportCommentsBtn = document.getElementById('exportCommentsBtn');
        const bulkActionBtn = document.getElementById('bulkActionBtn');
        
        // Apply filters when filter values change
        [severityFilter, statusFilter, fileFilter].forEach(filter => {
            if (filter) {
                filter.addEventListener('change', () => applyCommentFilters(comments));
            }
        });
        
        // Clear filters
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                severityFilter.value = '';
                statusFilter.value = '';
                fileFilter.value = '';
                applyCommentFilters(comments);
            });
        }
        
        // View mode toggles
        if (groupByFileBtn) {
            groupByFileBtn.addEventListener('click', () => {
                groupByFileBtn.classList.add('active');
                listViewBtn.classList.remove('active');
                document.getElementById('commentsContainer').innerHTML = renderComments(comments, 'grouped');
            });
        }
        
        if (listViewBtn) {
            listViewBtn.addEventListener('click', () => {
                listViewBtn.classList.add('active');
                groupByFileBtn.classList.remove('active');
                document.getElementById('commentsContainer').innerHTML = renderComments(comments, 'list');
            });
        }
        
        // Export comments
        if (exportCommentsBtn) {
            exportCommentsBtn.addEventListener('click', () => exportComments(comments));
        }
        
        // Bulk actions
        if (bulkActionBtn) {
            bulkActionBtn.addEventListener('click', () => showBulkActionsMenu(comments));
        }
    }

    /**
     * Apply comment filters
     */
    function applyCommentFilters(allComments) {
        const severityFilter = document.getElementById('severityFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        const fileFilter = document.getElementById('fileFilter').value;
        
        let filteredComments = allComments.filter(comment => {
            const matchesSeverity = !severityFilter || comment.severity === severityFilter;
            const matchesStatus = !statusFilter || (comment.status || 'pending') === statusFilter;
            const matchesFile = !fileFilter || comment.filePath === fileFilter;
            
            return matchesSeverity && matchesStatus && matchesFile;
        });
        
        const currentView = document.getElementById('groupByFileBtn').classList.contains('active') ? 'grouped' : 'list';
        document.getElementById('commentsContainer').innerHTML = renderComments(filteredComments, currentView);
    }

    /**
     * Toggle file comments visibility
     */
    function toggleFileComments(filePath) {
        const commentsContainer = document.getElementById(`file-comments-${encodeURIComponent(filePath)}`);
        const header = commentsContainer.previousElementSibling;
        const expandIndicator = header.querySelector('.expand-indicator');
        
        if (commentsContainer.style.display === 'none') {
            commentsContainer.style.display = 'block';
            expandIndicator.classList.remove('codicon-chevron-right');
            expandIndicator.classList.add('codicon-chevron-down');
        } else {
            commentsContainer.style.display = 'none';
            expandIndicator.classList.remove('codicon-chevron-down');
            expandIndicator.classList.add('codicon-chevron-right');
        }
    }

    /**
     * Edit comment
     */
    function editComment(commentId) {
        const commentItem = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (commentItem) {
            // Find the comment in analysisResults and mark as editing
            const comment = analysisResults.find(c => c.id === commentId);
            if (comment) {
                comment.isEditing = true;
                
                // Re-render just this comment
                commentItem.outerHTML = renderCommentItem(comment);
            }
        }
    }

    /**
     * Save comment edit
     */
    function saveCommentEdit(commentId) {
        const textarea = document.getElementById(`comment-editor-${commentId}`);
        if (textarea) {
            const newText = textarea.value.trim();
            if (newText) {
                sendMessage(MessageType.MODIFY_COMMENT, { commentId, newText });
            }
        }
    }

    /**
     * Cancel comment edit
     */
    function cancelCommentEdit(commentId) {
        const comment = analysisResults.find(c => c.id === commentId);
        if (comment) {
            comment.isEditing = false;
            const commentItem = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (commentItem) {
                commentItem.outerHTML = renderCommentItem(comment);
            }
        }
    }

    /**
     * Approve comment
     */
    function approveComment(commentId) {
        sendMessage(MessageType.APPROVE_COMMENT, { commentId });
    }

    /**
     * Dismiss comment
     */
    function dismissComment(commentId) {
        const reason = prompt('Please provide a reason for dismissing this comment (optional):');
        sendMessage(MessageType.DISMISS_COMMENT, { commentId, reason });
    }

    /**
     * Reset comment to pending
     */
    function resetComment(commentId) {
        const comment = analysisResults.find(c => c.id === commentId);
        if (comment) {
            comment.status = 'pending';
            const commentItem = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (commentItem) {
                commentItem.outerHTML = renderCommentItem(comment);
            }
        }
    }

    /**
     * Export comments
     */
    function exportComments(comments) {
        const format = prompt('Export format (json/csv):', 'json');
        if (format && ['json', 'csv'].includes(format.toLowerCase())) {
            sendMessage(MessageType.EXPORT_COMMENTS, { comments, format: format.toLowerCase() });
        }
    }

    /**
     * Show bulk actions menu
     */
    function showBulkActionsMenu(comments) {
        const pendingComments = comments.filter(c => (c.status || 'pending') === 'pending');
        
        if (pendingComments.length === 0) {
            showError('No pending comments available for bulk actions.');
            return;
        }
        
        const action = prompt(`Bulk actions available:\n1. Approve all pending (${pendingComments.length} comments)\n2. Dismiss all pending (${pendingComments.length} comments)\n\nEnter 1 or 2:`);
        
        if (action === '1') {
            if (confirm(`Approve all ${pendingComments.length} pending comments?`)) {
                pendingComments.forEach(comment => approveComment(comment.id));
            }
        } else if (action === '2') {
            const reason = prompt('Reason for dismissing all comments (optional):');
            if (confirm(`Dismiss all ${pendingComments.length} pending comments?`)) {
                pendingComments.forEach(comment => {
                    sendMessage(MessageType.DISMISS_COMMENT, { commentId: comment.id, reason });
                });
            }
        }
    }

    /**
     * Handle comment action responses
     */
    function handleCommentAction(message) {
        const { commentId, status, newText } = message.payload;
        
        // Update the comment in our local state
        const comment = analysisResults.find(c => c.id === commentId);
        if (comment) {
            comment.status = status;
            if (newText) {
                comment.content = newText;
            }
            comment.isEditing = false;
            
            // Re-render the comment
            const commentItem = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (commentItem) {
                commentItem.outerHTML = renderCommentItem(comment);
            }
        }
    }

    /**
     * Handle export response
     */
    function handleExportResponse(message) {
        if (message.payload.success) {
            showSuccess(`Comments exported successfully to ${message.payload.filename}`);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();