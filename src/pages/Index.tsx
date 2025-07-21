// Update this page (the content is just a fallback if you fail to update the page)

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Package, Printer } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">3D Printer Management System</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Monitor and analyze your 3D printing operations
          </p>
          <Link to="/dashboard">
            <Button size="lg" className="text-lg px-8 py-6">
              <BarChart3 className="mr-2 h-5 w-5" />
              View Dashboard
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <Printer className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Multi-Printer Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Track metrics across multiple 3D printers with individual performance analysis.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Filament Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Monitor filament usage, types, and costs with detailed consumption analytics.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Get insights into print times, success rates, and operational efficiency.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
