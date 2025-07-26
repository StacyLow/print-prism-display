import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Database, Settings as SettingsIcon, CheckCircle, Save, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { useSupabaseConfig } from "@/hooks/useSupabaseConfig";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { config, updateConfig, resetToDefault, isDefaultConfig } = useSupabaseConfig();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    url: config.url,
    anonKey: config.anonKey
  });

  const handleSave = () => {
    if (!formData.url || !formData.anonKey) {
      toast({
        title: "Invalid Configuration",
        description: "Please fill in both URL and API key",
        variant: "destructive"
      });
      return;
    }

    updateConfig(formData);
    toast({
      title: "Configuration Saved",
      description: "Supabase configuration updated successfully. The page will reload.",
    });
  };

  const handleReset = () => {
    resetToDefault();
    toast({
      title: "Configuration Reset",
      description: "Restored to default Supabase configuration. The page will reload.",
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

      <div className="container mx-auto px-6 py-6 max-w-2xl">
        <div className="space-y-6">
          {/* Supabase Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Connection
              </CardTitle>
              <CardDescription>
                Connected to Supabase for data storage and management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Connected to Supabase</span>
                {!isDefaultConfig && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Custom Config</span>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supabase-url">Supabase URL</Label>
                  <Input
                    id="supabase-url"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://your-project.supabase.co"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="supabase-key">Supabase Anon Key</Label>
                  <Input
                    id="supabase-key"
                    type="password"
                    value={formData.anonKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, anonKey: e.target.value }))}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </Button>
                  <Button onClick={handleReset} variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Default
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md border border-blue-200">
                <p className="font-medium text-blue-800">Configuration Info</p>
                <p className="text-blue-700">Configure your own Supabase project credentials to use your own database. Changes will reload the application.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}