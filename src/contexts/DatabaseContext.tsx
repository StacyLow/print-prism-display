
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
    console.log('Testing database connection with config:', config);
    
    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config }),
      });

      console.log('Test connection response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Test connection failed - response not ok:', errorText);
        setConnectionStatus({ 
          isConnected: false, 
          lastTested: new Date(), 
          error: `Connection failed: ${response.status} ${response.statusText}` 
        });
        return false;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Test connection failed - not JSON response:', contentType);
        setConnectionStatus({ 
          isConnected: false, 
          lastTested: new Date(), 
          error: 'Server returned non-JSON response' 
        });
        return false;
      }

      const data = await response.json();
      console.log('Test connection response data:', data);
      
      if (data.success) {
        setConnectionStatus({ isConnected: true, lastTested: new Date() });
        return true;
      } else {
        setConnectionStatus({ 
          isConnected: false, 
          lastTested: new Date(), 
          error: data.error || 'Connection test failed' 
        });
        return false;
      }
    } catch (error) {
      console.error('Test connection error:', error);
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
