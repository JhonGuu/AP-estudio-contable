/**
 * Persistencia minima de sesion en localStorage. El accessToken NUNCA lleva
 * empresaId (nota 06): la empresa activa se guarda aparte y viaja como header
 * X-Empresa-Id en cada request a un modulo de negocio (api-client.ts),
 * pudiendo cambiar sin volver a loguearse.
 */
const ACCESS_TOKEN_KEY = "ap.accessToken";
const REFRESH_TOKEN_KEY = "ap.refreshToken";
const EMPRESA_ACTIVA_KEY = "ap.empresaActivaId";

export const authStorage = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  getEmpresaActivaId: (): string | null => localStorage.getItem(EMPRESA_ACTIVA_KEY),

  setSession(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  setEmpresaActiva(empresaId: string): void {
    localStorage.setItem(EMPRESA_ACTIVA_KEY, empresaId);
  },

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(EMPRESA_ACTIVA_KEY);
  },
};
