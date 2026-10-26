/**
 * Formatea una fecha "YYYY-MM-DD" (lo que devuelve la API para columnas date)
 * como DD/MM/YYYY sin pasar por `new Date(...)`. `new Date("2026-10-26")` la
 * interpreta como medianoche UTC, y en una zona horaria negativa (Argentina,
 * UTC-3) `toLocaleDateString` la muestra un dia antes. Parseando los
 * componentes a mano evitamos el corrimiento.
 */
export function formatFechaISO(fecha: string): string {
  const [y, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
