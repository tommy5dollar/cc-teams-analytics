-- Session resume chain. One row per resumed session pointing to its parent.
-- via_prompt_id is the prompt.id that was shared between the two sessions,
-- marking where the resume occurred.
-- ReplacingMergeTree on session_id so re-running the job overwrites stale rows.
CREATE TABLE IF NOT EXISTS otel.session_links
(
    session_id        String,
    parent_session_id String,
    via_prompt_id     String,
    computed_at       DateTime
)
ENGINE = ReplacingMergeTree(computed_at)
ORDER BY session_id;
