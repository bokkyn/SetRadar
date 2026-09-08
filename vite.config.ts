import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

export default defineConfig({
  root: "client",
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./client/src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "8443", 10),
    strictPort: true,
    proxy: {
      "/api/agent": "http://localhost:4000",
      "/api/city-lookalike": "http://localhost:4000",
      "/api/films-in-city": "http://localhost:4000",
      "/api/history-check": "http://localhost:4000",
      "/api": "http://localhost:3000",
    },
  },
  preview: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "8443", 10),
  },
})
