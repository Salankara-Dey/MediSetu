/**
 * MediSetu — api.js
 * Frontend API helper. Include in every HTML page.
 * Uses the JWT token from sessionStorage (set by nav.js on login).
 *
 * Usage:
 *   const meds = await API.medicines.list();
 *   const user = await API.auth.login(email, password, role);
 */

// ── API Base URL ──────────────────────────────────────────────
// Your backend is deployed on Vercel at the same domain or a separate project.
// Option A: Same repo as frontend → use relative path '/api'
// Option B: Separate backend repo on Vercel → use that project's URL
const API_BASE = (() => {
  // If running locally
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';  // vercel dev runs on port 3000
  }
  // On Vercel — both frontend and backend are on the same domain
  // so we can use a relative path:
  return '/api';
})();

const API = (() => {

  /* ── Core fetch wrapper ──────────────────────────────────── */
  async function req(method, path, body = null, isFormData = false) {
    const session = JSON.parse(sessionStorage.getItem('medisetu_session') || 'null');
    const headers = {};

    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (session?.token) headers['Authorization'] = `Bearer ${session.token}`;

    const opts = { method, headers };
    if (body && method !== 'GET') {
      opts.body = isFormData ? body : JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();

    if (!res.ok) {
      const err = new Error(data.message || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  /* ── Save session after login ────────────────────────────── */
  function saveSession(data) {
    const session = {
      token: data.token,
      role:  data.user.role,
      name:  data.user.patient?.fullName || data.user.admin?.name || data.user.pharmacy?.storeName || data.user.email,
      email: data.user.email,
      id:    data.user._id,
      loginTime: Date.now(),
    };
    sessionStorage.setItem('medisetu_session', JSON.stringify(session));
    return session;
  }

  return {

    /* ── AUTH ─────────────────────────────────────────────── */
    auth: {
      async login(email, password, role) {
        const data = await req('POST', '/auth/login', { email, password, role });
        return saveSession(data);
      },
      async register(payload) {
        const data = await req('POST', '/auth/register', payload);
        return saveSession(data);
      },
      async me() {
        return req('GET', '/auth/me');
      },
      async forgotPassword(email) {
        return req('POST', '/auth/forgot-password', { email });
      },
      logout() {
        sessionStorage.removeItem('medisetu_session');
        window.location.href = 'login.html';
      },
    },

    /* ── MEDICINES ────────────────────────────────────────── */
    medicines: {
      async list(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return req('GET', `/medicines${qs ? '?' + qs : ''}`);
      },
      async get(id) {
        return req('GET', `/medicines/${id}`);
      },
      async create(medicine) {
        return req('POST', '/medicines', medicine);
      },
      async bulkImport(medicines) {
        return req('POST', '/medicines/bulk', { medicines });
      },
      async scanLabel(imageBase64, mimeType = 'image/jpeg') {
        return req('POST', '/medicines/scan', { imageBase64, mimeType });
      },
      async update(id, data) {
        return req('PUT', `/medicines/${id}`, data);
      },
      async delete(id) {
        return req('DELETE', `/medicines/${id}`);
      },
      async updateIoT(id, tempC) {
        return req('PATCH', `/medicines/${id}/iot`, { tempC });
      },
    },

    /* ── REQUESTS ─────────────────────────────────────────── */
    requests: {
      async list(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return req('GET', `/requests${qs ? '?' + qs : ''}`);
      },
      async create(request) {
        return req('POST', '/requests', request);
      },
      async updateStatus(id, status, rejectReason = '') {
        return req('PATCH', `/requests/${id}/status`, { status, rejectReason });
      },
      async cancel(id) {
        return req('DELETE', `/requests/${id}`);
      },
    },

    /* ── USERS ────────────────────────────────────────────── */
    users: {
      async list(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return req('GET', `/users${qs ? '?' + qs : ''}`);
      },
      async suspend(id)   { return req('PATCH', `/users/${id}/suspend`); },
      async unsuspend(id) { return req('PATCH', `/users/${id}/unsuspend`); },
      async verify(id)    { return req('PATCH', `/users/${id}/verify`); },
    },

    /* ── ALERTS ───────────────────────────────────────────── */
    alerts: {
      async list(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return req('GET', `/alerts${qs ? '?' + qs : ''}`);
      },
      async markRead(id)  { return req('PATCH', `/alerts/${id}/read`); },
      async markAllRead() { return req('PATCH', '/alerts/read-all'); },
    },

    /* ── HEALTH CHECK ─────────────────────────────────────── */
    async health() {
      return req('GET', '/health');
    },

  };
})();

/* Auto-check health on load (optional — comment out to disable) */
if (typeof window !== 'undefined') {
  window.API = API;
}
