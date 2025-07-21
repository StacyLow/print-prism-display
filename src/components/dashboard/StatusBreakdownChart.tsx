
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { MetricData } from "@/types/printJob";
import { Activity, AlertTriangle } from "lucide-react";

interface StatusBreakdownChartProps {
  data: MetricData | undefined;
  isLoading?: boolean;
}

const statusColors = {
  completed: "hsl(var(--primary))",
  cancelled: "hsl(var(--destructive))",
  interrupted: "hsl(var(--orange))",
  server_exit: "hsl(var(--red))",
  klippy_shutdown: "hsl(var(--yellow))",
  in_progress: "hsl(var(--secondary))",
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

  const activeJobs = data.statusBreakdown.in_progress;
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
                  label={({ name, value, percent }) => 
                    `${name}: ${value} (${(percent! * 100).toFixed(0)}%)`
                  }
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {activeJobs}
                </div>
                <div className="text-sm text-muted-foreground">Active Jobs</div>
              </div>
              
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-destructive flex items-center justify-center gap-1">
                  <AlertTriangle className="h-5 w-5" />
                  {failedJobs}
                </div>
                <div className="text-sm text-muted-foreground">Failed Jobs</div>
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
