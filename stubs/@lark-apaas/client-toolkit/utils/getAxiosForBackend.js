// no default
export function axiosForBackend(...args) { if (args.length) console.debug("[stub utils/getAxiosForBackend] axiosForBackend", args.slice(0,2)); return args[0] ?? null; };
export const axiosForBackendDefault = axiosForBackend;
