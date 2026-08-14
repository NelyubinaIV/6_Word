(function () {
'use strict';

const API_BASE = 'https://d5d74diucv441gm1qpr7.y3q8o1jq.apigw.yandexcloud.net';

let memoryToken = null;
function getToken() {
  try { return sessionStorage.getItem('academy_token') || memoryToken; }
  catch { return memoryToken; }
}
function setToken(token) {
  memoryToken = token || null;
  try { token ? sessionStorage.setItem('academy_token', token) : sessionStorage.removeItem('academy_token'); }
  catch { /* file:// may restrict browser storage; memory fallback remains available */ }
}

const RETRY_DELAY_MS = 1500;
const RETRYABLE_STATUSES = new Set([502, 503]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const method = String(options.method || 'GET').toUpperCase();

  // Автоматически повторяем только безопасные GET-запросы
  // и вход /login. Учебные POST-запросы (/check, /finish-session и т. п.)
  // повторять автоматически нельзя, чтобы не записать действие дважды.
  const mayRetry = method === 'GET' || path === '/login';

  let response;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch {
      if (mayRetry && attempt === 0) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      throw new Error(
        'Не удалось связаться с академией. Проверь интернет и попробуй снова.'
      );
    }

    if (
      mayRetry &&
      attempt === 0 &&
      RETRYABLE_STATUSES.has(response.status)
    ) {
      await sleep(RETRY_DELAY_MS);
      continue;
    }

    break;
  }

  let data = null;
  const text = await response.text();

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (response.status === 401) {
    setToken(null);
    window.dispatchEvent(new CustomEvent('academy:unauthorized'));
    throw new Error('Сеанс завершён. Войди снова.');
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      `Ошибка сервера (${response.status})`
    );
  }

  return data || {};
}

window.AcademyAPI = { api, getToken, setToken };

})();
