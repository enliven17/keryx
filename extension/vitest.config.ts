import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: { environment: "node" },
  resolve: {
    alias: { vscode: resolve(__dirname, "test/_stubs/vscode.ts") },
  },
});
