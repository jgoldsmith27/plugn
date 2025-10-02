import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/ingest": "http://localhost:8000",
      "/profile": "http://localhost:8000",
      "/suggestions": "http://localhost:8000",
      "/rules": "http://localhost:8000",
      "/query": "http://localhost:8000"
    }
  }
});
