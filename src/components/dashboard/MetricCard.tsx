import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({ title, value, unit, trend, icon, className }: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    
    if (trend.value === 0) return <Minus className="h-3 w-3" />;
    return trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (!trend || trend.value === 0) return "text-muted-foreground";
    return trend.isPositive ? "text-green-600" : "text-red-600";
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold">
            {formatValue(value)}
          </span>
          {unit && (
            <span className="text-sm text-muted-foreground">
              {unit}
            </span>
          )}
        </div>
        {trend && (
          <div className="flex items-center space-x-1 mt-2">
            <div className={cn("flex items-center space-x-1", getTrendColor())}>
              {getTrendIcon()}
              <span className="text-xs font-medium">
                {Math.abs(trend.value).toFixed(1)}%
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              vs previous period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}