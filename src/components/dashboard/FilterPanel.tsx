
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DateRange, FilterState } from "@/types/printJob";
import { CalendarDays, Filter, Printer, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableFilamentTypes: string[];
  availablePrinters: Array<{ name: string; emoji: string }>;
}

const dateRangeOptions: { value: DateRange; label: string }[] = [
  { value: '1W', label: '1 Week' },
  { value: '1M', label: '1 Month' },
  { value: '3M', label: '3 Months' },
  { value: '6M', label: '6 Months' },
  { value: '1Y', label: '1 Year' },
  { value: 'ALL', label: 'All Time' },
];

export function FilterPanel({ 
  filters, 
  onFiltersChange, 
  availableFilamentTypes = [],
  availablePrinters = []
}: FilterPanelProps) {
  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleFilamentType = (type: string) => {
    const newTypes = filters.filamentTypes.includes(type)
      ? filters.filamentTypes.filter(t => t !== type)
      : [...filters.filamentTypes, type];
    updateFilters({ filamentTypes: newTypes });
  };

  const togglePrinter = (printerName: string) => {
    const newPrinters = filters.printers.includes(printerName)
      ? filters.printers.filter(p => p !== printerName)
      : [...filters.printers, printerName];
    updateFilters({ printers: newPrinters });
  };

  const clearAllFilters = () => {
    updateFilters({
      dateRange: '1M',
      filamentTypes: [],
      printers: [],
      compareEnabled: false,
    });
  };

  const activeFilterCount = filters.filamentTypes.length + filters.printers.length + (filters.compareEnabled ? 1 : 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </CardTitle>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Date Range
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {dateRangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={filters.dateRange === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => updateFilters({ dateRange: option.value })}
                className="text-xs"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Period Comparison */}
        <div className="flex items-center space-x-2">
          <Switch
            id="compare"
            checked={filters.compareEnabled}
            onCheckedChange={(checked) => updateFilters({ compareEnabled: checked })}
          />
          <Label htmlFor="compare" className="text-sm">
            Compare with previous period
          </Label>
        </div>

        {/* Filament Types */}
        <div className="space-y-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <Package className="h-4 w-4 mr-2" />
                Filament Types
                {filters.filamentTypes.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {filters.filamentTypes.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select filament types:</Label>
                {availableFilamentTypes.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`filament-${type}`}
                      checked={filters.filamentTypes.includes(type)}
                      onCheckedChange={() => toggleFilamentType(type)}
                    />
                    <Label
                      htmlFor={`filament-${type}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {type}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {filters.filamentTypes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {filters.filamentTypes.map((type) => (
                <Badge
                  key={type}
                  variant="secondary"
                  className="text-xs cursor-pointer"
                  onClick={() => toggleFilamentType(type)}
                >
                  {type} ×
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Printers */}
        <div className="space-y-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <Printer className="h-4 w-4 mr-2" />
                Printers
                {filters.printers.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {filters.printers.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select printers:</Label>
                {availablePrinters.map((printer) => (
                  <div key={printer.name} className="flex items-center space-x-2">
                    <Checkbox
                      id={`printer-${printer.name}`}
                      checked={filters.printers.includes(printer.name)}
                      onCheckedChange={() => togglePrinter(printer.name)}
                    />
                    <Label
                      htmlFor={`printer-${printer.name}`}
                      className="text-sm font-normal cursor-pointer flex items-center gap-2"
                    >
                      <span>{printer.emoji}</span>
                      {printer.name}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {filters.printers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {filters.printers.map((printerName) => {
                const printer = availablePrinters.find(p => p.name === printerName);
                return (
                  <Badge
                    key={printerName}
                    variant="secondary"
                    className="text-xs cursor-pointer"
                    onClick={() => togglePrinter(printerName)}
                  >
                    {printer?.emoji} {printerName} ×
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
