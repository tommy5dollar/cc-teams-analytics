# cc-teams-analytics

Self-hosted analytics platform for [Claude Code](https://claude.ai/code) team telemetry. Collects OpenTelemetry data from CC clients, stores it in ClickHouse, and visualises it in a Next.js dashboard.

## Architecture

```
CC clients  ──OTLP/HTTPS──►  Caddy (TLS + auth)  ──►  otel-collector  ──►  ClickHouse
                                                              │
                                                         file/backup (zstd JSONL)
                                                              │
                                                     Next.js dashboard
```

- **Caddy** — terminates TLS, enforces bearer token auth on the OTLP endpoint
- **OTel collector** — receives OTLP logs, fans out to ClickHouse + local backup file
- **ClickHouse** — stores raw events in `otel.otel_logs`; a materialised view populates `otel.events` at insert time
- **Dashboard** — Next.js 15 app querying ClickHouse directly (server components, no separate API)

---

## Local development

### Prerequisites

- Docker + Docker Compose
- Node.js 22+

### Start the stack

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

This starts ClickHouse (port 8123) and the OTel collector (port 4318) with ports exposed for local use.

### Start the dashboard

```bash
cd dashboard
npm install
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

### Point Claude Code at your local collector

Add to your shell profile:

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
export OTEL_LOG_TOOL_DETAILS=1
```

### Import historical data

If you have existing CC telemetry JSONL files:

```bash
cd import
pip install clickhouse-connect zstandard
python load.py
```

---

## Production deployment

### 1. Provision a server

A single VPS is sufficient for a small team (≤50 engineers).

Recommended: **Hetzner CAX21** (4 vCPU ARM, 8 GB RAM, 80 GB NVMe, ~€8/mo).

```bash
apt update && apt upgrade -y
apt install -y docker.io docker-compose-plugin git ufw
systemctl enable --now docker
```

### 2. Harden the firewall

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp    # Caddy ACME challenge
ufw allow 443/tcp   # OTLP + dashboard over HTTPS
ufw enable
```

ClickHouse (8123/9000) and the raw collector ports (4317/4318) must **not** be open publicly.

### 3. Clone and configure

```bash
git clone https://github.com/your-org/cc-teams-analytics.git
cd cc-teams-analytics
cp .env.example .env
```

Edit `.env`:

```env
CLICKHOUSE_USER=otel
CLICKHOUSE_PASSWORD=<strong-random-password>
OTLP_BEARER_TOKEN=<strong-random-token>
OTEL_DOMAIN=otel.yourcompany.com
```

Generate secure values:

```bash
openssl rand -hex 32   # run twice
```

### 4. Deploy

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Caddy will automatically obtain a TLS certificate on first start.

### 5. Verify

```bash
curl -s https://otel.yourcompany.com/health

docker compose exec clickhouse \
  clickhouse-client --query "SELECT count() FROM otel.events"
```

### 6. Point Claude Code at the production endpoint

Distribute to your team (via dotfiles, MDM, or onboarding docs):

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.yourcompany.com
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer <OTLP_BEARER_TOKEN>"
export OTEL_LOG_TOOL_DETAILS=1
```

### 7. Deploy the dashboard

Build the Docker image and run it alongside ClickHouse:

```bash
cd dashboard
docker build -t cc-dashboard .
```

Or use the provided GitHub Actions CI as a starting point — it builds and pushes to GHCR on every main push. See `.github/workflows/ci.yml`.

---

## Dashboard features

- **Overview** — cost, tokens, active users, sessions; spend-by-user scatter chart
- **Adoption & environment** — daily active users by model, CC version, terminal type, OS
- **MCP tools** — usage grouped by server, accept rates, per-tool breakdown
- **Skills invoked** — counts of slash commands used across the team
- **Per-engineer page** — cost over time by model, tools, sessions with inferred repo
- **Session drilldown** — full event timeline with tool details, bash commands, errors

### Repo inference

The dashboard attempts to infer which repository each session was running in, based on bash command paths and repo-root file markers (`.git`, `package.json`, `go.mod`, `Cargo.toml`, etc.).

Run the inference job from the admin page at `/admin`, or call the API directly:

```bash
# Incremental — only processes sessions not yet inferred at the current logic version
curl -X POST https://your-dashboard/api/admin/infer-repos

# Full reprocess — reruns over all sessions
curl -X POST https://your-dashboard/api/admin/infer-repos \
  -H "Content-Type: application/json" \
  -d '{"full": true}'
```

Bump `LOGIC_VERSION` in `dashboard/lib/inferRepo.ts` after improving extraction logic, then run incremental to backfill stale sessions.

---

## Data retention

ClickHouse TTL is set to **2 years** on `otel.otel_logs` by default. To change it:

```sql
ALTER TABLE otel.otel_logs MODIFY TTL toDateTime(Timestamp) + INTERVAL 1 YEAR;
ALTER TABLE otel.events MODIFY TTL toDateTime(timestamp) + INTERVAL 1 YEAR;
```

---

## Backups

The OTel collector writes a zstd-compressed JSONL backup to the `otel_data` Docker volume. This can be used to replay data into a fresh ClickHouse instance via `import/load.py`.

For off-server backups, sync the volume to object storage:

```bash
# Example: daily sync to S3
0 3 * * * docker run --rm \
  -v cc-teams-analytics_otel_data:/data:ro \
  -e AWS_ACCESS_KEY_ID=... \
  -e AWS_SECRET_ACCESS_KEY=... \
  amazon/aws-cli s3 sync /data s3://your-bucket/otel-backup/
```

---

## Monitoring

The collector exposes a health check at `https://otel.yourcompany.com/health`. Point an uptime monitor (UptimeRobot, BetterUptime, etc.) at it to alert on pipeline outages.
