# Contributing

Extoken is an early Agent context handoff system. Contributions are welcome, but the
package protocol should stay stable and explicit.

## Good First Contributions

- Improve documentation, examples, and Agent integration notes.
- Add self-hosting guides for common environments.
- Add tests around package creation, pickup, expiration, and event logs.
- Report interoperability issues with Claude Code, Codex, Cursor, Trae, or other agents.

## Protocol Changes

Before changing package semantics, check:

- Does the change preserve existing package fields?
- Can older agents ignore the new field safely?
- Is the field a context fact, an instruction, an event, or a recovery hint?
- Does it accidentally encourage storing secrets?

Protocol changes should include docs and tests.

## Local Checks

Run these before sending changes:

```bash
npm run type:check
npm run build:prod
```

If you changed backend behavior, add or update tests where practical.

## Security

Do not open public issues for vulnerabilities or leaked secrets. Follow
[SECURITY.md](SECURITY.md).
