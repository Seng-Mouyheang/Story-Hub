import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET;
  const proxy = apiProxyTarget
    ? {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      }
    : undefined;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy,
    },
  };
});
