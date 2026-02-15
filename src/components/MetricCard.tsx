import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'stable';
  status?: 'normal' | 'warning' | 'danger';
  animate?: boolean;
}

export const MetricCard = ({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  status = 'normal',
  animate = false,
}: MetricCardProps) => {
  const statusColors = {
    normal: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  };

  const iconBgColors = {
    normal: 'bg-success-light',
    warning: 'bg-warning-light',
    danger: 'bg-danger-light',
  };

  return (
    <Card className="p-6 gradient-card shadow-custom-md hover:shadow-custom-lg transition-all duration-300 border-border/50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${statusColors[status]}`}>
              {value}
            </span>
            <span className="text-sm text-muted-foreground">{unit}</span>
          </div>
          {trend && (
            <p className="text-xs text-muted-foreground mt-2">
              {trend === 'up' && '↑ Increasing'}
              {trend === 'down' && '↓ Decreasing'}
              {trend === 'stable' && '→ Stable'}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBgColors[status]} ${animate ? 'animate-heartbeat' : ''}`}>
          <Icon className={`h-6 w-6 ${statusColors[status]}`} />
        </div>
      </div>
    </Card>
  );
};
