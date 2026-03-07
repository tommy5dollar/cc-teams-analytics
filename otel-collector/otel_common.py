"""Shared utilities for parsing OTel Collector file exporter output."""

import json
import struct
from pathlib import Path

ZSTD_MAGIC = b'\x28\xb5\x2f\xfd'
DATA_DIR = Path(__file__).parent / "data"


def extract_attr_value(value_obj):
    """Pull the typed value out of an OTel attribute value object."""
    for vtype in ("stringValue", "intValue", "doubleValue", "boolValue"):
        if vtype in value_obj:
            return value_obj[vtype]
    return str(value_obj)


def flatten_attributes(attrs):
    """Convert [{key, value}] list to a flat dict."""
    return {a["key"]: extract_attr_value(a["value"]) for a in attrs}


def read_jsonl(path):
    """Yield parsed JSON objects from a .jsonl file (plain or zstd-compressed).

    The OTel file exporter with compression writes concatenated zstd frames,
    each prefixed with a 4-byte big-endian length. Each decompressed frame
    is one JSON line.
    """
    with open(path, "rb") as f:
        header = f.read(8)
        f.seek(0)

        if len(header) >= 8 and header[4:8] == ZSTD_MAGIC:
            yield from _read_zstd_frames(f)
        else:
            for line in f:
                line = line.strip()
                if line:
                    yield json.loads(line)


def _read_zstd_frames(f):
    """Read length-prefixed zstd frames and yield decoded JSON objects."""
    import zstandard as zstd
    dctx = zstd.ZstdDecompressor()

    while True:
        length_bytes = f.read(4)
        if len(length_bytes) < 4:
            break
        frame_len = struct.unpack(">I", length_bytes)[0]
        frame_data = f.read(frame_len)
        if len(frame_data) < frame_len:
            break
        try:
            decompressed = dctx.decompress(frame_data)
            yield json.loads(decompressed)
        except Exception:
            continue
