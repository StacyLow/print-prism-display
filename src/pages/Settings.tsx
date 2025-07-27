import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Database, Settings as SettingsIcon, CheckCircle, XCircle, Save, RotateCcw, TestTube, AlertTriangle, Info, RefreshCw, TrendingUp, Calendar, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { useDatabaseConfig } from "@/hooks/useDatabaseConfig";
import { useCacheManagement } from "@/hooks/useCacheManagement";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { DatabaseConfig, DatabaseType } from "@/types/database";
import { createDatabaseClient } from "@/lib/database";

export default function Settings() {
  const { config, updateConfig, resetToEmpty, isConfigured } = useDatabaseConfig();
  const { formatCacheInfo, isRebuilding, rebuildCache, getCacheHealth } = useCacheManagement();
  const { toast } = useToast();
  const [formData, setFormData] = useState<DatabaseConfig>(config);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  
  const cacheInfo = formatCacheInfo();

  const handleTypeChange = (type: DatabaseType) => {
    setFormData(prev => ({ ...prev, type }));
  };

  const handleSupabaseChange = (field: keyof NonNullable<DatabaseConfig['supabase']>, value: string) => {
    setFormData(prev => ({
      ...prev,
      supabase: {
        ...prev.supabase,
        [field]: value
      }
    }));
  };

  const handlePostgresChange = (field: keyof NonNullable<DatabaseConfig['postgres']>, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      postgres: {
        ...prev.postgres,
        [field]: value
      }
    }));
  };

  const validateConfig = () => {
    if (formData.type === 'supabase') {
      if (!formData.supabase?.url || !formData.supabase?.anonKey) {
        return "Please fill in both Supabase URL and API key";
      }
    } else if (formData.type === 'postgres') {
      if (!formData.postgres?.host || !formData.postgres?.database || !formData.postgres?.username) {
        return "Please fill in host, database, and username for PostgreSQL";
      }
    }
    return null;
  };

  const handleTestConnection = async () => {
    const error = validateConfig();
    if (error) {
      toast({
        title: "Invalid Configuration",
        description: error,
        variant: "destructive"
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      const client = createDatabaseClient(formData);
      const result = await client.testConnection();
      
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: "Database connection test passed!",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = () => {
    const error = validateConfig();
    if (error) {
      toast({
        title: "Invalid Configuration",
        description: error,
        variant: "destructive"
      });
      return;
    }

    updateConfig(formData);
    toast({
      title: "Configuration Saved",
      description: "Database configuration updated successfully. The page will reload.",
    });
  };

  const handleReset = () => {
    resetToEmpty();
    toast({
      title: "Configuration Reset",
      description: "Database configuration cleared. The page will reload.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <SettingsIcon className="h-6 w-6" />
                  Settings
                </h1>
                <p className="text-muted-foreground">Application configuration and status</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 max-w-3xl">
        <div className="space-y-6">
          {/* Configuration Warning */}
          {!isConfigured && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-5 w-5" />
                  <p className="font-medium">Database Not Configured</p>
                </div>
                <p className="text-orange-700 mt-1">
                  Please configure your database connection below to use the application.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Database Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Configuration
              </CardTitle>
              <CardDescription>
                Configure your database connection for data storage and management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {isConfigured ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Database Configured</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {formData.type === 'supabase' ? 'Supabase' : 'PostgreSQL'}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">Not Configured</span>
                  </>
                )}
              </div>
              
              {/* Database Type Selection */}
              <div className="space-y-3">
                <Label>Database Type</Label>
                <RadioGroup
                  value={formData.type}
                  onValueChange={(value) => handleTypeChange(value as DatabaseType)}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="supabase" id="supabase" />
                    <Label htmlFor="supabase">Supabase (Recommended)</Label>
                  </div>
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="postgres" id="postgres" />
                     <Label htmlFor="postgres">PostgreSQL via Backend API</Label>
                   </div>
                </RadioGroup>
              </div>

              {/* Supabase Configuration */}
              {formData.type === 'supabase' && (
                <div className="space-y-4 border rounded-lg p-4 bg-card">
                  <h4 className="font-medium">Supabase Configuration</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="supabase-url">Project URL</Label>
                    <Input
                      id="supabase-url"
                      value={formData.supabase?.url || ''}
                      onChange={(e) => handleSupabaseChange('url', e.target.value)}
                      placeholder="https://your-project.supabase.co"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="supabase-key">Anonymous Key</Label>
                    <Input
                      id="supabase-key"
                      type="password"
                      value={formData.supabase?.anonKey || ''}
                      onChange={(e) => handleSupabaseChange('anonKey', e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    />
                  </div>
                  
                  <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md border border-blue-200">
                    <p className="font-medium text-blue-800">How to get your Supabase credentials:</p>
                    <ol className="text-blue-700 mt-1 list-decimal list-inside space-y-1">
                      <li>Go to your Supabase project dashboard</li>
                      <li>Navigate to Settings → API</li>
                      <li>Copy the Project URL and anon/public key</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* PostgreSQL Configuration */}
              {formData.type === 'postgres' && (
                <div className="space-y-4 border rounded-lg p-4 bg-card">
                  <h4 className="font-medium">PostgreSQL Configuration</h4>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                          PostgreSQL via Backend API
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          PostgreSQL connections are handled through the Flask backend API. 
                          Make sure the backend service is running and accessible.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postgres-host">Host *</Label>
                      <Input
                        id="postgres-host"
                        value={formData.postgres?.host || ''}
                        onChange={(e) => handlePostgresChange('host', e.target.value)}
                        placeholder="localhost"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="postgres-port">Port</Label>
                      <Input
                        id="postgres-port"
                        type="number"
                        value={formData.postgres?.port || 5432}
                        onChange={(e) => handlePostgresChange('port', parseInt(e.target.value))}
                        placeholder="5432"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="postgres-database">Database Name *</Label>
                    <Input
                      id="postgres-database"
                      value={formData.postgres?.database || ''}
                      onChange={(e) => handlePostgresChange('database', e.target.value)}
                      placeholder="printer_dashboard"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postgres-username">Username *</Label>
                      <Input
                        id="postgres-username"
                        value={formData.postgres?.username || ''}
                        onChange={(e) => handlePostgresChange('username', e.target.value)}
                        placeholder="postgres"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="postgres-password">Password</Label>
                      <Input
                        id="postgres-password"
                        type="password"
                        value={formData.postgres?.password || ''}
                        onChange={(e) => handlePostgresChange('password', e.target.value)}
                        placeholder="password"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="postgres-ssl"
                      checked={formData.postgres?.ssl || false}
                      onCheckedChange={(checked) => handlePostgresChange('ssl', checked)}
                    />
                    <Label htmlFor="postgres-ssl">Enable SSL</Label>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                  <Button 
                  onClick={handleTestConnection} 
                  variant="outline" 
                  size="sm"
                  disabled={isTestingConnection || !!validateConfig()}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {isTestingConnection ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button onClick={handleSave} size="sm" disabled={!!validateConfig()}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Configuration
                </Button>
                <Button onClick={handleReset} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Clear Configuration
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cache Management (PostgreSQL only) */}
          {config.type === 'postgres' && isConfigured && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Cache Management
                </CardTitle>
                <CardDescription>
                  Manage your metrics cache for improved performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Cache Status */}
                {cacheInfo && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {cacheInfo.health === 'healthy' && (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Cache Healthy</span>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            {cacheInfo.totalEntries} entries
                          </span>
                        </>
                      )}
                      {cacheInfo.health === 'empty' && (
                        <>
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium">Cache Empty</span>
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            No cache entries
                          </span>
                        </>
                      )}
                      {cacheInfo.health === 'needs_rebuild' && (
                        <>
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium">Cache Needs Rebuild</span>
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                            {cacheInfo.coverage}% coverage
                          </span>
                        </>
                      )}
                    </div>

                    {/* Cache Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-card border rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Total Entries</span>
                        </div>
                        <p className="text-lg font-bold mt-1">{cacheInfo.totalEntries}</p>
                      </div>
                      
                      <div className="bg-card border rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Daily Cache</span>
                        </div>
                        <p className="text-lg font-bold mt-1">{cacheInfo.dailyEntries}</p>
                      </div>
                      
                      <div className="bg-card border rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Overall Cache</span>
                        </div>
                        <p className="text-lg font-bold mt-1">{cacheInfo.overallEntries}</p>
                      </div>
                      
                      <div className="bg-card border rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Print Jobs</span>
                        </div>
                        <p className="text-lg font-bold mt-1">{cacheInfo.printJobsTotal}</p>
                      </div>
                    </div>

                    {/* Cache Information */}
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {cacheInfo.lastUpdated && (
                        <p>Last updated: {cacheInfo.lastUpdated.toLocaleString()}</p>
                      )}
                      {cacheInfo.dateRange && (
                        <p>
                          Date range: {cacheInfo.dateRange.start.toLocaleDateString()} - {cacheInfo.dateRange.end.toLocaleDateString()}
                        </p>
                      )}
                      <p>Cache coverage: {cacheInfo.coverage}% of print jobs</p>
                    </div>
                  </div>
                )}

                {/* Cache Actions */}
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={rebuildCache}
                    variant="outline" 
                    size="sm"
                    disabled={isRebuilding}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRebuilding ? 'animate-spin' : ''}`} />
                    {isRebuilding ? 'Rebuilding...' : 'Rebuild Cache'}
                  </Button>
                </div>

                {/* Cache Information Box */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                        About Cache Management
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        The metrics cache improves dashboard performance by pre-calculating aggregated data. 
                        If your metrics seem outdated or you've imported new data, rebuild the cache to ensure accuracy.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}