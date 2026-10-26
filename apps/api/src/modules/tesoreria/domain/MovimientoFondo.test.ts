import { describe, expect, it } from "vitest";
import { movimientoEsValido, type NuevoMovimientoFondo } from "./MovimientoFondo.js";

function buildMovimiento(overrides: Partial<NuevoMovimientoFondo> = {}): NuevoMovimientoFondo {
  return {
    fecha: new Date("2026-01-15"),
    tipo: "TRANSFERENCIA",
    cuentaOrigenTipo: "CAJA",
    cuentaOrigenId: "caja-1",
    cuentaDestinoTipo: "CUENTA_BANCARIA",
    cuentaDestinoId: "cuenta-1",
    importe: 1000,
    descripcion: "Deposito de caja a banco",
    ...overrides,
  };
}

describe("MovimientoFondo (dominio tesoreria) — movimientoEsValido", () => {
  it("acepta una TRANSFERENCIA con origen y destino", () => {
    expect(movimientoEsValido(buildMovimiento())).toBe(true);
  });

  it("rechaza una TRANSFERENCIA sin cuenta de origen", () => {
    const mov = buildMovimiento({ cuentaOrigenTipo: null, cuentaOrigenId: null });
    expect(movimientoEsValido(mov)).toBe(false);
  });

  it("rechaza una TRANSFERENCIA sin cuenta de destino", () => {
    const mov = buildMovimiento({ cuentaDestinoTipo: null, cuentaDestinoId: null });
    expect(movimientoEsValido(mov)).toBe(false);
  });

  it("acepta un AJUSTE que solo acredita (solo destino)", () => {
    const mov = buildMovimiento({ tipo: "AJUSTE", cuentaOrigenTipo: null, cuentaOrigenId: null });
    expect(movimientoEsValido(mov)).toBe(true);
  });

  it("acepta un AJUSTE que solo debita (solo origen)", () => {
    const mov = buildMovimiento({ tipo: "AJUSTE", cuentaDestinoTipo: null, cuentaDestinoId: null });
    expect(movimientoEsValido(mov)).toBe(true);
  });

  it("rechaza un AJUSTE sin origen ni destino", () => {
    const mov = buildMovimiento({
      tipo: "AJUSTE",
      cuentaOrigenTipo: null,
      cuentaOrigenId: null,
      cuentaDestinoTipo: null,
      cuentaDestinoId: null,
    });
    expect(movimientoEsValido(mov)).toBe(false);
  });

  it("rechaza un importe cero o negativo", () => {
    expect(movimientoEsValido(buildMovimiento({ importe: 0 }))).toBe(false);
    expect(movimientoEsValido(buildMovimiento({ importe: -100 }))).toBe(false);
  });
});
