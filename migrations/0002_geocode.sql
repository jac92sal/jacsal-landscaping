-- Geocoded position of the service address.
--
-- Needed so the customer can trace their lawn on satellite imagery: the tracer
-- centres the map here, and every tapped point is converted from pixel offset
-- to lat/lng against this centre. Stored rather than re-geocoded per request —
-- geocoding is billed per call and the address rarely changes.
ALTER TABLE leads ADD COLUMN lat REAL;
ALTER TABLE leads ADD COLUMN lng REAL;
-- Which zoom the customer traced at. Kept so a traced polygon can be re-rendered
-- exactly as they drew it when an admin reviews the lead.
ALTER TABLE leads ADD COLUMN trace_zoom INTEGER;
