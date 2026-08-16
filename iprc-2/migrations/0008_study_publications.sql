DROP INDEX IF EXISTS admin_audit_entity_idx;
DROP INDEX IF EXISTS admin_audit_actor_idx;
ALTER TABLE admin_audit_log RENAME TO admin_audit_log_pre_studies;

CREATE TABLE admin_audit_log (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'publish', 'republish', 'unpublish', 'archive', 'cancel', 'activate', 'deactivate', 'duplicate', 'trash')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('recurring_schedule', 'agenda_event', 'bulletin', 'study')),
  entity_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

INSERT INTO admin_audit_log SELECT * FROM admin_audit_log_pre_studies;
DROP TABLE admin_audit_log_pre_studies;
CREATE INDEX admin_audit_entity_idx ON admin_audit_log (entity_type, entity_id, timestamp DESC);
CREATE INDEX admin_audit_actor_idx ON admin_audit_log (actor, timestamp DESC);

CREATE TABLE study_publications (
  id TEXT PRIMARY KEY,
  study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  source_updated_at TEXT NOT NULL,
  published_at TEXT NOT NULL,
  published_by TEXT NOT NULL,
  withdrawn_at TEXT,
  withdrawn_by TEXT,
  UNIQUE(study_id, revision)
);

CREATE UNIQUE INDEX study_publications_active_idx ON study_publications(study_id) WHERE withdrawn_at IS NULL;

INSERT INTO study_publications (id,study_id,revision,snapshot_json,source_updated_at,published_at,published_by)
SELECT 'study-publication-' || id || '-1',id,1,
  json_object('id',id,'slug',slug,'title',title,'summary',summary,'author',author,'studyDate',study_date,'publishedAt',published_at,'youtubeUrl','https://www.youtube.com/watch?v=' || youtube_video_id,'thumbnail',thumbnail,'durationSeconds',duration_seconds,'editorialContent',editorial_content,'transcript',transcript,'transcriptSource',transcript_source,'transcriptStatus',transcript_status,'references',json(references_json),'status','published','createdAt',created_at,'updatedAt',updated_at),
  updated_at,published_at,'migration:0008'
FROM studies WHERE status='published';
