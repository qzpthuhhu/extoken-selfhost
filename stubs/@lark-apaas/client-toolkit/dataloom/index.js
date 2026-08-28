import { logger } from '../logger/index.js';

function makeBucket(bucketId) {
  return new Proxy({}, {
    get(t, k) {
      if (k === 'uploadFile') return async (file) => ({ data: { id: 'local-' + Date.now(), file_path: '', bucket_id: bucketId, download_url: '' }, error: null });
      if (k === 'deleteFile') return async (id) => ({ data: null, error: null });
      if (k === 'getFile') return async (id) => ({ data: { id, file_path: '', bucket_id: bucketId, download_url: '' }, error: null });
      return undefined;
    }
  });
}

export function getDataloom() {
  return Promise.resolve(new Proxy({}, {
    get(t, k) {
      if (k === 'storage') return new Proxy({}, { get: (tt, bb) => makeBucket(String(bb)) });
      if (k === 'then') return undefined;
      if (typeof k === 'string' && !k.startsWith('_')) {
        return async (...args) => { logger.debug(`[stub] dataloom.${String(k)}`, args.slice(0,2)); return { items: [], total: 0, has_more: false }; };
      }
      return undefined;
    }
  }));
}
export default getDataloom;
