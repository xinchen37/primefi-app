import { encodeFunctionData } from 'viem';
import type { Call } from './service';

export const callKey = (call: Call) => call.address.toLowerCase() + ':' + encodeFunctionData(call);
type Result = { status: 'success'; result: unknown } | { status: 'failure'; error: Error };
export interface BatchTransport {
  multicall: (calls: Call[]) => Promise<readonly Result[]>;
  read: (call: Call) => Promise<unknown>;
}

/** One fixed-block reader per snapshot. Concurrent reads are explicitly grouped. */
export function batchReader(transport: BatchTransport, seed: Record<string, unknown> = {}, useMulticall = true) {
  const values = { ...seed };
  const pending = new Map<string, Promise<unknown>>();
  let queue: { call: Call; resolve: (v: unknown) => void; reject: (e: unknown) => void }[] = [];
  let scheduled = false;
  async function flush() {
    const work = queue; queue = []; scheduled = false;
    // Bound both aggregate size and fallback concurrency. No repeated fallback on revert.
    for (let offset = 0; offset < work.length; offset += 32) {
      const chunk = work.slice(offset, offset + 32);
      if (!useMulticall) {
        for (let start = 0; start < chunk.length; start += 4) {
          await Promise.all(chunk.slice(start, start + 4).map(async item => {
            try { item.resolve(await transport.read(item.call)); } catch (error) { item.reject(error); }
          }));
        }
        continue;
      }
      try {
        const results = await transport.multicall(chunk.map(item => item.call));
        if (results.length !== chunk.length) throw new Error('Incomplete Multicall response.');
        results.forEach((result, i) => result.status === 'success' ? chunk[i].resolve(result.result) : chunk[i].reject(result.error));
      } catch (error) { chunk.forEach(item => item.reject(error)); }
    }
  }
  function read(call: Call): Promise<unknown> {
    const key = callKey(call);
    if (Object.prototype.hasOwnProperty.call(values, key)) return Promise.resolve(values[key]);
    if (pending.has(key)) return pending.get(key)!;
    const result = new Promise<unknown>((resolve, reject) => {
      queue.push({ call, resolve, reject });
      if (!scheduled) { scheduled = true; setTimeout(() => void flush(), 0); }
    }).then(value => { values[key] = value; return value; });
    pending.set(key, result);
    return result;
  }
  return { read, values };
}
