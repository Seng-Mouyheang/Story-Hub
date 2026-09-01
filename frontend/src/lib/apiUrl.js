const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "";

const normalizeApiBaseUrl = (value) => {
  const trimmedValue = String(value || "")
    .trim()
    .replace(/\/+$/, "");

  if (!trimmedValue) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
};

export const API_BASE_URL = normalizeApiBaseUrl(rawApiBaseUrl);

export const apiUrl = (path) => {
  if (!path || typeof path !== "string") {
    return path;
  }

  if (!path.startsWith("/api")) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
};

const getRequestAuthorizationHeader = (input, init) => {
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      return init.headers.get("Authorization");
    }

    if (Array.isArray(init.headers)) {
      const entry = init.headers.find(
        ([key]) => key.toLowerCase() === "authorization",
      );
      return entry ? entry[1] : null;
    }

    const entry = Object.entries(init.headers).find(
      ([key]) => key.toLowerCase() === "authorization",
    );
    return entry ? entry[1] : null;
  }

  if (input instanceof Request) {
    return input.headers.get("Authorization");
  }

  return null;
};

// Only these authMiddleware.js messages mean the token itself is bad. Other
// 401s (e.g. "Invalid credentials" on a password check) happen with a
// perfectly valid token and must not log the user out.
const SESSION_EXPIRED_MESSAGES = new Set([
  "Invalid or expired token",
  "Unauthorized",
  "Account is unavailable",
]);

const isSessionExpiredResponse = async (response) => {
  try {
    const payload = await response.clone().json();
    return SESSION_EXPIRED_MESSAGES.has(payload?.message);
  } catch {
    return false;
  }
};

const redirectToLoginOnSessionExpired = () => {
  if (
    globalThis.__storyHubSessionExpiredRedirect ||
    globalThis.location.pathname.startsWith("/login")
  ) {
    return;
  }

  globalThis.__storyHubSessionExpiredRedirect = true;

  localStorage.removeItem("token");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("rememberLogin");

  // Replace (not push) the current history entry so the browser's back
  // button cannot return to the protected page that triggered this redirect.
  globalThis.location.replace("/login");
};

export const installApiFetchBaseUrl = () => {
  if (globalThis.__storyHubApiFetchInstalled) {
    return;
  }

  const nativeFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input, init) => {
    const hasAuthHeader = Boolean(getRequestAuthorizationHeader(input, init));

    let response;
    if (typeof input === "string") {
      response = await nativeFetch(apiUrl(input), init);
    } else if (input instanceof URL) {
      const nextUrl =
        input.origin === globalThis.location.origin
          ? apiUrl(input.pathname)
          : input.href;

      response = await nativeFetch(nextUrl + input.search + input.hash, init);
    } else {
      response = await nativeFetch(input, init);
    }

    if (
      response.status === 401 &&
      hasAuthHeader &&
      (await isSessionExpiredResponse(response))
    ) {
      redirectToLoginOnSessionExpired();
    }

    return response;
  };

  globalThis.__storyHubApiFetchInstalled = true;
};
