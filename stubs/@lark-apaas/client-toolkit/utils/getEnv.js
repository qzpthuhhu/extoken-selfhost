// no default
export function getEnv(...args) { if (args.length) console.debug("[stub utils/getEnv] getEnv", args.slice(0,2)); return args[0] ?? null; };
export const getEnvDefault = getEnv;
