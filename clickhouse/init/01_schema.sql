CREATE DATABASE IF NOT EXISTS otel;

-- Standard otel_logs table matching the otelcol-contrib ClickHouse exporter schema.
-- We pre-create it so the MV below can reference it at init time.
-- The exporter's create_schema: true will skip creation since it already exists.
CREATE TABLE IF NOT EXISTS otel.otel_logs
(
    Timestamp               DateTime64(9)                              CODEC(Delta, ZSTD(1)),
    TimestampDate           Date MATERIALIZED toDate(Timestamp),
    TimestampTime           DateTime MATERIALIZED toDateTime(Timestamp),
    TraceId                 String                                     CODEC(ZSTD(1)),
    SpanId                  String                                     CODEC(ZSTD(1)),
    TraceFlags              UInt32,
    SeverityText            LowCardinality(String)                     CODEC(ZSTD(1)),
    SeverityNumber          Int32,
    ServiceName             LowCardinality(String)                     CODEC(ZSTD(1)),
    Body                    String                                     CODEC(ZSTD(1)),
    ResourceSchemaUrl       String                                     CODEC(ZSTD(1)),
    ResourceAttributes      Map(LowCardinality(String), String)        CODEC(ZSTD(1)),
    ScopeSchemaUrl          String                                     CODEC(ZSTD(1)),
    ScopeName               String                                     CODEC(ZSTD(1)),
    ScopeVersion            String                                     CODEC(ZSTD(1)),
    ScopeAttributes         Map(LowCardinality(String), String)        CODEC(ZSTD(1)),
    LogAttributes           Map(LowCardinality(String), String)        CODEC(ZSTD(1)),
    INDEX idx_trace_id TraceId TYPE bloom_filter(0.001) GRANULARITY 1,
    INDEX idx_log_attr_key   mapKeys(LogAttributes)   TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_log_attr_value mapValues(LogAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_body Body TYPE tokenbf_v1(32768, 3, 0)  GRANULARITY 1
)
ENGINE = MergeTree()
PARTITION BY toDate(Timestamp)
ORDER BY (ServiceName, SeverityText, toUnixTimestamp(Timestamp), TraceId)
SETTINGS index_granularity = 8192;

-- Primary analytics table: one row per CC log event.
-- Populated by the MV below at insert time.
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

-- Materialized view: otel_logs → events (runs at insert time)
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
