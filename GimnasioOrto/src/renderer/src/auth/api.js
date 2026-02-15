import { clearSession, getAccessToken } from "./session";

export const API_BASE = "http://localhost:3000";

const REAUTH_CODES = new Set(["AUTH_REQUIRED", "TOKEN_EXPIRED", "INVALID_TOKEN"]);

export class ReauthRequiredError extends Error {
  constructor(message = "Tu sesion expiro. Debes volver a autenticarte.") {
    super(message);
    this.name = "ReauthRequiredError";
  }
}

const redirectToLogin = () => {
  if (window.location.hash !== "#/") {
    window.location.hash = "#/";
  }
};

const parseJsonSafe = async (resp) => {
  try {
    return await resp.clone().json();
  } catch {
    return null;
  }
};

export const apiFetch = async (path, options = {}) => {
  const token = getAccessToken();
  if (!token) {
    clearSession();
    redirectToLogin();
    throw new ReauthRequiredError();
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (resp.status === 401) {
    const body = await parseJsonSafe(resp);
    const code = String(body?.code || "");
    if (REAUTH_CODES.has(code) || !code) {
      clearSession();
      redirectToLogin();
      throw new ReauthRequiredError(body?.mensaje || undefined);
    }
  }

  return resp;
};
