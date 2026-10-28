import { describe, expect, it } from "vitest";
import { calcularEstadoMonotributo } from "./PanelMonotributo.js";

describe("calcularEstadoMonotributo", () => {
  it("devuelve SIN_CATEGORIZAR si no hay tope (no se cargo categoria)", () => {
    expect(calcularEstadoMonotributo(5000, null)).toBe("SIN_CATEGORIZAR");
  });

  it("devuelve OK si la facturacion esta por debajo del umbral de alerta (80%)", () => {
    expect(calcularEstadoMonotributo(7000, 10000)).toBe("OK");
  });

  it("devuelve ALERTA si la facturacion llego al 80% del tope", () => {
    expect(calcularEstadoMonotributo(8000, 10000)).toBe("ALERTA");
  });

  it("devuelve ALERTA justo por debajo del 100%", () => {
    expect(calcularEstadoMonotributo(9999, 10000)).toBe("ALERTA");
  });

  it("devuelve ALERTA (no EXCEDIDO) si la facturacion es exactamente el tope", () => {
    expect(calcularEstadoMonotributo(10000, 10000)).toBe("ALERTA");
  });

  it("devuelve EXCEDIDO si la facturacion supera el tope", () => {
    expect(calcularEstadoMonotributo(10001, 10000)).toBe("EXCEDIDO");
  });
});
