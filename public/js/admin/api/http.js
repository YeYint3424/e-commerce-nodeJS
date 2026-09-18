const TOKEN_KEY = 'admin.auth.token';

export async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const finalHeaders = { 'Content-Type': 'application/json', ...headers };
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error('Unable to reach the server. Please check your connection.');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (err) {
    payload = null;
  }

  if (!response.ok || !payload || payload.success === false) {
    const message = (payload && payload.message) || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function requestForm(path, { method = 'POST', formData } = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`/api${path}`, { method, headers, body: formData });
  } catch (err) {
    throw new Error('Unable to reach the server. Please check your connection.');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (err) {
    payload = null;
  }

  if (!response.ok || !payload || payload.success === false) {
    const message = (payload && payload.message) || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function buildQuery(params = {}) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      usp.set(key, value);
    }
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}
