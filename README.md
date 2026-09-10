# Extoken Selfhost

English | [简体中文](README.zh-CN.md)

Extoken is an encrypted context package system for handing off work between AI agents.

Official website: <https://extoken.aishangai.shop>

Extoken solves a specific workflow problem: one Agent may already understand the goal, codebase, error state, decisions, and next actions, but that context is often lost when work moves to another Agent, IDE, session, or automation environment. Extoken packages the working state into an auditable, redeemable, Agent-readable context package.

## What It Does

- **Context package protocol**: packages task state into a versioned envelope with `continuation`, `workspace`, `integrity`, and typed `items`.
- **Cross-agent handoff**: transfers context through pickup codes so another Agent can continue from the same goal, decisions, errors, and next actions.
- **Encrypted exchange**: stores encrypted package payloads and uses expiration, pickup limits, and event logs around the exchange flow.
- **Agent-readable docs**: exposes the package protocol as Markdown so agents do not need to parse a web page.
- **Self-hostable app**: includes a React frontend, NestJS backend, PostgreSQL schema, email login, API keys, and open gateway endpoints.

## Live Site

- Home: <https://extoken.aishangai.shop>
- Package protocol: <https://extoken.aishangai.shop/package>
- Use cases: <https://extoken.aishangai.shop/use-cases>
- Exchange records: <https://extoken.aishangai.shop/records>
- Agent Markdown doc: <https://extoken.aishangai.shop/api/extoken/package-doc>

Agents can read the public protocol document directly:

```bash
curl -L https://extoken.aishangai.shop/api/extoken/package-doc
```

Agents integrated with the open gateway can use:

```bash
curl -L \
  -H "Authorization: Bearer <PUBLIC_OPENAPI_GATEWAY_TOKEN>" \
  https://extoken.aishangai.shop/openapi/extoken/package-doc
```

## Package Model

An Extoken package is a handoff artifact. At minimum it should describe:

- package title, summary, protocol version, and creation time
- encrypted context payload
- pickup code, package ID, owner ID, expiration, and usage policy
- integrity digest for size, item count, and content completeness checks

A richer package can include:

- conversation notes, unresolved decisions, blockers, and next actions
- workspace fingerprint, project paths, environment hints, and dependency notes
- changed files, command results, tool side effects, and recovery strategy
- source Agent, target Agent, session IDs, run IDs, and event log references

It should not contain plaintext secrets such as passwords, long-lived API keys, SMTP credentials, SSH private keys, cookies, or database connection strings.

## Architecture

```text
client/       React + Vite frontend
server/       NestJS API, auth, package exchange, OpenAPI gateway
shared/       Shared package protocol docs and types
scripts/      CLI and deployment helpers
docs/         Supporting project documentation
```

Core backend areas:

- `server/modules/auth`: email verification, JWT sessions, API keys
- `server/modules/package`: package creation, pickup, records, event logs
- `server/modules/openapi`: gateway endpoints for external Agent access
- `server/database`: PostgreSQL schema and migrations

## Tech Stack

- Frontend: React, Vite, Tailwind CSS 4, Framer Motion
- Backend: NestJS, Express, PostgreSQL, Drizzle ORM
- Auth: bcrypt password hash, JWT access token, HttpOnly refresh cookie
- Mail: SMTP email verification codes
- Runtime: Node.js 20+, npm 10+

## Local Development

```bash
npm install
cp .env.example .env
npm run db:init
npm run dev
```

Useful commands:

```bash
npm run type:check
npm run build:server
npm run build:client
npm run build:prod
npm run test
```

## Environment

Start from `.env.example`. For production email verification, configure SMTP:

```env
EMAIL_CODE_SECRET=replace-with-a-random-secret
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@example.com
SMTP_PASS=replace-with-provider-password-or-app-code
SMTP_FROM="Extoken <no-reply@example.com>"
```

Never commit real `.env` files. The repository ignores `.env`, `.env.*`, build outputs, local Agent state, and zip dumps.

## CLI

This repository includes a minimal Extoken CLI:

```bash
npm run extoken -- pack handoff.json
npm run extoken -- redeem EXT-XXXX-XXXX-XXXX --out package.json
npm run extoken -- install-skill
```

## Deployment Notes

The public production site is:

```text
https://extoken.aishangai.shop
```

The current production server has limited memory, so frontend builds should be produced locally and then synchronized to the server. Backend or shared type changes require synchronizing `dist/server`, `dist/shared`, and restarting the `extoken` service.

## Security

Extoken packages are for task context, not credential storage. See [SECURITY.md](SECURITY.md) for reporting and handling security issues.

## Contributing

This project is early and protocol-heavy. Before changing package semantics, read the package protocol page and preserve backward compatibility where possible. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Copyright 2026 Extoken contributors. All rights reserved unless a separate license is added later.
