
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Database, TestTube, CheckCircle, AlertCircle, Settings as SettingsIcon, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useDatabaseContext } from "@/contexts/DatabaseContext";
import { DatabaseConfig } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { config, setConfig, connectionStatus, testConnection, isUsingMockData, setIsUsingMockData } = useDatabaseContext();
  const { toast } = useToast();
  const [formData, setFormData] = useState<DatabaseConfig>(config);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (field: keyof DatabaseConfig, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setConfig(formData);
    toast({
      title: "Settings saved",
      description: "Database configuration has been saved successfully.",
    });
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    
    // Temporarily use the form data for testing
    const originalConfig = config;
    setConfig(formData);
    
    try {
      const success = await testConnection();
      if (success) {
        toast({
          title: "Connection successful",
          description: "Successfully connected to the database.",
        });
      } else {
        toast({
          title: "Connection failed",
          description: connectionStatus.error || "Unable to connect to the database.",
          variant: "destructive",
        });
      }
    } finally {
      setConfig(originalConfig);
      setIsTestingConnection(false);
    }
  };

  const formatLastTested = (date?: Date) => {
    if (!date) return "Never";
    return date.toLocaleString();
  };

  const hasEmptyCredentials = !formData.database || !formData.username || !formData.password;

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
                  Database Settings
                </h1>
                <p className="text-muted-foreground">Configure your PostgreSQL database connection</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 max-w-2xl">
        <div className="space-y-6">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Connection Status
              </CardTitle>
              <CardDescription>
                Current database connection status and data source
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Use Mock Data</Label>
                  <Badge variant={isUsingMockData ? "secondary" : "outline"}>
                    {isUsingMockData ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <Switch
                  checked={isUsingMockData}
                  onCheckedChange={setIsUsingMockData}
                />
              </div>

              {hasEmptyCredentials && !isUsingMockData && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">Database credentials required</p>
                    <p className="text-yellow-700">Please fill in your PostgreSQL connection details below to connect to your database.</p>
                  </div>
                </div>
              )}
              
              {!isUsingMockData && !hasEmptyCredentials && (
                <div className="flex items-center gap-2">
                  {connectionStatus.isConnected ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm">
                    {connectionStatus.isConnected ? "Connected" : "Not connected"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    • Last tested: {formatLastTested(connectionStatus.lastTested)}
                  </span>
                </div>
              )}
              
              {connectionStatus.error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {connectionStatus.error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Database Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>PostgreSQL Configuration</CardTitle>
              <CardDescription>
                Configure your PostgreSQL database connection details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="host">Host</Label>
                  <Input
                    id="host"
                    placeholder="localhost or 127.0.0.1"
                    value={formData.host}
                    onChange={(e) => handleInputChange('host', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use 127.0.0.1 to force IPv4 connection
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    placeholder="5432"
                    value={formData.port}
                    onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 5432)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="database">Database Name</Label>
                <Input
                  id="database"
                  placeholder="your_database_name"
                  value={formData.database}
                  onChange={(e) => handleInputChange('database', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The name of your PostgreSQL database
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="your_username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </Button>
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="your_password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SSL Connection</Label>
                    <p className="text-sm text-muted-foreground">
                      Use SSL/TLS encryption for database connection
                    </p>
                  </div>
                  <Switch
                    checked={formData.ssl}
                    onCheckedChange={(checked) => handleInputChange('ssl', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeout">Connection Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min="1"
                    max="300"
                    value={formData.connectionTimeout}
                    onChange={(e) => handleInputChange('connectionTimeout', parseInt(e.target.value) || 30)}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">
                  Save Configuration
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || hasEmptyCredentials}
                  className="flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  {isTestingConnection ? "Testing..." : "Test Connection"}
                </Button>
              </div>

              {hasEmptyCredentials && (
                <p className="text-xs text-muted-foreground">
                  Fill in database name, username, and password to enable connection testing
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
