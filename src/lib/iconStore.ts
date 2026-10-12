// @ts-nocheck
// ═══════════════════════════════════════════════════════════════
//  iconStore — IndexedDB-хранилище для иконок (снимает лимит localStorage).
//  localStorage имеет лимит ~5MB, что критично при хранении dataURL иконок.
//  IndexedDB позволяет хранить сотни MB бинарных данных.
//
//  API:
//    await setIcon(key, dataUrl)  — сохранить иконку (dataURL → Blob)
//    await getIcon(key)           — получить иконку как dataURL (или null)
//    await deleteIcon(key)        — удалить иконку
//    await clearAllIcons()        — удалить все иконки
//
//  Ключи: формируются как `icon:{collection}:{itemId}` (например 'icon:DB_SPELLS:5')
// ═══════════════════════════════════════════════════════════════

const DB_NAME = 'mmoportal:icons';
const DB_VERSION = 1;
const STORE_NAME = 'icons';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB недоступен'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
  return dbPromise;
}

// dataURL → Blob (для экономии места в IndexedDB)
function dataUrlToBlob(dataUrl) {
  try {
    const [meta, b64] = dataUrl.split(',');
    const mime = meta.match(/data:(.*?);/)?.[1] || 'image/png';
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  } catch {
    return null;
  }
}

// Blob → dataURL (для использования в <img src=...>)
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function setIcon(key, dataUrl) {
  if (!dataUrl) return;
  const db = await openDB();
  // Если это уже dataURL — храним как Blob, иначе как есть
  const value = dataUrl.startsWith('data:') ? dataUrlToBlob(dataUrl) : dataUrl;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getIcon(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => {
        const val = req.result;
        if (!val) return resolve(null);
        if (val instanceof Blob) {
          blobToDataUrl(val).then(resolve, () => resolve(null));
        } else if (typeof val === 'string') {
          resolve(val);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deleteIcon(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    return;
  }
}

export async function clearAllIcons() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    return;
  }
}

// Сформировать ключ для иконки элемента коллекции
export function iconKey(collection, itemId) {
  return `icon:${collection}:${itemId}`;
}

// ═══════════════════════════════════════════════════════════════
//  Хук useIcon — загружает иконку по ключу, возвращает dataURL или null.
//  Используется в карточках/таблицах для отображения иконок из IndexedDB.
// ═══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';

export function useIcon(key) {
  const [icon, setIconState] = useState(null);
  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear the previous image when its external source is removed.
    if (!key) { setIconState(null); return; }
    getIcon(key).then((url) => { if (active) setIconState(url); }).catch(() => { if (active) setIconState(null); });
    return () => { active = false; };
  }, [key]);
  return icon;
}
