const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "";

const normalizeApiBaseUrl = (value) => {
  const trimmedValue = String(value || "").trim().replace(/\/+$/, "");

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

export const installApiFetchBaseUrl = () => {
  if (!API_BASE_URL || globalThis.__storyHubApiFetchInstalled) {
    return;
  }

  const nativeFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (input, init) => {
    if (typeof input === "string") {
      return nativeFetch(apiUrl(input), init);
    }

    if (input instanceof URL) {
      const nextUrl =
        input.origin === globalThis.location.origin
          ? apiUrl(input.pathname)
          : input.href;

      return nativeFetch(nextUrl + input.search + input.hash, init);
    }

    return nativeFetch(input, init);
  };

  globalThis.__storyHubApiFetchInstalled = true;
};
