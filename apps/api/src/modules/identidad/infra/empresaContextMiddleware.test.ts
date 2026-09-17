import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { createEmpresaContextMiddleware } from "./empresaContextMiddleware.js";
import type { UsuarioEmpresaRepository, AccesoEmpresa } from "./UsuarioEmpresaRepository.js";
import { AppError } from "../../../shared/http/AppError.js";

function buildRepoMock(acceso: AccesoEmpresa | null): UsuarioEmpresaRepository {
  return {
    buscarAcceso: vi.fn().mockResolvedValue(acceso),
    asignar: vi.fn(),
    listarEmpresasDeUsuario: vi.fn(),
  } as unknown as UsuarioEmpresaRepository;
}

function buildReq(overrides: Partial<Request> = {}): Request {
  return {
    header: (name: string) => (overrides as Record<string, unknown>)[`__header_${name.toLowerCase()}`] as string | undefined,
    ...overrides,
  } as unknown as Request;
}

const TENANT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TENANT_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const EMPRESA_X = "cccccccc-cccc-cccc-cccc-cccccccccccc";

describe("empresaContextMiddleware (nota 06, seccion 3 — doble validacion)", () => {
  it("arma req.context cuando el acceso existe y el tenant coincide", async () => {
    const repo = buildRepoMock({ empresaId: EMPRESA_X, rol: "CONTADOR", empresaTenantId: TENANT_A });
    const middleware = createEmpresaContextMiddleware(repo);
    const req = buildReq({
      auth: { usuarioId: "u1", tenantId: TENANT_A, rolGlobal: "ASISTENTE" },
      "__header_x-empresa-id": EMPRESA_X,
    } as unknown as Partial<Request>);
    const next = vi.fn();

    await middleware(req, {} as Response, next);

    expect(req.context).toEqual({
      usuarioId: "u1",
      tenantId: TENANT_A,
      rolGlobal: "ASISTENTE",
      empresaId: EMPRESA_X,
      rol: "CONTADOR",
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it("rechaza con 403 si no existe (usuarioId, empresaId) en usuario_empresa", async () => {
    const repo = buildRepoMock(null);
    const middleware = createEmpresaContextMiddleware(repo);
    const req = buildReq({
      auth: { usuarioId: "u1", tenantId: TENANT_A, rolGlobal: "ASISTENTE" },
      "__header_x-empresa-id": EMPRESA_X,
    } as unknown as Partial<Request>);

    await expect(middleware(req, {} as Response, vi.fn())).rejects.toMatchObject({
      statusCode: 403,
    } satisfies Partial<AppError>);
  });

  it("rechaza con 403 si la empresa pertenece a OTRO tenant que el del JWT (nunca confiar en un solo campo)", async () => {
    // El usuario SI tiene un registro en usuario_empresa para esta empresa,
    // pero la empresa es de otro tenant — esto es exactamente el escenario
    // que la doble validacion existe para bloquear.
    const repo = buildRepoMock({ empresaId: EMPRESA_X, rol: "CONTADOR", empresaTenantId: TENANT_B });
    const middleware = createEmpresaContextMiddleware(repo);
    const req = buildReq({
      auth: { usuarioId: "u1", tenantId: TENANT_A, rolGlobal: "ASISTENTE" },
      "__header_x-empresa-id": EMPRESA_X,
    } as unknown as Partial<Request>);

    await expect(middleware(req, {} as Response, vi.fn())).rejects.toMatchObject({
      statusCode: 403,
    } satisfies Partial<AppError>);
  });

  it("rechaza con 400 si falta el header X-Empresa-Id", async () => {
    const repo = buildRepoMock(null);
    const middleware = createEmpresaContextMiddleware(repo);
    const req = buildReq({
      auth: { usuarioId: "u1", tenantId: TENANT_A, rolGlobal: "ASISTENTE" },
    } as unknown as Partial<Request>);

    await expect(middleware(req, {} as Response, vi.fn())).rejects.toMatchObject({
      statusCode: 400,
    } satisfies Partial<AppError>);
  });
});
