import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/signin';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export interface SignupData {
  username: string;
  password: string;
  name: string;
}

export interface SigninData {
  username: string;
  password: string;
}

export interface CreateRoomData {
  name: string;
}

export const authAPI = {
  signup: async (data: SignupData) => {
    const response = await apiClient.post('/api/auth/signup', data);
    return response.data;
  },

  signin: async (data: SigninData) => {
    const response = await apiClient.post('/api/auth/signin', data);
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/api/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get('/api/user/me');
    return response.data;
  },
};

export const roomAPI = {
  create: async (data: CreateRoomData) => {
    const response = await apiClient.post('/api/room', data);
    return response.data;
  },

  getBySlug: async (slug: string) => {
    const response = await apiClient.get(`/api/room/${slug}`);
    return response.data;
  },

  getAll: async () => {
    const response = await apiClient.get('/api/rooms');
    return response.data;
  },

  // Member management
  addMember: async (roomId: number, email: string, role: string = 'editor') => {
    const response = await apiClient.post(`/api/room/${roomId}/members`, { email, role });
    return response.data;
  },

  getMembers: async (roomId: number) => {
    const response = await apiClient.get(`/api/room/${roomId}/members`);
    return response.data;
  },
};

export const canvasAPI = {
  get: async (roomId: number) => {
    const response = await apiClient.get(`/api/canvas/${roomId}`);
    return response.data;
  },

  save: async (roomId: number, elements: any[], appState: any) => {
    const response = await apiClient.post(`/api/canvas/${roomId}/save`, {
      elements,
      appState,
    });
    return response.data;
  },
};

export const chatAPI = {
  getMessages: async (roomId: number) => {
    const response = await apiClient.get(`/api/chats/${roomId}`);
    return response.data;
  },
};

export default apiClient;
