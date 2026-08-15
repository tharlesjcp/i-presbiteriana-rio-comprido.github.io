CREATE TABLE admin_audit_log (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'publish', 'cancel', 'activate', 'deactivate')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('recurring_schedule', 'agenda_event')),
  entity_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX admin_audit_entity_idx ON admin_audit_log (entity_type, entity_id, timestamp DESC);
CREATE INDEX admin_audit_actor_idx ON admin_audit_log (actor, timestamp DESC);
