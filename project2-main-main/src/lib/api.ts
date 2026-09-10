const API_BASE_URL = 'http://localhost:8081/api';

export async function apiRequest(endpoint: string, options: RequestOptions = {}) {
  const token = localStorage.getItem('akademia-token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Something went wrong');
  }

  return response.json();
}

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}