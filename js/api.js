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

async function api(path, options = {}) {
  const token = getToken();
  const headers = { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try { response = await fetch(`${API_BASE}${path}`, { ...options, headers }); }
  catch { throw new Error('Не удалось связаться с академией. Проверь интернет и попробуй снова.'); }
  let data = null;
  const text = await response.text();
  if (text) { try { data = JSON.parse(text); } catch { data = { message: text }; } }
  if (response.status === 401) {
    setToken(null);
    window.dispatchEvent(new CustomEvent('academy:unauthorized'));
    throw new Error('Сеанс завершён. Войди снова.');
  }
  if (!response.ok) throw new Error(data?.message || data?.error || `Ошибка сервера (${response.status})`);
  return data || {};
}

window.AcademyAPI = { api, getToken, setToken };

})();
