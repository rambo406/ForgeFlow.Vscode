// Comment Preview WebView JavaScript

(function() {
    'use strict';

    // Get VS Code API
    const vscode = acquireVsCodeApi();
    
    // State management
    let comments = window.initialComments || [];
    let currentFilter = {
        severity: 'all',
        fileName: 'all',
        showApproved: true
    };

    // Initialize the interface when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initializeEventListeners();
        initializeFilters();
        updateCommentVisibility();
        updateSummaryStats();
    });

    /**
     * Initialize all event listeners
     */
    function initializeEventListeners() {
        // Filter controls
        const severityFilter = document.getElementById('severityFilter');
        const fileFilter = document.getElementById('fileFilter');
        const showApprovedCheck = document.getElementById('showApproved');

        if (severityFilter) {
            severityFilter.addEventListener('change', handleSeverityFilter);
        }
        if (fileFilter) {
            fileFilter.addEventListener('change', handleFileFilter);
        }
        if (showApprovedCheck) {
            showApprovedCheck.addEventListener('change', handleShowApprovedFilter);
        }

        // Action buttons
        const selectAllBtn = document.getElementById('selectAllBtn');
        const selectNoneBtn = document.getElementById('selectNoneBtn');
        const postCommentsBtn = document.getElementById('postCommentsBtn');
        const cancelBtn = document.getElementById('cancelBtn');

        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', handleSelectAll);
        }
        if (selectNoneBtn) {
            selectNoneBtn.addEventListener('click', handleSelectNone);
        }
        if (postCommentsBtn) {
            postCommentsBtn.addEventListener('click', handlePostComments);
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', handleCancel);
        }

        // Comment interactions (use event delegation)
        document.addEventListener('click', handleCommentInteraction);
        document.addEventListener('change', handleApprovalChange);
        document.addEventListener('blur', handleContentEdit, true);
        document.addEventListener('keydown', handleKeydown);
    }

    /**
     * Initialize filter dropdowns with current values
     */
    function initializeFilters() {
        const severityFilter = document.getElementById('severityFilter');
        const fileFilter = document.getElementById('fileFilter');
        const showApprovedCheck = document.getElementById('showApproved');

        if (severityFilter) {
            severityFilter.value = currentFilter.severity;
        }
        if (fileFilter) {
            fileFilter.value = currentFilter.fileName;
        }
        if (showApprovedCheck) {
            showApprovedCheck.checked = currentFilter.showApproved;
        }
    }

    /**
     * Handle severity filter changes
     */
    function handleSeverityFilter(event) {
        currentFilter.severity = event.target.value;
        updateCommentVisibility();
        sendMessage('updateFilter', currentFilter);
    }

    /**
     * Handle file filter changes
     */
    function handleFileFilter(event) {
        currentFilter.fileName = event.target.value;
        updateCommentVisibility();
        sendMessage('updateFilter', currentFilter);
    }

    /**
     * Handle show approved filter changes
     */
    function handleShowApprovedFilter(event) {
        currentFilter.showApproved = event.target.checked;
        updateCommentVisibility();
        sendMessage('updateFilter', currentFilter);
    }

    /**
     * Handle select all button click
     */
    function handleSelectAll() {
        const checkboxes = document.querySelectorAll('.comment-card input[type="checkbox"][data-action="toggle-approval"]');
        checkboxes.forEach(checkbox => {
            if (!checkbox.checked) {
                checkbox.checked = true;
                toggleCommentApproval(checkbox);
            }
        });
        sendMessage('selectAll');
    }

    /**
     * Handle select none button click
     */
    function handleSelectNone() {
        const checkboxes = document.querySelectorAll('.comment-card input[type="checkbox"][data-action="toggle-approval"]');
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                checkbox.checked = false;
                toggleCommentApproval(checkbox);
            }
        });
        sendMessage('selectNone');
    }

    /**
     * Handle post comments button click
     */
    function handlePostComments() {
        const approvedComments = comments.filter(comment => comment.isApproved);
        
        if (approvedComments.length === 0) {
            showNotification('No comments selected for posting.', 'warning');
            return;
        }

        const confirmMessage = `Post ${approvedComments.length} selected comment(s) to Azure DevOps?`;
        if (confirm(confirmMessage)) {
            sendMessage('postComments', { approvedComments });
        }
    }

    /**
     * Handle cancel button click
     */
    function handleCancel() {
        if (confirm('Cancel review? Any changes will be lost.')) {
            sendMessage('cancel');
        }
    }

    /**
     * Handle comment interactions (edit, delete)
     */
    function handleCommentInteraction(event) {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (!action) return;

        const commentCard = event.target.closest('.comment-card');
        if (!commentCard) return;

        const commentId = commentCard.dataset.commentId;

        switch (action) {
            case 'edit':
                toggleEditMode(commentCard);
                break;
            case 'delete':
                deleteComment(commentId, commentCard);
                break;
        }
    }

    /**
     * Handle approval checkbox changes
     */
    function handleApprovalChange(event) {
        if (event.target.dataset.action === 'toggle-approval') {
            toggleCommentApproval(event.target);
        }
    }

    /**
     * Handle content editing blur events
     */
    function handleContentEdit(event) {
        if (event.target.contentEditable === 'true') {
            saveContentEdit(event.target);
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    function handleKeydown(event) {
        // Escape key to exit edit mode
        if (event.key === 'Escape' && event.target.contentEditable === 'true') {
            event.target.blur();
        }
        
        // Enter key to save and exit edit mode
        if (event.key === 'Enter' && event.target.contentEditable === 'true' && !event.shiftKey) {
            event.preventDefault();
            event.target.blur();
        }

        // Ctrl+A to select all comments
        if (event.ctrlKey && event.key === 'a' && !event.target.contentEditable) {
            event.preventDefault();
            handleSelectAll();
        }
    }

    /**
     * Toggle comment approval status
     */
    function toggleCommentApproval(checkbox) {
        const commentCard = checkbox.closest('.comment-card');
        const commentId = commentCard.dataset.commentId;
        const isApproved = checkbox.checked;

        // Update UI
        if (isApproved) {
            commentCard.setAttribute('data-approved', 'true');
        } else {
            commentCard.removeAttribute('data-approved');
        }

        // Update local state
        const comment = comments.find(c => c.id === commentId);
        if (comment) {
            comment.isApproved = isApproved;
        }

        // Send update to extension
        sendMessage('toggleApproval', { commentId, isApproved });

        // Update summary stats
        updateSummaryStats();
    }

    /**
     * Toggle edit mode for a comment
     */
    function toggleEditMode(commentCard) {
        const contentText = commentCard.querySelector('.comment-text');
        const suggestionText = commentCard.querySelector('.suggestion-text');
        
        if (contentText.contentEditable === 'true') {
            // Exit edit mode
            contentText.contentEditable = 'false';
            if (suggestionText) {
                suggestionText.contentEditable = 'false';
            }
            
            // Update edit button icon/text
            const editBtn = commentCard.querySelector('[data-action="edit"]');
            editBtn.title = 'Edit comment';
        } else {
            // Enter edit mode
            contentText.contentEditable = 'true';
            contentText.focus();
            
            if (suggestionText) {
                suggestionText.contentEditable = 'true';
            }
            
            // Update edit button icon/text
            const editBtn = commentCard.querySelector('[data-action="edit"]');
            editBtn.title = 'Finish editing';
        }
    }

    /**
     * Save content edits
     */
    function saveContentEdit(element) {
        const commentCard = element.closest('.comment-card');
        const commentId = commentCard.dataset.commentId;
        const field = element.dataset.field;

        if (!commentId || !field) return;

        const content = element.textContent.trim();
        const comment = comments.find(c => c.id === commentId);

        if (!comment) return;

        // Update local state
        if (field === 'content') {
            comment.content = content;
        } else if (field === 'suggestion') {
            comment.suggestion = content || undefined;
        }

        // Send update to extension
        sendMessage('updateComment', {
            commentId,
            content: comment.content,
            severity: comment.severity,
            suggestion: comment.suggestion
        });

        // Exit edit mode
        element.contentEditable = 'false';
    }

    /**
     * Delete a comment
     */
    function deleteComment(commentId, commentCard) {
        if (confirm('Delete this comment? This action cannot be undone.')) {
            // Remove from local state
            const index = comments.findIndex(c => c.id === commentId);
            if (index !== -1) {
                comments.splice(index, 1);
            }

            // Remove from UI
            commentCard.remove();

            // Send delete message to extension
            sendMessage('deleteComment', { commentId });

            // Update summary stats
            updateSummaryStats();

            // Check if file section is now empty
            const fileSection = commentCard.closest('.file-section');
            if (fileSection && fileSection.querySelectorAll('.comment-card').length === 0) {
                fileSection.remove();
            }
        }
    }

    /**
     * Update comment visibility based on current filters
     */
    function updateCommentVisibility() {
        const commentCards = document.querySelectorAll('.comment-card');
        
        commentCards.forEach(card => {
            const severity = card.dataset.severity;
            const fileName = card.closest('.file-section')?.dataset.file;
            const isApproved = card.hasAttribute('data-approved');

            let shouldShow = true;

            // Apply severity filter
            if (currentFilter.severity !== 'all' && severity !== currentFilter.severity) {
                shouldShow = false;
            }

            // Apply file filter
            if (currentFilter.fileName !== 'all' && fileName !== currentFilter.fileName) {
                shouldShow = false;
            }

            // Apply approval filter
            if (!currentFilter.showApproved && isApproved) {
                shouldShow = false;
            }

            // Update visibility
            if (shouldShow) {
                card.removeAttribute('data-hidden');
            } else {
                card.setAttribute('data-hidden', 'true');
            }
        });

        // Hide file sections with no visible comments
        const fileSections = document.querySelectorAll('.file-section');
        fileSections.forEach(section => {
            const visibleComments = section.querySelectorAll('.comment-card:not([data-hidden])');
            if (visibleComments.length === 0) {
                section.setAttribute('data-hidden', 'true');
            } else {
                section.removeAttribute('data-hidden');
            }
        });
    }

    /**
     * Update summary statistics in the header
     */
    function updateSummaryStats() {
        const stats = {
            total: comments.length,
            errors: comments.filter(c => c.severity === 'error').length,
            warnings: comments.filter(c => c.severity === 'warning').length,
            info: comments.filter(c => c.severity === 'info').length,
            approved: comments.filter(c => c.isApproved).length
        };

        // Update stat displays
        const statElements = document.querySelectorAll('.summary .stat');
        statElements.forEach(element => {
            const text = element.textContent;
            if (text.includes('Total:')) {
                element.textContent = `Total: ${stats.total}`;
            } else if (text.includes('Errors:')) {
                element.textContent = `Errors: ${stats.errors}`;
            } else if (text.includes('Warnings:')) {
                element.textContent = `Warnings: ${stats.warnings}`;
            } else if (text.includes('Suggestions:')) {
                element.textContent = `Suggestions: ${stats.info}`;
            } else if (text.includes('Approved:')) {
                element.textContent = `Approved: ${stats.approved}`;
            }
        });

        // Update post button state
        const postBtn = document.getElementById('postCommentsBtn');
        if (postBtn) {
            if (stats.approved === 0) {
                postBtn.disabled = true;
                postBtn.textContent = 'No Comments Selected';
            } else {
                postBtn.disabled = false;
                postBtn.textContent = `Post ${stats.approved} Comment${stats.approved === 1 ? '' : 's'}`;
            }
        }
    }

    /**
     * Show a notification message
     */
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            background: var(--vscode-notifications-background);
            color: var(--vscode-notifications-foreground);
            border: 1px solid var(--vscode-notifications-border);
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;

        // Add to page
        document.body.appendChild(notification);

        // Remove after delay
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Send a message to the extension
     */
    function sendMessage(type, data = {}) {
        vscode.postMessage({ type, data });
    }

    /**
     * Handle messages from the extension
     */
    window.addEventListener('message', function(event) {
        const message = event.data;
        
        switch (message.type) {
            case 'updateComments':
                comments = message.data.comments;
                updateSummaryStats();
                updateCommentVisibility();
                break;
            case 'showNotification':
                showNotification(message.data.message, message.data.type);
                break;
        }
    });

    // CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .notification {
            animation: slideIn 0.3s ease-out;
        }
    `;
    document.head.appendChild(style);

})();