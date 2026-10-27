import { inject, injectable } from "inversify";
import { PlanCuentaRepository } from "../infra/PlanCuentaRepository.js";
import { ModeloAsientoRepository } from "../infra/ModeloAsientoRepository.js";
import type { TipoCuenta } from "../domain/CuentaContable.js";

/**
 * Plan de cuentas "de fabrica" (nota 07, punto 2: "el contador despues las
 * reasigna a su propio plan de cuentas si lo necesita"). Cubre los modelos
 * de compras/ventas/cobros/pagos y, desde que se construyo tesoreria (nota
 * 22), tambien el modelo DEPOSITO — reusando 1.1.01.002/1.1.01.003 (que ya
 * existian) y sirviendo ademas como cuenta_contable_id por defecto de las
 * cajas/cuentas bancarias que de alta un usuario. sueldos suma las suyas
 * cuando se construya ese modulo (nota 08, seccion 6).
 *
 * 2.1.01.004 cierra el hueco documentado en RegistrarPagoCompra: pagar a un
 * proveedor con TARJETA (una corporativa, no la que cobra a un cliente) no
 * tenia cuenta de fabrica y el asiento se rechazaba con ASIENTO_DESBALANCEADO.
 *
 * 5.9.01.001 cierra un hueco analogo en RegistrarMovimientoFondo: un AJUSTE
 * de un solo lado (ej. acreditar una caja sin indicar de donde sale la
 * plata — una diferencia de arqueo) generaba un asiento de una sola linea,
 * sin contrapartida, violando Σ DEBE == Σ HABER (encontrado via el Libro
 * Diario, nota 11). Es una unica cuenta de resultado usada en los dos
 * sentidos (HABER cuando sobra, DEBE cuando falta) — simplificacion v1
 * razonable porque el tipo "RESULTADO" de AP-Contadores no distingue
 * ingreso/gasto, y el saldo neto de la cuenta ya refleja sobrantes menos
 * faltantes del periodo.
 */
const PLAN_CUENTAS_DE_FABRICA: { codigo: string; nombre: string; tipo: TipoCuenta }[] = [
  { codigo: "1.1.01.001", nombre: "Caja", tipo: "ACTIVO" },
  { codigo: "1.1.01.002", nombre: "Cuentas bancarias", tipo: "ACTIVO" },
  { codigo: "1.1.01.003", nombre: "Cheques de terceros en cartera", tipo: "ACTIVO" },
  { codigo: "1.1.01.004", nombre: "Tarjetas de credito a cobrar", tipo: "ACTIVO" },
  { codigo: "1.1.03.001", nombre: "Deudores por ventas", tipo: "ACTIVO" },
  { codigo: "1.1.04.001", nombre: "IVA Credito Fiscal", tipo: "ACTIVO" },
  { codigo: "1.1.04.002", nombre: "Percepciones IIBB a favor", tipo: "ACTIVO" },
  { codigo: "1.1.04.003", nombre: "Otros impuestos a favor", tipo: "ACTIVO" },
  { codigo: "2.1.01.001", nombre: "Proveedores", tipo: "PASIVO" },
  { codigo: "2.1.01.002", nombre: "Cheques emitidos a pagar", tipo: "PASIVO" },
  { codigo: "2.1.01.003", nombre: "Retenciones a depositar", tipo: "PASIVO" },
  { codigo: "2.1.01.004", nombre: "Tarjeta corporativa a pagar", tipo: "PASIVO" },
  { codigo: "2.1.04.001", nombre: "IVA Debito Fiscal", tipo: "PASIVO" },
  { codigo: "2.1.04.002", nombre: "Percepciones IIBB a depositar", tipo: "PASIVO" },
  { codigo: "2.1.04.003", nombre: "Otros impuestos a depositar", tipo: "PASIVO" },
  { codigo: "4.2.01.001", nombre: "Ventas", tipo: "RESULTADO" },
  { codigo: "5.2.02.001", nombre: "Compras y gastos", tipo: "RESULTADO" },
  { codigo: "5.9.01.001", nombre: "Diferencias de caja y valores", tipo: "RESULTADO" },
];

/** Codigo de la cuenta de fabrica que RegistrarMovimientoFondo usa como contrapartida de un AJUSTE de un solo lado. */
export const CODIGO_CUENTA_DIFERENCIAS_CAJA_Y_VALORES = "5.9.01.001";

/**
 * Nota 07, "Flujo de alta": cuando se crea una empresa, se copian las
 * modelo_asiento_plantilla activas a modelo_asiento de esa empresa, con las
 * cuentas del plan por defecto pre-mapeadas a los codigos estandar. Se llama
 * desde CrearEmpresa (identidad) — orquestacion entre modulos a nivel de
 * caso de uso, no acoplamiento de infraestructura: identidad no importa nada
 * de infra/contabilidad, solo este use-case.
 */
@injectable()
export class ActivarModelosAsientoDeFabrica {
  constructor(
    @inject(PlanCuentaRepository) private readonly planCuentaRepository: PlanCuentaRepository,
    @inject(ModeloAsientoRepository) private readonly modeloAsientoRepository: ModeloAsientoRepository,
  ) {}

  async ejecutar(tenantId: string, empresaId: string): Promise<void> {
    const cuentaIdPorCodigo = new Map<string, string>();
    for (const cuenta of PLAN_CUENTAS_DE_FABRICA) {
      const existente = await this.planCuentaRepository.buscarPorCodigo(empresaId, cuenta.codigo);
      const creada = existente ?? (await this.planCuentaRepository.crear({ tenantId, empresaId, ...cuenta }));
      cuentaIdPorCodigo.set(cuenta.codigo, creada.id);
    }

    const plantillas = await this.modeloAsientoRepository.listarPlantillasActivas();
    for (const plantilla of plantillas) {
      const movimientos = plantilla.movimientos.map((m) => {
        const cuentaId = cuentaIdPorCodigo.get(m.cuentaCodigo);
        if (!cuentaId) {
          throw new Error(
            `La plantilla ${plantilla.evento} referencia la cuenta ${m.cuentaCodigo}, que no esta en el plan de cuentas de fabrica`,
          );
        }
        return { orden: m.orden, cuentaId, lado: m.lado, formula: m.formula };
      });
      await this.modeloAsientoRepository.crearModeloDesdeplantilla(
        tenantId,
        empresaId,
        plantilla.evento,
        plantilla.nombre,
        movimientos,
      );
    }
  }
}
