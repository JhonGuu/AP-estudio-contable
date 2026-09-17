import "dotenv/config";
import { db, pool } from "../../shared/db/client.js";
import { moneda, provincia, condicionIva, tipoDocumento } from "../../modules/catalogos/infra/schema.js";

/**
 * Seed reproducible de catalogos globales (nota 25, seccion 3): "estos datos
 * hacen falta en cada entorno nuevo (desarrollo, testing, produccion)".
 * Idempotente: se puede correr las veces que haga falta (onConflictDoNothing
 * sobre la clave unica de cada catalogo).
 *
 * Lo que falta a proposito (nota 25, seccion 3, y nota 25 seccion 4 "orden de
 * construccion"): tipo_comprobante/tipo_afip (modulo fiscal), modelo_asiento_plantilla
 * (modulo contabilidad), convenios/categorias (modulo sueldos) — se agregan a
 * este seed cuando esos modulos existan, no antes.
 *
 * IMPORTANTE: los codigos de provincia y de condicion_iva de abajo siguen la
 * codificacion estandar que publica AFIP, pero no fueron verificados contra
 * la tabla oficial vigente al momento de usarlos en produccion — antes de la
 * primera facturacion electronica real, contrastar contra
 * https://www.afip.gob.ar (padron / condicion IVA receptor, tabla de provincias).
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

async function main() {
  console.log("Cargando catalogos base...");
  await seedMonedas();
  await seedProvincias();
  await seedCondicionesIva();
  await seedTiposDocumento();
  console.log("Listo.");
  await pool.end();
}

main().catch((error) => {
  console.error("Error cargando el seed:", error);
  process.exit(1);
});
