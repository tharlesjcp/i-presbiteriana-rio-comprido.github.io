INSERT OR IGNORE INTO recurring_schedules
  (id, title, weekday, start_time, location_name, location_address, active, sort_order)
VALUES
  ('oracao-estudo-quarta', 'Oração e Estudo', 3, '18:00', 'Igreja Presbiteriana do Rio Comprido', 'Rua Sampaio Viana, 185, Rio Comprido - RJ', 1, 10),
  ('ebd-domingo', 'EBD - Escola Bíblica Dominical', 0, '09:00', 'Igreja Presbiteriana do Rio Comprido', 'Rua Sampaio Viana, 185, Rio Comprido - RJ', 1, 20),
  ('culto-matutino-domingo', 'Culto Matutino', 0, '10:00', 'Igreja Presbiteriana do Rio Comprido', 'Rua Sampaio Viana, 185, Rio Comprido - RJ', 1, 30),
  ('culto-vespertino-domingo', 'Culto Vespertino', 0, '18:00', 'Igreja Presbiteriana do Rio Comprido', 'Rua Sampaio Viana, 185, Rio Comprido - RJ', 1, 40);

INSERT OR IGNORE INTO bulletin_templates (id, name, kind, style_key, active)
VALUES ('standard', 'Template padrão', 'annual', 'iprc-standard', 1);
