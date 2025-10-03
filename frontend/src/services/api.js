import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Get authorization header with current user's token
 */
async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Generic API request handler
 */
async function apiRequest(endpoint, options = {}) {
  const headers = await getAuthHeader();
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'API request failed');
  }

  return data;
}

// Upload Sessions API
export const uploadSessionsApi = {
  create: () => apiRequest('/api/upload-session/create', { method: 'POST' }),
  
  upload: async (sessionId, file, fileIndex) => {
    const headers = await getAuthHeader();
    delete headers['Content-Type']; // Let browser set it for FormData
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileIndex', fileIndex);
    
    const response = await fetch(`${API_URL}/api/upload-session/${sessionId}/upload`, {
      method: 'POST',
      headers: { 'Authorization': headers['Authorization'] },
      body: formData,
    });
    
    return response.json();
  },
  
  analyze: (sessionId, options = {}) => 
    apiRequest(`/api/upload-session/${sessionId}/analyze`, {
      method: 'POST',
      body: JSON.stringify(options),
    }),
  
  getStatus: (sessionId) => 
    apiRequest(`/api/upload-session/${sessionId}/status`),
  
  review: (sessionId, data) => 
    apiRequest(`/api/upload-session/${sessionId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// Templates API
export const templatesApi = {
  create: (data) => apiRequest('/api/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/templates${query ? `?${query}` : ''}`);
  },
  
  getById: (templateId) => apiRequest(`/api/templates/${templateId}`),
  
  update: (templateId, data) => apiRequest(`/api/templates/${templateId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: (templateId) => apiRequest(`/api/templates/${templateId}`, {
    method: 'DELETE',
  }),
};

// Documents API
export const documentsApi = {
  generate: (data) => apiRequest('/api/documents/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/documents${query ? `?${query}` : ''}`);
  },
  
  getById: (documentId) => apiRequest(`/api/documents/${documentId}`),
  
  getDownloadUrl: (documentId) => `${API_URL}/api/documents/${documentId}/download`,
  
  regenerate: (documentId, data) => apiRequest(`/api/documents/${documentId}/regenerate`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: (documentId) => apiRequest(`/api/documents/${documentId}`, {
    method: 'DELETE',
  }),
};

// Form Assistance API
export const formAssistApi = {
  getHelp: (data) => apiRequest('/api/form-assist', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

