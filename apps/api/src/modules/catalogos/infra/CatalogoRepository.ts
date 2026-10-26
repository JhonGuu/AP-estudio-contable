import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import type { Catalogos } from "../domain/Catalogo.js";

/**
 * GET /catalogos — catalogos globales de solo lectura (nota 01, nota 25
 * seccion 3). Un unico endpoint combinado en vez de uno por tabla: el
 * frontend los necesita todos juntos para armar los selects de los
 * formularios de alta, y son chicos (unas pocas decenas de filas en total).
 */
@injectable()
export class CatalogoRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async obtenerTodos(): Promise<Catalogos> {
    const [monedas, provincias, condicionesIva, tiposDocumento] = await Promise.all([
      this.db.query.moneda.findMany(),
      this.db.query.provincia.findMany(),
      this.db.query.condicionIva.findMany(),
      this.db.query.tipoDocumento.findMany(),
    ]);

    return {
      monedas: monedas.map((m) => ({ id: m.id, codigo: m.codigo, nombre: m.nombre, simbolo: m.simbolo })),
      provincias: provincias.map((p) => ({ id: p.id, codigoAfip: p.codigoAfip, nombre: p.nombre })),
      condicionesIva: condicionesIva.map((c) => ({
        id: c.id,
        codigoAfip: c.codigoAfip,
        nombre: c.nombre,
        esResponsableInscripto: c.esResponsableInscripto,
      })),
      tiposDocumento: tiposDocumento.map((t) => ({
        id: t.id,
        codigoAfip: t.codigoAfip,
        nombre: t.nombre,
        longitud: t.longitud,
      })),
    };
  }
}
