import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({ mode }) => {
  // Vitest uses the dev configuration; deployable builds must select dev/prod explicitly.
  const environment = mode === 'test' ? 'dev' : mode;
  if (environment !== 'dev' && environment !== 'prod') throw new Error('Use --mode dev or --mode prod.');
  const env = loadEnv(environment, new URL('.', import.meta.url).pathname, 'VITE_');
  if (env.VITE_APP_ENV !== environment) {
    throw new Error(`VITE_APP_ENV must match --mode ${environment}. Check .env.${environment} and local overrides.`);
  }
  return {
    define: { 'import.meta.env.VITE_APP_ENV': JSON.stringify(env.VITE_APP_ENV) },
    resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
    plugins: [react(), tailwindcss()],
  };
});
