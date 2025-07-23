
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterPanel } from "@/components/dashboard/FilterPanel";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PrintTimeChart } from "@/components/dashboard/PrintTimeChart";
import { FilamentUsageChart } from "@/components/dashboard/FilamentUsageChart";
import { StatusBreakdownChart } from "@/components/dashboard/StatusBreakdownChart";
import { usePrintMetrics, useChartData, useFilamentTypes, usePrinters } from "@/hooks/usePrintData";
import { FilterState } from "@/types/printJob";
import { 
  Clock, 
  Package, 
  Weight, 
  CheckCircle, 
  BarChart3, 
  Timer,
  ArrowLeft,
  Settings as SettingsIcon
} from "lucide-react";
import { Link } from "react-router-dom";

const initialFilters: FilterState = {
  dateRange: '1M',
  filamentTypes: [],
  printers: [],
  compareEnabled: false,
};

export default function Dashboard() {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  
  const { data: metrics, isLoading: metricsLoading } = usePrintMetrics(filters);
  const { data: chartData, isLoading: chartLoading } = useChartData(filters);
  const { data: filamentTypes = [] } = useFilamentTypes();
  const { data: printers = [] } = usePrinters();

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatWeight = (grams: number) => {
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(1)}kg`;
    }
    return `${Math.round(grams)}g`;
  };

  const formatLength = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${Math.round(meters)}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">3D Printer Dashboard</h1>
                <p className="text-muted-foreground">Monitor your printing metrics and performance</p>
              </div>
            </div>
            <Link to="/settings">
              <Button variant="outline" size="sm">
                <SettingsIcon className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="xl:col-span-1">
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              availableFilamentTypes={filamentTypes}
              availablePrinters={printers}
            />
          </div>

          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricCard
                title="Total Print Time"
                value={metrics ? formatTime(metrics.totalPrintTime) : "0h"}
                icon={<Clock className="h-4 w-4" />}
                trend={metrics?.trends?.totalPrintTime}
              />
              <MetricCard
                title="Filament Length Used"
                value={metrics ? formatLength(metrics.totalFilamentLength) : "0m"}
                icon={<Package className="h-4 w-4" />}
                trend={metrics?.trends?.totalFilamentLength}
              />
              <MetricCard
                title="Filament Weight Used"
                value={metrics ? formatWeight(metrics.totalFilamentWeight) : "0g"}
                icon={<Weight className="h-4 w-4" />}
                trend={metrics?.trends?.totalFilamentWeight}
              />
              <MetricCard
                title="Success Rate"
                value={metrics ? `${metrics.successRate.toFixed(1)}%` : "0%"}
                icon={<CheckCircle className="h-4 w-4" />}
                trend={metrics?.trends?.successRate}
              />
              <MetricCard
                title="Total Jobs"
                value={metrics?.totalJobs || 0}
                icon={<BarChart3 className="h-4 w-4" />}
                trend={metrics?.trends?.totalJobs}
              />
              <MetricCard
                title="Avg Print Time"
                value={metrics ? formatTime(metrics.avgPrintTime) : "0h"}
                icon={<Timer className="h-4 w-4" />}
                trend={metrics?.trends?.avgPrintTime}
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PrintTimeChart data={chartData || []} isLoading={chartLoading} />
              <FilamentUsageChart data={chartData || []} isLoading={chartLoading} />
            </div>

            {/* Status Analytics */}
            <div className="grid grid-cols-1 gap-6">
              <StatusBreakdownChart data={metrics} isLoading={metricsLoading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
