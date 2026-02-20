'use client';

import { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

const STORAGE_KEY = 'bulk-query-api-key';
const MODEL_STORAGE_KEY = 'bulk-query-model';

const MODELS: { id: string; label: string }[] = [
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Recommended)' },
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6 (Most intelligent)' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (Fastest, cheapest)' },
];

export const DEFAULT_MODEL = MODELS[0].id;

// These read from localStorage (which acts as a fast cache of server state)
export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function getStoredModel(): string {
  if (typeof window === 'undefined') return DEFAULT_MODEL;
  return localStorage.getItem(MODEL_STORAGE_KEY) || DEFAULT_MODEL;
}

// Sync server settings into localStorage cache. Called once on login.
export async function loadSettingsFromServer(): Promise<{
  apiKey: string;
  model: string;
  templates: { id: string; name: string; prompt: string }[];
  draftText: string;
} | null> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return null;
    const data = await res.json();

    // Cache in localStorage for fast synchronous access
    if (data.apiKey) {
      localStorage.setItem(STORAGE_KEY, data.apiKey);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    localStorage.setItem(MODEL_STORAGE_KEY, data.model || DEFAULT_MODEL);

    return data;
  } catch {
    return null;
  }
}

// Save a settings field to the server
export async function saveSettingToServer(
  field: string,
  value: unknown
): Promise<boolean> {
  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

interface ApiKeySettingsProps {
  onClose: () => void;
  showToast: (message: string) => void;
}

export default function ApiKeySettings({ onClose, showToast }: ApiKeySettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [showKey, setShowKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setApiKey(getStoredApiKey());
    setModel(getStoredModel());
  }, []);

  const save = async () => {
    setSaving(true);
    const trimmed = apiKey.trim();

    // Update localStorage cache immediately
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    localStorage.setItem(MODEL_STORAGE_KEY, model);

    // Persist to server
    const ok = await saveSettingToServer('apiKey', trimmed);
    await saveSettingToServer('model', model);

    setSaving(false);
    if (ok) {
      showToast(trimmed ? 'API key saved to your account' : 'API key cleared');
    } else {
      showToast(trimmed ? 'API key saved locally (server sync failed)' : 'API key cleared');
    }
    setVerified(null);
  };

  const verify = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      showToast('Enter an API key first');
      return;
    }

    setVerifying(true);
    setVerified(null);

    try {
      const res = await fetch('/api/verify-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': trimmed,
        },
      });

      const data = await res.json();
      if (data.valid) {
        setVerified(true);
        showToast('API key is valid');
      } else {
        setVerified(false);
        showToast(data.error || 'Invalid API key');
      }
    } catch {
      setVerified(false);
      showToast('Failed to verify key');
    } finally {
      setVerifying(false);
    }
  };

  const clear = async () => {
    setApiKey('');
    localStorage.removeItem(STORAGE_KEY);
    await saveSettingToServer('apiKey', '');
    setVerified(null);
    showToast('API key removed');
  };

  const maskedKey = apiKey
    ? `sk-ant-...${apiKey.slice(-8)}`
    : '';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-24">
      <div className="bg-surface-dark border border-surface-light rounded-xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Key size={20} className="text-accent" />
            API Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Instructions */}
        <div className="mb-6 p-4 bg-surface rounded-lg border border-surface-light text-sm text-gray-300">
          <p className="mb-2">To use this app, you need an Anthropic API key:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-400">
            <li>Go to the Anthropic Console</li>
            <li>Navigate to <strong className="text-gray-300">API Keys</strong></li>
            <li>Click <strong className="text-gray-300">Create Key</strong> and copy it</li>
            <li>Paste it below</li>
          </ol>
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-accent hover:underline"
          >
            Open Anthropic Console
            <ExternalLink size={14} />
          </a>
        </div>

        {/* API Key Input */}
        <label className="block text-sm text-gray-400 mb-2">API Key</label>
        <div className="relative mb-4">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setVerified(null); }}
            placeholder="sk-ant-api03-..."
            className="w-full p-3 pr-10 bg-surface border-2 border-surface-light rounded-lg text-gray-200 font-mono text-sm focus:outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
          >
            {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Verification Status */}
        {verified !== null && (
          <div className={`mb-4 text-sm flex items-center gap-1 ${verified ? 'text-emerald-500' : 'text-red-500'}`}>
            {verified ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {verified ? 'Key verified' : 'Key invalid or expired'}
          </div>
        )}

        {/* Stored key indicator */}
        {!showKey && getStoredApiKey() && !apiKey && (
          <div className="mb-4 text-xs text-gray-500">
            Stored: {maskedKey}
          </div>
        )}

        {/* Model Selector */}
        <label className="block text-sm text-gray-400 mb-2">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full p-3 bg-surface border-2 border-surface-light rounded-lg text-gray-200 mb-6 focus:outline-none focus:border-accent"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={async () => { await save(); onClose(); }} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Close'}
          </Button>
          <Button variant="secondary" onClick={verify} disabled={verifying || !apiKey.trim()}>
            {verifying ? 'Verifying...' : 'Verify Key'}
          </Button>
          {apiKey && (
            <Button variant="danger" size="small" onClick={clear}>
              Clear
            </Button>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-600">
          Your API key is saved to your account and synced across devices.
          It is sent only to your own server&apos;s API routes for processing.
        </p>
      </div>
    </div>
  );
}
