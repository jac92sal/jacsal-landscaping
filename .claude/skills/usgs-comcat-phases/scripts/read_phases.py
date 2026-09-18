#!/usr/bin/env python3
"""Read a libcomcat `getphases` CSV (event header + phase table).

Port of read_phases.m. Usage:
    from read_phases import read_phases
    event, phases = read_phases("us2000b3dm_phases.csv")
    # event: dict  (id, time [datetime, UTC], location, latitude, longitude, depth,
    #               magnitude, magtype, url, plus any <src>_<method>_mrr ... np2_rake)
    # phases: list[dict] with keys Channel, Distance, Azimuth, Phase, Arrival Time,
    #               Status, Residual, Weight (and Agency when present)
Or from the shell:  python3 read_phases.py FILE.csv  → prints JSON.
Only the standard library is used; pass to pandas with pd.DataFrame(phases) if wanted.
"""
import csv
import io
import json
import sys
from datetime import datetime, timezone

NUMERIC = {"Distance", "Azimuth", "Residual", "Weight"}


def _num(s):
    try:
        return int(s)
    except ValueError:
        try:
            return float(s)
        except ValueError:
            return None


def _time(s):
    s = s.strip().replace("Z", "+00:00")
    for fmt in ("%Y-%m-%d %H:%M:%S.%f%z", "%Y-%m-%d %H:%M:%S%z", "%Y-%m-%dT%H:%M:%S.%f%z",
                "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S"):
        try:
            d = datetime.strptime(s, fmt)
            return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return s


def read_phases(path):
    if path.lower().endswith((".xlsx", ".xls")):
        raise ValueError("Excel files are not supported; run getphases with --format=csv")
    event, body = {}, []
    with open(path, encoding="utf-8") as f:
        for line in f:
            if line.startswith("#"):
                if line.startswith("#%"):          # documentation line, skip
                    continue
                key, _, value = line[1:].partition("=")
                key, value = key.strip(), value.strip()
                if key == "time":
                    event[key] = _time(value)
                else:
                    n = _num(value)
                    event[key] = value if n is None else n
            else:
                body.append(line)
    delim = "\t" if body and "\t" in body[0] else ","
    rows = []
    for r in csv.DictReader(io.StringIO("".join(body)), delimiter=delim):
        for k in NUMERIC & r.keys():
            r[k] = _num(r[k]) if r[k] not in ("", None) else None
        if "Arrival Time" in r:
            r["Arrival Time"] = _time(r["Arrival Time"])
        rows.append(r)
    return event, rows


if __name__ == "__main__":
    ev, ph = read_phases(sys.argv[1])
    print(json.dumps({"event": ev, "phases": ph}, default=str, indent=2))
