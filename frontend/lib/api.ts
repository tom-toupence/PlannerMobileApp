import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
console.log('[API] Using backend URL:', API_URL);

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

async function apiRequest<T = any>(
  method: string,
  path: string,
  body?: any,
  isFormData = false,
): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'bypass-tunnel-reminder': 'true',
  };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `API error ${response.status}`);
    }

    const text = await response.text();
    if (!text) return {} as T;
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

function getMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    default: return 'image/jpeg';
  }
}

function getExtension(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return ext;
  return 'jpg';
}

export const api = {
  // Auth
  createProfileIfNeeded: (displayName?: string | null, avatarUrl?: string | null) =>
    apiRequest('POST', '/auth/profile', { display_name: displayName, avatar_url: avatarUrl }),

  // Profile
  getProfile: () => apiRequest('GET', '/profile'),
  updateProfile: (displayName: string) =>
    apiRequest('PATCH', '/profile', { display_name: displayName }),
  updateAvatar: (avatarUrl: string) =>
    apiRequest('PATCH', '/profile/avatar', { avatar_url: avatarUrl }),
  updateFavoriteGroup: (groupId: string | null) =>
    apiRequest('PATCH', '/profile/favorite-group', { default_group_id: groupId }),

  // Groups
  getGroups: () => apiRequest('GET', '/groups'),
  createGroup: (name: string, description?: string | null, color?: string) =>
    apiRequest('POST', '/groups', { name, description, color }),
  getGroup: (id: string) => apiRequest('GET', `/groups/${id}`),
  updateGroup: (id: string, data: { name?: string; description?: string; image_url?: string }) =>
    apiRequest('PATCH', `/groups/${id}`, data),

  // Members
  joinGroup: (groupId: string, color: string) =>
    apiRequest('POST', `/groups/${groupId}/join`, { color }),
  getMembers: (groupId: string) => apiRequest('GET', `/groups/${groupId}/members`),

  // Events
  getEvents: (groupId: string) => apiRequest('GET', `/groups/${groupId}/events`),
  createEvent: (groupId: string, event: {
    title: string;
    description?: string | null;
    location?: string | null;
    start_time: string;
    end_time?: string;
    all_day?: boolean;
  }) => apiRequest('POST', `/groups/${groupId}/events`, event),
  getEvent: (eventId: string) => apiRequest('GET', `/events/${eventId}`),
  updateEvent: (eventId: string, data: Record<string, any>) =>
    apiRequest('PATCH', `/events/${eventId}`, data),
  deleteEvent: (eventId: string) => apiRequest('DELETE', `/events/${eventId}`),

  // Messages
  getMessages: (groupId: string) => apiRequest('GET', `/groups/${groupId}/messages`),
  sendMessage: (groupId: string, content: string, imageUrl?: string | null) =>
    apiRequest('POST', `/groups/${groupId}/messages`, {
      content: content || (imageUrl ? 'Photo' : ''),
      image_url: imageUrl,
    }),

  // Upload
  upload: async (uri: string, folder: string = 'uploads'): Promise<string> => {
    const token = await getToken();
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: getMimeType(uri),
      name: `${Date.now()}.${getExtension(uri)}`,
    } as any);
    formData.append('folder', folder);

    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'bypass-tunnel-reminder': 'true' },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed: ${error}`);
    }

    const data = await response.json();
    return data.url;
  },
};
