// no default
export function resolveAppUrl(...args) { if (args.length) console.debug("[stub utils/resolveAppUrl] resolveAppUrl", args.slice(0,2)); return args[0] ?? null; };
export const resolveAppUrlDefault = resolveAppUrl;
