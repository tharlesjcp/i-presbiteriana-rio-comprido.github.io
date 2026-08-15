DROP INDEX IF EXISTS admin_audit_entity_idx;
DROP INDEX IF EXISTS admin_audit_actor_idx;
ALTER TABLE admin_audit_log RENAME TO admin_audit_log_phase8;

CREATE TABLE admin_audit_log (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'publish', 'unpublish', 'cancel', 'activate', 'deactivate', 'duplicate', 'trash')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('recurring_schedule', 'agenda_event', 'bulletin')),
  entity_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

INSERT INTO admin_audit_log SELECT * FROM admin_audit_log_phase8;
DROP TABLE admin_audit_log_phase8;
CREATE INDEX admin_audit_entity_idx ON admin_audit_log (entity_type, entity_id, timestamp DESC);
CREATE INDEX admin_audit_actor_idx ON admin_audit_log (actor, timestamp DESC);

INSERT OR IGNORE INTO bulletin_templates (id, name, kind, style_key, active)
VALUES ('iprc-padrao', 'IPRC padrão', 'annual', 'iprc-default', 1);

ALTER TABLE bulletin_activities ADD COLUMN start_time TEXT;
ALTER TABLE bulletin_activities ADD COLUMN end_time TEXT;
ALTER TABLE bulletin_activities ADD COLUMN location_name TEXT;
ALTER TABLE bulletin_activities ADD COLUMN location_address TEXT;
ALTER TABLE bulletin_activities ADD COLUMN description TEXT;
