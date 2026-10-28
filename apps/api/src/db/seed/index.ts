import "dotenv/config";
import { db, pool } from "../../shared/db/client.js";
import { moneda, provincia, condicionIva, tipoDocumento, categoriaMonotributo } from "../../modules/catalogos/infra/schema.js";
import { tipoComprobante } from "../../modules/comprobantes/infra/schema.js";
import { modeloAsientoPlantilla, modeloAsientoPlantillaMovimiento } from "../../modules/contabilidad/infra/schema.js";

/**
 * Seed reproducible de catalogos globales (nota 25, seccion 3): "estos datos
 * hacen falta en cada entorno nuevo (desarrollo, testing, produccion)".
 * Idempotente: se puede correr las veces que haga falta (onConflictDoNothing
 * sobre la clave unica de cada catalogo).
 *
 * Ahora incluye tipo_comprobante (circuito comercial, nota 08) y
 * modelo_asiento_plantilla + sus movimientos (motor de asientos, nota 07) —
 * sin esto ConfirmarComprobante/RegistrarPago/RegistrarCobro rechazan todo
 * con MODELO_ASIENTO_NO_CONFIGURADO. Las formulas usan los codigos del plan
 * de cuentas "de fabrica" (ActivarModelosAsientoDeFabrica.ts) — si ese plan
 * cambia de codigos, estas plantillas tienen que actualizarse junto con el.
 *
 * Lo que falta a proposito (nota 25, seccion 3, y nota 25 seccion 4 "orden de
 * construccion"): tipo_afip detallado del modulo fiscal, convenios/categorias
 * (modulo sueldos) — se agregan a este seed cuando esos modulos existan.
 *
 * IMPORTANTE: los codigos de provincia y de condicion_iva de abajo siguen la
 * codificacion estandar que publica AFIP, pero no fueron verificados contra
 * la tabla oficial vigente al momento de usarlos en produccion — antes de la
 * primera facturacion electronica real, contrastar contra
 * https://www.afip.gob.ar (padron / condicion IVA receptor, tabla de provincias).
 * Los codigos de tipo_comprobante de abajo (FA/FB/FC/...) son el shorthand
 * usado en nota 08 — no son los codigos numericos oficiales de AFIP
 * (01/02/03/06/...); mapear a esos cuando se disene el modulo fiscal (fac+iva).
 */

const MONEDAS = [
  { codigo: "ARS", nombre: "Peso argentino", simbolo: "$" },
  { codigo: "USD", nombre: "Dolar estadounidense", simbolo: "US$" },
  { codigo: "EUR", nombre: "Euro", simbolo: "€" },
];

const PROVINCIAS = [
  { codigoAfip: "01", nombre: "Ciudad Autonoma de Buenos Aires" },
  { codigoAfip: "02", nombre: "Buenos Aires" },
  { codigoAfip: "03", nombre: "Catamarca" },
  { codigoAfip: "04", nombre: "Cordoba" },
  { codigoAfip: "05", nombre: "Corrientes" },
  { codigoAfip: "06", nombre: "Entre Rios" },
  { codigoAfip: "07", nombre: "Jujuy" },
  { codigoAfip: "08", nombre: "Mendoza" },
  { codigoAfip: "09", nombre: "La Rioja" },
  { codigoAfip: "10", nombre: "Salta" },
  { codigoAfip: "11", nombre: "San Juan" },
  { codigoAfip: "12", nombre: "San Luis" },
  { codigoAfip: "13", nombre: "Santa Fe" },
  { codigoAfip: "14", nombre: "Santiago del Estero" },
  { codigoAfip: "16", nombre: "Tucuman" },
  { codigoAfip: "17", nombre: "Chaco" },
  { codigoAfip: "18", nombre: "Chubut" },
  { codigoAfip: "19", nombre: "Formosa" },
  { codigoAfip: "20", nombre: "Misiones" },
  { codigoAfip: "21", nombre: "Neuquen" },
  { codigoAfip: "22", nombre: "La Pampa" },
  { codigoAfip: "23", nombre: "Rio Negro" },
  { codigoAfip: "24", nombre: "Santa Cruz" },
  { codigoAfip: "25", nombre: "Tierra del Fuego" },
];

const CONDICIONES_IVA = [
  { codigoAfip: "1", nombre: "IVA Responsable Inscripto", esResponsableInscripto: true },
  { codigoAfip: "4", nombre: "IVA Sujeto Exento", esResponsableInscripto: false },
  { codigoAfip: "5", nombre: "Consumidor Final", esResponsableInscripto: false },
  { codigoAfip: "6", nombre: "Responsable Monotributo", esResponsableInscripto: false },
  { codigoAfip: "9", nombre: "IVA No Alcanzado", esResponsableInscripto: false },
  { codigoAfip: "13", nombre: "Monotributista Social", esResponsableInscripto: false },
  { codigoAfip: "15", nombre: "IVA No Alcanzado (operaciones exentas por sujeto)", esResponsableInscripto: false },
];

const TIPOS_DOCUMENTO = [
  { codigoAfip: "80", nombre: "CUIT", longitud: 11 },
  { codigoAfip: "86", nombre: "CUIL", longitud: 11 },
  { codigoAfip: "96", nombre: "DNI", longitud: 8 },
  { codigoAfip: "94", nombre: "Pasaporte", longitud: null },
  { codigoAfip: "99", nombre: "Consumidor Final / Sin identificar", longitud: null },
];

/**
 * Topes anuales de facturacion por categoria de Monotributo, vigentes desde
 * el 1/08/2026 (actualizacion semestral de ARCA — la proxima se espera para
 * febrero 2027). Fuente al momento de escribir este seed: fiscal.com.ar y
 * wynges.com, cruzadas entre si. ANTES DE USAR EN PRODUCCION (y en cada
 * actualizacion semestral), verificar contra la tabla oficial vigente en
 * https://www.arca.gob.ar — este seed NO se actualiza solo.
 * `soloVentaBienes`: I/J/K solo estan disponibles para venta de cosas
 * muebles, un prestador de servicios tiene su techo en H (ver nota en
 * modules/catalogos/infra/schema.ts).
 */
const CATEGORIAS_MONOTRIBUTO = [
  { codigo: "A", orden: 1, topeAnualFacturacion: "12009410.45", soloVentaBienes: false },
  { codigo: "B", orden: 2, topeAnualFacturacion: "17595182.74", soloVentaBienes: false },
  { codigo: "C", orden: 3, topeAnualFacturacion: "24670494.31", soloVentaBienes: false },
  { codigo: "D", orden: 4, topeAnualFacturacion: "30628651.43", soloVentaBienes: false },
  { codigo: "E", orden: 5, topeAnualFacturacion: "36028231.33", soloVentaBienes: false },
  { codigo: "F", orden: 6, topeAnualFacturacion: "45151659.41", soloVentaBienes: false },
  { codigo: "G", orden: 7, topeAnualFacturacion: "53995798.87", soloVentaBienes: false },
  { codigo: "H", orden: 8, topeAnualFacturacion: "81924660.37", soloVentaBienes: false },
  { codigo: "I", orden: 9, topeAnualFacturacion: "91699761.90", soloVentaBienes: true },
  { codigo: "J", orden: 10, topeAnualFacturacion: "105012519.20", soloVentaBienes: true },
  { codigo: "K", orden: 11, topeAnualFacturacion: "126610838.75", soloVentaBienes: true },
];

const TIPOS_COMPROBANTE = [
  { codigo: "FA", nombre: "Factura A", aplicaA: "AMBOS" as const, afectaIva: true, afectaCuentaCorriente: true, requiereCae: true },
  { codigo: "FB", nombre: "Factura B", aplicaA: "AMBOS" as const, afectaIva: true, afectaCuentaCorriente: true, requiereCae: true },
  { codigo: "FC", nombre: "Factura C", aplicaA: "AMBOS" as const, afectaIva: false, afectaCuentaCorriente: true, requiereCae: true },
  { codigo: "FE", nombre: "Factura E (exportacion)", aplicaA: "VENTA" as const, afectaIva: false, afectaCuentaCorriente: true, requiereCae: true },
  { codigo: "NC", nombre: "Nota de Credito", aplicaA: "AMBOS" as const, afectaIva: true, afectaCuentaCorriente: true, requiereCae: true },
  { codigo: "ND", nombre: "Nota de Debito", aplicaA: "AMBOS" as const, afectaIva: true, afectaCuentaCorriente: true, requiereCae: true },
  { codigo: "REM", nombre: "Remito", aplicaA: "AMBOS" as const, afectaIva: false, afectaCuentaCorriente: false, requiereCae: false },
];

/**
 * Las 4 plantillas de fabrica (nota 07 seccion 2, nota 08 seccion 3). Cada
 * formula se evalua contra el ContextoEvaluacionContable que arma
 * ConfirmarComprobanteCompra/Venta o RegistrarPago/Cobro (ver esos use-cases
 * para el detalle de que variables arman en cada caso). cuentaCodigo referencia
 * al plan de cuentas "de fabrica" — ver ActivarModelosAsientoDeFabrica.ts.
 */
const MODELOS_ASIENTO_PLANTILLA: {
  evento: "ASIENTO_COMPRA" | "ASIENTO_VENTA" | "COBRO_ASIENTO" | "PAGO_ASIENTO" | "DEPOSITO";
  nombre: string;
  movimientos: { orden: number; cuentaCodigo: string; lado: "DEBE" | "HABER"; formula: string }[];
}[] = [
  {
    evento: "ASIENTO_COMPRA",
    nombre: "Compra de fabrica",
    movimientos: [
      { orden: 1, cuentaCodigo: "5.2.02.001", lado: "DEBE", formula: "IF(RUBRO=1,NETO_TOTAL+NOGRAVADO_TOTAL+EXENTO_TOTAL,0)" },
      { orden: 2, cuentaCodigo: "1.1.04.001", lado: "DEBE", formula: "IMPUESTOS(1)" },
      { orden: 3, cuentaCodigo: "1.1.04.002", lado: "DEBE", formula: "IMPUESTOS(2)" },
      { orden: 4, cuentaCodigo: "1.1.04.003", lado: "DEBE", formula: "IMPUESTOS(3)" },
      { orden: 5, cuentaCodigo: "2.1.01.001", lado: "HABER", formula: "IMPORTE_TOTAL" },
    ],
  },
  {
    evento: "ASIENTO_VENTA",
    nombre: "Venta de fabrica",
    movimientos: [
      { orden: 1, cuentaCodigo: "1.1.03.001", lado: "DEBE", formula: "IMPORTE_TOTAL" },
      { orden: 2, cuentaCodigo: "4.2.01.001", lado: "HABER", formula: "IF(RUBRO=1,NETO_TOTAL+NOGRAVADO_TOTAL+EXENTO_TOTAL,0)" },
      { orden: 3, cuentaCodigo: "2.1.04.001", lado: "HABER", formula: "IMPUESTOS(1)" },
      { orden: 4, cuentaCodigo: "2.1.04.002", lado: "HABER", formula: "IMPUESTOS(2)" },
      { orden: 5, cuentaCodigo: "2.1.04.003", lado: "HABER", formula: "IMPUESTOS(3)" },
    ],
  },
  {
    evento: "PAGO_ASIENTO",
    nombre: "Pago a proveedor de fabrica",
    movimientos: [
      { orden: 1, cuentaCodigo: "2.1.01.001", lado: "DEBE", formula: "PAGO_TOTAL" },
      { orden: 2, cuentaCodigo: "1.1.01.001", lado: "HABER", formula: "CAJA_TOTAL" },
      { orden: 3, cuentaCodigo: "1.1.01.002", lado: "HABER", formula: "CUENTA_TOTAL" },
      { orden: 4, cuentaCodigo: "2.1.01.002", lado: "HABER", formula: "CHEQUE_PROPIO_TOTAL" },
      { orden: 5, cuentaCodigo: "1.1.01.003", lado: "HABER", formula: "CHEQUE_TERCERO_TOTAL" },
      { orden: 6, cuentaCodigo: "2.1.01.004", lado: "HABER", formula: "TARJETA_TOTAL" },
      { orden: 7, cuentaCodigo: "2.1.01.003", lado: "HABER", formula: "RETENCIONES_TOTAL" },
    ],
  },
  {
    evento: "DEPOSITO",
    nombre: "Deposito de cheque de tercero (fabrica)",
    movimientos: [
      { orden: 1, cuentaCodigo: "1.1.01.002", lado: "DEBE", formula: "DEPOSITO_TOTAL" },
      { orden: 2, cuentaCodigo: "1.1.01.003", lado: "HABER", formula: "DEPOSITO_TOTAL" },
    ],
  },
  {
    evento: "COBRO_ASIENTO",
    nombre: "Cobro a cliente de fabrica",
    movimientos: [
      { orden: 1, cuentaCodigo: "1.1.01.001", lado: "DEBE", formula: "CAJA_TOTAL" },
      { orden: 2, cuentaCodigo: "1.1.01.002", lado: "DEBE", formula: "CUENTA_TOTAL" },
      { orden: 3, cuentaCodigo: "1.1.01.004", lado: "DEBE", formula: "TARJETA_TOTAL" },
      { orden: 4, cuentaCodigo: "1.1.01.003", lado: "DEBE", formula: "CHEQUE_TERCERO_TOTAL" },
      { orden: 5, cuentaCodigo: "1.1.03.001", lado: "HABER", formula: "COBRO_TOTAL" },
    ],
  },
];

async function seedMonedas() {
  await db.insert(moneda).values(MONEDAS).onConflictDoNothing({ target: moneda.codigo });
  console.log(`  moneda: ${MONEDAS.length} filas (idempotente)`);
}

async function seedProvincias() {
  await db.insert(provincia).values(PROVINCIAS).onConflictDoNothing({ target: provincia.codigoAfip });
  console.log(`  provincia: ${PROVINCIAS.length} filas (idempotente)`);
}

async function seedCondicionesIva() {
  await db.insert(condicionIva).values(CONDICIONES_IVA).onConflictDoNothing({ target: condicionIva.codigoAfip });
  console.log(`  condicion_iva: ${CONDICIONES_IVA.length} filas (idempotente)`);
}

async function seedTiposDocumento() {
  await db.insert(tipoDocumento).values(TIPOS_DOCUMENTO).onConflictDoNothing({ target: tipoDocumento.codigoAfip });
  console.log(`  tipo_documento: ${TIPOS_DOCUMENTO.length} filas (idempotente)`);
}

async function seedCategoriasMonotributo() {
  await db.insert(categoriaMonotributo).values(CATEGORIAS_MONOTRIBUTO).onConflictDoNothing({ target: categoriaMonotributo.codigo });
  console.log(`  categoria_monotributo: ${CATEGORIAS_MONOTRIBUTO.length} filas (idempotente)`);
}

async function seedTiposComprobante() {
  await db.insert(tipoComprobante).values(TIPOS_COMPROBANTE).onConflictDoNothing({ target: tipoComprobante.codigo });
  console.log(`  tipo_comprobante: ${TIPOS_COMPROBANTE.length} filas (idempotente)`);
}

/** Idempotente por evento: si la plantilla ya existe no se duplica ni ella ni sus movimientos. */
async function seedModelosAsientoPlantilla() {
  for (const plantilla of MODELOS_ASIENTO_PLANTILLA) {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(modeloAsientoPlantilla)
        .values({ evento: plantilla.evento, nombre: plantilla.nombre })
        .onConflictDoNothing({ target: modeloAsientoPlantilla.evento })
        .returning();
      if (!row) return;
      await tx.insert(modeloAsientoPlantillaMovimiento).values(
        plantilla.movimientos.map((m) => ({
          plantillaId: row.id,
          orden: m.orden,
          cuentaCodigo: m.cuentaCodigo,
          lado: m.lado,
          formula: m.formula,
        })),
      );
    });
  }
  console.log(`  modelo_asiento_plantilla: ${MODELOS_ASIENTO_PLANTILLA.length} plantillas (idempotente)`);
}

async function main() {
  console.log("Cargando catalogos base...");
  await seedMonedas();
  await seedProvincias();
  await seedCondicionesIva();
  await seedTiposDocumento();
  await seedCategoriasMonotributo();
  await seedTiposComprobante();
  await seedModelosAsientoPlantilla();
  console.log("Listo.");
  await pool.end();
}

main().catch((error) => {
  console.error("Error cargando el seed:", error);
  process.exit(1);
});
