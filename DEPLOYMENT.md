# Zawadi — Deployment Guide

Zawadi is a pnpm monorepo with three services that must all run simultaneously:

| Service | Path prefix | Default port |
|---|---|---|
| `artifacts/web` | `/` | `$PORT` (Vite) |
| `artifacts/api-server` | `/api` | `8080` |
| PostgreSQL | — | `5432` |

---

## 1. Local Development (Replit)

Everything is pre-configured. The Replit workflow manager starts each service automatically.

```bash
# Install dependencies
pnpm install

# Push DB schema (first time only, or after schema changes)
pnpm --filter @workspace/db run push

# Seed data (if starting fresh)
pnpm --filter @workspace/db run seed

# Type-check all packages
pnpm run typecheck

# The workflows handle dev servers — no manual `pnpm dev` needed at root
```

To regenerate the API client after OpenAPI spec changes:
```bash
pnpm --filter @workspace/api-spec run codegen
```

---

## 2. VPS / Ubuntu (Recommended for production)

### Prerequisites

```bash
# Node.js 24 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24

# pnpm
npm install -g pnpm

# PostgreSQL 16
sudo apt update
sudo apt install -y postgresql-16 postgresql-client-16

# PM2 process manager
npm install -g pm2

# Caddy (reverse proxy with automatic HTTPS)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

### Database setup

```bash
sudo -u postgres psql <<EOF
CREATE USER zawadi WITH PASSWORD 'your-strong-password';
CREATE DATABASE zawadi OWNER zawadi;
EOF
```

### Clone & build

```bash
git clone https://github.com/JBlizzard-sketch/zawadi.git /opt/zawadi
cd /opt/zawadi
pnpm install --frozen-lockfile

# Set environment variables
cat > .env.production <<EOF
DATABASE_URL=postgresql://zawadi:your-strong-password@localhost:5432/zawadi
SESSION_SECRET=$(openssl rand -hex 64)
NODE_ENV=production
PORT=3000
EOF

# Push schema to production DB
source .env.production
pnpm --filter @workspace/db run push

# Build the API server
pnpm --filter @workspace/api-server run build

# Build the frontend (Vite)
cd artifacts/web
BASE_URL=/ pnpm run build
cd /opt/zawadi
```

### PM2 process config

```bash
cat > /opt/zawadi/ecosystem.config.cjs <<'EOF'
module.exports = {
  apps: [
    {
      name: "zawadi-api",
      script: "./artifacts/api-server/dist/index.mjs",
      cwd: "/opt/zawadi",
      env_file: ".env.production",
      interpreter: "node",
      node_args: "--enable-source-maps",
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
EOF

pm2 start /opt/zawadi/ecosystem.config.cjs
pm2 save
pm2 startup   # follow the printed command to enable on reboot
```

The API runs on port 8080. The frontend is served as static files.

### Caddy reverse proxy

```bash
cat > /etc/caddy/Caddyfile <<'EOF'
yourdomain.com {
  # API traffic → Express
  handle /api/* {
    reverse_proxy localhost:8080
  }

  # Everything else → Vite static build
  handle {
    root * /opt/zawadi/artifacts/web/dist
    file_server
    try_files {path} /index.html
  }

  encode gzip
}
EOF

sudo systemctl reload caddy
```

Caddy automatically provisions and renews TLS certificates via Let's Encrypt.

### Updating

```bash
cd /opt/zawadi
git pull origin main
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push      # apply any schema changes
pnpm --filter @workspace/api-server run build
cd artifacts/web && BASE_URL=/ pnpm run build && cd /opt/zawadi
pm2 restart zawadi-api
```

---

## 3. Vercel (Frontend only — API + DB must be hosted separately)

Vercel is a good fit for the **Vite frontend** only. The Express API cannot run on Vercel's serverless runtime without significant refactoring.

### Recommended split

| Component | Host |
|---|---|
| Frontend (`artifacts/web`) | Vercel |
| API (`artifacts/api-server`) | Railway / Render / Fly.io / Ubuntu VPS |
| PostgreSQL | Neon / Supabase / Railway Postgres |

### Frontend on Vercel

1. Push to GitHub (already configured)
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Set **Root Directory** to `artifacts/web`
4. Set **Framework Preset** to `Vite`
5. Add environment variable: `VITE_API_BASE_URL=https://your-api-host.com`
6. Update `artifacts/web/src/lib/api.ts` (or wherever `BASE` is set) to use `import.meta.env.VITE_API_BASE_URL`

> **Note**: The current codebase uses `import.meta.env.BASE_URL` (Vite's built-in base path) for path-based routing inside a shared proxy. On Vercel you'll point at a separate API host instead — change `BASE = import.meta.env.BASE_URL.replace(/\/$/, "")` to `BASE = import.meta.env.VITE_API_BASE_URL ?? ""` in each page file, or centralise it in a shared constant.

### API on Railway (simplest managed option)

1. Create a new project at [railway.app](https://railway.app)
2. Add a PostgreSQL plugin — copy the `DATABASE_URL`
3. Add a new service → deploy from GitHub, set root to `artifacts/api-server`
4. Set environment variables: `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV=production`, `PORT=8080`
5. Set start command: `node --enable-source-maps dist/index.mjs`
6. Set build command: `pnpm install && pnpm run build`

---

## 4. Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Random 64-char hex string for session signing |
| `NODE_ENV` | ✅ | `development` or `production` |
| `PORT` | ✅ (frontend) | Port Vite dev server or static server listens on |
| `GITHUB_TOKEN` | dev only | Used by `scripts/github-push.mjs` |

---

## 5. Health Check

```bash
# API health
curl https://yourdomain.com/api/healthz

# Database connectivity (from API logs)
pm2 logs zawadi-api --lines 20
```

---

## 6. GitHub Auto-Sync

Changes are pushed from Replit using:

```bash
node scripts/github-push.mjs "Your commit message"
```

The script diffs against the remote tree, uploads only changed blobs, creates a tree+commit, and fast-forwards the `main` branch. Rate limit: ~100 blob uploads per hour (GitHub API constraint).

For production, set up a webhook or GitHub Actions CI to auto-deploy when `main` is updated:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @workspace/api-server run build
      - run: cd artifacts/web && BASE_URL=/ pnpm run build
      # Add your deployment step here (SSH, Railway deploy hook, etc.)
```
