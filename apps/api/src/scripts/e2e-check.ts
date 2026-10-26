import "reflect-metadata";
import { buildContainer } from "../container.js";
import { CrearTenant } from "../modules/identidad/use-cases/CrearTenant.js";
import { CrearEmpresa } from "../modules/identidad/use-cases/CrearEmpresa.js";
import { CrearPuntoVenta } from "../modules/comprobantes/use-cases/CrearPuntoVenta.js";
import { RegistrarProveedor } from "../modules/compras/use-cases/RegistrarProveedor.js";
import { RegistrarComprobanteCompra } from "../modules/compras/use-cases/RegistrarComprobanteCompra.js";
import { ConfirmarComprobanteCompra } from "../modules/compras/use-cases/ConfirmarComprobanteCompra.js";
import { RegistrarPagoCompra } from "../modules/compras/use-cases/RegistrarPagoCompra.js";
import { RegistrarCliente } from "../modules/ventas/use-cases/RegistrarCliente.js";
import { RegistrarComprobanteVenta } from "../modules/ventas/use-cases/RegistrarComprobanteVenta.js";
import { ConfirmarComprobanteVenta } from "../modules/ventas/use-cases/ConfirmarComprobanteVenta.js";
import { RegistrarCobroVenta } from "../modules/ventas/use-cases/RegistrarCobroVenta.js";
import { db } from "../shared/db/client.js";
import { sql } from "drizzle-orm";
import type { EmpresaContext } from "../shared/http/requestContext.js";

async function condicionIvaId(nombre: string): Promise<string> {
  const rows = await db.execute(sql`SELECT id FROM condicion_iva WHERE nombre = ${nombre} LIMIT 1`);
  const row = rows.rows[0] as { id: string } | undefined;
  if (!row) throw new Error(`condicion_iva ${nombre} no encontrada`);
  return row.id;
}

async function provinciaId(nombre: string): Promise<string> {
  const rows = await db.execute(sql`SELECT id FROM provincia WHERE nombre = ${nombre} LIMIT 1`);
  const row = rows.rows[0] as { id: string } | undefined;
  if (!row) throw new Error(`provincia ${nombre} no encontrada`);
  return row.id;
}

async function monedaId(codigo: string): Promise<string> {
  const rows = await db.execute(sql`SELECT id FROM moneda WHERE codigo = ${codigo} LIMIT 1`);
  const row = rows.rows[0] as { id: string } | undefined;
  if (!row) throw new Error(`moneda ${codigo} no encontrada`);
  return row.id;
}

async function tipoComprobanteId(codigo: string): Promise<string> {
  const rows = await db.execute(sql`SELECT id FROM tipo_comprobante WHERE codigo = ${codigo} LIMIT 1`);
  const row = rows.rows[0] as { id: string } | undefined;
  if (!row) throw new Error(`tipo_comprobante ${codigo} no encontrada`);
  return row.id;
}

async function asientoDe(origenTipo: string, origenId: string) {
  const rows = await db.execute(
    sql`SELECT a.id, a.leyenda FROM asiento a WHERE a.comprobante_origen_tipo = ${origenTipo} AND a.comprobante_origen_id = ${origenId} LIMIT 1`,
  );
  const row = rows.rows[0] as { id: string; leyenda: string } | undefined;
  if (!row) throw new Error(`No se genero asiento para origen ${origenTipo}/${origenId}`);
  const movs = await db.execute(
    sql`SELECT lado, importe FROM asiento_movimiento WHERE asiento_id = ${row.id}`,
  );
  let debe = 0;
  let haber = 0;
  for (const m of movs.rows as { lado: string; importe: string }[]) {
    if (m.lado === "DEBE") debe += Number(m.importe);
    else haber += Number(m.importe);
  }
  return { id: row.id, leyenda: row.leyenda, debe, haber, movimientos: movs.rows.length };
}

async function main() {
  const container = buildContainer();
  const suf = Date.now().toString().slice(-8);

  console.log("--- CrearTenant ---");
  const { tenant, owner } = await container.get(CrearTenant).ejecutar({
    razonSocial: `E2E Estudio ${suf}`,
    cuit: `20${suf}001`,
    emailContacto: `e2e-${suf}@example.com`,
    ownerNombre: "E2E",
    ownerApellido: "Test",
    ownerPassword: "Password123!",
  });
  console.log("tenant:", tenant.id, "owner:", owner.id);

  const auth = { usuarioId: owner.id, tenantId: tenant.id, rolGlobal: "OWNER" as const };

  console.log("--- CrearEmpresa (dispara ActivarModelosAsientoDeFabrica) ---");
  const empresa = await container.get(CrearEmpresa).ejecutar(auth, {
    razonSocial: `E2E Empresa ${suf}`,
    cuit: `30${suf}002`,
    condicionIvaId: await condicionIvaId("IVA Responsable Inscripto"),
    domicilioFiscal: "Calle Falsa 123",
    provinciaId: await provinciaId("San Juan"),
    actividadAfip: "620100",
    monedaBaseId: await monedaId("ARS"),
    cierreEjercicio: "12-31",
  });
  console.log("empresa:", empresa.id);

  const ctx: EmpresaContext = {
    usuarioId: owner.id,
    tenantId: tenant.id,
    empresaId: empresa.id,
    rolGlobal: "OWNER",
    rol: "OWNER",
  };

  console.log("--- CrearPuntoVenta ---");
  const puntoVenta = await container.get(CrearPuntoVenta).ejecutar(ctx, { numero: 1, nombre: "Casa Central" });
  console.log("puntoVenta:", puntoVenta.id);

  const tipoFA = await tipoComprobanteId("FA");

  // ===================== COMPRAS =====================
  console.log("--- RegistrarProveedor ---");
  const proveedor = await container.get(RegistrarProveedor).ejecutar(ctx, {
    razonSocial: "Proveedor E2E SA",
    cuit: `20${suf}003`,
    condicionIvaId: await condicionIvaId("IVA Responsable Inscripto"),
  });

  console.log("--- RegistrarComprobanteCompra ---");
  const compraComprobante = await container.get(RegistrarComprobanteCompra).ejecutar(ctx, {
    proveedorId: proveedor.id,
    tipoComprobanteId: tipoFA,
    puntoVentaId: puntoVenta.id,
    fecha: new Date(),
    rubro: 1,
    netoTotal: 1000,
    exentoTotal: 0,
    noGravadoTotal: 0,
    importeTotal: 1210,
    items: [{ descripcion: "Mercaderia", cantidad: 1, precioUnitario: 1000, alicuotaIva: 21 }],
    impuestos: [{ tipo: "IVA", importe: 210 }],
  });
  console.log("compra comprobante:", compraComprobante.id, "saldoPendiente:", compraComprobante.saldoPendiente);

  console.log("--- ConfirmarComprobanteCompra ---");
  await container.get(ConfirmarComprobanteCompra).ejecutar(ctx, compraComprobante.id);
  const asientoCompra = await asientoDe("compra", compraComprobante.id);
  console.log("asiento ASIENTO_COMPRA:", asientoCompra);
  if (Math.abs(asientoCompra.debe - asientoCompra.haber) > 0.005) {
    throw new Error(`ASIENTO_COMPRA desbalanceado: debe=${asientoCompra.debe} haber=${asientoCompra.haber}`);
  }

  console.log("--- RegistrarPagoCompra (mix CAJA + CHEQUE_TERCERO, antes se perdia) ---");
  const pago = await container.get(RegistrarPagoCompra).ejecutar(ctx, {
    proveedorId: proveedor.id,
    fecha: new Date(),
    importeTotal: 1210,
    medios: [
      { medio: "CAJA", importe: 700 },
      { medio: "CHEQUE_TERCERO", importe: 510 },
    ],
    comprobantes: [{ comprobanteId: compraComprobante.id, importeAplicado: 1210 }],
  });
  console.log("pago:", pago.id);
  const asientoPago = await asientoDe("pago", pago.id);
  console.log("asiento PAGO_ASIENTO:", asientoPago);
  if (Math.abs(asientoPago.debe - asientoPago.haber) > 0.005) {
    throw new Error(`PAGO_ASIENTO desbalanceado: debe=${asientoPago.debe} haber=${asientoPago.haber}`);
  }

  // ===================== VENTAS =====================
  console.log("--- RegistrarCliente ---");
  const cliente = await container.get(RegistrarCliente).ejecutar(ctx, {
    razonSocial: "Cliente E2E SA",
    cuit: `20${suf}004`,
    condicionIvaId: await condicionIvaId("Consumidor Final"),
  });

  console.log("--- RegistrarComprobanteVenta ---");
  const ventaComprobante = await container.get(RegistrarComprobanteVenta).ejecutar(ctx, {
    clienteId: cliente.id,
    tipoComprobanteId: tipoFA,
    puntoVentaId: puntoVenta.id,
    fecha: new Date(),
    rubro: 1,
    netoTotal: 2000,
    exentoTotal: 0,
    noGravadoTotal: 0,
    importeTotal: 2420,
    items: [{ descripcion: "Producto", cantidad: 2, precioUnitario: 1000, alicuotaIva: 21 }],
    impuestos: [{ tipo: "IVA", importe: 420 }],
    cuotas: [],
  } as any);
  console.log("venta comprobante:", ventaComprobante.id, "saldoPendiente:", ventaComprobante.saldoPendiente);

  console.log("--- ConfirmarComprobanteVenta ---");
  await container.get(ConfirmarComprobanteVenta).ejecutar(ctx, ventaComprobante.id);
  const asientoVenta = await asientoDe("venta", ventaComprobante.id);
  console.log("asiento ASIENTO_VENTA:", asientoVenta);
  if (Math.abs(asientoVenta.debe - asientoVenta.haber) > 0.005) {
    throw new Error(`ASIENTO_VENTA desbalanceado: debe=${asientoVenta.debe} haber=${asientoVenta.haber}`);
  }

  console.log("--- RegistrarCobroVenta (mix TARJETA + CHEQUE_TERCERO, antes se perdia) ---");
  const cobro = await container.get(RegistrarCobroVenta).ejecutar(ctx, {
    clienteId: cliente.id,
    fecha: new Date(),
    importeTotal: 2420,
    medios: [
      { medio: "TARJETA", importe: 1500 },
      { medio: "CHEQUE_TERCERO", importe: 920 },
    ],
    comprobantes: [{ comprobanteId: ventaComprobante.id, importeAplicado: 2420 }],
  } as any);
  console.log("cobro:", cobro.id);
  const asientoCobro = await asientoDe("cobro", cobro.id);
  console.log("asiento COBRO_ASIENTO:", asientoCobro);
  if (Math.abs(asientoCobro.debe - asientoCobro.haber) > 0.005) {
    throw new Error(`COBRO_ASIENTO desbalanceado: debe=${asientoCobro.debe} haber=${asientoCobro.haber}`);
  }

  console.log("\n=== TODO OK: 4 asientos generados y balanceados (compra, pago, venta, cobro) ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("E2E FALLO:", err);
  process.exit(1);
});
