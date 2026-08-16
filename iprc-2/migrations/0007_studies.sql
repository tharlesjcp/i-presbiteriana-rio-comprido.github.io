CREATE TABLE studies (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  author TEXT NOT NULL,
  study_date TEXT,
  published_at TEXT,
  youtube_video_id TEXT NOT NULL UNIQUE,
  thumbnail TEXT NOT NULL,
  duration_seconds INTEGER,
  editorial_content TEXT NOT NULL DEFAULT '',
  transcript TEXT NOT NULL DEFAULT '',
  transcript_source TEXT,
  transcript_status TEXT NOT NULL DEFAULT 'unavailable' CHECK (transcript_status IN ('unavailable','raw','reviewed')),
  references_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX studies_public_idx ON studies(status,study_date DESC,published_at DESC);

INSERT INTO studies (id,slug,title,author,study_date,published_at,youtube_video_id,thumbnail,duration_seconds,status,created_at,updated_at) VALUES
('study-b8anLmQG6l0','a-fe-oportunidades-notaveis','A Fé — Oportunidades Notáveis','Presb. Maurício Buraseska','2025-05-28','2025-07-20T23:51:51Z','b8anLmQG6l0','https://i.ytimg.com/vi/b8anLmQG6l0/hqdefault.jpg',1309,'published','2026-08-16T00:00:00Z','2026-08-16T00:00:00Z'),
('study-dr-d1Ou7oXk','o-ser-de-deus-a-soberania-de-deus','O ser de Deus — A soberania de Deus','Presb. Maurício Buraseska','2025-05-14','2025-07-05T10:01:10Z','dr-d1Ou7oXk','https://i.ytimg.com/vi/dr-d1Ou7oXk/hqdefault.jpg',2080,'published','2026-08-16T00:00:00Z','2026-08-16T00:00:00Z'),
('study-HXvHXFRYRAw','retidao-e-justica','Retidão e Justiça','Presb. Maurício Buraseska','2025-05-07','2025-05-24T15:03:17Z','HXvHXFRYRAw','https://i.ytimg.com/vi/HXvHXFRYRAw/hqdefault.jpg',1831,'published','2026-08-16T00:00:00Z','2026-08-16T00:00:00Z'),
('study-5NqLcRsfTFM','a-graca-de-deus','A Graça de Deus','Presb. Maurício Buraseska','2025-04-23','2025-05-14T14:51:27Z','5NqLcRsfTFM','https://i.ytimg.com/vi/5NqLcRsfTFM/hqdefault.jpg',1975,'published','2026-08-16T00:00:00Z','2026-08-16T00:00:00Z'),
('study-PCmLMkMWhcE','deus-e-paciente','Deus é paciente','Presb. Maurício Buraseska','2025-04-16','2025-05-05T20:01:14Z','PCmLMkMWhcE','https://i.ytimg.com/vi/PCmLMkMWhcE/hqdefault.jpg',2137,'published','2026-08-16T00:00:00Z','2026-08-16T00:00:00Z'),
('study-UrgARjALi-4','deus-e-amor','Deus é amor','Presb. Maurício Buraseska','2025-04-09','2025-04-21T01:22:43Z','UrgARjALi-4','https://i.ytimg.com/vi/UrgARjALi-4/hqdefault.jpg',2276,'published','2026-08-16T00:00:00Z','2026-08-16T00:00:00Z'),
('study-9_PsQUdO7Uc','a-verdade-de-deus','A verdade de Deus','Presb. Maurício Buraseska',NULL,'2025-04-06T10:00:10Z','9_PsQUdO7Uc','https://i.ytimg.com/vi/9_PsQUdO7Uc/hqdefault.jpg',1127,'published','2026-08-16T00:00:00Z','2026-08-16T00:00:00Z'),
('study-tUglVULg8Vs','o-ser-de-deus','O Ser de Deus','Presb. Maurício Buraseska',NULL,'2025-03-20T16:01:09Z','tUglVULg8Vs','https://i.ytimg.com/vi/tUglVULg8Vs/hqdefault.jpg',1908,'published','2026-08-16T00:00:00Z','2026-08-16T00:00:00Z');
