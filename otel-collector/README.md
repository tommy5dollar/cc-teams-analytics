# OTel Collector

Local OpenTelemetry Collector that captures traces, metrics, and logs to disk as JSON Lines files.

## Quick start

```bash
cd otel-collector
docker compose up -d
```

The collector exposes:

- **gRPC** on `localhost:4317`
- **HTTP** on `localhost:4318`

Telemetry is written to `./data/` as separate files:

| File | Signal |
|------|--------|
| `data/traces.jsonl` | Traces |
| `data/metrics.jsonl` | Metrics |
| `data/logs.jsonl` | Logs |

Each file rotates at 50 MB with 10 backups (~1.5 GB max total disk usage).

## Verify it works

```bash
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans":[]}'
```

## Point a service at it

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

## Stop

```bash
docker compose down
```
