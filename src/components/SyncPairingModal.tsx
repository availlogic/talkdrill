import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, QrCode } from 'lucide-react';

export interface SyncPairingModalProps {
  isOpen: boolean;
  syncKey: string;
  onClose: () => void;
}

export const SyncPairingModal: React.FC<SyncPairingModalProps> = ({
  isOpen,
  syncKey,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !syncKey) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pairingUrl = `${origin}/?pair=${syncKey}`;

    QRCode.toDataURL(pairingUrl, { width: 256, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [isOpen, syncKey]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(syncKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold">
            <QrCode className="w-5 h-5 text-indigo-500" />
            <h3>Scan to Pair Device</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Sync QR Code"
              className="w-48 h-48 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 bg-white"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
              Generating QR...
            </div>
          )}
          <p className="mt-3 text-xs text-center text-slate-500 dark:text-slate-400">
            Open camera on iPhone or mobile to scan and pair instantly.
          </p>
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Pairing Secret Key
          </span>
          <div className="flex items-center gap-2">
            <div className="flex-1 font-mono text-xs px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-800 dark:text-slate-200 truncate select-all">
              {syncKey}
            </div>
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-xl flex items-center gap-1 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Key'}</span>
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
        >
          Done
        </button>
      </div>
    </div>
  );
};
