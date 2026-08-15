import type { AgendaRepository } from './AgendaRepository.ts';
import type { BulletinRepository } from './BulletinRepository.ts';
import { D1AgendaRepository } from './D1AgendaRepository.ts';
import { D1BulletinRepository } from './D1BulletinRepository.ts';
import { StaticAgendaRepository } from './StaticAgendaRepository.ts';
import { StaticBulletinRepository } from './StaticBulletinRepository.ts';

export type RepositoryBackend = { kind: 'static' } | { kind: 'd1'; db: D1Database };

export const createAgendaRepository = (backend: RepositoryBackend): AgendaRepository =>
  backend.kind === 'd1' ? new D1AgendaRepository(backend.db) : new StaticAgendaRepository();

export const createBulletinRepository = (backend: RepositoryBackend): BulletinRepository =>
  backend.kind === 'd1' ? new D1BulletinRepository(backend.db) : new StaticBulletinRepository();
