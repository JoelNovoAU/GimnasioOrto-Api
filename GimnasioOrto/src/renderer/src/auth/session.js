let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = String(token || "").trim() || null;
};

export const getAccessToken = () => accessToken;

export const saveUsuario = (usuario) => {
  localStorage.setItem("usuario", JSON.stringify(usuario || {}));
};

export const getUsuario = () => {
  try {
    const raw = localStorage.getItem("usuario");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  accessToken = null;
  localStorage.removeItem("usuario");
};

export const hasActiveSession = () => Boolean(accessToken && getUsuario());
