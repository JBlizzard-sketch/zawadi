#!/usr/bin/env node
/**
 * github-push.mjs
 * Pushes only changed files to GitHub using the Git Data API.
 * Compares local SHA1 against the existing tree to skip unchanged files.
 *
 * Usage: node scripts/github-push.mjs "optional commit message"
 * Env:   GITHUB_TOKEN must be set
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
  'User-Agent':   'zawadi-push-script/2.0',
};

async function api(method, url, body) {
  const r = await fetch(url, { method, headers: HDRS, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`${method} ${url.replace(BASE,'')} → ${r.status}: ${t.slice(0,400)}`);
  }
  return r.json();
}

// Compute git-style blob SHA1: "blob <size>\0<content>"
function gitBlobSha(buf) {
  const header = `blob ${buf.length}\0`;
  const h = crypto.createHash('sha1');
  h.update(header);
  h.update(buf);
  return h.digest('hex');
}

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

// Recursively fetch the full flat tree from GitHub (handles truncation)
async function fetchFullTree(treeSha) {
  const res = await api('GET', `${BASE}/git/trees/${treeSha}?recursive=1`);
  const map = {};
  for (const item of res.tree) {
    if (item.type === 'blob') map[item.path] = item.sha;
  }
  return map;
}

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
  console.log(`✅ Bootstrap commit: ${res.commit.sha.slice(0,7)}`);
  return res.commit.sha;
}

async function main() {
  console.log(`\n🚀  Pushing to https://github.com/${OWNER}/${REPO} [${BRANCH}]\n`);

  // 1. Get current HEAD SHA
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

  // 2. Fetch existing remote tree to diff against
  console.log('🔍 Fetching remote tree for diff...');
  const parentCommit = await api('GET', `${BASE}/git/commits/${parentSha}`);
  const remoteTree = await fetchFullTree(parentCommit.tree.sha);
  console.log(`   Remote has ${Object.keys(remoteTree).length} files`);

  // 3. Walk local files and find changed/new ones
  const allFiles = walk(ROOT);
  const changed = [];
  const unchanged = [];

  for (const file of allFiles) {
    const buf = fs.readFileSync(file.full);
    const localSha = gitBlobSha(buf);
    if (remoteTree[file.rel] === localSha) {
      unchanged.push(file.rel);
    } else {
      changed.push({ ...file, buf });
    }
  }

  // Files deleted locally
  const localPaths = new Set(allFiles.map(f => f.rel));
  const deleted = Object.keys(remoteTree).filter(p => !localPaths.has(p));

  console.log(`📦 ${allFiles.length} total files — ${changed.length} changed, ${unchanged.length} unchanged, ${deleted.length} deleted`);

  if (changed.length === 0 && deleted.length === 0) {
    console.log('\n✅  Nothing to push — remote is already up to date.\n');
    return;
  }

  // 4. Upload blobs only for changed files — sequential with small delay to avoid secondary rate limits
  const treeItems = [];
  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  for (let i = 0; i < changed.length; i++) {
    const { buf, rel } = changed[i];
    const b64 = buf.toString('base64');
    const blob = await api('POST', `${BASE}/git/blobs`, { content: b64, encoding: 'base64' });
    process.stdout.write('.');
    treeItems.push({ path: rel, mode: '100644', type: 'blob', sha: blob.sha });
    // Pause every 10 uploads to stay under secondary rate limits
    if ((i + 1) % 10 === 0) await delay(2000);
  }

  // Mark deleted files as null sha
  for (const p of deleted) {
    treeItems.push({ path: p, mode: '100644', type: 'blob', sha: null });
  }

  if (changed.length > 0) console.log(`\n🌳 ${changed.length} blobs uploaded`);

  // 5. Create tree
  const tree = await api('POST', `${BASE}/git/trees`, {
    base_tree: parentCommit.tree.sha,
    tree: treeItems,
  });
  console.log(`🌲 Tree SHA: ${tree.sha.slice(0,7)}`);

  // 6. Create commit
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

  // 7. Update ref
  await api('PATCH', `${BASE}/git/refs/heads/${BRANCH}`, { sha: commit.sha, force: false });

  console.log(`\n✅  https://github.com/${OWNER}/${REPO}/commit/${commit.sha.slice(0,7)}\n`);
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
