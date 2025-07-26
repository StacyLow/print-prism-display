import { useState, useEffect } from 'react';
import { DatabaseConfig, EMPTY_DATABASE_CONFIG } from '@/types/database';

const STORAGE_KEY = 'database-config';

export const useDatabaseConfig = () => {
  const [config, setConfig] = useState<DatabaseConfig>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Validate that we have required fields
        if (parsed.type === 'supabase' && parsed.supabase?.url && parsed.supabase?.anonKey) {
          return parsed;
        }
        if (parsed.type === 'postgres' && parsed.postgres?.host && parsed.postgres?.database) {
          return parsed;
        }
      } catch {
        // Fall through to empty config
      }
    }
    return EMPTY_DATABASE_CONFIG;
  });

  const updateConfig = (newConfig: DatabaseConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    // Reload the page to reinitialize database client
    window.location.reload();
  };

  const resetToEmpty = () => {
    updateConfig(EMPTY_DATABASE_CONFIG);
  };

  const isConfigured = () => {
    if (config.type === 'supabase') {
      return !!(config.supabase?.url && config.supabase?.anonKey);
    }
    if (config.type === 'postgres') {
      return !!(config.postgres?.host && config.postgres?.database && config.postgres?.username);
    }
    return false;
  };

  return {
    config,
    updateConfig,
    resetToEmpty,
    isConfigured: isConfigured()
  };
};