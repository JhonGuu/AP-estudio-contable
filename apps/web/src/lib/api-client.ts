import { authStorage } from "./auth-storage";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** true en cualquier endpoint de un modulo de negocio (nota 06): agrega X-Empresa-Id. */
  conEmpresaActiva?: boolean;
}

/**
 * Cliente HTTP minimo del frontend. Agrega automaticamente Authorization
 * (si hay sesion) y X-Empresa-Id (si el endpoint lo pide y hay una empresa
 * activa elegida) — el selector de empresa de nota 06, seccion 5.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const accessToken = authStorage.getAccessToken();
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  if (options.conEmpresaActiva) {
    const empresaId = authStorage.getEmpresaActivaId();
    if (empresaId) headers["X-Empresa-Id"] = empresaId;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error?.message ?? `Error ${response.status}`;
    throw new ApiError(response.status, message, data?.error?.code);
  }

  return data as T;
}
