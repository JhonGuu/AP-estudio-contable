import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { CuentaBancariaRepository } from "../infra/CuentaBancariaRepository.js";
import { ConciliacionBancariaRepository } from "../infra/ConciliacionBancariaRepository.js";
import { AsientoRepository, type MovimientoMayor } from "../../contabilidad/infra/AsientoRepository.js";
import { EPSILON_CONCILIACION, VENTANA_DIAS_MATCHING, type LineaExtracto } from "../domain/ConciliacionBancaria.js";
import type { ConciliacionBancaria } from "../domain/ConciliacionBancaria.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";

export interface ImportarExtractoBancarioInput {
  cuentaBancariaId: string;
  lineas: LineaExtracto[];
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * POST /tesoreria/cuentas-bancarias/:id/conciliacion (nota 22, seccion 5).
 * No matchea contra `movimiento_fondo` — eso dejaria afuera los pagos a
 * proveedores y cobros a clientes hechos por CUENTA_BANCARIA, que no pasan
 * por tesoreria (actualizan el saldo directo desde compras/ventas). En
 * cambio matchea contra el Libro Mayor de la cuenta contable de la cuenta
 * bancaria (el mismo `AsientoRepository.listarMovimientosPorCuenta` que ya
 * usa ObtenerLibroMayor) — ahi esta el 100% de lo que la tocó, venga de
 * donde venga, sin acoplar tesoreria a compras/ventas.
 *
 * Matching v1 (nota 22, "decision abierta"): importe exacto (dentro de
 * EPSILON) + lado coherente con el signo del extracto + fecha dentro de
 * una ventana de dias. Si no hay exactamente un candidato libre, la linea
 * queda PENDIENTE para conciliar a mano.
 */
@injectable()
export class ImportarExtractoBancario {
  constructor(
    @inject(CuentaBancariaRepository) private readonly cuentaBancariaRepository: CuentaBancariaRepository,
    @inject(ConciliacionBancariaRepository) private readonly conciliacionBancariaRepository: ConciliacionBancariaRepository,
    @inject(AsientoRepository) private readonly asientoRepository: AsientoRepository,
  ) {}

  async ejecutar(context: EmpresaContext, input: ImportarExtractoBancarioInput): Promise<ConciliacionBancaria[]> {
    if (input.lineas.length === 0) {
      throw AppError.badRequest("El extracto no tiene lineas", "EXTRACTO_VACIO");
    }

    const cuenta = await this.cuentaBancariaRepository.buscarPorIdYEmpresa(input.cuentaBancariaId, context.empresaId);
    if (!cuenta) {
      throw AppError.notFound("Cuenta bancaria no encontrada en esta empresa");
    }

    const movimientos = await this.asientoRepository.listarMovimientosPorCuenta(
      context.empresaId,
      cuenta.cuentaContableId,
    );
    const yaConciliados = await this.conciliacionBancariaRepository.listarAsientosYaConciliados(cuenta.id);
    const usadosEnEstaImportacion = new Set<string>();

    const lineasAInsertar = input.lineas.map((linea) => {
      const candidato = this.buscarCandidato(linea, movimientos, yaConciliados, usadosEnEstaImportacion);
      if (candidato) usadosEnEstaImportacion.add(candidato.asientoId);
      return {
        tenantId: context.tenantId,
        empresaId: context.empresaId,
        cuentaBancariaId: cuenta.id,
        fecha: linea.fecha,
        descripcion: linea.descripcion,
        importe: linea.importe,
        asientoId: candidato ? candidato.asientoId : null,
      };
    });

    return this.conciliacionBancariaRepository.crearMuchas(lineasAInsertar);
  }

  private buscarCandidato(
    linea: LineaExtracto,
    movimientos: MovimientoMayor[],
    yaConciliados: Set<string>,
    usadosEnEstaImportacion: Set<string>,
  ): MovimientoMayor | null {
    const ladoEsperado = linea.importe >= 0 ? "DEBE" : "HABER";
    const candidatos = movimientos.filter((m) => {
      if (yaConciliados.has(m.asientoId) || usadosEnEstaImportacion.has(m.asientoId)) return false;
      if (m.lado !== ladoEsperado) return false;
      if (Math.abs(m.importe - Math.abs(linea.importe)) > EPSILON_CONCILIACION) return false;
      const diffDias = Math.abs(m.fecha.getTime() - linea.fecha.getTime()) / MS_POR_DIA;
      return diffDias <= VENTANA_DIAS_MATCHING;
    });
    return candidatos.length === 1 ? candidatos[0]! : null;
  }
}
