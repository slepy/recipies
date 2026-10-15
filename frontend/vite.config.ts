import { loadEnv } from "vite"
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "")

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: environment.API_PROXY_TARGET || "http://127.0.0.1:8010",
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test-setup.ts",
    },
  }
})