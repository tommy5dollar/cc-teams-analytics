# Dashboard

Next.js 15 app that queries ClickHouse directly and renders the analytics UI. See the [root README](../README.md) for setup instructions.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

Requires ClickHouse to be running — start the full stack first:

```bash
docker compose -f ../docker-compose.yml -f ../docker-compose.dev.yml up -d
```

## Stack

- Next.js 15 App Router (server components, no separate API layer)
- Recharts for visualisations
- Tailwind CSS
- `@clickhouse/client` for ClickHouse queries
