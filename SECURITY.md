# Security Policy

## Supported Versions

We provide security updates for the following versions of the Azure DevOps PR Code Reviewer extension:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

The security of our users is extremely important to us. If you discover a security vulnerability in the Azure DevOps PR Code Reviewer extension, please report it responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by emailing us at:
📧 **security@forgeflow.dev**

### What to Include

When reporting a security vulnerability, please include:

1. **Description** of the vulnerability
2. **Steps to reproduce** the issue
3. **Impact assessment** (what could an attacker do?)
4. **Affected versions** (if known)
5. **Proof of concept** (if applicable)
6. **Suggested fix** (if you have one)

### Response Timeline

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Initial Assessment**: We will provide an initial assessment within 5 business days
- **Progress Updates**: We will send progress updates every 5 business days
- **Resolution**: We aim to resolve critical security issues within 30 days

### Our Commitment

- We will respond to security reports in a timely manner
- We will keep you informed throughout the investigation and resolution process
- We will credit you for responsible disclosure (if desired)
- We will coordinate disclosure timing with you
- We will not take legal action against researchers acting in good faith

## Security Considerations

### Data Handling

The Azure DevOps PR Code Reviewer extension handles sensitive information:

- **Personal Access Tokens (PATs)**: Stored securely using VS Code's Secret Storage API
- **Source Code**: Code content is sent to language models for analysis
- **Azure DevOps Data**: Pull request metadata and comments are accessed via APIs

### Security Measures

1. **Secure Storage**
   - PATs are stored using VS Code's encrypted Secret Storage
   - No sensitive data is logged or persisted locally
   - Configuration data is sanitized before storage

2. **Network Security**
   - All communications use HTTPS encryption
   - API calls are authenticated with proper tokens
   - Request data is validated and sanitized

3. **Code Analysis Security**
   - Only changed code lines are sent to language models
   - No full file contents are transmitted unnecessarily
   - Users can configure custom instructions to limit data exposure

4. **Input Validation**
   - All user inputs are validated and sanitized
   - URL validation prevents malicious redirects
   - Token format validation prevents injection attacks

5. **Error Handling**
   - Error messages are sanitized to prevent information disclosure
   - Sensitive data is never included in error logs
   - Stack traces are filtered for production use

### Common Security Scenarios

#### Scenario 1: Malicious Azure DevOps Organization

**Risk**: User connects to a malicious Azure DevOps instance
**Mitigation**: 
- URL validation ensures only valid Azure DevOps URLs
- HTTPS enforcement prevents man-in-the-middle attacks
- User confirmation required for all data transmission

#### Scenario 2: Compromised PAT Token

**Risk**: Personal Access Token is compromised
**Mitigation**:
- Tokens are stored encrypted in VS Code Secret Storage
- Users can easily revoke and update tokens
- Limited scope requirements (only necessary permissions)

#### Scenario 3: Code Exposure to Language Models

**Risk**: Sensitive code is sent to external language models
**Mitigation**:
- Only changed lines are analyzed, not entire files
- Users can customize analysis instructions
- No code is stored or logged by the extension
- Respects VS Code Language Model API privacy controls

#### Scenario 4: Extension Tampering

**Risk**: Malicious modification of the extension
**Mitigation**:
- Extension is signed and distributed through official VS Code Marketplace
- Code integrity is verified during installation
- Regular security audits of dependencies

### Best Practices for Users

1. **Token Management**
   - Use tokens with minimal required permissions
   - Regularly rotate Personal Access Tokens
   - Monitor token usage in Azure DevOps

2. **Organization Security**
   - Only connect to trusted Azure DevOps organizations
   - Verify organization URLs before entering credentials
   - Use conditional access policies in Azure AD

3. **Code Privacy**
   - Review custom analysis instructions carefully
   - Be aware that code changes are sent to language models
   - Consider privacy implications of your organization's policies

4. **Extension Updates**
   - Keep the extension updated to the latest version
   - Review release notes for security-related changes
   - Report any suspicious behavior immediately

### Security Audit Information

- **Last Security Review**: January 2024
- **Dependency Scanning**: Automated via GitHub Dependabot
- **Code Analysis**: Static analysis via ESLint and TypeScript compiler
- **Penetration Testing**: Planned for Q2 2024

### Responsible Disclosure

We believe in responsible disclosure and work with security researchers to:

- Understand and reproduce reported vulnerabilities
- Develop and test fixes in a secure environment
- Coordinate public disclosure timing
- Provide credit for responsible reporting (if desired)

### Security Contact

For security-related questions or concerns:
- 📧 **Email**: security@forgeflow.dev
- 🔐 **PGP Key**: Available upon request
- ⚡ **Response Time**: Within 48 hours for critical issues

### Legal

We will not pursue legal action against security researchers who:
- Make a good faith effort to avoid privacy violations and data destruction
- Only interact with accounts they own or have explicit permission to test
- Do not access or modify data belonging to others
- Report vulnerabilities promptly and follow responsible disclosure practices
- Do not perform attacks that could harm service availability

Thank you for helping keep the Azure DevOps PR Code Reviewer extension and our users safe!