/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_APP_ENV: 'dev' | 'prod';
  readonly VITE_ROBINHOOD_RPC_URL?: string;
}
