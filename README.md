# Azure DevOps PR Code Reviewer

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue?logo=visual-studio-code)](https://marketplace.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.1.0-green.svg)](package.json)

An AI-powered VS Code extension that automatically reviews Azure DevOps pull requests using advanced language models. Get intelligent code review feedback with customizable instructions and seamless integration with your development workflow.

![Extension Demo](images/demo.gif)

## ✨ Features

- 🤖 **AI-Powered Code Review**: Leverages VS Code's Language Model API (GitHub Copilot, etc.) for intelligent analysis
- 🔐 **Secure Authentication**: Personal Access Tokens stored securely using VS Code Secret Storage
- 📝 **Customizable Instructions**: Configure review criteria, focus areas, and coding standards
- 🚀 **Batch Processing**: Efficiently handles large PRs with configurable parallel processing
- 💬 **Interactive Preview**: Review, edit, and approve AI-generated comments before posting
- ⚡ **Performance Optimized**: Smart caching, request throttling, and memory management
- 🎯 **Targeted Analysis**: Focus on changed code with intelligent diff parsing
- 📊 **Progress Tracking**: Real-time progress indicators for long-running analyses
- 🛡️ **Error Recovery**: Robust error handling and retry mechanisms

## 📋 Requirements

- **VS Code**: Version 1.74.0 or higher
- **Azure DevOps**: Account with appropriate permissions
- **Personal Access Token**: With the following scopes:
  - Code (read)
  - Pull Request (read & write)
- **Language Model**: Access to VS Code Language Model API (e.g., GitHub Copilot)

## 🚀 Getting Started

### Step 1: Install the Extension

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/) or search for "Azure DevOps PR Code Reviewer" in the Extensions view.

### Step 2: Create a Personal Access Token

1. Go to your Azure DevOps organization
2. Navigate to **User Settings** → **Personal Access Tokens**
3. Click **New Token**
4. Set appropriate expiration and scopes:
   - ✅ **Code (read)**
   - ✅ **Pull Request (read & write)**
5. Copy the generated token

### Step 3: Configure the Extension

1. Open VS Code Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **"Azure DevOps PR Reviewer: Configure"**
3. Enter your Azure DevOps organization URL:
   ```
   https://dev.azure.com/your-organization
   ```
4. Paste your Personal Access Token
5. Optionally set a default project name

### Step 4: Start Reviewing!

1. Open Command Palette
2. Run **"Azure DevOps PR Reviewer: Analyze Pull Request"** (`Ctrl+Shift+A` / `Cmd+Shift+A`)
3. Select a pull request from the list
4. Wait for AI analysis to complete
5. Review the generated comments in the preview
6. Edit, approve, or remove comments as needed
7. Post approved comments to Azure DevOps

## 🎮 Commands & Shortcuts

| Command | Shortcut | Description |
|---------|----------|-------------|
| `Azure DevOps PR Reviewer: Configure` | - | Set up Azure DevOps connection and preferences |
| `Azure DevOps PR Reviewer: Analyze Pull Request` | `Ctrl+Shift+A` | Start analyzing a pull request |
| `Azure DevOps PR Reviewer: Quick Analyze PR by ID` | `Ctrl+Shift+Q` | Analyze a specific PR by ID |
| `Azure DevOps PR Reviewer: Select Language Model` | - | Choose your preferred AI model |
| `Azure DevOps PR Reviewer: Test Connection` | - | Verify your Azure DevOps connection |
| `Azure DevOps PR Reviewer: Show Status` | - | View extension status and diagnostics |

## ⚙️ Configuration

Access settings via **File** → **Preferences** → **Settings** → Search for "Azure DevOps PR Reviewer"

### Core Settings

| Setting | Description | Default | Type |
|---------|-------------|---------|------|
| `organizationUrl` | Azure DevOps organization URL | - | `string` |
| `defaultProject` | Default project name (optional) | - | `string` |
| `selectedModel` | Preferred language model | `"gpt-4"` | `enum` |
| `customInstructions` | Custom review instructions | See below | `string` |
| `batchSize` | Files to process in parallel | `10` | `number` |
| `enableTelemetry` | Enable usage telemetry | `true` | `boolean` |

### Default Custom Instructions

```
Focus on code quality, security vulnerabilities, performance issues, and maintainability. 
Provide specific suggestions for improvement.
```

### Example Custom Instructions

```
- Prioritize security vulnerabilities and potential exploits
- Check for proper error handling and input validation  
- Verify TypeScript type safety and avoid 'any' types
- Ensure consistent code formatting and naming conventions
- Look for performance bottlenecks and optimization opportunities
- Validate accessibility compliance for frontend code
- Check for proper unit test coverage
```

## 🛠️ Troubleshooting

### Common Issues

**🔴 "No language models available"**
- Install and activate GitHub Copilot or another supported extension
- Ensure you have an active subscription/license

**🔴 "Authentication failed"**
- Verify your Personal Access Token has the correct permissions
- Check if the token has expired
- Ensure the organization URL is correct

**🔴 "Pull request not found"**
- Verify you have access to the project and repository
- Check if the PR ID is correct
- Ensure the PR hasn't been deleted or moved

**🔴 "Rate limit exceeded"**
- Wait a few minutes before retrying
- Reduce the batch size in settings
- Check Azure DevOps service status

### Debug Information

Run **"Azure DevOps PR Reviewer: Show Status"** to view:
- Connection status
- Available language models
- Recent error logs
- Performance metrics

### Support

- 🐛 **Report Issues**: [GitHub Issues](https://github.com/forgeflow/azdo-pr-code-reviewer/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/forgeflow/azdo-pr-code-reviewer/discussions)
- 📧 **Contact**: support@forgeflow.dev

## 🔒 Security & Privacy

### Data Handling
- **Personal Access Tokens**: Stored securely using VS Code Secret Storage API
- **Code Content**: Only changed lines are sent to language models for analysis
- **No Data Retention**: Code content is not stored or logged by the extension
- **API Communications**: All requests use HTTPS encryption

### Permissions
The extension requires minimal permissions:
- Azure DevOps API access (for reading PRs and posting comments)
- VS Code Language Model API access (for code analysis)
- Local storage (for configuration and caching)

## 🏗️ Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Setup
```bash
git clone https://github.com/forgeflow/azdo-pr-code-reviewer.git
cd azdo-pr-code-reviewer
npm install
```

### Development Workflow
```bash
# Start development build with watch mode
npm run watch

# Run tests
npm test

# Lint code
npm run lint

# Build for production
npm run compile

# Package extension
npm run package
```

### Project Structure
```
src/
├── extension.ts              # Main extension entry point
├── commands/                 # Command implementations
├── services/                 # Core business logic
├── models/                   # Data models and interfaces
├── utils/                    # Utility functions
├── webview-angular/          # Angular webview application
│   ├── src/                  # Angular source code
│   ├── libs/ui/              # Tailwind-based UI component library
│   └── tailwind.config.js    # Tailwind CSS configuration
└── test/                     # Test suites
    ├── suite/               # Unit tests
    └── integration/         # Integration tests

docs/tailwind/                # Tailwind CSS documentation
├── README.md                 # Overview and quick start
├── getting-started.md        # Setup and basic usage
├── component-reference.md    # Complete component catalog
├── design-tokens.md          # Design system tokens
├── theme-integration.md      # VS Code theme system
├── utility-guidelines.md     # Best practices
├── migration-patterns.md     # Migration strategies
└── developer-onboarding.md   # New developer guide
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### UI Development

For UI component development, see our [Tailwind CSS Documentation](docs/tailwind/README.md):

- **[Getting Started](docs/tailwind/getting-started.md)**: Setup and basic usage
- **[Component Reference](docs/tailwind/component-reference.md)**: Complete component catalog  
- **[Developer Onboarding](docs/tailwind/developer-onboarding.md)**: New developer guide
- **[Design Tokens](docs/tailwind/design-tokens.md)**: Design system reference
- **[Utility Guidelines](docs/tailwind/utility-guidelines.md)**: Best practices

### Development Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following our [coding guidelines](docs/tailwind/utility-guidelines.md)
4. Add tests for new functionality
5. Test across VS Code themes: `./scripts/theme-testing.sh`
6. Ensure tests pass: `npm test`
7. Commit changes: `git commit -m 'Add amazing feature'`
8. Push to branch: `git push origin feature/amazing-feature`
9. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- VS Code team for the excellent Language Model API
- Azure DevOps team for comprehensive REST APIs
- The open-source community for inspiration and feedback

---

**Made with ❤️ by ForgeFlow** | [Website](https://forgeflow.dev) | [GitHub](https://github.com/forgeflow)

