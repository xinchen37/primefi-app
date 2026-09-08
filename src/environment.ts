export type AppEnvironment = 'dev' | 'prod';

export function parseAppEnvironment(value: unknown): AppEnvironment {
  if (value !== 'dev' && value !== 'prod') throw new Error('VITE_APP_ENV must be dev or prod.');
  return value;
}

export const appEnvironment = parseAppEnvironment(import.meta.env.VITE_APP_ENV);
export const environmentChainIds = { dev: 46630, prod: 4663 } as const;
