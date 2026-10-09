import React, { useState, useEffect } from 'react';
import { Cloud, RefreshCw, QrCode, Unlink, CheckCircle2, AlertCircle } from 'lucide-react';
import { syncManager, type SyncState } from '../services/syncManager';
import { generateSyncKey, isValidSyncKey } from '../utils/syncCrypto';
import { SyncPairingModal } from './SyncPairingModal';

export const CrossDeviceSyncSection: React.FC = () => {
  const [syncKey, setSyncKey] = useState<string | null>(syncManager.getSyncKey());
  const [syncState, setSyncState] = useState<SyncState>(syncManager.getState());
  const [manualInputKey, setManualInputKey] = useState('');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return syncManager.subscribe((state) => {
      setSyncState(state);
      setSyncKey(syncManager.getSyncKey());
    });
  }, []);

  const handleEnableSync = async () => {
    const newKey = generateSyncKey();
    syncManager.setSyncKey(newKey);
    setSyncKey(newKey);
    setIsQrModalOpen(true);
    await syncManager.syncNow();
  };

  const handleConnectExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidSyncKey(manualInputKey)) {
      setErrorMessage('Invalid sync key format. Must be TD-XXXX-XXXX-XXXX-XXXX');
      return;
    }
    setErrorMessage(null);
    syncManager.setSyncKey(manualInputKey);
    setSyncKey(manualInputKey);
    setManualInputKey('');
    await syncManager.syncNow();
  };

  const handleDisconnect = () => {
    syncManager.clearSyncKey();
    setSyncKey(null);
  };

  const renderDisconnectedState = () => (
    <div className="space-y-4 pt-2">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          type="button"
          onClick={handleEnableSync}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm"
        >
          <Cloud className="w-4 h-4" />
          <span>Enable Cloud Sync (Generate Key)</span>
        </button>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
        <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Or Pair Existing Device
        </span>
        <form onSubmit={handleConnectExisting} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={manualInputKey}
            onChange={(e) => setManualInputKey(e.target.value)}
            placeholder="TD-XXXX-XXXX-XXXX-XXXX"
            className="flex-1 font-mono text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
          >
            Connect
          </button>
        </form>
        {errorMessage && (
          <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMessage}</span>
          </p>
        )}
      </div>
    </div>
  );

  const renderConnectedState = () => (
    <div className="space-y-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
        <div className="space-y-0.5">
          <span className="text-[11px] font-medium text-slate-400">Current Device Key</span>
          <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
            {syncKey}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Show QR Code</span>
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
          >
            <Unlink className="w-3.5 h-3.5" />
            <span>Disconnect</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {syncState.lastSyncedAt
            ? `Last synced: ${new Date(syncState.lastSyncedAt).toLocaleTimeString()}`
            : 'Ready to sync'}
        </div>
        <button
          type="button"
          disabled={syncState.status === 'syncing'}
          onClick={() => syncManager.syncNow()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncState.status === 'syncing' ? 'animate-spin' : ''}`} />
          <span>{syncState.status === 'syncing' ? 'Syncing...' : 'Sync Now'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            Cross-Device Cloud Sync
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {syncKey ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Connected</span>
            </span>
          ) : (
            <span className="text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              Not Connected
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Passwordless synchronization across laptop, mobile, and tablet via Cloudflare cloud storage.
      </p>

      {syncKey ? renderConnectedState() : renderDisconnectedState()}

      {syncKey && (
        <SyncPairingModal
          isOpen={isQrModalOpen}
          syncKey={syncKey}
          onClose={() => setIsQrModalOpen(false)}
        />
      )}
    </div>
  );
};
