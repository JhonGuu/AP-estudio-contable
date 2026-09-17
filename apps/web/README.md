# @ap-contadores/web

Frontend de AP-Contadores: React 19 + Vite + TanStack Router/Query + Zod/React Hook Form + Tailwind v4 + shadcn/ui.

## Arranque

```bash
cp .env.example .env   # VITE_API_URL apuntando a la API local
pnpm dev                # http://localhost:5173
```

## Estado de este scaffold

- `LoginPage` + `DashboardPage` (selector de "empresa activa", nota 06 sección 5) ya están wireados contra `/auth/login` y `/me` de la API.
- `components/ui/{button,input,label}.tsx` son primitivas hechas a mano siguiendo la convención de shadcn/ui (mismo `cn()` en `lib/utils.ts`, mismo `components.json`) — una vez con `pnpm install` y red disponible, se puede usar `npx shadcn add <componente>` normalmente para sumar el resto de la librería sin conflictos.
- El ruteo usa TanStack Router en modo *code-based* (`src/routes.tsx`) — se puede migrar a file-based routing más adelante si el árbol de rutas crece.
