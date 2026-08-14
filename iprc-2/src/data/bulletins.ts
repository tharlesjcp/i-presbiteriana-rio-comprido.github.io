import type { BulletinInput, BulletinTemplate } from '../domain/bulletin.ts';

// Cadastre somente boletins reais e autorizados. Fixtures pertencem exclusivamente aos testes.
export const staticBulletins: BulletinInput[] = [];

// Referências de arte ficam vazias até que as artes reais sejam cadastradas no futuro armazenamento.
export const bulletinTemplates: BulletinTemplate[] = [
  { id: 'standard', name: 'Template padrão', kind: 'annual', styleKey: 'iprc-standard', active: true },
];
