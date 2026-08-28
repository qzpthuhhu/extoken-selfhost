// Selfhost stub — 妙搭 toolkit 的 services classes，私有化部署下返回空数据
import { logger } from '../logger/index.js';

const emptyObj = Promise.resolve({ data: null, error: null, success: true });
const emptyList = (extra = {}) => Promise.resolve({
  data: { items: [], total: 0, has_more: false, page_token: undefined, ...extra },
  error: null,
  success: true,
});

export class UserService {
  searchUsers(p) { logger.debug('[stub] UserService.searchUsers', p); return emptyList(); }
  listUsersByIds(ids) { logger.debug('[stub] UserService.listUsersByIds', ids); return Promise.resolve({ data: { items: [], users: {} }, error: null, success: true }); }
  convertExternalContact(ids) { return Promise.resolve({ data: { items: [] }, error: null, success: true }); }
  getCurrentUser() { return Promise.resolve({ data: null, error: null, success: true }); }
}

export class ChatService {
  searchChats(p) { logger.debug('[stub] ChatService.searchChats', p); return emptyList(); }
  listChatsByIds(ids) { return Promise.resolve({ data: { items: [], chats: {} }, error: null, success: true }); }
}

export class DepartmentService {
  searchDepartments(p) { logger.debug('[stub] DepartmentService.searchDepartments', p); return emptyList(); }
  getDepartmentTree() { return Promise.resolve({ data: { items: [] }, error: null, success: true }); }
}

export class StorageService {
  uploadFile(f) { return Promise.resolve({ data: { id: '', file_path: '', bucket_id: '', download_url: '' }, error: null, success: true }); }
  getFile(id) { return emptyObj; }
  getDownloadUrl(id) { return Promise.resolve({ data: { url: '' }, error: null, success: true }); }
  deleteFile(id) { return emptyObj; }
}

// 兼容之前的函数式 export
export const accountService = new UserService();
export const chatService = new ChatService();
export const departmentService = new DepartmentService();
export const storageService = new StorageService();

export class UserProfileData {
  constructor(opts) {}
  async search(p) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async get(...a) { return { data: null, error: null, success: true }; }
  async list(...a) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async update(...a) { return { data: null, error: null, success: true }; }
  async create(...a) { return { data: null, error: null, success: true }; }
  async delete(...a) { return { data: null, error: null, success: true }; }
  async batchGet(...a) { return { data: { items: [] }, error: null, success: true }; }
}


export class BatchGetUsersResponse {
  constructor(opts) {}
  async search(p) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async get(...a) { return { data: null, error: null, success: true }; }
  async list(...a) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async update(...a) { return { data: null, error: null, success: true }; }
  async create(...a) { return { data: null, error: null, success: true }; }
  async delete(...a) { return { data: null, error: null, success: true }; }
  async batchGet(...a) { return { data: { items: [] }, error: null, success: true }; }
}


export class SearchChatsResponse {
  constructor(opts) {}
  async search(p) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async get(...a) { return { data: null, error: null, success: true }; }
  async list(...a) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async update(...a) { return { data: null, error: null, success: true }; }
  async create(...a) { return { data: null, error: null, success: true }; }
  async delete(...a) { return { data: null, error: null, success: true }; }
  async batchGet(...a) { return { data: { items: [] }, error: null, success: true }; }
}


export class SearchDepartmentsParams {
  constructor(opts) {}
  async search(p) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async get(...a) { return { data: null, error: null, success: true }; }
  async list(...a) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async update(...a) { return { data: null, error: null, success: true }; }
  async create(...a) { return { data: null, error: null, success: true }; }
  async delete(...a) { return { data: null, error: null, success: true }; }
  async batchGet(...a) { return { data: { items: [] }, error: null, success: true }; }
}


export class SearchDepartmentsResponse {
  constructor(opts) {}
  async search(p) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async get(...a) { return { data: null, error: null, success: true }; }
  async list(...a) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async update(...a) { return { data: null, error: null, success: true }; }
  async create(...a) { return { data: null, error: null, success: true }; }
  async delete(...a) { return { data: null, error: null, success: true }; }
  async batchGet(...a) { return { data: { items: [] }, error: null, success: true }; }
}


export class BatchGetChatsResponse {
  constructor(opts) {}
  async search(p) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async get(...a) { return { data: null, error: null, success: true }; }
  async list(...a) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async update(...a) { return { data: null, error: null, success: true }; }
  async create(...a) { return { data: null, error: null, success: true }; }
  async delete(...a) { return { data: null, error: null, success: true }; }
  async batchGet(...a) { return { data: { items: [] }, error: null, success: true }; }
}


export class SearchUsersResponse {
  constructor(opts) {}
  async search(p) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async get(...a) { return { data: null, error: null, success: true }; }
  async list(...a) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async update(...a) { return { data: null, error: null, success: true }; }
  async create(...a) { return { data: null, error: null, success: true }; }
  async delete(...a) { return { data: null, error: null, success: true }; }
  async batchGet(...a) { return { data: { items: [] }, error: null, success: true }; }
}


export class SearchUsersParams {
  constructor(opts) {}
  async search(p) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async get(...a) { return { data: null, error: null, success: true }; }
  async list(...a) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async update(...a) { return { data: null, error: null, success: true }; }
  async create(...a) { return { data: null, error: null, success: true }; }
  async delete(...a) { return { data: null, error: null, success: true }; }
  async batchGet(...a) { return { data: { items: [] }, error: null, success: true }; }
}


export class ConvertExternalContactResponse {
  constructor(opts) {}
  async search(p) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async get(...a) { return { data: null, error: null, success: true }; }
  async list(...a) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async update(...a) { return { data: null, error: null, success: true }; }
  async create(...a) { return { data: null, error: null, success: true }; }
  async delete(...a) { return { data: null, error: null, success: true }; }
  async batchGet(...a) { return { data: { items: [] }, error: null, success: true }; }
}


export class SearchChatsParams {
  constructor(opts) {}
  async search(p) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async get(...a) { return { data: null, error: null, success: true }; }
  async list(...a) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async update(...a) { return { data: null, error: null, success: true }; }
  async create(...a) { return { data: null, error: null, success: true }; }
  async delete(...a) { return { data: null, error: null, success: true }; }
  async batchGet(...a) { return { data: { items: [] }, error: null, success: true }; }
}


export class UserProfileService {
  constructor(opts) {}
  async search(p) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async get(...a) { return { data: null, error: null, success: true }; }
  async list(...a) { return { data: { items: [], total: 0 }, error: null, success: true }; }
  async update(...a) { return { data: null, error: null, success: true }; }
  async create(...a) { return { data: null, error: null, success: true }; }
  async delete(...a) { return { data: null, error: null, success: true }; }
  async batchGet(...a) { return { data: { items: [] }, error: null, success: true }; }
}


export function getAssetsUrl(...args) { if (args.length) console.debug("[stub services] call getAssetsUrl", args.slice(0,2)); return args[0] ?? null; }
export const getAssetsUrlDefault = getAssetsUrl;

export default accountService;
