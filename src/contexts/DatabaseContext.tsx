
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
    console.log('=== TESTING DATABASE CONNECTION ===');
    console.log('Testing database connection with config:', { ...config, password: '***' });
    
    try {
      console.log('Making request to /api/test-connection...');
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config }),
      });

      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Read the response body once and store it
      const responseText = await response.text();
      console.log('Raw response text:', responseText);

      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText);
        
        // Use the already-read response text
        let errorMessage = `Connection failed: ${response.status} ${response.statusText}`;
        if (responseText.trim()) {
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            console.error('Failed to parse error response as JSON:', parseError);
            errorMessage = `Server error: ${responseText.substring(0, 100)}`;
          }
        }
        
        setConnectionStatus({ 
          isConnected: false, 
          lastTested: new Date(), 
          error: errorMessage
        });
        return false;
      }

      // Check if we have a response body
      if (!responseText.trim()) {
        console.error('Empty response received');
        setConnectionStatus({ 
          isConnected: false, 
          lastTested: new Date(), 
          error: 'Empty response received from server'
        });
        return false;
      }

      // Try to parse the response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed response data:', data);
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        console.error('Response text that failed to parse:', responseText);
        
        setConnectionStatus({ 
          isConnected: false, 
          lastTested: new Date(), 
          error: `Invalid JSON response: ${responseText.substring(0, 100)}` 
        });
        return false;
      }
      
      if (data.success) {
        console.log('Connection test successful!');
        setConnectionStatus({ isConnected: true, lastTested: new Date() });
        return true;
      } else {
        console.log('Connection test failed:', data.error);
        setConnectionStatus({ 
          isConnected: false, 
          lastTested: new Date(), 
          error: data.error || 'Connection test failed' 
        });
        return false;
      }
    } catch (error) {
      console.error('Connection test error:', error);
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
