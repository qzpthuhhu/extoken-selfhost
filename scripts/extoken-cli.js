#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const [, , command, ...args] = process.argv;

function usage() {
  console.log(`Extoken CLI

Environment:
  EXTOKEN_API_BASE       https://extoken.aishangai.shop
  EXTOKEN_GATEWAY_TOKEN  public gateway bearer token
  EXTOKEN_API_KEY        exk_... account key

Commands:
  extoken pack <payload.json|-> [--out result.json]
  extoken redeem <EXT-XXXX-XXXX-XXXX> [--out package.json]
  extoken install-skill [skills/extoken/SKILL.md]

Payload example:
  {
    "title": "handoff",
    "description": "context for next agent",
    "expiresInDays": 7,
    "continuation": { "sourceAgent": "codex", "handoffStatus": "ready", "nextActions": ["run tests"] },
    "items": [{ "type": "doc", "title": "summary", "content": "..." }]
  }
`);
}

function readStdin() {
  return fs.readFileSync(0, 'utf8');
}

function readPayload(input) {
  const raw = input === '-' ? readStdin() : fs.readFileSync(path.resolve(input), 'utf8');
  return JSON.parse(raw);
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function apiBase() {
  return requireEnv('EXTOKEN_API_BASE').replace(/\/$/, '');
}

function headers(includeAccountKey = true) {
  const h = {
    Authorization: `Bearer ${requireEnv('EXTOKEN_GATEWAY_TOKEN')}`,
  };
  if (includeAccountKey) h['x-extoken-key'] = requireEnv('EXTOKEN_API_KEY');
  return h;
}

function option(name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

async function request(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? JSON.parse(text) : text;
}

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) return '';
  return result.stdout.trim();
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function collectWorkspaceIdentity() {
  const root = git(['rev-parse', '--show-toplevel']);
  if (!root) return {};
  const dirtyFiles = git(['status', '--short']);
  return {
    projectName: path.basename(root),
    rootHash: sha256(root),
    gitRemote: git(['config', '--get', 'remote.origin.url']),
    gitBranch: git(['branch', '--show-current']),
    gitCommit: git(['rev-parse', 'HEAD']),
    dirtyFilesHash: dirtyFiles ? sha256(dirtyFiles) : '',
  };
}

function writeOutput(value, defaultStdout = true) {
  const out = option('--out');
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (out) {
    fs.writeFileSync(path.resolve(out), `${text}\n`, 'utf8');
    console.log(`Wrote ${out}`);
    return;
  }
  if (defaultStdout) console.log(text);
}

async function pack() {
  const input = args[0];
  if (!input || input.startsWith('--')) throw new Error('pack requires <payload.json|->');
  const payload = readPayload(input);
  payload.workspace = {
    ...collectWorkspaceIdentity(),
    ...(payload.workspace || {}),
  };
  const result = await request(`${apiBase()}/openapi/extoken`, {
    method: 'POST',
    headers: {
      ...headers(true),
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  writeOutput(result);
}

async function redeem() {
  const code = args[0];
  if (!code || code.startsWith('--')) throw new Error('redeem requires <EXT-...>');
  const result = await request(`${apiBase()}/openapi/extoken/redeem`, {
    method: 'POST',
    headers: {
      ...headers(true),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });
  writeOutput(result);
}

async function installSkill() {
  const target = args[0] && !args[0].startsWith('--') ? args[0] : 'skills/extoken/SKILL.md';
  const markdown = await request(`${apiBase()}/openapi/extoken/skill`, {
    method: 'GET',
    headers: headers(false),
  });
  const filePath = path.resolve(target);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, markdown, 'utf8');
  writeOutput({ installed: filePath });
}

async function main() {
  if (!command || command === '--help' || command === '-h') {
    usage();
    return;
  }
  if (command === 'pack') return pack();
  if (command === 'redeem') return redeem();
  if (command === 'install-skill') return installSkill();
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
