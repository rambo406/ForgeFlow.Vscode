# Design Document: Settings Configuration Button

## Overview

This design document outlines the implementation approach for adding a centralized settings configuration interface to the Azure DevOps PR Code Reviewer extension. The feature will introduce a prominent cog button in webview interfaces that opens a comprehensive settings panel, providing users with easy access to all extension configuration options.

## Architecture Decisions

### 1. Settings Panel Architecture

**Decision:** Implement settings as a dedicated webview panel with section-based configuration

**Rationale:**
- Provides a comprehensive, user-friendly interface for all settings
- Maintains consistency with VS Code UI patterns
- Allows for real-time validation and feedback
- Enables logical grouping of related settings

### 2. Settings Storage Strategy

**Decision:** Use a hybrid storage approach combining VS Code configurations and secure storage

**Storage Mapping:**
- **VS Code Global Configuration:** Non-sensitive user preferences (model selection, batch sizes, telemetry)
- **VS Code Workspace Configuration:** Project-specific settings (default project, custom instructions)
- **VS Code Secret Storage API:** Sensitive data (PAT tokens)
- **Extension Context Global State:** UI preferences and welcome flags

### 3. UI Integration Approach

**Decision:** Extend existing webview architecture with new message types and views

**Benefits:**
- Leverages existing webview infrastructure
- Maintains consistent communication patterns
- Allows reuse of existing styling and components
- Minimizes disruption to current functionality

## Technical Specifications

### Component Structure

```
src/
├── controllers/
│   └── PRDashboardController.ts (Enhanced)
├── services/
│   ├── ConfigurationManager.ts (Enhanced)
│   └── SettingsValidationService.ts (New)
├── webview/
│   ├── dashboard.css (Enhanced)
│   ├── dashboard.js (Enhanced)
│   └── settings-panel.html (New template)
└── utils/
    └── SettingsUtils.ts (New)
```

### New Message Types

```typescript
export enum MessageType {
    // Existing messages...
    
    // Settings-specific messages
    OPEN_SETTINGS = 'openSettings',
    CLOSE_SETTINGS = 'closeSettings',
    VALIDATE_SETTING = 'validateSetting',
    RESET_SETTINGS = 'resetSettings',
    EXPORT_SETTINGS = 'exportSettings',
    IMPORT_SETTINGS = 'importSettings',
    SETTINGS_CHANGED = 'settingsChanged'
}
```

### Settings Data Model

```typescript
interface SettingsConfiguration {
    azureDevOps: {
        organizationUrl: string;
        personalAccessToken: string;
        defaultProject: string;
    };
    languageModel: {
        selectedModel: string;
        modelParameters?: Record<string, any>;
    };
    reviewInstructions: {
        customInstructions: string;
        useDefaultInstructions: boolean;
    };
    performance: {
        batchSize: number;
        maxConcurrentRequests: number;
        timeoutSeconds: number;
        enableTelemetry: boolean;
    };
    ui: {
        theme: 'auto' | 'light' | 'dark';
        enableAnimations: boolean;
        compactMode: boolean;
    };
}
```

## Implementation Plan

### Phase 1: Core Infrastructure

#### 1.1 Enhance ConfigurationManager

**Location:** `src/services/ConfigurationManager.ts`

**Changes:**
- Add settings validation methods
- Implement settings export/import functionality
- Add configuration change event handling
- Enhance error handling and user feedback

**New Methods:**
```typescript
// Settings validation
validateAllSettings(): Promise<ValidationResult>;
validateSetting(key: string, value: any): Promise<ValidationResult>;

// Settings management
exportSettings(): Promise<SettingsConfiguration>;
importSettings(config: SettingsConfiguration): Promise<ValidationResult>;
resetSettingsToDefault(): Promise<void>;

// Event handling
onConfigurationChanged(callback: (changes: ConfigurationChange[]) => void): vscode.Disposable;
```

#### 1.2 Create SettingsValidationService

**Location:** `src/services/SettingsValidationService.ts`

**Purpose:** Centralized validation logic for all settings

**Key Features:**
- Organization URL format validation
- PAT token format and permission validation
- Model availability checking
- Performance setting bounds validation
- Real-time validation feedback

### Phase 2: Webview Enhancement

#### 2.1 Update PRDashboardController

**Enhancements:**
- Add settings panel view management
- Implement settings-specific message handlers
- Add settings persistence logic
- Integrate real-time validation

**New Message Handlers:**
```typescript
private async handleOpenSettings(message: WebviewMessage): Promise<void>;
private async handleCloseSettings(message: WebviewMessage): Promise<void>;
private async handleValidateSetting(message: WebviewMessage): Promise<void>;
private async handleResetSettings(message: WebviewMessage): Promise<void>;
```

#### 2.2 Enhance Webview UI

**HTML Structure Updates:**
```html
<!-- Settings Button (added to header) -->
<button id="settingsBtn" class="settings-btn" title="Settings">
    <span class="codicon codicon-gear"></span>
</button>

<!-- Settings Panel (new modal/panel) -->
<div id="settingsPanel" class="settings-panel" style="display: none;">
    <div class="settings-header">
        <h2>Extension Settings</h2>
        <button id="closeSettingsBtn" class="close-btn">
            <span class="codicon codicon-close"></span>
        </button>
    </div>
    <div class="settings-content">
        <!-- Settings sections will be dynamically generated -->
    </div>
</div>
```

### Phase 3: Settings Sections Implementation

#### 3.1 Azure DevOps Configuration Section

**Features:**
- Organization URL input with real-time validation
- PAT token input (masked) with validation
- Default project selection
- Connection test functionality

**Validation Rules:**
- URL format: `https://dev.azure.com/{organization}` or `https://{organization}.visualstudio.com`
- PAT token: Base64 format validation
- Project: Existence validation via API call

#### 3.2 Language Model Configuration Section

**Features:**
- Available models dropdown
- Model details display (vendor, capabilities, limits)
- Model parameter configuration
- Fallback model selection

**Integration Points:**
- Language Model Service for model enumeration
- Real-time availability checking
- Model capability validation

#### 3.3 Review Instructions Section

**Features:**
- Custom instructions text area with preview
- Character count and limits
- Reset to defaults functionality
- Instruction templates/presets

**Validation:**
- Character limit enforcement (configurable)
- Template syntax validation
- Preview generation

#### 3.4 Performance Settings Section

**Features:**
- Batch size slider/input (1-100)
- Concurrent request limits (1-10)
- Timeout configuration (5-300 seconds)
- Telemetry opt-in/out toggle

**Validation:**
- Numeric range validation
- Performance impact warnings
- Hardware-based recommendations

### Phase 4: Advanced Features

#### 4.1 Settings Import/Export

**Features:**
- Export current settings to JSON/YAML
- Import settings from file
- Backup and restore functionality
- Settings migration support

#### 4.2 Settings Synchronization

**Features:**
- VS Code Settings Sync integration
- Workspace vs global setting detection
- Conflict resolution UI
- Setting source indication

#### 4.3 Accessibility Enhancements

**Features:**
- Full keyboard navigation support
- Screen reader compatibility
- High contrast theme support
- Focus management and aria labels

## UI/UX Design Specifications

### Visual Design

#### Settings Button
- **Location:** Top-right corner of all webview headers
- **Style:** Consistent with VS Code icon buttons
- **States:** Normal, hover, active, focused
- **Icon:** Codicon gear (codicon-gear)
- **Size:** 24x24px minimum touch target

#### Settings Panel
- **Layout:** Modal overlay with centered panel (max-width: 800px)
- **Sections:** Collapsible accordion-style sections
- **Responsive:** Adapts to webview size
- **Theme:** Follows VS Code theme automatically

### Interaction Design

#### Opening Settings
1. User clicks settings cog button
2. Settings panel slides in from right
3. Focus moves to first interactive element
4. Background is dimmed with overlay

#### Navigation
- Tab order follows logical flow
- Arrow keys navigate within sections
- Escape key closes panel
- Enter/Space activate buttons

#### Validation Feedback
- Real-time validation on input change
- Inline error messages below inputs
- Success indicators for valid inputs
- Summary validation status

### Responsive Behavior

```css
/* Mobile/narrow webview */
@media (max-width: 600px) {
    .settings-panel {
        width: 100%;
        height: 100%;
        border-radius: 0;
    }
}

/* Wide webview */
@media (min-width: 1200px) {
    .settings-panel {
        max-width: 1000px;
        display: grid;
        grid-template-columns: 300px 1fr;
    }
}
```

## Error Handling Strategy

### Validation Errors
- **Strategy:** Immediate feedback with specific error messages
- **Recovery:** Clear instructions for correction
- **Prevention:** Input constraints and format helpers

### Network Errors
- **Strategy:** Distinguish between connectivity and configuration issues
- **Recovery:** Retry mechanisms with exponential backoff
- **Fallback:** Offline mode with cached settings

### Configuration Conflicts
- **Strategy:** Clear precedence rules (workspace > global > default)
- **Recovery:** Conflict resolution UI
- **Prevention:** Source indication and warnings

## Performance Considerations

### Lazy Loading
- Settings sections loaded on demand
- Model list fetched asynchronously
- Validation debounced (300ms)

### Caching Strategy
- Configuration cache (5-minute TTL)
- Model capability cache (1-hour TTL)
- Validation result cache (session-based)

### Memory Management
- Event listener cleanup on panel close
- Cache size limits and LRU eviction
- Dispose pattern for subscriptions

## Security Considerations

### Sensitive Data Handling
- PAT tokens stored only in VS Code Secret Storage
- No plaintext token transmission
- Mask tokens in UI (show last 4 characters)

### Input Sanitization
- HTML entity encoding for all user inputs
- URL validation to prevent SSRF attacks
- JSON schema validation for imported settings

### Access Control
- Settings panel only accessible to authenticated users
- Workspace settings require appropriate permissions
- Audit trail for sensitive setting changes

## Testing Strategy

### Unit Tests
- Configuration validation logic
- Settings persistence mechanisms
- Error handling scenarios
- Message communication patterns

### Integration Tests
- End-to-end settings workflow
- Cross-platform compatibility
- Theme adaptation testing
- Accessibility compliance

### Performance Tests
- Settings panel load time
- Large configuration handling
- Memory usage validation
- Concurrent access scenarios

## Migration and Compatibility

### Existing Configuration Migration
- Automatic detection of legacy settings
- One-time migration prompt
- Backup creation before migration
- Rollback mechanism for failed migrations

## Implementation Timeline

### Week 1-2: Core Infrastructure
- Enhanced ConfigurationManager
- SettingsValidationService
- Message type definitions
- Basic settings data model

### Week 3-4: Webview Integration
- UI layout and styling
- Message handling infrastructure
- Settings panel framework
- Basic validation integration

### Week 5-6: Settings Sections
- Azure DevOps configuration
- Language model settings
- Performance configuration
- Basic import/export

### Week 7-8: Polish and Testing
- Accessibility enhancements
- Error handling refinement
- Performance optimization
- Comprehensive testing

## Success Metrics

### User Experience
- Reduced configuration-related support requests
- Improved first-time user setup success rate
- Higher user satisfaction with settings management

### Technical Metrics
- Settings panel load time < 200ms
- Validation response time < 100ms
- Zero configuration data loss incidents
- 100% accessibility compliance

### Adoption Metrics
- Settings panel usage frequency
- Feature utilization rates
- Configuration completion rates
- User retention improvement

## Conclusion

This design provides a comprehensive approach to implementing the settings configuration button feature. The solution leverages the existing extension architecture while adding robust settings management capabilities. The phased implementation approach ensures incremental delivery of value while maintaining system stability and user experience quality.

The design prioritizes accessibility, performance, and security while providing a familiar and intuitive user interface that follows VS Code design patterns. The modular architecture enables future enhancements and maintains the extension's maintainability and extensibility.