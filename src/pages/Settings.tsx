import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Database, Settings as SettingsIcon, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function Settings() {
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
              </div>
              
              <div className="text-sm text-muted-foreground bg-green-50 p-3 rounded-md border border-green-200">
                <p className="font-medium text-green-800">Database Status</p>
                <p className="text-green-700">Your application is connected to Supabase and ready to store and retrieve print job data.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}