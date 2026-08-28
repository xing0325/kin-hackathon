import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

declare const process: { env: Record<string, string | undefined> };

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];

export default defineConfig({
  base: process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : "/",
  plugins: [react()],
  server: {
    port: 4174,
    proxy: { "/api": "http://127.0.0.1:8080" },
  },
  preview: { port: 4174 },
});
