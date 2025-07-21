import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area } from "recharts";
import { ChartData } from "@/types/printJob";
import { Clock } from "lucide-react";

interface PrintTimeChartProps {
  data: ChartData[];
  isLoading?: boolean;
}

const chartConfig = {
  printTime: {
    label: "Print Time",
    color: "hsl(var(--primary))",
  },
  filamentUsed: {
    label: "Filament Used",
    color: "hsl(var(--secondary))",
  },
};

export function PrintTimeChart({ data, isLoading }: PrintTimeChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Print Time Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse bg-muted rounded-md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Print Time Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={data}>
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `${Math.round(value)}h`}
            />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              formatter={(value: number, name: string) => [
                `${Math.round(value / 60 * 10) / 10}h`,
                name === 'printTime' ? 'Print Time' : 'Filament Used'
              ]}
              labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            />
            <Area
              type="monotone"
              dataKey="printTime"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary) / 0.2)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}