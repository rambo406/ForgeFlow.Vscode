# Contributing to Azure DevOps PR Code Reviewer

Thank you for your interest in contributing to the Azure DevOps PR Code Reviewer extension! We welcome contributions from the community to help make this tool even better.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Guidelines](#coding-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)
- [Release Process](#release-process)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [support@forgeflow.dev](mailto:support@forgeflow.dev).

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git
- VS Code (for development and testing)
- Azure DevOps account (for testing)
- GitHub Copilot or another VS Code Language Model (for testing AI features)

### Development Setup

1. **Fork and Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/azdo-pr-code-reviewer.git
   cd azdo-pr-code-reviewer
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Extension**
   ```bash
   npm run compile
   ```

4. **Open in VS Code**
   ```bash
   code .
   ```

5. **Run the Extension**
   - Press `F5` to launch a new Extension Development Host window
   - Test your changes in the new window

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/forgeflow/azdo-pr-code-reviewer/issues) to see if the problem has already been reported.

When filing a bug report, please include:

- **Clear description** of the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs actual behavior
- **Environment details** (VS Code version, OS, extension version)
- **Screenshots or logs** if applicable
- **Azure DevOps configuration** (without sensitive information)

### Suggesting Enhancements

Enhancement suggestions are welcome! Please:

1. Check existing [feature requests](https://github.com/forgeflow/azdo-pr-code-reviewer/discussions)
2. Create a new discussion with:
   - Clear description of the enhancement
   - Use cases and benefits
   - Possible implementation approach
   - Examples or mockups if applicable

### Contributing Code

1. **Find an Issue**
   - Look for issues labeled `good first issue` or `help wanted`
   - Comment on the issue to let others know you're working on it

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Follow the coding guidelines below
   - Add tests for new functionality
   - Update documentation as needed

4. **Test Your Changes**
   ```bash
   npm test
   npm run lint
   ```

5. **Commit Your Changes**
   ```bash
   git commit -m "feat: add amazing new feature"
   ```
   Use [conventional commits](https://www.conventionalcommits.org/) format.

6. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a pull request on GitHub.

## Pull Request Process

### Before Submitting

- [ ] Fork the repository and create a feature branch
- [ ] Make your changes following the coding guidelines
- [ ] Add or update tests as appropriate
- [ ] Update documentation if needed
- [ ] Run tests and ensure they pass
- [ ] Run linting and fix any issues
- [ ] Test the extension manually in VS Code

### PR Guidelines

1. **Title**: Use a clear, descriptive title
   - Good: "feat: add support for custom review templates"
   - Bad: "update stuff"

2. **Description**: Include:
   - What changes were made and why
   - How to test the changes
   - Screenshots/GIFs for UI changes
   - Any breaking changes or migration notes

3. **Size**: Keep PRs focused and reasonably sized
   - Large features should be broken into smaller PRs
   - Consider creating an issue to discuss design first

4. **Tests**: Include appropriate tests
   - Unit tests for business logic
   - Integration tests for complex workflows
   - Manual testing instructions

### Review Process

1. **Automated Checks**: All PRs must pass:
   - TypeScript compilation
   - ESLint checks
   - Unit tests
   - Integration tests (if applicable)

2. **Code Review**: At least one maintainer will review your PR
   - Reviews focus on code quality, architecture, and functionality
   - Address feedback promptly and professionally

3. **Testing**: Maintainers will test the functionality manually

4. **Merge**: Once approved, maintainers will merge the PR

## Coding Guidelines

### TypeScript

- Use **strict TypeScript** settings
- Prefer **interfaces** over types where appropriate
- Use **meaningful names** for variables, functions, and classes
- Add **JSDoc comments** for public APIs
- Use **async/await** instead of promises where possible

### Architecture

- Follow the existing **layered architecture**:
  - `services/` - Business logic and external integrations
  - `utils/` - Utility functions and helpers
  - `models/` - Data models and interfaces
  - `commands/` - VS Code command implementations
  - `webview/` - UI components

- **Separation of concerns**: Keep business logic separate from VS Code APIs
- **Dependency injection**: Use constructor injection for testability
- **Error handling**: Use proper error handling and logging

### Code Style

- **Indentation**: 4 spaces (no tabs)
- **Line length**: 120 characters maximum
- **Semicolons**: Always use semicolons
- **Quotes**: Use single quotes for strings
- **Imports**: Group and sort imports logically

### Example Code

```typescript
import * as vscode from 'vscode';
import { AzureDevOpsClient } from '../services/AzureDevOpsClient';

/**
 * Handles pull request analysis commands
 */
export class PullRequestCommands {
    constructor(
        private azureDevOpsClient: AzureDevOpsClient,
        private outputChannel: vscode.OutputChannel
    ) {}

    /**
     * Analyze a pull request by ID
     */
    async analyzePullRequestById(pullRequestId: number): Promise<void> {
        try {
            this.outputChannel.appendLine(`Starting analysis for PR ${pullRequestId}`);
            
            const pullRequest = await this.azureDevOpsClient.getPullRequest('project', pullRequestId);
            // ... implementation
            
        } catch (error) {
            this.outputChannel.appendLine(`Error analyzing PR: ${error}`);
            throw error;
        }
    }
}
```

## Testing

### Unit Tests

- Located in `src/test/suite/`
- Use Mocha and Node.js assert
- Mock external dependencies
- Test both success and error scenarios

```typescript
suite('ConfigurationManager Tests', () => {
    test('should validate PAT token format', async () => {
        const result = await configManager.validatePatToken('invalid-token');
        assert.strictEqual(result.isValid, false);
    });
});
```

### Integration Tests

- Located in `src/test/integration/`
- Test complete workflows
- Use mocked services where appropriate
- Include performance testing for large operations

### Manual Testing

1. **Extension Loading**: Test in a clean VS Code instance
2. **Configuration**: Test setup and validation
3. **PR Analysis**: Test with various PR sizes and types
4. **Error Scenarios**: Test with invalid configurations
5. **Performance**: Test with large PRs and multiple files

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npx mocha "src/test/suite/ConfigurationManager.test.js"

# Run with coverage
npm run test:coverage
```

## Documentation

### Code Documentation

- **JSDoc comments** for all public methods and classes
- **Inline comments** for complex logic
- **README updates** for new features
- **Changelog entries** for all changes

### User Documentation

- Update **README.md** for new features
- Add **configuration examples** where helpful
- Include **screenshots** for UI changes
- Update **troubleshooting** section for new error scenarios

## Release Process

### Version Management

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version: Breaking changes
- **MINOR** version: New features (backward compatible)
- **PATCH** version: Bug fixes (backward compatible)

### Release Steps

1. **Update Version**
   ```bash
   npm version minor  # or major/patch
   ```

2. **Update Changelog**
   - Add new version section
   - List all changes with links to PRs
   - Include breaking changes and migration notes

3. **Create Release**
   - Tag the release in Git
   - Create GitHub release with changelog
   - Publish to VS Code Marketplace

### Pre-release Testing

Before releasing:

- [ ] Full test suite passes
- [ ] Manual testing in clean environment
- [ ] Performance testing with large datasets
- [ ] Security review for sensitive changes
- [ ] Documentation is up to date

## Getting Help

- **Questions**: Create a [GitHub Discussion](https://github.com/forgeflow/azdo-pr-code-reviewer/discussions)
- **Bugs**: Create a [GitHub Issue](https://github.com/forgeflow/azdo-pr-code-reviewer/issues)
- **Email**: [support@forgeflow.dev](mailto:support@forgeflow.dev)
- **Documentation**: Check the [README](README.md) and [Wiki](https://github.com/forgeflow/azdo-pr-code-reviewer/wiki)

## Recognition

Contributors are recognized in several ways:

- **Contributors list** in README.md
- **Release notes** mention for significant contributions
- **GitHub insights** show contribution statistics
- **Special thanks** in major release announcements

Thank you for contributing to the Azure DevOps PR Code Reviewer! Your efforts help make code reviews better for developers everywhere. 🚀