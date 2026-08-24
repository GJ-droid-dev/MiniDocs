/**
 * MiniDocs API Client Wrapper
 * Attaches X-User-Id header to requests and standardizes responses.
 */

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`
  : '/api';

function getAuthHeaders(isMultipart = false) {
  const userId = localStorage.getItem('minidocs_user_id') || '';
  const headers = {};
  if (userId) {
    headers['X-User-Id'] = userId;
  }
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function handleResponse(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      const errMessage = data?.error?.message || data?.message || 'Request failed';
      const error = new Error(errMessage);
      error.code = data?.error?.code || 'API_ERROR';
      error.status = response.status;
      throw error;
    }
    return data;
  }
  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(errorText || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response;
}

export const api = {
  // Users / Personas
  async getUsers() {
    const res = await fetch(`${API_BASE}/users`);
    return handleResponse(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Documents
  async getDocuments() {
    const res = await fetch(`${API_BASE}/documents`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getDocument(id) {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createDocument(data = {}) {
    const res = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateDocument(id, data = {}) {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteDocument(id) {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Attachments
  async uploadAttachment(documentId, file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/documents/${documentId}/attachment`, {
      method: 'POST',
      headers: getAuthHeaders(true), // omit Content-Type so browser sets multipart boundary
      body: formData,
    });
    return handleResponse(res);
  },

  getAttachmentDownloadUrl(documentId) {
    return `${API_BASE}/documents/${documentId}/attachment`;
  },

  async deleteAttachment(documentId) {
    const res = await fetch(`${API_BASE}/documents/${documentId}/attachment`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Sharing
  async shareDocument(documentId, userId) {
    const res = await fetch(`${API_BASE}/documents/${documentId}/shares`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });
    return handleResponse(res);
  },

  async getShares(documentId) {
    const res = await fetch(`${API_BASE}/documents/${documentId}/shares`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async revokeShare(documentId, userId) {
    const res = await fetch(`${API_BASE}/documents/${documentId}/shares/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Version History
  async getVersions(documentId) {
    const res = await fetch(`${API_BASE}/documents/${documentId}/versions`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createVersion(documentId, label = null) {
    const res = await fetch(`${API_BASE}/documents/${documentId}/versions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ label }),
    });
    return handleResponse(res);
  },

  async getVersion(documentId, versionId) {
    const res = await fetch(`${API_BASE}/documents/${documentId}/versions/${versionId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async restoreVersion(documentId, versionId) {
    const res = await fetch(`${API_BASE}/documents/${documentId}/versions/${versionId}/restore`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async updateVersionLabel(documentId, versionId, label) {
    const res = await fetch(`${API_BASE}/documents/${documentId}/versions/${versionId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ label }),
    });
    return handleResponse(res);
  },

  async deleteVersion(documentId, versionId) {
    const res = await fetch(`${API_BASE}/documents/${documentId}/versions/${versionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

export default api;


