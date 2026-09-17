import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { ejercicio } from "./schema.js";

export interface Ejercicio {
  id: string;
  tenantId: string;
  empresaId: string;
  fechaDesde: string;
  fechaHasta: string;
  cerrado: boolean;
}

function toDomain(row: typeof ejercicio.$inferSelect): Ejercicio {
  return {
    id: row.id,
    tenantId: row.tenantId,
    empresaId: row.empresaId,
    fechaDesde: row.fechaDesde,
    fechaHasta: row.fechaHasta,
    cerrado: row.cerrado,
  };
}

/**
 * Calcula el rango [desde, hasta] del ejercicio anual que contiene `fecha`,
 * segun el dia de cierre MM-DD de la empresa (nota 06: empresa.cierreEjercicio).
 * Ej. cierre "12-31" y fecha en cualquier dia de un anio calendario -> el
 * ejercicio de ese mismo anio (01-01 a 12-31); cierre "05-31" y fecha en junio
 * de 2026 -> ejercicio 01-06-2026 a 31-05-2027.
 */
function calcularRangoEjercicio(fecha: Date, cierreEjercicioMMDD: string): { desde: string; hasta: string } {
  const partes = cierreEjercicioMMDD.split("-").map(Number);
  const mesCierre = partes[0]!;
  const diaCierre = partes[1]!;
  const anio = fecha.getUTCFullYear();

  const cierreEsteAnio = new Date(Date.UTC(anio, mesCierre - 1, diaCierre));
  const perteneceAlQueTerminaEsteAnio = fecha.getTime() <= cierreEsteAnio.getTime();
  const finEjercicio = perteneceAlQueTerminaEsteAnio
    ? cierreEsteAnio
    : new Date(Date.UTC(anio + 1, mesCierre - 1, diaCierre));

  const inicioEjercicio = new Date(finEjercicio);
  inicioEjercicio.setUTCFullYear(finEjercicio.getUTCFullYear() - 1);
  inicioEjercicio.setUTCDate(inicioEjercicio.getUTCDate() + 1);

  return {
    desde: inicioEjercicio.toISOString().slice(0, 10),
    hasta: finEjercicio.toISOString().slice(0, 10),
  };
}

/**
 * Resuelve el ejercicio contable de una empresa para una fecha dada,
 * creandolo si todavia no existe. v1 no tiene ABM manual de ejercicios (nota
 * 07 no lo define como endpoint todavia), asi que GenerarAsientoDesdeComprobante
 * lo resuelve solo a partir de empresa.cierreEjercicio (nota 06).
 */
@injectable()
export class EjercicioRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async obtenerOCrear(
    tenantId: string,
    empresaId: string,
    fecha: Date,
    cierreEjercicioMMDD: string,
  ): Promise<Ejercicio> {
    const { desde, hasta } = calcularRangoEjercicio(fecha, cierreEjercicioMMDD);

    const existente = await this.db.query.ejercicio.findFirst({
      where: and(eq(ejercicio.empresaId, empresaId), eq(ejercicio.fechaDesde, desde)),
    });
    if (existente) return toDomain(existente);

    const [row] = await this.db
      .insert(ejercicio)
      .values({ tenantId, empresaId, fechaDesde: desde, fechaHasta: hasta })
      .onConflictDoNothing({ target: [ejercicio.empresaId, ejercicio.fechaDesde] })
      .returning();
    if (row) return toDomain(row);

    // Carrera: otro request lo creo entre el find y el insert de arriba — releer.
    const releido = await this.db.query.ejercicio.findFirst({
      where: and(eq(ejercicio.empresaId, empresaId), eq(ejercicio.fechaDesde, desde)),
    });
    if (!releido) throw new Error("No se pudo resolver el ejercicio contable");
    return toDomain(releido);
  }
}
