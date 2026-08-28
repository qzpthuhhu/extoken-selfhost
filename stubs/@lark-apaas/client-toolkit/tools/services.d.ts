export type AccountType = 'apaas' | 'lark';

export interface I18nText {
  zh_cn: string;
  en_us?: string;
  ja_jp?: string;
}

export interface UserInfo {
  id?: string;
  userID?: string;
  user_id?: string;
  open_id?: string;
  larkUserID?: string;
  larkUserId?: string;
  name: I18nText;
  en_name?: string;
  nickname?: string;
  avatar?: any;
  avatar_url?: string;
  email?: string;
  phone?: string;
  userType?: '_employee' | '_externalUser' | '_anonymousUser';
  user_type?: '_employee' | '_externalUser' | '_anonymousUser';
  department?: unknown;
  department_ids?: string[];
  department_paths?: unknown;
  account_type?: AccountType;
  tenantName?: string;
  tenant_key?: string;
  status?: number;
}

export type SearchAvatar = {
  avatar?: string | {
    image?: {
      large?: string;
    };
  };
};

export interface DepartmentInfo {
  id?: string;
  departmentID: string;
  larkDepartmentID: string;
  name: I18nText;
  parent_id?: string;
  path?: string;
  member_count?: number;
}

export interface ChatInfo {
  id?: string;
  chatID: string;
  name: I18nText;
  avatar: string;
  avatar_url?: string;
  chat_mode?: string;
  description?: string;
  isExternal?: boolean;
  userCount?: number;
  member_count?: number;
  tenant_key?: string;
}

export interface SearchUsersParams {
  query?: string;
  keyword?: string;
  pageSize?: number;
  page_size?: number;
  pageToken?: string;
  page_token?: string;
  searchExternalContact?: boolean;
}

export interface SearchUsersResponse {
  data: {
    userList?: UserInfo[];
    items?: UserInfo[];
    total?: number;
    has_more?: boolean;
    page_token?: string;
  };
  error?: unknown;
  success?: boolean;
}

export interface BatchGetUsersResponse {
  data: {
    userInfoMap?: Record<string, UserInfo>;
    items?: UserInfo[];
    users?: Record<string, UserInfo>;
  };
  error?: unknown;
  success?: boolean;
}

export interface ConvertExternalContactResponse {
  data: {
    userInfo: UserInfo;
    items?: UserInfo[];
  };
  error?: unknown;
  success?: boolean;
}

export interface SearchChatsParams {
  query?: string;
  keyword?: string;
  pageSize?: number;
  page_size?: number;
  pageToken?: string;
  page_token?: string;
}

export interface SearchChatsResponse {
  data: {
    result?: {
      chatResult?: {
        items?: ChatInfo[];
      };
    };
    items?: ChatInfo[];
    total?: number;
  };
  error?: unknown;
  success?: boolean;
}

export interface BatchGetChatsResponse {
  data: {
    chatInfoMap?: Record<string, ChatInfo>;
    items?: ChatInfo[];
    chats?: Record<string, ChatInfo>;
  };
  error?: unknown;
  success?: boolean;
}

export interface SearchDepartmentsParams {
  query?: string;
  keyword?: string;
  pageSize?: number;
  page_size?: number;
  pageToken?: string;
  page_token?: string;
  parent_id?: string;
}

export interface SearchDepartmentsResponse {
  data: {
    departmentList?: DepartmentInfo[];
    items?: DepartmentInfo[];
    total?: number;
  };
  error?: unknown;
  success?: boolean;
}

export type UserProfileData =
  | {
      useLarkCard: false;
      userProfileInfo: {
        name?: string;
        avatar?: string;
        email?: string;
        userStatus: number;
        userType: '_employee' | '_externalUser';
      };
    }
  | {
      useLarkCard: true;
      larkCardParam: {
        needRedirect?: boolean;
        redirectURL?: string;
        larkAppID: string;
        jsAPITicket: string;
        larkOpenID: string;
        targetLarkOpenID: string;
      };
    };

export class UserService {
  constructor(opts?: unknown);
  searchUsers(params: SearchUsersParams): Promise<SearchUsersResponse>;
  listUsersByIds(ids: string[]): Promise<BatchGetUsersResponse>;
  convertExternalContact(id: string): Promise<ConvertExternalContactResponse>;
  getCurrentUser(): Promise<unknown>;
}

export class ChatService {
  constructor(opts?: unknown);
  searchChats(params: SearchChatsParams): Promise<SearchChatsResponse>;
  listChatsByIds(ids: string[]): Promise<BatchGetChatsResponse>;
}

export class DepartmentService {
  constructor(opts?: unknown);
  searchDepartments(params: SearchDepartmentsParams): Promise<SearchDepartmentsResponse>;
  getDepartmentTree(): Promise<unknown>;
}

export class StorageService {
  constructor(opts?: unknown);
  uploadFile(file: unknown): Promise<unknown>;
  getFile(id: string): Promise<unknown>;
  getDownloadUrl(id: string): Promise<unknown>;
  deleteFile(id: string): Promise<unknown>;
}

export class UserProfileService {
  constructor(opts?: unknown);
  getUserProfile(
    userId: string,
    accountType?: AccountType,
    signal?: AbortSignal,
  ): Promise<UserProfileData>;
}

export const accountService: UserService;
export const chatService: ChatService;
export const departmentService: DepartmentService;
export const storageService: StorageService;
export default accountService;

export function getAssetsUrl(path: string): string;
