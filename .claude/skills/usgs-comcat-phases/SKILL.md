---
name: usgs-comcat-phases
description: Fetch earthquake origin, magnitude, moment tensor, and seismic phase-pick (arrival) data from the USGS ComCat catalog, and read or write the libcomcat `getphases` CSV/Excel format (event header lines starting with # followed by a phase table). Use for any earthquake event ID (e.g. us2000b3dm), station arrival times, P/S picks, residuals, or a MATLAB read_phases.m workflow.
---

# USGS ComCat phase data (libcomcat `getphases`)

## What the data is
For one earthquake, ComCat stores a **phase-data** product: every station pick (P, Pn, Pg, S, ...), its arrival time, distance/azimuth from the epicenter, residual, and weight. `getphases` (from the `libcomcat` Python package) writes that to one file per event: `<eventid>_phases.csv` (or `.xlsx`).

## Getting the file
```bash
pip install libcomcat            # needs Python + pandas; obspy for QuakeML
getphases OUTDIR -i us2000b3dm --format=csv          # one event by ComCat ID
getphases OUTDIR -b -97.573 -97.460 36.247 36.329 -s 2017-08-26 -e 2017-09-15 -f excel   # search bbox+dates
getphases OUTDIR -r 34.05 -118.25 50 -m 4.0 9.9 -s 2024-01-01                            # radius (lat lon km) + mag range
```
Flags: `-i/--event-id`, `-b/--bounds lonmin lonmax latmin latmax`, `-r/--radius lat lon rmax_km`, `-s/--start-time`, `-e/--end-time` (`YYYY-mm-dd[THH:MM:SS[.s]]`), `-m/--mag-range min max`, `-c/--catalog` (e.g. `us`, `ak`; default preferred), `--contributor`, `-t/--time-after` (updated after), `-f/--format csv|tab|excel` (default csv), `--logfile`, `--loglevel`. `-b` and `-r` are mutually exclusive. Events without a phase-data product are skipped with a message.

Python API equivalent:
```python
from libcomcat.search import get_event_by_id
from libcomcat.dataframes import get_phase_dataframe
detail = get_event_by_id("us2000b3dm")          # DetailEvent
df = get_phase_dataframe(detail, catalog="preferred")
hdr = detail.toDict()                            # id, time, location, latitude, longitude, depth, magnitude, magtype, url, MT fields
```

## Without libcomcat (plain HTTP)
1. Event summary: `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&eventid=us2000b3dm`
   → `properties.{title,time(ms),mag,magType,place,url}`, `geometry.coordinates=[lon,lat,depth_km]`, `properties.products['phase-data'][0].contents['quakeml.xml'].url`.
2. Download that QuakeML and read `<pick>` (time, waveformID net/sta/cha/loc, evaluationMode manual|automatic) joined to `<arrival>` (phase, azimuth, distance in degrees, timeResidual, timeWeight) via `pickID`. Multiply distance in degrees by 111.19 to get km, as `getphases` does.
3. Search: same endpoint with `starttime`, `endtime`, `minlatitude`... or `latitude,longitude,maxradiuskm`, `minmagnitude`, `catalog`, `contributor`, `updatedafter`, `producttype=phase-data`, `limit` (max 20000), `orderby=time`.

## CSV format (what `read_phases` parses)
```
#%This file contains information about either a preferred        ← lines starting "#%" are documentation, ignore
#%...
#id = us2000b3dm                                                  ← "#key = value" header lines
#time = 2017-10-10 06:32:21.170000+00:00                          ← UTC; may lack microseconds/offset
#location = 58 km E of Arica, Chile
#latitude = -18.5138                                              ← %.4f
#longitude = -69.7000                                             ← %.4f
#depth = 101.9                                                    ← km, %.1f
#magnitude = 6.3                                                  ← %.1f
#magtype = mww
#url = https://earthquake.usgs.gov/earthquakes/eventpage/us2000b3dm
#us_Mww_mrr = 1.234e+18                                           ← optional moment tensor: <source>_<method>_{mrr,mtt,mpp,mrt,mrp,mtp} (N m)
#us_Mww_np1_strike = 12   ... np1_dip, np1_rake, np2_strike, np2_dip, np2_rake
Channel,Distance,Azimuth,Phase,Arrival Time,Status,Residual,Weight[,Agency]
IU.LVC.BHZ.10,235.6,178.2,P,2017-10-10 06:32:56.120,manual,0.3,1.0
```
- `Channel` is NSCL `NET.STA.CHA.LOC`; `--` or `-` marks a missing part.
- `Distance` km, `Azimuth` degrees, `Arrival Time` UTC, `Status` manual|automatic.
- `--format=tab` is identical but tab-separated; Excel puts the doc lines in column A, then key/value in A/B, then the table.
- Header numeric formatting quirk in `getphases`: non-standard float header values (e.g. moment tensor components) are written with `%i`, so they may appear truncated to integers.

## Readers
- MATLAB: `scripts/read_phases.m` → `[event, table] = read_phases('file.csv')` (event struct with `datenum` time; table with the columns above). Rejects Excel.
- Python (stdlib only): `scripts/read_phases.py` → `event, phases = read_phases('file.csv')`; CLI prints JSON. Handles csv and tab, parses times to tz-aware UTC `datetime`, numbers to int/float.
- JavaScript: split on newlines; lines starting `#%` skip, `#k = v` → header, remainder → CSV. Same rules as the Python port.

## Gotchas
- Event IDs are lowercase network code + id (`us2000b3dm`, `ci38457511`, `nc73584926`). A `-c/--catalog` other than the preferred one changes which network's picks and header you get.
- Times are UTC everywhere; Excel output strips the tz suffix.
- Phase data exists mainly for events reviewed by a network; small or very recent events may have none.
- Do not commit downloaded phase files to this repo; they belong in the scratchpad or the user's data folder.
