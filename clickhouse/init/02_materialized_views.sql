-- Analytics aggregation materialized views
-- Query with sumMerge() / countMerge() for sub-ms responses

-- ── Per-user daily cost aggregation ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otel.mv_user_daily_cost_state
(
    date                  Date,
    user_email            LowCardinality(String),
    model                 LowCardinality(String),
    cost_usd_state        AggregateFunction(sum, Float64),
    input_tokens_state    AggregateFunction(sum, UInt64),
    output_tokens_state   AggregateFunction(sum, UInt64),
    event_count_state     AggregateFunction(count, UInt8)
)
ENGINE = AggregatingMergeTree()
ORDER BY (date, user_email, model);

CREATE MATERIALIZED VIEW IF NOT EXISTS otel.mv_user_daily_cost
TO otel.mv_user_daily_cost_state
AS
SELECT
    toDate(timestamp)                  AS date,
    user_email,
    model,
    sumState(cost_usd)                 AS cost_usd_state,
    sumState(toUInt64(input_tokens))   AS input_tokens_state,
    sumState(toUInt64(output_tokens))  AS output_tokens_state,
    countState()                       AS event_count_state
FROM otel.events
WHERE user_email != ''
GROUP BY date, user_email, model;

-- ── Per-model aggregation ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otel.mv_model_usage_state
(
    date               Date,
    model              LowCardinality(String),
    cost_usd_state     AggregateFunction(sum, Float64),
    event_count_state  AggregateFunction(count, UInt8)
)
ENGINE = AggregatingMergeTree()
ORDER BY (date, model);

CREATE MATERIALIZED VIEW IF NOT EXISTS otel.mv_model_usage
TO otel.mv_model_usage_state
AS
SELECT
    toDate(timestamp)  AS date,
    model,
    sumState(cost_usd) AS cost_usd_state,
    countState()       AS event_count_state
FROM otel.events
WHERE model != ''
GROUP BY date, model;
