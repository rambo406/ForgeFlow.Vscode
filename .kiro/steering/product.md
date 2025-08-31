# Product Overview

Azure DevOps PR Code Reviewer is a VS Code extension that provides AI-powered code review for Azure DevOps pull requests. The extension integrates with VS Code's Language Model API (GitHub Copilot, etc.) to automatically analyze code changes and generate intelligent review comments.

## Key Features
- AI-powered code analysis using VS Code Language Model API
- Secure authentication via Personal Access Tokens stored in VS Code Secret Storage
- Customizable review instructions and criteria
- Batch processing for large PRs with configurable parallel processing
- Interactive comment preview with edit/approve workflow
- Real-time progress tracking and error recovery
- Performance optimizations including caching and request throttling

## Target Users
- Developers working with Azure DevOps repositories
- Teams looking to automate and improve code review quality
- Organizations wanting consistent code review standards

## Core Workflow
1. Configure Azure DevOps connection and authentication
2. Select a pull request to analyze
3. AI analyzes changed code and generates review comments
4. User reviews, edits, and approves comments in preview
5. Approved comments are posted to Azure DevOps PR

## Business Value
- Improves code quality through consistent AI-powered reviews
- Reduces manual review time and effort
- Ensures adherence to coding standards and best practices
- Identifies security vulnerabilities and performance issues