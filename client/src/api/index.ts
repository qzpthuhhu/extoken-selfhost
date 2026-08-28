import { api } from '@client/src/lib/axios';
import type { AxiosRequestConfig } from 'axios';

const ADMIN_FORBIDDEN_MESSAGE = '无操作权限，此功能仅对平台管理员开放';

// 轻量 logger（代替 @lark-apaas/client-toolkit/logger）
const logger = {
  error: (msg: string, detail?: unknown) => {
    // eslint-disable-next-line no-console
    console.error(`[extoken/api] ${msg}`, detail ?? '');
  },
  warn: (msg: string, detail?: unknown) => {
    // eslint-disable-next-line no-console
    console.warn(`[extoken/api] ${msg}`, detail ?? '');
  },
  info: (msg: string, detail?: unknown) => {
    // eslint-disable-next-line no-console
    console.info(`[extoken/api] ${msg}`, detail ?? '');
  },
};

export { logger };

import type {
  AdminOverviewResponse,
  MyAccountResponse,
  PackageDownloadResponse,
  AnnouncementListResponse,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
  CreateFeedbackRequest,
  MyFeedbackListResponse,
  AdminFeedbackListResponse,
  UpdateFeedbackRequest,
  RoadmapListResponse,
  CreateRoadmapRequest,
  UpdateRoadmapRequest,
  PublicConfigResponse,
  RotateApiKeyResponse,
} from '@shared/api.interface';

async function callApi<T>(cfg: AxiosRequestConfig): Promise<T> {
  try {
    const response = await api.request<T>(cfg);
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 403) {
      // 保留与原实现一致的 403 提示（调用方也可以自己抛）
    }
    throw error;
  }
}

export async function fetchMyAccount(): Promise<MyAccountResponse> {
  try {
    return await callApi<MyAccountResponse>({
      url: '/api/extoken/me',
      method: 'GET',
    });
  } catch (error) {
    logger.error('获取我的账户失败', String(error));
    throw error;
  }
}

export async function downloadPackage(
  packageId: string,
): Promise<PackageDownloadResponse> {
  try {
    return await callApi<PackageDownloadResponse>({
      url: `/api/extoken/package/${packageId}/download`,
      method: 'GET',
    });
  } catch (error) {
    logger.error('下载 extoken 包失败', String(error));
    throw error;
  }
}

export async function fetchExtokenSkill(): Promise<string> {
  try {
    const response = await api.request<string>({
      url: '/api/extoken/skill',
      method: 'GET',
      responseType: 'text',
    });
    return response.data;
  } catch (error) {
    logger.error('获取 extoken 技能说明失败', String(error));
    throw error;
  }
}

export async function rotateExtokenApiKey(): Promise<RotateApiKeyResponse> {
  try {
    return await callApi<RotateApiKeyResponse>({
      url: '/api/extoken/me/api-key/rotate',
      method: 'POST',
    });
  } catch (error) {
    logger.error('轮换 extoken API Key 失败', String(error));
    throw error;
  }
}

export async function fetchAdminOverview(): Promise<AdminOverviewResponse> {
  try {
    const resp = await api.get<AdminOverviewResponse>('/api/extoken/admin/overview');
    if (resp.status === 403) throw new Error(ADMIN_FORBIDDEN_MESSAGE);
    return resp.data;
  } catch (error) {
    logger.error('获取管理台概览失败', String(error));
    throw error;
  }
}

/* ============ 反馈与通知 ============ */

export async function fetchAnnouncements(): Promise<AnnouncementListResponse> {
  try {
    return await callApi<AnnouncementListResponse>({
      url: '/api/site/announcements',
      method: 'GET',
    });
  } catch (error) {
    logger.error('获取公告列表失败', String(error));
    throw error;
  }
}

export async function fetchPublicConfig(): Promise<PublicConfigResponse> {
  try {
    return await callApi<PublicConfigResponse>({
      url: '/api/site/public-config',
      method: 'GET',
    });
  } catch (error) {
    logger.error('获取公开配置失败', String(error));
    throw error;
  }
}

export async function submitFeedback(
  payload: CreateFeedbackRequest,
): Promise<{ id: string }> {
  try {
    return await callApi<{ id: string }>({
      url: '/api/site/feedback',
      method: 'POST',
      data: payload,
    });
  } catch (error) {
    logger.error('提交反馈失败', String(error));
    throw error;
  }
}

export async function fetchMyFeedback(): Promise<MyFeedbackListResponse> {
  try {
    return await callApi<MyFeedbackListResponse>({
      url: '/api/site/feedback/mine',
      method: 'GET',
    });
  } catch (error) {
    logger.error('获取我的反馈失败', String(error));
    throw error;
  }
}

/* ---- 管理台：反馈处理 ---- */

export async function fetchAdminFeedback(): Promise<AdminFeedbackListResponse> {
  try {
    const resp = await api.get<AdminFeedbackListResponse>('/api/site/admin/feedback');
    if (resp.status === 403) throw new Error(ADMIN_FORBIDDEN_MESSAGE);
    return resp.data;
  } catch (error) {
    logger.error('获取反馈列表失败', String(error));
    throw error;
  }
}

export async function updateFeedback(
  id: string,
  payload: UpdateFeedbackRequest,
): Promise<{ id: string }> {
  try {
    const resp = await api.patch<{ id: string }>(`/api/site/admin/feedback/${id}`, payload);
    if (resp.status === 403) throw new Error(ADMIN_FORBIDDEN_MESSAGE);
    return resp.data;
  } catch (error) {
    logger.error('更新反馈失败', String(error));
    throw error;
  }
}

/* ---- 管理台：公告 CRUD ---- */

export async function fetchAdminAnnouncements(): Promise<AnnouncementListResponse> {
  try {
    const resp = await api.get<AnnouncementListResponse>('/api/site/admin/announcements');
    if (resp.status === 403) throw new Error(ADMIN_FORBIDDEN_MESSAGE);
    return resp.data;
  } catch (error) {
    logger.error('获取公告管理列表失败', String(error));
    throw error;
  }
}

export async function createAnnouncement(
  payload: CreateAnnouncementRequest,
): Promise<{ id: string }> {
  try {
    const resp = await api.post<{ id: string }>('/api/site/admin/announcements', payload);
    if (resp.status === 403) throw new Error(ADMIN_FORBIDDEN_MESSAGE);
    return resp.data;
  } catch (error) {
    logger.error('发布公告失败', String(error));
    throw error;
  }
}

export async function updateAnnouncement(
  id: string,
  payload: UpdateAnnouncementRequest,
): Promise<{ id: string }> {
  try {
    const resp = await api.patch<{ id: string }>(`/api/site/admin/announcements/${id}`, payload);
    if (resp.status === 403) throw new Error(ADMIN_FORBIDDEN_MESSAGE);
    return resp.data;
  } catch (error) {
    logger.error('更新公告失败', String(error));
    throw error;
  }
}

export async function deleteAnnouncement(id: string): Promise<{ id: string }> {
  try {
    const resp = await api.delete<{ id: string }>(`/api/site/admin/announcements/${id}`);
    if (resp.status === 403) throw new Error(ADMIN_FORBIDDEN_MESSAGE);
    return resp.data;
  } catch (error) {
    logger.error('删除公告失败', String(error));
    throw error;
  }
}

/* ---- 管理台：路线图 CRUD ---- */

export async function fetchRoadmap(): Promise<RoadmapListResponse> {
  try {
    const resp = await api.get<RoadmapListResponse>('/api/site/admin/roadmap');
    if (resp.status === 403) throw new Error(ADMIN_FORBIDDEN_MESSAGE);
    return resp.data;
  } catch (error) {
    logger.error('获取路线图失败', String(error));
    throw error;
  }
}

export async function createRoadmapItem(
  payload: CreateRoadmapRequest,
): Promise<{ id: string }> {
  try {
    const resp = await api.post<{ id: string }>('/api/site/admin/roadmap', payload);
    if (resp.status === 403) throw new Error(ADMIN_FORBIDDEN_MESSAGE);
    return resp.data;
  } catch (error) {
    logger.error('创建路线图项失败', String(error));
    throw error;
  }
}

export async function updateRoadmapItem(
  id: string,
  payload: UpdateRoadmapRequest,
): Promise<{ id: string }> {
  try {
    const resp = await api.patch<{ id: string }>(`/api/site/admin/roadmap/${id}`, payload);
    if (resp.status === 403) throw new Error(ADMIN_FORBIDDEN_MESSAGE);
    return resp.data;
  } catch (error) {
    logger.error('更新路线图项失败', String(error));
    throw error;
  }
}

export async function deleteRoadmapItem(id: string): Promise<{ id: string }> {
  try {
    const resp = await api.delete<{ id: string }>(`/api/site/admin/roadmap/${id}`);
    if (resp.status === 403) throw new Error(ADMIN_FORBIDDEN_MESSAGE);
    return resp.data;
  } catch (error) {
    logger.error('删除路线图项失败', String(error));
    throw error;
  }
}
