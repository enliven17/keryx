// Minimal vscode stub for vitest. loopback.ts uses env.asExternalUri; config.ts
// uses workspace.getConfiguration. Settings return undefined here so config.ts
// falls back to env vars / defaults.
export const Uri = { parse: (s: string) => ({ toString: () => s }) };
export const env = { asExternalUri: async (u: { toString(): string }) => u };
export const workspace = {
  getConfiguration: (_section?: string) => ({
    get: <T>(_key: string): T | undefined => undefined,
  }),
};
