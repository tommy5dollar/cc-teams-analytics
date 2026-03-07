-- OTel Collector ClickHouse exporter creates these tables automatically when
-- create_schema: true. We create the database and our analytics table here.

CREATE DATABASE IF NOT EXISTS otel;

-- Primary analytics table: one row per CC log event
-- The MV below populates this from otel_logs
CREATE TABLE IF NOT EXISTS otel.events
(
    timestamp             DateTime64(9),
    session_id            LowCardinality(String),
    user_id               LowCardinality(String),
    user_email            LowCardinality(String),
    org_id                LowCardinality(String),
    event_name            LowCardinality(String),
    model                 LowCardinality(String),
    tool_name             LowCardinality(String),
    decision              LowCardinality(String),
    input_tokens          UInt32,
    output_tokens         UInt32,
    cache_read_tokens     UInt32,
    cache_creation_tokens UInt32,
    cost_usd              Float64,
    body                  String,
    service_name          LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, user_email, session_id)
TTL toDateTime(timestamp) + INTERVAL 2 YEAR;

-- Materialized view: otel_logs → events
-- Runs at insert time, zero maintenance
CREATE MATERIALIZED VIEW IF NOT EXISTS otel.mv_otel_logs_to_events
TO otel.events
AS
SELECT
    Timestamp                                                AS timestamp,
    LogAttributes['session.id']                             AS session_id,
    LogAttributes['user.id']                                AS user_id,
    LogAttributes['user.email']                             AS user_email,
    LogAttributes['org.id']                                 AS org_id,
    LogAttributes['event.name']                             AS event_name,
    LogAttributes['model']                                  AS model,
    LogAttributes['tool.name']                              AS tool_name,
    LogAttributes['tool.decision']                          AS decision,
    toUInt32OrZero(LogAttributes['tokens.input'])           AS input_tokens,
    toUInt32OrZero(LogAttributes['tokens.output'])          AS output_tokens,
    toUInt32OrZero(LogAttributes['tokens.cache_read'])      AS cache_read_tokens,
    toUInt32OrZero(LogAttributes['tokens.cache_creation'])  AS cache_creation_tokens,
    toFloat64OrZero(LogAttributes['cost.usd'])              AS cost_usd,
    Body                                                    AS body,
    ServiceName                                             AS service_name
FROM otel.otel_logs;
