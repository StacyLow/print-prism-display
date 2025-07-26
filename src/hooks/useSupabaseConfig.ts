import { useState } from 'react';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const STORAGE_KEY = 'supabase-config';

const EMPTY_CONFIG: SupabaseConfig = {
  url: '',
  anonKey: ''
};

export const useSupabaseConfig = () => {
  const [config, setConfig] = useState<SupabaseConfig>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Only return valid config with both URL and key
        if (parsed.url && parsed.anonKey) {
          return parsed;
        }
      } catch {
        // Fall through to empty config
      }
    }
    return EMPTY_CONFIG;
  });

  const updateConfig = (newConfig: SupabaseConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    // Reload the page to reinitialize Supabase client
    window.location.reload();
  };

  const resetToEmpty = () => {
    updateConfig(EMPTY_CONFIG);
  };

  const isConfigured = () => {
    return !!(config.url && config.anonKey);
  };

  return {
    config,
    updateConfig,
    resetToEmpty,
    isConfigured: isConfigured()
  };
};