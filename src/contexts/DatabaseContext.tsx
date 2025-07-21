
import React, { createContext, useContext, useState, useEffect } from 'react';
import { DatabaseConfig, DatabaseConnectionStatus, defaultDatabaseConfig } from '@/types/database';

interface DatabaseContextType {
  config: DatabaseConfig;
  setConfig: (config: DatabaseConfig) => void;
  connectionStatus: DatabaseConnectionStatus;
  setConnectionStatus: (status: DatabaseConnectionStatus) => void;
  testConnection: () => Promise<boolean>;
  isUsingMockData: boolean;
  setIsUsingMockData: (useMock: boolean) => void;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const useDatabaseContext = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabaseContext must be used within a DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfigState] = useState<DatabaseConfig>(defaultDatabaseConfig);
  const [connectionStatus, setConnectionStatus] = useState<DatabaseConnectionStatus>({ isConnected: false });
  const [isUsingMockData, setIsUsingMockData] = useState(true);

  // Load config from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('database-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfigState(parsed);
      } catch (error) {
        console.error('Failed to parse saved database config:', error);
      }
    }
  }, []);

  const setConfig = (newConfig: DatabaseConfig) => {
    setConfigState(newConfig);
    localStorage.setItem('database-config', JSON.stringify(newConfig));
  };

  const testConnection = async (): Promise<boolean> => {
    try {
      // In a real implementation, this would test the actual database connection
      // For now, we'll simulate a connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simple validation - check if all required fields are filled
      const isValid = config.host && config.database && config.username && config.password;
      
      if (isValid) {
        setConnectionStatus({ isConnected: true, lastTested: new Date() });
        return true;
      } else {
        setConnectionStatus({ 
          isConnected: false, 
          lastTested: new Date(), 
          error: 'Missing required connection details' 
        });
        return false;
      }
    } catch (error) {
      setConnectionStatus({ 
        isConnected: false, 
        lastTested: new Date(), 
        error: error instanceof Error ? error.message : 'Connection failed' 
      });
      return false;
    }
  };

  return (
    <DatabaseContext.Provider value={{
      config,
      setConfig,
      connectionStatus,
      setConnectionStatus,
      testConnection,
      isUsingMockData,
      setIsUsingMockData,
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};
