# @ap-contadores/api

Backend de AP-Contadores. Express + Zod + Drizzle (PostgreSQL) + Inversify, arquitectura hexagonal por modulo bajo `src/modules/`.

## Modulos

- `identidad/` (nucleo) — tenant/empresa/usuario, login, `X-Empresa-Id`. **Implementado en este scaffold inicial.**
- `catalogos/` — catalogos globales (moneda, provincia, condicion IVA, tipo documento). Solo schema + seed por ahora.
- `contabilidad/`, `compras/`, `ventas/`, `fiscal/`, `tesoreria/`, `stock/`, `sueldos/` — pendientes, ver el orden de construcción en el README de la raíz del repo.

## Arranque

```bash
cp .env.example .env   # completar DATABASE_URL, JWT_*_SECRET, MASTER_ENCRYPTION_KEY
pnpm db:generate        # genera drizzle/*.sql a partir de src/modules/**/infra/schema.ts
pnpm db:migrate         # aplica las migraciones contra DATABASE_URL
pnpm db:seed            # carga catalogos base (moneda, provincia, condicion_iva, tipo_documento)
pnpm dev                # http://localhost:3000 (tsx watch)
```

## Autenticación (núcleo — nota 06)

1. `POST /tenants` da de alta el estudio + su primer usuario `OWNER`.
2. `POST /auth/login` devuelve `accessToken` (JWT corto, `{ sub, tenantId, rolGlobal }`, **nunca** `empresaId`) + `refreshToken`.
3. Cualquier request a un módulo de negocio (cuando existan) debe llevar `Authorization: Bearer <accessToken>` + header `X-Empresa-Id: <uuid>`.
4. `empresaContextMiddleware` valida dos veces antes de armar `req.context`: que `(usuarioId, empresaId)` exista en `usuario_empresa`, y que `empresa.tenant_id` coincida con el `tenantId` del JWT. Cualquiera de las dos que falle da `403`, nunca un `404` silencioso.

## Tests

```bash
pnpm test
```

Los tests de `identidad` (`Login.test.ts`, `empresaContextMiddleware.test.ts`) usan repositorios mockeados — no requieren una base Postgres real. Los tests de integración contra una base real quedan para cuando el CI tenga un Postgres de test disponible.
