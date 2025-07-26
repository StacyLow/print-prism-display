import { useState, useEffect } from 'react';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const STORAGE_KEY = 'supabase-config';

const DEFAULT_CONFIG: SupabaseConfig = {
  url: "https://drkxbrcpjdrophwtcekd.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRya3hicmNwamRyb3Bod3RjZWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODcwNzQsImV4cCI6MjA2ODY2MzA3NH0.2vNdDh37m_sCexlJeNFKWVKQbz8RaAb3AEAKguYMsfs"
};

export const useSupabaseConfig = () => {
  const [config, setConfig] = useState<SupabaseConfig>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  });

  const updateConfig = (newConfig: SupabaseConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    // Reload the page to reinitialize Supabase client
    window.location.reload();
  };

  const resetToDefault = () => {
    updateConfig(DEFAULT_CONFIG);
  };

  return {
    config,
    updateConfig,
    resetToDefault,
    isDefaultConfig: config.url === DEFAULT_CONFIG.url && config.anonKey === DEFAULT_CONFIG.anonKey
  };
};