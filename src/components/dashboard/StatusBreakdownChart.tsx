
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { MetricData } from "@/types/printJob";
import { Activity, AlertTriangle, Package } from "lucide-react";

interface StatusBreakdownChartProps {
  data: MetricData | undefined;
  isLoading?: boolean;
}

// Distinct colors for each status
const statusColors = {
  completed: "#22c55e", // Green
  cancelled: "#ef4444", // Red
  interrupted: "#f97316", // Orange
  server_exit: "#8b5cf6", // Purple
  klippy_shutdown: "#eab308", // Yellow
  in_progress: "#3b82f6", // Blue
};

const statusLabels = {
  completed: "Completed",
  cancelled: "Cancelled",
  interrupted: "Interrupted",
  server_exit: "Server Exit",
  klippy_shutdown: "Klippy Shutdown",
  in_progress: "In Progress",
};

const chartConfig = {
  count: {
    label: "Jobs",
  },
};

export function StatusBreakdownChart({ data, isLoading }: StatusBreakdownChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse bg-muted rounded-md" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const chartData = Object.entries(data.statusBreakdown)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: statusLabels[status as keyof typeof statusLabels],
      value: count,
      color: statusColors[status as keyof typeof statusColors],
    }));

  const failedJobs = data.statusBreakdown.cancelled + data.statusBreakdown.interrupted + 
                     data.statusBreakdown.server_exit + data.statusBreakdown.klippy_shutdown;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Status Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-[250px]">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ paddingTop: '20px' }}
                />
              </PieChart>
            </ChartContainer>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                  <Package className="h-5 w-5" />
                  {data.mostUsedFilament.type}
                </div>
                <div className="text-sm text-muted-foreground">Most Used Filament</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {data.mostUsedFilament.count} jobs ({data.mostUsedFilament.percentage.toFixed(1)}%)
                </div>
              </div>
              
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-destructive flex items-center justify-center gap-1">
                  <AlertTriangle className="h-5 w-5" />
                  {failedJobs}
                </div>
                <div className="text-sm text-muted-foreground">Failed Jobs</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {data.totalJobs > 0 ? ((failedJobs / data.totalJobs) * 100).toFixed(1) : 0}% failure rate
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Failure Breakdown:</h4>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Cancelled:</span>
                  <span>{data.statusBreakdown.cancelled}</span>
                </div>
                <div className="flex justify-between">
                  <span>Interrupted:</span>
                  <span>{data.statusBreakdown.interrupted}</span>
                </div>
                <div className="flex justify-between">
                  <span>Server Exit:</span>
                  <span>{data.statusBreakdown.server_exit}</span>
                </div>
                <div className="flex justify-between">
                  <span>Klippy Shutdown:</span>
                  <span>{data.statusBreakdown.klippy_shutdown}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
