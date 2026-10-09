import {
  type ArticleRecord,
  type DrillLogRecord,
  type SettingsRecord,
} from '../storage/db';
import { type WordLookupRecord } from '../types/models';

export interface AudioMetaRecord {
  id: string;
  articleId: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
  duration: number;
  sourceType: 'tts' | 'upload';
  createdAt: number;
}

export interface SyncSnapshot {
  schemaVersion: number;
  exportedAt: number;
  articles: ArticleRecord[];
  drillLogs: Omit<DrillLogRecord, 'id'>[];
  settings: SettingsRecord[];
  wordLookups?: Omit<WordLookupRecord, 'id'>[] | undefined;
  audioMetas?: AudioMetaRecord[] | undefined;
}

export interface MergeStats {
  articlesAdded: number;
  articlesUpdated: number;
  drillLogsAdded: number;
  settingsUpdated: number;
}

export interface MergeResult {
  mergedSnapshot: SyncSnapshot;
  stats: MergeStats;
}

function mergeDrillLogs(
  local: Omit<DrillLogRecord, 'id'>[],
  remote: Omit<DrillLogRecord, 'id'>[]
): { logs: Omit<DrillLogRecord, 'id'>[]; added: number } {
  const logMap = new Map<string, Omit<DrillLogRecord, 'id'>>();
  local.forEach((log) => logMap.set(`${log.articleId}:${log.timestamp}`, log));

  let added = 0;
  remote.forEach((log) => {
    const key = `${log.articleId}:${log.timestamp}`;
    if (!logMap.has(key)) {
      logMap.set(key, log);
      added += 1;
    }
  });

  const sortedLogs = Array.from(logMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  return { logs: sortedLogs, added };
}

function resolveArticleConflict(
  localArt: ArticleRecord,
  remoteArt: ArticleRecord
): { article: ArticleRecord; updated: boolean } {
  const useRemote = remoteArt.updatedAt > localArt.updatedAt;
  const base = useRemote ? remoteArt : localArt;
  const other = useRemote ? localArt : remoteArt;

  const resolved: ArticleRecord = {
    ...base,
    currentCount: Math.max(base.currentCount, other.currentCount),
    lastPracticedAt: Math.max(base.lastPracticedAt || 0, other.lastPracticedAt || 0) || undefined,
  };

  return { article: resolved, updated: useRemote };
}

function mergeArticles(
  local: ArticleRecord[],
  remote: ArticleRecord[]
): { articles: ArticleRecord[]; added: number; updated: number } {
  const artMap = new Map<string, ArticleRecord>();
  local.forEach((art) => artMap.set(art.id, art));

  let added = 0;
  let updated = 0;

  remote.forEach((remoteArt) => {
    const localArt = artMap.get(remoteArt.id);
    if (!localArt) {
      artMap.set(remoteArt.id, remoteArt);
      added += 1;
    } else {
      const result = resolveArticleConflict(localArt, remoteArt);
      artMap.set(remoteArt.id, result.article);
      if (result.updated) updated += 1;
    }
  });

  return { articles: Array.from(artMap.values()), added, updated };
}

function mergeSettings(
  local: SettingsRecord[],
  remote: SettingsRecord[]
): { settings: SettingsRecord[]; updated: number } {
  const setMap = new Map<string, SettingsRecord>();
  local.forEach((s) => setMap.set(s.key, s));

  let updated = 0;
  remote.forEach((remoteSetting) => {
    const localSetting = setMap.get(remoteSetting.key);
    if (!localSetting || remoteSetting.updatedAt > localSetting.updatedAt) {
      setMap.set(remoteSetting.key, remoteSetting);
      if (localSetting) updated += 1;
    }
  });

  return { settings: Array.from(setMap.values()), updated };
}

function mergeWordLookups(
  local: Omit<WordLookupRecord, 'id'>[] = [],
  remote: Omit<WordLookupRecord, 'id'>[] = []
): Omit<WordLookupRecord, 'id'>[] {
  const lookupMap = new Map<string, Omit<WordLookupRecord, 'id'>>();
  local.forEach((l) => lookupMap.set(`${l.lang}:${l.text}`, l));

  remote.forEach((remoteLookup) => {
    const key = `${remoteLookup.lang}:${remoteLookup.text}`;
    const localLookup = lookupMap.get(key);
    if (!localLookup || remoteLookup.timestamp > localLookup.timestamp) {
      lookupMap.set(key, remoteLookup);
    }
  });

  return Array.from(lookupMap.values());
}

function mergeAudioMetas(
  local: AudioMetaRecord[] = [],
  remote: AudioMetaRecord[] = []
): AudioMetaRecord[] {
  const audioMap = new Map<string, AudioMetaRecord>();
  local.forEach((a) => audioMap.set(a.id, a));
  remote.forEach((a) => {
    if (!audioMap.has(a.id)) {
      audioMap.set(a.id, a);
    }
  });
  return Array.from(audioMap.values());
}

export function mergeSnapshots(local: SyncSnapshot, remote: SyncSnapshot): MergeResult {
  const logMerge = mergeDrillLogs(local.drillLogs, remote.drillLogs);
  const artMerge = mergeArticles(local.articles, remote.articles);
  const setMerge = mergeSettings(local.settings, remote.settings);
  const lookups = mergeWordLookups(local.wordLookups, remote.wordLookups);
  const audioMetas = mergeAudioMetas(local.audioMetas, remote.audioMetas);

  return {
    mergedSnapshot: {
      schemaVersion: 1,
      exportedAt: Math.max(local.exportedAt, remote.exportedAt),
      articles: artMerge.articles,
      drillLogs: logMerge.logs,
      settings: setMerge.settings,
      wordLookups: lookups,
      audioMetas,
    },
    stats: {
      articlesAdded: artMerge.added,
      articlesUpdated: artMerge.updated,
      drillLogsAdded: logMerge.added,
      settingsUpdated: setMerge.updated,
    },
  };
}
