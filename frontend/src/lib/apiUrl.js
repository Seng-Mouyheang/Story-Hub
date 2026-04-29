const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "";

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");

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
  if (!API_BASE_URL || window.__storyHubApiFetchInstalled) {
    return;
  }

  const nativeFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    if (typeof input === "string") {
      return nativeFetch(apiUrl(input), init);
    }

    if (input instanceof URL) {
      const nextUrl =
        input.origin === window.location.origin
          ? apiUrl(input.pathname)
          : input.href;

      return nativeFetch(nextUrl + input.search + input.hash, init);
    }

    return nativeFetch(input, init);
  };

  window.__storyHubApiFetchInstalled = true;
};
