import { createClient } from "@clickhouse/client";

const clickhouse = createClient({
  url: `http://${process.env.CLICKHOUSE_HOST ?? "localhost"}:${process.env.CLICKHOUSE_PORT ?? "8123"}`,
  database: process.env.CLICKHOUSE_DATABASE ?? "otel",
  username: process.env.CLICKHOUSE_USER ?? "default",
  password: process.env.CLICKHOUSE_PASSWORD ?? "",
});

export default clickhouse;
