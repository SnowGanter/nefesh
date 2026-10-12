// @ts-nocheck
// Auto-converted from .js — user's actual data

// ═══════════════════════════════════════════════════════════════
//  forumStore — отдельная база данных форума (localStorage).
//  Хранит: категории, темы, посты, реакции, подписки, закладки.
//  Отдельна от dataStore (игровые данные) и authStore (пользователи).
//
//  Put this file at:  utils/forumStore.js
// ═══════════════════════════════════════════════════════════════
import { useSyncExternalStore } from 'react';
import {
  INITIAL_MAIN_CATEGORIES,
  INITIAL_POSTS,
  INITIAL_SUBCATEGORIES,
  INITIAL_TOPICS,
} from '@/data/gameData';

const STORAGE_KEY = 'mmoportal:forum:v1';

// ── Default data (from gameData, used on first load) ──
const DEFAULTS = {
  mainCategories: INITIAL_MAIN_CATEGORIES,
  subCategories: INITIAL_SUBCATEGORIES,
  topics: INITIAL_TOPICS,
  posts: INITIAL_POSTS,
};

// ── Per-user data (keyed by username) ──
// subscriptions: { username: [topicId, ...] }
// bookmarks: { username: [topicId, ...] }
// reactions: { postId: { emoji: { count, users: [username, ...] } } }

const listeners = new Set();

function load() {
  if (typeof window === 'undefined') return { ...DEFAULTS, subscriptions: {}, bookmarks: {}, reactions: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return {
        ...data,
        mainCategories: data.mainCategories || DEFAULTS.mainCategories,
        subCategories: data.subCategories || DEFAULTS.subCategories,
        topics: data.topics || DEFAULTS.topics,
        posts: data.posts || DEFAULTS.posts,
        subscriptions: data.subscriptions || {},
        bookmarks: data.bookmarks || {},
        reactions: data.reactions || {},
        reputation: data.reputation || {},
        repHistory: data.repHistory || {},
        repVotes: data.repVotes || {},
        images: data.images || {},
      };
    }
  } catch { /* ignore */ }
  return { ...DEFAULTS, subscriptions: {}, bookmarks: {}, reactions: {} };
}

function save(data) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  listeners.forEach((l) => l());
}

function notify() { listeners.forEach((l) => l()); }

export const forumStore = {
  // ── Categories ──
  getMainCategories() { return load().mainCategories; },
  getSubCategories() { return load().subCategories; },
  addMainCategory(name) {
    const d = load();
    d.mainCategories = [...d.mainCategories, { id: Date.now(), name, order: d.mainCategories.length + 1 }];
    save(d);
  },
  addSubCategory(parentId, name, desc) {
    const d = load();
    d.subCategories = [...d.subCategories, { id: Date.now(), parentId: Number(parentId), name, desc, hidden: false }];
    save(d);
  },
  deleteSubCategory(subcatId) {
    const d = load();
    d.subCategories = d.subCategories.filter(s => s.id !== subcatId);
    // Also delete topics+posts in this subcat
    const topicIds = d.topics.filter(t => t.subcategoryId === subcatId).map(t => t.id);
    d.topics = d.topics.filter(t => t.subcategoryId !== subcatId);
    d.posts = d.posts.filter(p => !topicIds.includes(p.topicId));
    save(d);
  },
  toggleHideSubCategory(subcatId) {
    const d = load();
    d.subCategories = d.subCategories.map(s => s.id === subcatId ? { ...s, hidden: !s.hidden } : s);
    save(d);
  },
  deleteMainCategory(catId) {
    const d = load();
    const subIds = d.subCategories.filter(s => s.parentId === catId).map(s => s.id);
    d.mainCategories = d.mainCategories.filter(c => c.id !== catId);
    d.subCategories = d.subCategories.filter(s => s.parentId !== catId);
    // Delete topics+posts in those subcats
    const topicIds = d.topics.filter(t => subIds.includes(t.subcategoryId)).map(t => t.id);
    d.topics = d.topics.filter(t => !subIds.includes(t.subcategoryId));
    d.posts = d.posts.filter(p => !topicIds.includes(p.topicId));
    save(d);
  },

  // ── Topics ──
  getTopics() { return load().topics; },
  addTopic(topic) {
    const d = load();
    const newTopic = { id: Date.now(), pinned: false, closed: false, views: 1, ...topic };
    d.topics = [newTopic, ...d.topics];
    save(d);
    return newTopic;
  },
  updateTopic(topicId, updates) {
    const d = load();
    d.topics = d.topics.map(t => t.id === topicId ? { ...t, ...updates } : t);
    save(d);
  },
  deleteTopic(topicId) {
    const d = load();
    d.topics = d.topics.filter(t => t.id !== topicId);
    d.posts = d.posts.filter(p => p.topicId !== topicId);
    save(d);
  },
  incrementViews(topicId) {
    const d = load();
    d.topics = d.topics.map(t => t.id === topicId ? { ...t, views: (t.views || 0) + 1 } : t);
    save(d);
  },

  // ── Posts ──
  getPosts() { return load().posts; },
  getPostsByTopic(topicId) { return load().posts.filter(p => p.topicId === topicId); },
  addPost(post) {
    const d = load();
    const newPost = { id: Date.now(), likes: 0, likedByMe: false, ...post };
    d.posts = [...d.posts, newPost];
    save(d);
    return newPost;
  },
  updatePost(postId, content) {
    const d = load();
    d.posts = d.posts.map(p => p.id === postId ? { ...p, content, edited: true } : p);
    save(d);
  },
  deletePost(postId) {
    const d = load();
    d.posts = d.posts.filter(p => p.id !== postId);
    save(d);
  },

  // ── Reactions (per-post, per-user) ──
  getReactions(postId) {
    return load().reactions[postId] || {};
  },
  toggleReaction(postId, emoji, username) {
    const d = load();
    if (!d.reactions[postId]) d.reactions[postId] = {};
    const r = d.reactions[postId];
    if (!r[emoji]) r[emoji] = { count: 0, users: [] };
    if (r[emoji].users.includes(username)) {
      // Remove reaction
      r[emoji].count = Math.max(0, r[emoji].count - 1);
      r[emoji].users = r[emoji].users.filter(u => u !== username);
      if (r[emoji].count === 0) delete r[emoji];
    } else {
      // Add reaction
      r[emoji].count += 1;
      r[emoji].users.push(username);
    }
    save(d);
  },
  getUserReactions(postId, username) {
    const r = load().reactions[postId] || {};
    const result = [];
    for (const [emoji, data] of Object.entries(r)) {
      if (data.users.includes(username)) result.push(emoji);
    }
    return result;
  },

  // ── Subscriptions (per-user) ──
  getSubscriptions(username) { return load().subscriptions[username] || []; },
  toggleSubscription(topicId, username) {
    const d = load();
    if (!d.subscriptions[username]) d.subscriptions[username] = [];
    const subs = d.subscriptions[username];
    if (subs.includes(topicId)) {
      d.subscriptions[username] = subs.filter(id => id !== topicId);
    } else {
      d.subscriptions[username] = [...subs, topicId];
    }
    save(d);
  },

  // ── Bookmarks (per-user) ──
  getBookmarks(username) { return load().bookmarks[username] || []; },
  toggleBookmark(topicId, username) {
    const d = load();
    if (!d.bookmarks[username]) d.bookmarks[username] = [];
    const bms = d.bookmarks[username];
    if (bms.includes(topicId)) {
      d.bookmarks[username] = bms.filter(id => id !== topicId);
    } else {
      d.bookmarks[username] = [...bms, topicId];
    }
    save(d);
  },

  // ── Reset ──
  reset() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
    notify();
  },

  // ── Warnings (per-user) ──
  getWarnings(username) { return (load().warnings || {})[username] || []; },
  addWarning(username, reason, byUser) {
    const d = load();
    if (!d.warnings) d.warnings = {};
    if (!d.warnings[username]) d.warnings[username] = [];
    d.warnings[username].push({ id: Date.now(), reason, by: byUser, date: new Date().toISOString() });
    save(d);
  },
  removeWarning(username, warningId) {
    const d = load();
    if (!d.warnings) d.warnings = {};
    if (d.warnings[username]) {
      d.warnings[username] = d.warnings[username].filter(w => w.id !== warningId);
      save(d);
    }
  },

  // ── Move topic to different subcategory ──
  moveTopic(topicId, newSubcatId) {
    const d = load();
    d.topics = d.topics.map(t => t.id === topicId ? { ...t, subcategoryId: newSubcatId } : t);
    save(d);
  },

  // ── Merge topics ──
  mergeTopics(sourceTopicId, targetTopicId) {
    const d = load();
    // Move all posts from source to target
    d.posts = d.posts.map(p => p.topicId === sourceTopicId ? { ...p, topicId: targetTopicId } : p);
    // Delete source topic
    d.topics = d.topics.filter(t => t.id !== sourceTopicId);
    save(d);
  },

  // ── Archive (soft delete) ──
  archiveTopic(topicId) {
    const d = load();
    if (!d.archived) d.archived = { topics: [], posts: [] };
    const topic = d.topics.find(t => t.id === topicId);
    if (topic) {
      d.archived.topics.push({ ...topic, archivedAt: Date.now() });
      const topicPosts = d.posts.filter(p => p.topicId === topicId);
      d.archived.posts.push(...topicPosts.map(p => ({ ...p, archivedAt: Date.now() })));
      d.topics = d.topics.filter(t => t.id !== topicId);
      d.posts = d.posts.filter(p => p.topicId !== topicId);
      save(d);
    }
  },
  getArchivedTopics() { return (load().archived || {}).topics || []; },
  restoreTopic(topicId) {
    const d = load();
    if (!d.archived) return;
    const topic = d.archived.topics.find(t => t.id === topicId);
    if (topic) {
      d.topics = [{ ...topic, archivedAt: undefined }, ...d.topics];
      const posts = d.archived.posts.filter(p => p.topicId === topicId);
      d.posts = [...d.posts, ...posts.map(p => ({ ...p, archivedAt: undefined }))];
      d.archived.topics = d.archived.topics.filter(t => t.id !== topicId);
      d.archived.posts = d.archived.posts.filter(p => p.topicId !== topicId);
      save(d);
    }
  },

  // ── Polls ──
  addPoll(topicId, question, options) {
    const d = load();
    if (!d.polls) d.polls = {};
    d.polls[topicId] = { question, options: options.map(o => ({ text: o, votes: [] })) };
    save(d);
  },
  getPoll(topicId) { return (load().polls || {})[topicId] || null; },
  votePoll(topicId, optionIdx, username) {
    const d = load();
    if (!d.polls || !d.polls[topicId]) return;
    const poll = d.polls[topicId];
    // Remove previous vote by this user
    poll.options.forEach(opt => { opt.votes = opt.votes.filter(u => u !== username); });
    poll.options[optionIdx].votes.push(username);
    save(d);
  },

  // ── Edit history ──
  getEditHistory(postId) { return (load().editHistory || {})[postId] || []; },
  saveEditHistory(postId, oldContent) {
    const d = load();
    if (!d.editHistory) d.editHistory = {};
    if (!d.editHistory[postId]) d.editHistory[postId] = [];
    d.editHistory[postId].push({ content: oldContent, date: new Date().toISOString() });
    save(d);
  },

  // ── Reports (flag posts) ──
  getReports() { return load().reports || []; },
  addReport(postId, reporter, reason) {
    const d = load();
    if (!d.reports) d.reports = [];
    d.reports.push({ id: Date.now(), postId, reporter, reason, status: 'pending', date: new Date().toISOString() });
    save(d);
  },
  resolveReport(reportId) {
    const d = load();
    if (d.reports) {
      d.reports = d.reports.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r);
      save(d);
    }
  },

  // ── Drafts (autosave) ──
  getDraft(topicId, username) {
    const d = load();
    if (!d.drafts) d.drafts = {};
    return (d.drafts[topicId + '_' + username]) || '';
  },
  saveDraft(topicId, username, text) {
    const d = load();
    if (!d.drafts) d.drafts = {};
    d.drafts[topicId + '_' + username] = text;
    save(d);
  },
  clearDraft(topicId, username) {
    const d = load();
    if (!d.drafts) d.drafts = {};
    delete d.drafts[topicId + '_' + username];
    save(d);
  },

  // ── Unread tracking ──
  getReadPosts(username) { return (load().readPosts || {})[username] || []; },
  markTopicRead(topicId, username, postIds) {
    const d = load();
    if (!d.readPosts) d.readPosts = {};
    if (!d.readPosts[username]) d.readPosts[username] = [];
    postIds.forEach(id => { if (!d.readPosts[username].includes(id)) d.readPosts[username].push(id); });
    save(d);
  },
  getUnreadCount(topicId, username) {
    const d = load();
    const allPosts = d.posts.filter(p => p.topicId === topicId);
    const read = (d.readPosts || {})[username] || [];
    return allPosts.filter(p => !read.includes(p.id)).length;
  },

  // ── Reputation / karma ──
  getReputation(username) { return (load().reputation || {})[username] || 0; },
  getPostReputationVote(postId, username) {
    return (load().repVotes || {})[postId + '_' + username] || 0;
  },
  votePostReputation(postId, author, voter, delta) {
    if (!postId || !author || !voter || author === voter || ![-1, 1].includes(delta)) return;
    const d = load();
    d.reputation ||= {};
    d.repVotes ||= {};
    const key = postId + '_' + voter;
    const previous = d.repVotes[key] || 0;
    if (previous === delta) return;
    d.reputation[author] = (d.reputation[author] || 0) - previous + delta;
    d.repVotes[key] = delta;
    save(d);
  },

  saveImage({ name, type, dataUrl }) {
    const d = load();
    d.images ||= {};
    const id = 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    d.images[id] = { id, name, type, dataUrl, createdAt: Date.now() };
    save(d);
    return id;
  },
  getImage(id) { return (load().images || {})[id] || null; },

  getIgnored(username) { return (load().ignored || {})[username] || []; },
  toggleIgnore(username, targetUser) {
    const d = load();
    if (!d.ignored) d.ignored = {};
    if (!d.ignored[username]) d.ignored[username] = [];
    if (d.ignored[username].includes(targetUser)) {
      d.ignored[username] = d.ignored[username].filter(u => u !== targetUser);
    } else {
      d.ignored[username].push(targetUser);
    }
    save(d);
  },

  // ── Collapsible categories (UI state) ──
  getCollapsedCats(username) { return (load().collapsedCats || {})[username] || []; },
  toggleCollapsedCat(catId, username) {
    const d = load();
    if (!d.collapsedCats) d.collapsedCats = {};
    if (!d.collapsedCats[username]) d.collapsedCats[username] = [];
    if (d.collapsedCats[username].includes(catId)) {
      d.collapsedCats[username] = d.collapsedCats[username].filter(id => id !== catId);
    } else {
      d.collapsedCats[username].push(catId);
    }
    save(d);
  },

  // ── PM (private messages) ──
  getPMs(username) {
    const d = load();
    if (!d.pms) return [];
    return (d.pms[username] || []).sort((a, b) => b.date - a.date);
  },
  sendPM(from, to, text) {
    const d = load();
    if (!d.pms) d.pms = {};
    if (!d.pms[to]) d.pms[to] = [];
    if (!d.pms[from]) d.pms[from] = [];
    const msg = { id: Date.now(), from, to, text, date: Date.now(), read: false };
    d.pms[to].push(msg);
    d.pms[from].push(msg);
    save(d);
  },
  markPMRead(pmId, username) {
    const d = load();
    if (d.pms && d.pms[username]) {
      d.pms[username] = d.pms[username].map(m => m.id === pmId ? { ...m, read: true } : m);
      save(d);
    }
  },
  getUnreadPMs(username) {
    const d = load();
    if (!d.pms || !d.pms[username]) return 0;
    return d.pms[username].filter(m => !m.read && m.to === username).length;
  },

  // ── Topic creation permissions ──
  // admin: can create in any subcat
  // mod: can create in any subcat except admin-only
  // user: can only create in subcats with allowUserCreate=true
  canCreateTopic(username, subcatId) {
    const d = load();
    // Get user from authStore (via window — hack but works)
    const users = JSON.parse(localStorage.getItem('mmoportal:users:v1') || '[]');
    const user = users.find(u => u.username === username);
    if (!user) return false;
    if (user.banned) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'mod') return true;
    // Regular user: check if subcat allows user creation
    const sub = d.subCategories.find(s => s.id === subcatId);
    if (sub && sub.adminOnly) return false;
    return true; // by default users can create topics
  },

  // ── Subscribe ──
  subscribe(l) { listeners.add(l); return () => { listeners.delete(l); }; },
};

// ── React hooks ──
export function useForumData() {
  const serialized = useSyncExternalStore(
    forumStore.subscribe,
    () => JSON.stringify(load()),
    () => JSON.stringify(DEFAULTS),
  );
  try {
    const d = JSON.parse(serialized);
    return {
      mainCategories: d.mainCategories || DEFAULTS.mainCategories,
      subCategories: d.subCategories || DEFAULTS.subCategories,
      topics: d.topics || DEFAULTS.topics,
      posts: d.posts || DEFAULTS.posts,
      subscriptions: d.subscriptions || {},
      bookmarks: d.bookmarks || {},
      reactions: d.reactions || {},
      warnings: d.warnings || {},
      polls: d.polls || {},
      reports: d.reports || [],
      editHistory: d.editHistory || {},
      drafts: d.drafts || {},
      readPosts: d.readPosts || {},
      reputation: d.reputation || {},
      ignored: d.ignored || {},
      collapsedCats: d.collapsedCats || {},
      pms: d.pms || {},
      archived: d.archived || { topics: [], posts: [] },
    };
  } catch {
    return { ...DEFAULTS, subscriptions: {}, bookmarks: {}, reactions: {} };
  }
}
