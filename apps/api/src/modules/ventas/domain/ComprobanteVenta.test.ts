import { describe, expect, it } from "vitest";
import {
  puedeConfirmarse,
  sumaImpuestoPorTipo,
  totalesCoinciden,
  type NuevoComprobanteVenta,
} from "./ComprobanteVenta.js";

function buildComprobante(overrides: Partial<NuevoComprobanteVenta> = {}): NuevoComprobanteVenta {
  return {
    clienteId: "cli-1",
    tipoComprobanteId: "tipo-1",
    puntoVentaId: "pv-1",
    fecha: new Date("2026-01-15"),
    rubro: 1,
    netoTotal: 2000,
    exentoTotal: 0,
    noGravadoTotal: 0,
    importeTotal: 2420,
    items: [],
    impuestos: [{ tipo: "IVA", importe: 420 }],
    cuotas: [],
    ...overrides,
  };
}

describe("ComprobanteVenta (dominio, espejo de ComprobanteCompra) — totalesCoinciden", () => {
  it("acepta cuando neto + exento + no gravado + impuestos == total", () => {
    expect(totalesCoinciden(buildComprobante())).toBe(true);
  });

  it("rechaza cuando el total no cierra", () => {
    const cmp = buildComprobante({ importeTotal: 3000 });
    expect(totalesCoinciden(cmp)).toBe(false);
  });

  it("acepta comprobantes en cuotas: las cuotas no alteran la validacion de totales (no alimentan el asiento)", () => {
    const cmp = buildComprobante({
      cuotas: [
        { numero: 1, fecha: new Date("2026-02-15"), importe: 1210, capital: 1000, interes: 210 },
        { numero: 2, fecha: new Date("2026-03-15"), importe: 1210, capital: 1000, interes: 210 },
      ],
    });
    expect(totalesCoinciden(cmp)).toBe(true);
  });
});

describe("ComprobanteVenta (dominio) — sumaImpuestoPorTipo", () => {
  it("suma solo los impuestos del tipo pedido", () => {
    const impuestos = [
      { tipo: "IVA" as const, importe: 420 },
      { tipo: "IIBB" as const, importe: 60 },
      { tipo: "IIBB" as const, importe: 15 },
    ];
    expect(sumaImpuestoPorTipo(impuestos, "IIBB")).toBe(75);
    expect(sumaImpuestoPorTipo(impuestos, "IVA")).toBe(420);
  });
});

describe("ComprobanteVenta (dominio) — puedeConfirmarse", () => {
  it("permite confirmar solo comprobantes en BORRADOR", () => {
    expect(puedeConfirmarse({ estado: "BORRADOR" })).toBe(true);
    expect(puedeConfirmarse({ estado: "CONFIRMADO" })).toBe(false);
    expect(puedeConfirmarse({ estado: "ANULADO" })).toBe(false);
  });
});
