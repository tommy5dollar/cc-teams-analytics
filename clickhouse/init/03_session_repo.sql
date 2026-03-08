-- Inferred repository per session, computed by the inferRepo job.
-- ReplacingMergeTree on session_id means re-running the job overwrites stale rows.
-- logic_version lets us detect and backfill rows computed by older logic.
CREATE TABLE IF NOT EXISTS otel.session_repo
(
    session_id     String,
    repo           String,
    confidence     LowCardinality(String),  -- 'high' | 'medium'
    logic_version  UInt8,
    computed_at    DateTime
)
ENGINE = ReplacingMergeTree(computed_at)
ORDER BY session_id;
