import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card } from '@/components/ui/card';

interface HealthData {
  date: string;
  heartRate: number;
  steps: number;
  calories: number;
  distance: number;
}

interface CombinedHealthHistogramProps {
  data: HealthData[];
}

export const CombinedHealthHistogram = ({ data }: CombinedHealthHistogramProps) => {
  // Normalize data for better visualization (different scales)
  // We'll show actual values in tooltip but normalize for display
  const normalizedData = data.map(item => ({
    date: item.date,
    // Store original values for tooltip
    originalHeartRate: item.heartRate,
    originalSteps: item.steps,
    originalCalories: item.calories,
    originalDistance: item.distance,
    // Normalize to 0-100 scale for visualization
    'Heart Rate': item.heartRate ? Math.min((item.heartRate / 200) * 100, 100) : 0,
    'Steps': item.steps ? Math.min((item.steps / 15000) * 100, 100) : 0,
    'Calories': item.calories ? Math.min((item.calories / 500) * 100, 100) : 0,
    'Distance': item.distance ? Math.min((item.distance / 10) * 100, 100) : 0,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = normalizedData.find(d => d.date === label);
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p style={{ color: 'hsl(var(--danger))' }}>
              Heart Rate: <span className="font-medium">{dataPoint?.originalHeartRate || 0} BPM</span>
            </p>
            <p style={{ color: 'hsl(var(--primary))' }}>
              Steps: <span className="font-medium">{(dataPoint?.originalSteps || 0).toLocaleString()}</span>
            </p>
            <p style={{ color: 'hsl(var(--warning))' }}>
              Calories: <span className="font-medium">{dataPoint?.originalCalories || 0} kcal</span>
            </p>
            <p style={{ color: 'hsl(var(--success))' }}>
              Distance: <span className="font-medium">{(dataPoint?.originalDistance || 0).toFixed(2)} km</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6 gradient-card shadow-custom-md">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Health Metrics Overview</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Combined view of Heart Rate, Steps, Calories & Distance (normalized scale)
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={normalizedData} barCategoryGap="15%">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            angle={-45}
            textAnchor="end"
            height={80}
            interval={Math.ceil(data.length / 10)}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            label={{
              value: 'Normalized Scale (%)',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
          />
          <Bar
            dataKey="Heart Rate"
            fill="hsl(var(--danger))"
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="Steps"
            fill="hsl(var(--primary))"
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="Calories"
            fill="hsl(var(--warning))"
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="Distance"
            fill="hsl(var(--success))"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
