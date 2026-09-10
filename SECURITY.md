# Security Policy

Extoken handles task context packages and exchange records. Treat package payloads,
pickup codes, API keys, email verification flows, and event logs as security-sensitive.

## Do Not Put Secrets In Packages

Extoken packages should not contain:

- plaintext passwords
- long-lived API keys
- SMTP credentials
- SSH private keys
- cookies or session tokens
- database connection strings
- cloud access keys

When an Agent needs environment context, include only variable names, purpose,
configuration location, and redacted examples.

## Reporting A Vulnerability

Please do not disclose security issues in public GitHub issues.

Report privately by contacting the project owner or by opening a private GitHub
security advisory if repository permissions allow it.

Useful report details:

- affected endpoint, page, CLI command, or protocol field
- reproduction steps
- expected impact
- whether any pickup code, API key, account, or package data was exposed

## Security-Relevant Areas

- package encryption and integrity checks
- pickup code generation, expiration, and redemption limits
- API key creation and open gateway authorization
- email verification and password reset
- event log audit trail
- `.env` and deployment configuration handling
