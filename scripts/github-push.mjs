#!/usr/bin/env node
/**
 * github-push.mjs
 * Pushes the workspace to GitHub using the Git Data API (no git CLI needed).
 * Handles both empty repos (bootstrap via Contents API) and existing ones.
 *
 * Usage: node scripts/github-push.mjs "optional commit message"
 * Env:   GITHUB_TOKEN must be set
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const OWNER  = 'JBlizzard-sketch';
const REPO   = 'zawadi';
const BRANCH = 'main';
const TOKEN  = process.env.GITHUB_TOKEN;
const MSG    = process.argv[2] || `chore: auto-sync ${new Date().toISOString().slice(0,19).replace('T',' ')}`;

if (!TOKEN) { console.error('GITHUB_TOKEN not set'); process.exit(1); }

const BASE = `https://api.github.com/repos/${OWNER}/${REPO}`;
const HDRS = {
  Authorization:  `token ${TOKEN}`,
  Accept:         'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
  'User-Agent':   'zawadi-push-script/1.0',
};

async function api(method, url, body) {
  const r = await fetch(url, { method, headers: HDRS, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`${method} ${url.replace(BASE,'')} → ${r.status}: ${t.slice(0,400)}`);
  }
  return r.json();
}

// ── File walker ──────────────────────────────────────────────────────────────
const SKIP_DIRS  = new Set(['node_modules','.local','dist','build','.next','.expo',
                             '.cache','.upm','coverage','.git']);
const SKIP_NAMES = new Set(['pnpm-lock.yaml','.replit','replit.nix']);

function walk(dir, rel = '') {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name) || SKIP_NAMES.has(e.name)) continue;
    const full = path.join(dir, e.name);
    const r    = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walk(full, r));
    else                 out.push({ full, rel: r });
  }
  return out;
}

// ── Bootstrap an empty repo via Contents API, return the commit SHA ──────────
async function bootstrapEmpty() {
  console.log('🌱 Bootstrapping empty repo via Contents API...');
  const readmePath = path.join(ROOT, 'README.md');
  const content = fs.existsSync(readmePath)
    ? fs.readFileSync(readmePath).toString('base64')
    : Buffer.from('# zawadi\n').toString('base64');

  const res = await api('PUT', `${BASE}/contents/README.md`, {
    message: 'chore: bootstrap repo',
    content,
    branch: BRANCH,
  });
  const sha = res.commit.sha;
  console.log(`✅ Bootstrap commit: ${sha.slice(0,7)}`);
  return sha;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀  Pushing to https://github.com/${OWNER}/${REPO} [${BRANCH}]\n`);

  // 1. Get current HEAD SHA (if branch/repo exists)
  let parentSha = null;
  try {
    const ref = await api('GET', `${BASE}/git/ref/heads/${BRANCH}`);
    parentSha = ref.object.sha;
    console.log(`📌 Current HEAD: ${parentSha.slice(0,7)}`);
  } catch (e) {
    if (e.message.includes('404') || e.message.includes('409') || e.message.includes('empty')) {
      parentSha = await bootstrapEmpty();
    } else {
      throw e;
    }
  }

  // 2. Collect files
  const files = walk(ROOT);
  console.log(`📦 ${files.length} files staged`);

  // 3. Create blobs in batches of 8
  const BATCH = 8;
  const treeItems = [];
  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    const blobs = await Promise.all(batch.map(async ({ full, rel }) => {
      const buf = fs.readFileSync(full);
      const b64 = buf.toString('base64');
      const blob = await api('POST', `${BASE}/git/blobs`, { content: b64, encoding: 'base64' });
      process.stdout.write('.');
      return { path: rel, mode: '100644', type: 'blob', sha: blob.sha };
    }));
    treeItems.push(...blobs);
  }
  console.log(`\n🌳 ${treeItems.length} blobs created`);

  // 4. Get base tree from parent commit
  const parentCommit = await api('GET', `${BASE}/git/commits/${parentSha}`);
  const tree = await api('POST', `${BASE}/git/trees`, {
    base_tree: parentCommit.tree.sha,
    tree: treeItems,
  });
  console.log(`🌲 Tree SHA: ${tree.sha.slice(0,7)}`);

  // 5. Create commit
  const commit = await api('POST', `${BASE}/git/commits`, {
    message: MSG,
    tree: tree.sha,
    parents: [parentSha],
    author: {
      name:  'JBlizzard-sketch',
      email: 'jblizzard-sketch@users.noreply.github.com',
      date:  new Date().toISOString(),
    },
  });
  console.log(`✍️  Commit: ${commit.sha.slice(0,7)} — "${MSG}"`);

  // 6. Update ref
  await api('PATCH', `${BASE}/git/refs/heads/${BRANCH}`, { sha: commit.sha, force: false });

  console.log(`\n✅  https://github.com/${OWNER}/${REPO}/commit/${commit.sha.slice(0,7)}\n`);
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
