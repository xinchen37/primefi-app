import { expect, it } from 'vitest';
import { appEnvironment, parseAppEnvironment } from './environment';
import { getLendingConfig } from './lending/config';
import { robinhood } from './network';

it('loads dev environment for tests and uses it for both network and contracts', () => {
  expect(appEnvironment).toBe('dev');
  expect(robinhood.id).toBe(46630);
  expect(getLendingConfig(robinhood.id).chainId).toBe(robinhood.id);
});
it('rejects missing/invalid environment identifiers', () => {
  for (const value of [undefined, '', 'test', 'staging']) expect(() => parseAppEnvironment(value)).toThrow('VITE_APP_ENV');
  expect(parseAppEnvironment('prod')).toBe('prod');
});
it('never falls back to dev contracts in prod', () => {
  expect(() => getLendingConfig(46630, 'prod')).toThrow('No lending deployment');
  expect(() => getLendingConfig(4663, 'prod')).toThrow('No lending deployment');
  expect(() => getLendingConfig(4663, 'dev')).toThrow('No lending deployment');
});
