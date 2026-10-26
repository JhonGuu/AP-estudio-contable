import { describe, expect, it } from "vitest";
import { puedeDepositarse, puedeTransicionar } from "./Cheque.js";

describe("Cheque (dominio tesoreria) — puedeTransicionar", () => {
  it("permite RECIBIDO -> DEPOSITADO (nota 22, seccion 4: flujo normal de deposito)", () => {
    expect(puedeTransicionar("RECIBIDO", "DEPOSITADO")).toBe(true);
  });

  it("permite DEPOSITADO -> COBRADO", () => {
    expect(puedeTransicionar("DEPOSITADO", "COBRADO")).toBe(true);
  });

  it("permite DEPOSITADO -> RECHAZADO (cheque rebotado en el banco)", () => {
    expect(puedeTransicionar("DEPOSITADO", "RECHAZADO")).toBe(true);
  });

  it("rechaza COBRAR un cheque RECHAZADO (estado terminal)", () => {
    expect(puedeTransicionar("RECHAZADO", "COBRADO")).toBe(false);
  });

  it("rechaza cualquier transicion desde un estado terminal (COBRADO, VENCIDO, CADUCADO, ANULADO)", () => {
    for (const terminal of ["COBRADO", "RECHAZADO", "VENCIDO", "CADUCADO", "ANULADO"] as const) {
      expect(puedeTransicionar(terminal, "DEPOSITADO")).toBe(false);
      expect(puedeTransicionar(terminal, "COBRADO")).toBe(false);
    }
  });

  it("rechaza RECIBIDO -> COBRADO directo (tiene que pasar por DEPOSITADO)", () => {
    expect(puedeTransicionar("RECIBIDO", "COBRADO")).toBe(false);
  });

  it("permite EMITIDO -> COBRADO (cheque propio que el banco debita)", () => {
    expect(puedeTransicionar("EMITIDO", "COBRADO")).toBe(true);
  });
});

describe("Cheque (dominio tesoreria) — puedeDepositarse", () => {
  it("acepta un cheque RECIBIDO en estado RECIBIDO", () => {
    expect(puedeDepositarse({ origen: "RECIBIDO", estado: "RECIBIDO" })).toBe(true);
  });

  it("rechaza un cheque EMITIDO (propio) aunque el estado coincida — solo RECIBIDO se deposita", () => {
    expect(puedeDepositarse({ origen: "EMITIDO", estado: "RECIBIDO" })).toBe(false);
  });

  it("rechaza un cheque RECIBIDO ya DEPOSITADO (no se deposita dos veces)", () => {
    expect(puedeDepositarse({ origen: "RECIBIDO", estado: "DEPOSITADO" })).toBe(false);
  });

  it("rechaza un cheque RECIBIDO y RECHAZADO", () => {
    expect(puedeDepositarse({ origen: "RECIBIDO", estado: "RECHAZADO" })).toBe(false);
  });
});
