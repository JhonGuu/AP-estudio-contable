# AP-Contadores

SaaS multi-tenant de gestión contable para estudios contables en Argentina. Cada **tenant** es un estudio contable (cliente pago); cada tenant administra una o más **empresas** (sus clientes). Todas las tablas de negocio quedan aisladas por `tenant_id` + `empresa_id` en una base compartida (no una base por tenant).

Este proyecto es independiente de `bioestancia-app`: no comparte código ni base de datos. Solo reutiliza el mismo patrón de arquitectura (Node + TypeScript + Express + Zod + PostgreSQL + Drizzle, hexagonal/DDD-lite, monorepo con frontend separado).

## Estructura

```
ap-contadores/
├── apps/
│   ├── api/                  # backend: Express + Zod + Drizzle, hexagonal
│   │   └── src/modules/
│   │       ├── identidad/        # tenant/empresa/usuario, login, X-Empresa-Id
│   │       ├── contabilidad/     # motor de asientos (formula-engine)
│   │       ├── compras/          # circuito comercial
│   │       ├── ventas/           # circuito comercial
│   │       ├── fiscal/           # AFIP (CAE) + Libro IVA digital
│   │       ├── tesoreria/        # caja, cuenta bancaria, cheques
│   │       ├── stock/            # add-on opcional
│   │       └── sueldos/          # motor de liquidacion propio (formula-engine)
│   └── web/                  # frontend: React 19 + Vite + TanStack Router/Query
└── packages/
    └── formula-engine/       # parser/evaluador compartido entre contabilidad y sueldos
```

## Stack

- **Backend**: Node.js + TypeScript, Express + Zod, PostgreSQL + Drizzle ORM, Inversify (DI), JWT + bcrypt, Pino, Vitest.
- **Frontend**: React 19 + TypeScript + Vite, TanStack Router/Query, Zod + React Hook Form, Tailwind v4 + shadcn/ui.
- **Monorepo**: pnpm workspaces (sin Turborepo/Nx — repo chico, se suma más adelante si hace falta).

## Arranque local

Requiere Docker Desktop corriendo (para la base) y Node 20+.

```bash
docker compose up -d            # levanta Postgres en localhost:5432 (usuario/clave/base: ap_contadores)
pnpm install
cp apps/api/.env.example apps/api/.env   # completar JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, MASTER_ENCRYPTION_KEY
pnpm db:migrate                 # aplica migraciones
pnpm db:seed                    # carga catálogos base (monedas, provincias, condición IVA, tipo de comprobante, modelos de asiento)
pnpm dev:api                    # http://localhost:3000
pnpm dev:web                    # http://localhost:5173
```

`docker-compose.yml` en la raíz define el contenedor `ap-contadores-db` con un volumen nombrado, asi que los datos persisten entre reinicios (`docker compose down` sin `-v` no los borra). El `.env.example` de la raíz quedó desactualizado — el que hay que copiar es el de `apps/api/`.

## Orden de construcción

1. **Núcleo** (`identidad`): tenant/empresa/usuario, login, `X-Empresa-Id`.
2. `packages/formula-engine` + **motor de asientos** (`contabilidad`).
3. **Circuito comercial** (`compras`/`ventas`).
4. **Tesorería** (`tesoreria`) — en paralelo con el punto 3.
5. **Compliance fiscal** (`fiscal`).
6. **Add-ons** (`stock`, `sueldos`).

Diseño completo y decisiones de arquitectura documentadas en la bóveda de planeamiento (Obsidian/Drive) del proyecto — no versionadas en este repo.
