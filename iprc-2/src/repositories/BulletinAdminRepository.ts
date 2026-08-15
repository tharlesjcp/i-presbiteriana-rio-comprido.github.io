import type { BulletinInput, VersionedBulletin } from '../domain/bulletin.ts';

export class BulletinAdminConflictError extends Error {}
export class BulletinAdminNotFoundError extends Error {}
export class BulletinNumberConflictError extends Error {}

export interface BulletinSuggestions { number: number; date: string; templateId: string }
export interface BulletinAdminRepository {
  list(): Promise<VersionedBulletin[]>;
  find(id: string): Promise<VersionedBulletin>;
  suggestions(): Promise<BulletinSuggestions>;
  create(input: BulletinInput, actor: string): Promise<VersionedBulletin>;
  update(id: string, input: BulletinInput, expectedVersion: string, actor: string): Promise<VersionedBulletin>;
  duplicate(id: string, actor: string): Promise<VersionedBulletin>;
}
