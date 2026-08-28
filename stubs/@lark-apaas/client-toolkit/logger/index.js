const noop = () => {};
export const logger = {
  info: console.info.bind(console),
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: noop,
  verbose: noop,
  child: () => logger,
};
export default logger;
