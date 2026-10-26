import { describe, expect, it } from "vitest";
import {
  puedeConfirmarse,
  sumaImpuestoPorTipo,
  totalesCoinciden,
  type NuevoComprobanteCompra,
} from "./ComprobanteCompra.js";

function buildComprobante(overrides: Partial<NuevoComprobanteCompra> = {}): NuevoComprobanteCompra {
  return {
    proveedorId: "prov-1",
    tipoComprobanteId: "tipo-1",
    puntoVentaId: "pv-1",
    fecha: new Date("2026-01-15"),
    rubro: 1,
    netoTotal: 1000,
    exentoTotal: 0,
    noGravadoTotal: 0,
    importeTotal: 1210,
    items: [],
    impuestos: [{ tipo: "IVA", importe: 210 }],
    ...overrides,
  };
}

describe("ComprobanteCompra (dominio) — totalesCoinciden", () => {
  it("acepta cuando neto + exento + no gravado + impuestos == total", () => {
    expect(totalesCoinciden(buildComprobante())).toBe(true);
  });

  it("acepta combinando varios tipos de impuesto (IVA + IIBB + OTROS)", () => {
    const cmp = buildComprobante({
      netoTotal: 1000,
      importeTotal: 1250,
      impuestos: [
        { tipo: "IVA", importe: 210 },
        { tipo: "IIBB", importe: 30 },
        { tipo: "OTROS", importe: 10 },
      ],
    });
    expect(totalesCoinciden(cmp)).toBe(true);
  });

  it("acepta comprobantes con exento y no gravado ademas del neto", () => {
    const cmp = buildComprobante({
      netoTotal: 500,
      exentoTotal: 200,
      noGravadoTotal: 100,
      impuestos: [{ tipo: "IVA", importe: 105 }],
      importeTotal: 905,
    });
    expect(totalesCoinciden(cmp)).toBe(true);
  });

  it("rechaza cuando el total no cierra (nota 08: se rechaza sin grabar nada)", () => {
    const cmp = buildComprobante({ importeTotal: 1300 });
    expect(totalesCoinciden(cmp)).toBe(false);
  });
});

describe("ComprobanteCompra (dominio) — sumaImpuestoPorTipo", () => {
  it("suma solo los impuestos del tipo pedido", () => {
    const impuestos = [
      { tipo: "IVA" as const, importe: 210 },
      { tipo: "IVA" as const, importe: 50 },
      { tipo: "IIBB" as const, importe: 30 },
    ];
    expect(sumaImpuestoPorTipo(impuestos, "IVA")).toBe(260);
    expect(sumaImpuestoPorTipo(impuestos, "IIBB")).toBe(30);
    expect(sumaImpuestoPorTipo(impuestos, "OTROS")).toBe(0);
  });
});

describe("ComprobanteCompra (dominio) — puedeConfirmarse", () => {
  it("permite confirmar solo comprobantes en BORRADOR", () => {
    expect(puedeConfirmarse({ estado: "BORRADOR" })).toBe(true);
    expect(puedeConfirmarse({ estado: "CONFIRMADO" })).toBe(false);
    expect(puedeConfirmarse({ estado: "ANULADO" })).toBe(false);
  });
});
