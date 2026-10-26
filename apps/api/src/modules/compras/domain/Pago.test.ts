import { describe, expect, it } from "vitest";
import { aplicacionCoincideConTotal, mediosCoincidenConTotal, type NuevoPago } from "./Pago.js";

function buildPago(overrides: Partial<NuevoPago> = {}): NuevoPago {
  return {
    proveedorId: "prov-1",
    fecha: new Date("2026-01-15"),
    importeTotal: 1000,
    medios: [{ medio: "CAJA", importe: 1000 }],
    comprobantes: [{ comprobanteId: "cmp-1", importeAplicado: 1000 }],
    retenciones: [],
    ...overrides,
  };
}

describe("Pago (dominio compras) — mediosCoincidenConTotal", () => {
  it("acepta cuando la suma de medios iguala el total", () => {
    expect(mediosCoincidenConTotal(buildPago())).toBe(true);
  });

  it("acepta combinando varios medios (nota 08: mix de caja + cheque de tercero)", () => {
    const pago = buildPago({
      importeTotal: 1210,
      medios: [
        { medio: "CAJA", importe: 700 },
        { medio: "CHEQUE_TERCERO", importe: 510 },
      ],
    });
    expect(mediosCoincidenConTotal(pago)).toBe(true);
  });

  it("resta las retenciones del efectivo pagado (medios + retenciones == total)", () => {
    const pago = buildPago({
      importeTotal: 1000,
      medios: [{ medio: "CAJA", importe: 900 }],
      retenciones: [{ tipo: "IIBB", importe: 100 }],
    });
    expect(mediosCoincidenConTotal(pago)).toBe(true);
  });

  it("rechaza cuando los medios no alcanzan el total", () => {
    const pago = buildPago({ importeTotal: 1000, medios: [{ medio: "CAJA", importe: 900 }] });
    expect(mediosCoincidenConTotal(pago)).toBe(false);
  });

  it("rechaza cuando los medios exceden el total", () => {
    const pago = buildPago({ importeTotal: 1000, medios: [{ medio: "CAJA", importe: 1100 }] });
    expect(mediosCoincidenConTotal(pago)).toBe(false);
  });

  it("tolera diferencias de redondeo menores al epsilon (0.005)", () => {
    const pago = buildPago({ importeTotal: 1000, medios: [{ medio: "CAJA", importe: 1000.004 }] });
    expect(mediosCoincidenConTotal(pago)).toBe(true);
  });
});

describe("Pago (dominio compras) — aplicacionCoincideConTotal", () => {
  it("acepta cuando la aplicacion a comprobantes agota el total del pago", () => {
    expect(aplicacionCoincideConTotal(buildPago())).toBe(true);
  });

  it("acepta aplicacion parcial repartida entre varios comprobantes", () => {
    const pago = buildPago({
      importeTotal: 1000,
      comprobantes: [
        { comprobanteId: "cmp-1", importeAplicado: 600 },
        { comprobanteId: "cmp-2", importeAplicado: 400 },
      ],
    });
    expect(aplicacionCoincideConTotal(pago)).toBe(true);
  });

  it("rechaza si la aplicacion no agota el total del pago", () => {
    const pago = buildPago({
      importeTotal: 1000,
      comprobantes: [{ comprobanteId: "cmp-1", importeAplicado: 500 }],
    });
    expect(aplicacionCoincideConTotal(pago)).toBe(false);
  });
});
