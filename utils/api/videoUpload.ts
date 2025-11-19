import { HTTP_PROXY_PATH, VIDEO_UPLOAD, VIDEO_LIST, VIDEO_DELETE } from '@/constants';

export interface VideoUploadResponse {
  video_key: string;
  filename: string | null;
  content_type: string;
  size: number;
  uuid: string;
}

export interface VideoItem {
  video_key: string;
  filename: string | null;
  content_type: string;
  size: number;
  uuid: string;
  uploaded_at?: string | null;
}

export interface VideoListResponse {
  videos: VideoItem[];
}

export interface VideoDeleteResponse {
  message: string;
  video_key: string;
}

export interface VideoUploadError {
  detail: string;
}

export const uploadVideo = async (
  file: File,
  metadata?: string,
): Promise<VideoUploadResponse> => {
  try {
    if (!file.type || !file.type.startsWith('video/')) {
      throw new Error('File must be a video. Content type must start with "video/"');
    }

    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', metadata);
    }

    const uploadPath = `${HTTP_PROXY_PATH}${VIDEO_UPLOAD}`;

    const response = await fetch(uploadPath, {
      method: 'POST',
      body: formData,
    });

    const text = await response.text();
    let body: any = undefined;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      // ignore JSON parse error; fall back to text
    }

    if (!response.ok) {
      const serverMessage =
        body?.detail || body?.error || text || `HTTP ${response.status}`;
      throw new Error(serverMessage);
    }

    return body as VideoUploadResponse;
  } catch (error) {
    console.error('Error uploading video:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to upload video');
  }
};

export const listVideos = async (): Promise<VideoItem[]> => {
  try {
    const listPath = `${HTTP_PROXY_PATH}${VIDEO_LIST}`;

    const response = await fetch(listPath, {
      method: 'GET',
    });

    const text = await response.text();
    let body: any = undefined;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      // ignore JSON parse error; fall back to text
    }

    if (!response.ok) {
      const serverMessage =
        body?.detail || body?.error || text || `HTTP ${response.status}`;
      throw new Error(serverMessage);
    }

    const data = body as VideoListResponse;
    return data.videos || [];
  } catch (error) {
    console.error('Error listing videos:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to list videos');
  }
};

export const deleteVideo = async (videoKey: string): Promise<VideoDeleteResponse> => {
  try {
    const deletePath = `${HTTP_PROXY_PATH}${VIDEO_DELETE}/${videoKey}`;

    const response = await fetch(deletePath, {
      method: 'DELETE',
    });

    const text = await response.text();
    let body: any = undefined;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      // ignore JSON parse error; fall back to text
    }

    if (!response.ok) {
      const serverMessage =
        body?.detail || body?.error || text || `HTTP ${response.status}`;
      throw new Error(serverMessage);
    }

    return body as VideoDeleteResponse;
  } catch (error) {
    console.error('Error deleting video:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to delete video');
  }
};

