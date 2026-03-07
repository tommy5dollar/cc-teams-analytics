#!/usr/bin/env python3
"""
One-time replay of existing OTel JSONL backup files into ClickHouse.

Usage:
    python scripts/migrate_jsonl_to_clickhouse.py [--host localhost] [--port 8123] \
        [--database otel] [--user default] [--password ''] \
        [--data-dir otel-collector/data]

The script reads all backup*.jsonl files (plain or zstd-compressed),
extracts log records, and inserts them into otel.otel_logs so that the
existing materialized views populate otel.events automatically.
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add otel-collector dir so we can reuse otel_common
sys.path.insert(0, str(Path(__file__).parent.parent / "otel-collector"))
from otel_common import read_jsonl, flatten_attributes  # noqa: E402


def parse_args():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--host", default="localhost")
    p.add_argument("--port", type=int, default=8123)
    p.add_argument("--database", default="otel")
    p.add_argument("--user", default="default")
    p.add_argument("--password", default="")
    p.add_argument(
        "--data-dir",
        default="otel-collector/data",
        help="Directory containing backup*.jsonl files",
    )
    p.add_argument("--dry-run", action="store_true", help="Parse only, don't insert")
    return p.parse_args()


def extract_log_rows(obj: dict) -> list[dict]:
    """Pull log records from a parsed OTel export JSON object."""
    rows = []
    for rl in obj.get("resourceLogs", []):
        resource_attrs = flatten_attributes(
            rl.get("resource", {}).get("attributes", [])
        )
        service_name = resource_attrs.get("service.name", "")
        for sl in rl.get("scopeLogs", []):
            scope = sl.get("scope", {})
            scope_name = scope.get("name", "")
            for lr in sl.get("logRecords", []):
                log_attrs = flatten_attributes(lr.get("attributes", []))
                # Timestamp: nanoseconds epoch → datetime
                ts_ns = int(lr.get("timeUnixNano", 0))
                if ts_ns == 0:
                    ts_ns = int(lr.get("observedTimeUnixNano", 0))
                ts = datetime.fromtimestamp(ts_ns / 1e9, tz=timezone.utc)

                body_obj = lr.get("body", {})
                body = body_obj.get("stringValue", str(body_obj)) if body_obj else ""

                rows.append(
                    {
                        "Timestamp": ts.strftime("%Y-%m-%d %H:%M:%S.%f"),
                        "TimestampDate": ts.strftime("%Y-%m-%d"),
                        "TimestampTime": ts.strftime("%Y-%m-%d %H:%M:%S"),
                        "TraceId": lr.get("traceId", ""),
                        "SpanId": lr.get("spanId", ""),
                        "TraceFlags": int(lr.get("flags", 0)),
                        "SeverityText": lr.get("severityText", ""),
                        "SeverityNumber": int(lr.get("severityNumber", 0)),
                        "ServiceName": service_name,
                        "Body": body,
                        "ResourceSchemaUrl": rl.get("schemaUrl", ""),
                        "ResourceAttributes": json.dumps(resource_attrs),
                        "ScopeSchemaUrl": sl.get("schemaUrl", ""),
                        "ScopeName": scope_name,
                        "ScopeVersion": scope.get("version", ""),
                        "ScopeAttributes": json.dumps({}),
                        "LogAttributes": json.dumps(log_attrs),
                    }
                )
    return rows


def insert_batch(session, host: str, port: int, database: str, rows: list[dict]):
    import urllib.request

    payload = "\n".join(json.dumps(r) for r in rows).encode()
    url = (
        f"http://{host}:{port}/"
        f"?query=INSERT+INTO+{database}.otel_logs+FORMAT+JSONEachRow"
    )
    req = urllib.request.Request(url, data=payload, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        if resp.status != 200:
            raise RuntimeError(f"ClickHouse returned {resp.status}: {resp.read()}")


def main():
    args = parse_args()
    data_dir = Path(args.data_dir)
    files = sorted(data_dir.glob("backup*.jsonl*")) + sorted(data_dir.glob("*.jsonl"))

    if not files:
        print(f"No JSONL files found in {data_dir}", file=sys.stderr)
        sys.exit(1)

    total_rows = 0
    for path in files:
        print(f"Processing {path} …", end=" ", flush=True)
        batch: list[dict] = []
        for obj in read_jsonl(path):
            batch.extend(extract_log_rows(obj))
        print(f"{len(batch)} log records")
        if batch and not args.dry_run:
            insert_batch(None, args.host, args.port, args.database, batch)
        total_rows += len(batch)

    print(f"\nDone. Inserted {total_rows} rows total.")
    if args.dry_run:
        print("(dry-run — nothing was inserted)")


if __name__ == "__main__":
    main()
