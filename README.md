# cc-teams-analytics

Analytics platform for Claude Code team telemetry. Collects OpenTelemetry data from CC clients, stores it in ClickHouse, and visualises it in a Next.js dashboard.

## Architecture

```
CC clients  ──OTLP/HTTPS──►  Caddy (TLS)  ──►  otel-collector  ──►  ClickHouse
                                                      │
                                                 file/backup (zstd JSONL)
```

- **OTel collector** — receives OTLP logs/metrics/traces, fans out to ClickHouse + local backup file
- **ClickHouse** — stores raw events in `otel.events` via a materialised view on `otel.otel_logs`
- **Dashboard** — Next.js app querying ClickHouse directly (server components, no separate API)

---

## Local development

### Prerequisites
- Docker + Docker Compose
- Node.js 20+

### Start the stack

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

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

```bash
cd import
pip install clickhouse-connect zstandard
python load.py
```

---

## Production — Stage 1: OTel collection & storage

Goal: a hardened, publicly reachable OTLP endpoint backed by a durable ClickHouse instance, with no dashboard yet.

### 1. Provision a server

A single VPS is sufficient for a small team (≤50 engineers).

Recommended: **Hetzner CAX21** (4 vCPU ARM, 8 GB RAM, 80 GB NVMe, ~€8/mo).

```bash
# On the server after first login
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
ufw allow 443/tcp   # OTLP over HTTPS (Caddy)
ufw enable
```

ClickHouse and the raw collector ports (4317/4318) must **not** be open publicly.

### 3. Clone the repo

```bash
git clone https://github.com/tommy5dollar/cc-teams-analytics.git
cd cc-teams-analytics
```

### 4. Create the environment file

```bash
cp .env.example .env
```

Edit `.env`:

```env
# ClickHouse
CLICKHOUSE_USER=otel
CLICKHOUSE_PASSWORD=<strong-random-password>

# OTLP bearer token — clients must send this in the Authorization header
OTLP_BEARER_TOKEN=<strong-random-token>

# Domain Caddy will provision TLS for
OTEL_DOMAIN=otel.yourcompany.com
```

Generate secure values:
```bash
openssl rand -hex 32   # run twice — once for password, once for token
```

### 5. Deploy

```bash
docker compose up -d
```

Caddy will automatically obtain a TLS certificate for `OTEL_DOMAIN` on first start.

### 6. Verify

```bash
# Collector is reachable and accepting data
curl -s https://otel.yourcompany.com/health | jq .

# ClickHouse has data
docker compose exec clickhouse \
  clickhouse-client --query "SELECT count() FROM otel.events"
```

### 7. Point Claude Code at the production endpoint

Add to your shell profile (or distribute via your team's dotfiles/MDM):

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.yourcompany.com
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer <OTLP_BEARER_TOKEN>"
export OTEL_LOG_TOOL_DETAILS=1
```

---

## Production — Stage 2: Dashboard (coming soon)

- Deploy the Next.js dashboard behind Caddy on the same server (or separately)
- Add basic auth or SSO in front of the dashboard
- Set up CI/CD via GitHub Actions → ghcr.io → SSH deploy

---

## Data retention

ClickHouse TTL is set to **90 days** on `otel.events` by default. To change it:

```sql
ALTER TABLE otel.events MODIFY TTL timestamp + INTERVAL 180 DAY;
```

---

## Backups

The OTel collector writes a zstd-compressed JSONL backup to the `otel_data` Docker volume
(`/data/backup.jsonl.*`). This can be used to replay data into a new ClickHouse instance.

For off-server backups, mount the volume and sync to S3/Backblaze with a cron job:

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

The collector exposes a health check endpoint. A simple uptime monitor (UptimeRobot, BetterUptime)
on `https://otel.yourcompany.com/health` will alert you if the pipeline goes down.
