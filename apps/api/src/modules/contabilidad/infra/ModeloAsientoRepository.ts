import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { modeloAsiento, modeloAsientoMovimiento, modeloAsientoPlantilla } from "./schema.js";
import type { EventoModeloAsiento, LadoMovimiento, ModeloAsiento } from "../domain/ModeloAsiento.js";

export interface MovimientoPlantilla {
  orden: number;
  cuentaCodigo: string;
  lado: LadoMovimiento;
  formula: string;
}

export interface PlantillaActiva {
  evento: EventoModeloAsiento;
  nombre: string;
  movimientos: MovimientoPlantilla[];
}

export interface MovimientoNuevoModelo {
  orden: number;
  cuentaId: string;
  lado: LadoMovimiento;
  formula: string;
}

@injectable()
export class ModeloAsientoRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async buscarPorEvento(empresaId: string, evento: EventoModeloAsiento): Promise<ModeloAsiento | null> {
    const modelo = await this.db.query.modeloAsiento.findFirst({
      where: and(eq(modeloAsiento.empresaId, empresaId), eq(modeloAsiento.evento, evento), eq(modeloAsiento.activo, true)),
      with: {
        movimientos: { with: { cuenta: true }, orderBy: (m, { asc }) => [asc(m.orden)] },
      },
    });
    if (!modelo) return null;

    return {
      id: modelo.id,
      tenantId: modelo.tenantId,
      empresaId: modelo.empresaId,
      evento: modelo.evento,
      nombre: modelo.nombre,
      activo: modelo.activo,
      movimientos: modelo.movimientos.map((m) => ({
        id: m.id,
        orden: m.orden,
        cuentaId: m.cuentaId,
        cuentaCodigo: m.cuenta.codigo,
        lado: m.lado,
        formula: m.formula,
      })),
    };
  }

  async listarPlantillasActivas(): Promise<PlantillaActiva[]> {
    const plantillas = await this.db.query.modeloAsientoPlantilla.findMany({
      where: eq(modeloAsientoPlantilla.activo, true),
      with: { movimientos: { orderBy: (m, { asc }) => [asc(m.orden)] } },
    });
    return plantillas.map((p) => ({
      evento: p.evento,
      nombre: p.nombre,
      movimientos: p.movimientos.map((m) => ({
        orden: m.orden,
        cuentaCodigo: m.cuentaCodigo,
        lado: m.lado,
        formula: m.formula,
      })),
    }));
  }

  /**
   * Nota 07 "Flujo de alta": copia una plantilla de fabrica a modelo_asiento
   * de la empresa. Idempotente por (empresaId, evento) — si ya existe (ej. se
   * reintenta la activacion), no duplica.
   */
  async crearModeloDesdeplantilla(
    tenantId: string,
    empresaId: string,
    evento: EventoModeloAsiento,
    nombre: string,
    movimientos: MovimientoNuevoModelo[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [modelo] = await tx
        .insert(modeloAsiento)
        .values({ tenantId, empresaId, evento, nombre })
        .onConflictDoNothing({ target: [modeloAsiento.empresaId, modeloAsiento.evento] })
        .returning();
      if (!modelo) return;
      if (movimientos.length > 0) {
        await tx.insert(modeloAsientoMovimiento).values(
          movimientos.map((m) => ({
            modeloAsientoId: modelo.id,
            orden: m.orden,
            cuentaId: m.cuentaId,
            lado: m.lado,
            formula: m.formula,
          })),
        );
      }
    });
  }
}
