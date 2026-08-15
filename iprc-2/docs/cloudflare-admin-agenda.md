# Fase 8 — Worker administrativo e Agenda

## Separação de origens

- Público: `iprc-2-backend-preview.iprc-2.workers.dev`. Continua aberto e serve o site, `/api/public/*` e mídia pública autorizada.
- Administrativo: `iprc-2-admin-preview.iprc-2.workers.dev`. Serve somente `/admin/*` e `/api/admin/*` e deve ser protegido integralmente pelo Cloudflare Access.

Os dois Workers compartilham domínio, validações e repositórios, além dos bindings `DB` (`iprc-2-preview`) e `MEDIA` (`iprc-2-media-preview`). A configuração administrativa está em `wrangler.admin.jsonc` e não define produção.

## Segurança

O Worker administrativo nega por padrão. Toda API exige `Cf-Access-Jwt-Assertion` e valida assinatura RS256 com JWKS oficial, `kid`, issuer, audience, `exp`, `nbf`, e identidade (`email` e `sub`).

`CF_ACCESS_TEAM_DOMAIN` e `CF_ACCESS_AUD` não são versionados. Devem ser configurados depois que a aplicação Access existir:

```powershell
wrangler secret put CF_ACCESS_TEAM_DOMAIN --config wrangler.admin.jsonc --env preview
wrangler secret put CF_ACCESS_AUD --config wrangler.admin.jsonc --env preview
```

Escritas também exigem `Origin` igual a `ADMIN_ORIGIN`; não existe CORS administrativo aberto. Access na borda e validação dentro do Worker são camadas independentes.

## Agenda e auditoria

- `GET|POST /api/admin/agenda/recurring`
- `PUT /api/admin/agenda/recurring/{id}`
- `GET|POST /api/admin/agenda/events`
- `PUT /api/admin/agenda/events/{id}`
- `GET /api/admin/session`

Novos IDs usam `crypto.randomUUID()`. Atualizações exigem `expectedUpdatedAt`; uma versão antiga retorna HTTP 409. Programações são desativadas em vez de excluídas. Somente eventos `published` aparecem na API pública.

`0003_admin_audit_log.sql` registra criação, atualização, publicação, cancelamento, ativação e desativação. O ator vem do e-mail validado pelo Access. Tokens e conteúdo editorial não são armazenados. Escrita e auditoria usam o mesmo `DB.batch` transacional.

## Preview

```powershell
pnpm validate
wrangler d1 migrations apply DB --remote --env preview
wrangler deploy --config wrangler.admin.jsonc --env preview
wrangler deploy --env preview
```

O último comando atualiza somente o Worker público de preview para redirecionar `/admin/*`. Nenhum comando de produção, DNS ou Netlify faz parte desta fase.
