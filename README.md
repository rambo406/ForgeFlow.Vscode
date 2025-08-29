<<<<<<< HEAD
# ForgeFlow.Vscode
=======
# Azure DevOps PR Code Reviewer

An AI-powered VSCode extension that automatically reviews pull requests in Azure DevOps using advanced language models.

## Features

- 🤖 **AI-Powered Code Review**: Leverages VS Code's Language Model API for intelligent code analysis
- 🔐 **Secure Authentication**: Uses Personal Access Tokens stored securely in VS Code
- 📝 **Customizable Instructions**: Configure custom review criteria and focus areas
- 🚀 **Batch Processing**: Efficiently handles large pull requests with configurable batch sizes
- 💬 **Interactive Comments**: Preview and edit AI-generated comments before posting
- ⚡ **Performance Optimized**: Smart caching and request throttling for optimal performance

## Requirements
````markdown
# ForgeFlow.Vscode — Azure DevOps PR Code Reviewer

An AI-powered VS Code extension that automatically reviews pull requests in Azure DevOps using advanced language models.

## Features

- 🤖 **AI-Powered Code Review**: Leverages VS Code's Language Model API for intelligent code analysis
- 🔐 **Secure Authentication**: Uses Personal Access Tokens stored securely in VS Code
- 📝 **Customizable Instructions**: Configure custom review criteria and focus areas
- 🚀 **Batch Processing**: Efficiently handles large pull requests with configurable batch sizes
- 💬 **Interactive Comments**: Preview and edit AI-generated comments before posting
- ⚡ **Performance Optimized**: Smart caching and request throttling for optimal performance

## Requirements

- VS Code 1.74.0 or higher
- Azure DevOps account with appropriate permissions
- Personal Access Token with Code (read) and Pull Request (read/write) permissions

## Getting Started

### 1. Installation

Install the extension from the VS Code Marketplace or install from VSIX file.

### 2. Configuration

1. Open VS Code Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run `Azure DevOps PR Reviewer: Configure Azure DevOps PR Reviewer`
3. Enter your Azure DevOps organization URL (e.g., `https://dev.azure.com/myorg`)
4. Provide your Personal Access Token
5. Optionally set a default project name

### 3. Usage

1. Open Command Palette
2. Run `Azure DevOps PR Reviewer: Analyze Pull Request`
3. Select the pull request you want to analyze
4. Review and edit the AI-generated comments
5. Post approved comments to Azure DevOps

## Commands

- `Azure DevOps PR Reviewer: Configure` - Set up your Azure DevOps connection and preferences
- `Azure DevOps PR Reviewer: Analyze Pull Request` - Start analyzing a pull request
- `Azure DevOps PR Reviewer: Select Language Model` - Choose your preferred AI model

## Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| `azdo-pr-reviewer.organizationUrl` | Azure DevOps organization URL | - |
| `azdo-pr-reviewer.defaultProject` | Default project name (optional) | - |
| `azdo-pr-reviewer.selectedModel` | Preferred language model | `gpt-4` |
| `azdo-pr-reviewer.customInstructions` | Custom review instructions | Default quality-focused instructions |
| `azdo-pr-reviewer.batchSize` | Number of files to process in parallel | `10` |
| `azdo-pr-reviewer.enableTelemetry` | Enable usage telemetry | `true` |

## Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Building

```bash
npm install
npm run compile
```

### Running Tests

```bash
npm test
```

### Packaging

```bash
npm run package
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Security

This extension handles sensitive information (Personal Access Tokens). All tokens are stored securely using VS Code's Secret Storage API and are never logged or transmitted outside of authenticated Azure DevOps API calls.

## Support

If you encounter any issues or have feature requests, please open an issue on GitHub.

````
