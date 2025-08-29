# Changelog

All notable changes to the Azure DevOps PR Code Reviewer extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features
- Multi-language support for review comments
- Integration with GitHub for cross-platform support
- Custom review templates and presets
- Detailed analytics and reporting
- Team collaboration features

## [0.1.0] - 2024-01-15

### Added
- Initial release of Azure DevOps PR Code Reviewer
- AI-powered code review using VS Code Language Model API
- Secure PAT token authentication with Azure DevOps
- Interactive comment preview and editing interface
- Customizable review instructions and criteria
- Batch processing for large pull requests
- Performance optimization with caching and rate limiting
- Comprehensive error handling and recovery
- Memory management for resource efficiency
- Progress tracking for long-running analyses
- Configuration management with validation
- Support for multiple language models (GPT-4, GPT-3.5-turbo, Claude)

### Core Features
- **Pull Request Analysis**: Automatically fetch and analyze PR file changes
- **AI-Powered Reviews**: Generate intelligent code review comments
- **Comment Management**: Preview, edit, approve, and post comments
- **Configuration**: Secure setup with organization URL and PAT tokens
- **Batch Processing**: Configurable parallel processing for performance
- **Error Recovery**: Robust error handling with retry mechanisms
- **Telemetry**: Optional usage analytics for improvement insights

### Commands
- `Azure DevOps PR Reviewer: Configure` - Set up connection and preferences
- `Azure DevOps PR Reviewer: Analyze Pull Request` - Start PR analysis
- `Azure DevOps PR Reviewer: Quick Analyze PR by ID` - Direct PR analysis by ID
- `Azure DevOps PR Reviewer: Select Language Model` - Choose AI model
- `Azure DevOps PR Reviewer: Test Connection` - Verify Azure DevOps connection
- `Azure DevOps PR Reviewer: Show Status` - Display extension diagnostics

### Configuration Options
- Organization URL configuration with validation
- Default project setting for convenience
- Language model selection (GPT-4, GPT-3.5-turbo, Claude variants)
- Custom review instructions and focus areas
- Batch size configuration for performance tuning
- Telemetry enable/disable option

### Technical Implementation
- TypeScript codebase with comprehensive type safety
- Modular architecture with separation of concerns
- Extensive unit and integration test coverage
- Performance monitoring and optimization
- Memory management with object pooling
- Rate limiting and request throttling
- Secure credential storage using VS Code Secret Storage API
- Webpack bundling for optimized distribution

### Developer Experience
- Comprehensive documentation and README
- Development setup with watch mode
- ESLint configuration for code quality
- Automated testing with Mocha
- VSCE packaging for marketplace distribution

### Security & Privacy
- Secure PAT token storage with VS Code Secret Storage
- HTTPS-only communications with Azure DevOps APIs
- No persistent storage of code content
- Optional telemetry with clear privacy controls
- Input validation and sanitization

### Supported File Types
- All text-based files supported by Azure DevOps
- Special handling for binary files (excluded from analysis)
- Large file detection and optimized processing
- Intelligent diff parsing for focused analysis

### Language Model Integration
- VS Code Language Model API compatibility
- Support for GitHub Copilot and compatible extensions
- Graceful fallback when models are unavailable
- Model-specific configuration and optimization
- Custom prompt engineering for code review quality

### Known Limitations
- Requires active VS Code Language Model API subscription
- Azure DevOps cloud only (on-premises TFS not supported)
- Limited to text-based file analysis
- Review quality depends on selected language model capabilities

### Dependencies
- VS Code 1.74.0 or higher
- Node.js runtime for extension execution
- Axios for HTTP requests to Azure DevOps APIs
- TypeScript for development and compilation
- Webpack for bundling and optimization

---

## Version History

### Pre-release Development
- Architecture design and planning
- Core service implementation
- Azure DevOps API integration
- Language Model API integration
- User interface development
- Testing framework setup
- Documentation creation
- Performance optimization
- Security review and hardening

---

**Note**: This extension is in active development. Features and APIs may change between versions. Please check the README and marketplace page for the latest information.