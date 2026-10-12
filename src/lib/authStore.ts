// @ts-nocheck
// Auto-converted from .js — user's actual data

// ═══════════════════════════════════════════════════════════════
//  authStore — localStorage-backed authentication system.
//  Roles: 'admin' | 'mod' | 'user'
//  Default admin: admin/admin
//
//  Put this file at:  utils/authStore.js
// ═══════════════════════════════════════════════════════════════
import { useSyncExternalStore } from 'react';

const USERS_KEY = 'mmoportal:users:v1';
const SESSION_KEY = 'mmoportal:session:v1';
const NOTIFS_KEY = 'mmoportal:notifs:v1';

const listeners = new Set();

const DEFAULT_USERS = [
  {
    id: 'u-admin',
    username: 'admin',
    password: 'admin',
    role: 'admin',
    banned: false,
    muted: false,
    createdAt: Date.now(),
    bio: 'Главный администратор портала',
  },
];

function loadUsers() {
  if (typeof window === 'undefined') return DEFAULT_USERS;
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) { const value = JSON.parse(raw); if (Array.isArray(value)) return value; }
  } catch { /* ignore */ }
  return DEFAULT_USERS;
}

function saveUsers(users) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  notify();
}

function loadSession() {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
}

function saveSession(userId) {
  if (typeof window === 'undefined') return;
  if (userId) localStorage.setItem(SESSION_KEY, userId);
  else localStorage.removeItem(SESSION_KEY);
  notify();
}

function loadNotifs() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveNotifs(notifs) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifs));
  notify();
}

function notify() {
  listeners.forEach((l) => l());
}

function genId() {
  return 'u-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export const authStore = {
  getUsers() { return loadUsers(); },
  getUserById(id) { return loadUsers().find((u) => u.id === id); },
  getUserByName(username) {
    return loadUsers().find((u) => u.username.toLowerCase() === username.toLowerCase());
  },

  getCurrentUser() {
    const sid = loadSession();
    if (!sid) return null;
    return loadUsers().find((u) => u.id === sid) || null;
  },

  login(username, password) {
    username = username.trim();
    const user = loadUsers().find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return { ok: false, error: 'Пользователь не найден' };
    if (user.password !== password) return { ok: false, error: 'Неверный пароль' };
    if (user.banned) return { ok: false, error: 'Аккаунт заблокирован' };
    saveSession(user.id);
    addNotification(user.id, 'Добро пожаловать на портал!', 'info');
    return { ok: true };
  },

  logout() { saveSession(null); },

  register(username, password) {
    username = username.trim();
    if (!username.trim() || username.length < 3) return { ok: false, error: 'Имя минимум 3 символа' };
    if (!password || password.length < 3) return { ok: false, error: 'Пароль минимум 3 символа' };
    if (loadUsers().some((u) => u.username.toLowerCase() === username.toLowerCase()))
      return { ok: false, error: 'Имя занято' };
    const user = {
      id: genId(),
      username: username.trim(),
      password,
      role: 'user',
      banned: false,
      muted: false,
      createdAt: Date.now(),
    };
    saveUsers([...loadUsers(), user]);
    saveSession(user.id);
    addNotification(user.id, 'Аккаунт создан! Добро пожаловать.', 'success');
    return { ok: true };
  },

  promote(userId, role) {
    const users = loadUsers();
    const u = users.find((x) => x.id === userId);
    if (u) {
      u.role = role;
      saveUsers(users);
      addNotification(userId, `Ваша роль изменена на: ${role === 'admin' ? 'Администратор' : role === 'mod' ? 'Модератор' : 'Пользователь'}`, 'info');
    }
  },

  setBanned(userId, banned) {
    const users = loadUsers();
    const u = users.find((x) => x.id === userId);
    if (u) {
      u.banned = banned;
      saveUsers(users);
      addNotification(userId, banned ? 'Ваш аккаунт заблокирован' : 'Ваш аккаунт разблокирован', banned ? 'danger' : 'success');
    }
  },

  setMuted(userId, muted) {
    const users = loadUsers();
    const u = users.find((x) => x.id === userId);
    if (u) {
      u.muted = muted;
      saveUsers(users);
      addNotification(userId, muted ? 'Вам ограничена возможность писать (мут)' : 'Мут снят', muted ? 'warning' : 'success');
    }
  },

  updateProfile(userId, updates) {
    const users = loadUsers();
    const u = users.find((x) => x.id === userId);
    if (u) { Object.assign(u, updates); saveUsers(users); }
  },

  /**
   * Persist the current user's armory build (accessories / charms / abilities).
   * Stored under `user.savedArmory`. Calls `updateProfile` under the hood so
   * existing hooks (useCurrentUser) re-render automatically.
   */
  saveArmory(userId, armoryData) {
    if (!userId) return;
    const users = loadUsers();
    const u = users.find((x) => x.id === userId);
    if (!u) return;
    // Merge with any previously saved armory so partial updates work.
    const merged = {
      ...(u.savedArmory || {}),
      ...armoryData,
    };
    this.updateProfile(userId, { savedArmory: merged });
  },

  deleteUser(userId) {
    saveUsers(loadUsers().filter((u) => u.id !== userId));
  },

  getNotifications(userId) {
    return loadNotifs().filter((n) => n.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
  },
  markNotifRead(notifId) {
    const notifs = loadNotifs();
    const n = notifs.find((x) => x.id === notifId);
    if (n) { n.read = true; saveNotifs(notifs); }
  },
  markAllRead(userId) {
    const notifs = loadNotifs();
    notifs.filter((n) => n.userId === userId).forEach((n) => { n.read = true; });
    saveNotifs(notifs);
  },
  deleteNotif(notifId) {
    saveNotifs(loadNotifs().filter((n) => n.id !== notifId));
  },

  subscribe(l) { listeners.add(l); return () => { listeners.delete(l); }; },
};

function addNotification(userId, text, type) {
  type = type || 'info';
  const notifs = loadNotifs();
  notifs.push({
    id: 'n-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    userId, text, type, read: false, createdAt: Date.now(),
  });
  saveNotifs(notifs);
}

// ── React hooks ──
export function useCurrentUser() {
  const serialized = useSyncExternalStore(
    authStore.subscribe,
    () => JSON.stringify(authStore.getCurrentUser()),
    () => JSON.stringify(null),
  );
  try { return JSON.parse(serialized); } catch { return null; }
}

export function useUsers() {
  const serialized = useSyncExternalStore(
    authStore.subscribe,
    () => JSON.stringify(authStore.getUsers()),
    () => JSON.stringify(DEFAULT_USERS),
  );
  try { return JSON.parse(serialized); } catch { return DEFAULT_USERS; }
}

export function useNotifications(userId) {
  const serialized = useSyncExternalStore(
    authStore.subscribe,
    () => JSON.stringify(userId ? authStore.getNotifications(userId) : []),
    () => JSON.stringify([]),
  );
  try { return JSON.parse(serialized); } catch { return []; }
}
