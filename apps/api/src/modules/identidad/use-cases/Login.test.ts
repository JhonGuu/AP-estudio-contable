import { describe, expect, it, vi } from "vitest";
import { Login } from "./Login.js";
import { AppError } from "../../../shared/http/AppError.js";
import { hashPassword } from "../../../shared/security/password.js";
import type { UsuarioRepository } from "../infra/UsuarioRepository.js";
import type { Usuario } from "../domain/Usuario.js";

async function buildUsuario(overrides: Partial<Usuario> = {}): Promise<Usuario> {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    tenantId: "22222222-2222-2222-2222-222222222222",
    email: "contador@estudio.test",
    passwordHash: await hashPassword("password-correcta"),
    nombre: "Ana",
    apellido: "Contadora",
    rolGlobal: "OWNER",
    estado: "ACTIVO",
    lastLoginAt: null,
    ...overrides,
  };
}

function buildRepoMock(usuario: Usuario | null): UsuarioRepository {
  return {
    buscarPorEmail: vi.fn().mockResolvedValue(usuario),
    marcarUltimoLogin: vi.fn().mockResolvedValue(undefined),
    crear: vi.fn(),
    buscarPorId: vi.fn(),
  } as unknown as UsuarioRepository;
}

describe("Login (modulo identidad)", () => {
  it("devuelve tokens y datos publicos del usuario ante credenciales correctas", async () => {
    const usuario = await buildUsuario();
    const repo = buildRepoMock(usuario);
    const login = new Login(repo);

    const result = await login.ejecutar({ email: usuario.email, password: "password-correcta" });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.usuario.email).toBe(usuario.email);
    expect((result.usuario as unknown as { passwordHash?: string }).passwordHash).toBeUndefined();
    expect(repo.marcarUltimoLogin).toHaveBeenCalledWith(usuario.id, expect.any(Date));
  });

  it("rechaza con 401 si el email no existe (mismo mensaje que password incorrecta)", async () => {
    const repo = buildRepoMock(null);
    const login = new Login(repo);

    await expect(login.ejecutar({ email: "nadie@test.com", password: "x" })).rejects.toMatchObject({
      statusCode: 401,
    } satisfies Partial<AppError>);
  });

  it("rechaza con 401 si la contrasena es incorrecta", async () => {
    const usuario = await buildUsuario();
    const repo = buildRepoMock(usuario);
    const login = new Login(repo);

    await expect(
      login.ejecutar({ email: usuario.email, password: "password-incorrecta" }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rechaza si el usuario no esta ACTIVO (ej. INVITADO_PENDIENTE)", async () => {
    const usuario = await buildUsuario({ estado: "INVITADO_PENDIENTE" });
    const repo = buildRepoMock(usuario);
    const login = new Login(repo);

    await expect(
      login.ejecutar({ email: usuario.email, password: "password-correcta" }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});
