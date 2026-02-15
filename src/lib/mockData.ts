export interface HealthReading {
  id: string;
  timestamp: Date;
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  oxygenLevel: number;
  temperature: number;
}

export interface Alert {
  id: string;
  severity: 'low' | 'moderate' | 'high';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface UserProfile {
  name: string;
  age: number;
  gender: string;
  email: string;
}

export const userProfile: UserProfile = {
  name: 'Alex Johnson',
  age: 34,
  gender: 'Male',
  email: 'alex.johnson@email.com',
};

// Generate realistic health data for the past 7 days
export const generateHealthReadings = (): HealthReading[] => {
  const readings: HealthReading[] = [];
  const now = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Generate 3 readings per day
    for (let j = 0; j < 3; j++) {
      const readingDate = new Date(date);
      readingDate.setHours(8 + j * 6, Math.floor(Math.random() * 60), 0, 0);

      readings.push({
        id: `reading-${i}-${j}`,
        timestamp: readingDate,
        heartRate: 65 + Math.floor(Math.random() * 20), // 65-85 BPM
        bloodPressureSystolic: 115 + Math.floor(Math.random() * 15), // 115-130
        bloodPressureDiastolic: 75 + Math.floor(Math.random() * 10), // 75-85
        oxygenLevel: 96 + Math.floor(Math.random() * 4), // 96-100%
        temperature: 97.5 + Math.random() * 1.5, // 97.5-99°F
      });
    }
  }

  return readings.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

export const healthReadings = generateHealthReadings();

export const getLatestReading = (): HealthReading => {
  return healthReadings[0];
};

export const calculateRiskLevel = (reading: HealthReading): 'low' | 'moderate' | 'high' => {
  let riskScore = 0;

  // Heart rate check
  if (reading.heartRate < 60 || reading.heartRate > 100) riskScore += 2;
  else if (reading.heartRate > 90) riskScore += 1;

  // Blood pressure check
  if (reading.bloodPressureSystolic > 140 || reading.bloodPressureDiastolic > 90) riskScore += 2;
  else if (reading.bloodPressureSystolic > 130 || reading.bloodPressureDiastolic > 85) riskScore += 1;

  // Oxygen level check
  if (reading.oxygenLevel < 95) riskScore += 2;
  else if (reading.oxygenLevel < 97) riskScore += 1;

  // Temperature check
  if (reading.temperature > 100.4 || reading.temperature < 97) riskScore += 2;
  else if (reading.temperature > 99.5) riskScore += 1;

  if (riskScore >= 4) return 'high';
  if (riskScore >= 2) return 'moderate';
  return 'low';
};

export const alerts: Alert[] = [
  {
    id: 'alert-1',
    severity: 'low',
    title: 'Stay Hydrated',
    message: 'Remember to drink at least 8 glasses of water today for optimal health.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: false,
  },
  {
    id: 'alert-2',
    severity: 'moderate',
    title: 'Blood Pressure Trending Up',
    message: 'Your blood pressure has been slightly elevated over the past 3 days. Consider reducing salt intake.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    read: false,
  },
  {
    id: 'alert-3',
    severity: 'low',
    title: 'Great Progress!',
    message: 'Your heart rate has been consistently in the healthy range. Keep up the good work!',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
    read: true,
  },
  {
    id: 'alert-4',
    severity: 'low',
    title: 'Exercise Reminder',
    message: 'Aim for at least 30 minutes of moderate exercise today.',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    read: true,
  },
];

export const recommendations = [
  {
    id: 'rec-1',
    title: 'Maintain Regular Exercise',
    description: 'Continue your current exercise routine to keep your heart health optimal.',
    icon: 'activity',
  },
  {
    id: 'rec-2',
    title: 'Monitor Blood Pressure',
    description: 'Check your blood pressure at the same time daily for consistent tracking.',
    icon: 'heart-pulse',
  },
  {
    id: 'rec-3',
    title: 'Balanced Diet',
    description: 'Focus on whole foods, lean proteins, and plenty of vegetables.',
    icon: 'apple',
  },
  {
    id: 'rec-4',
    title: 'Adequate Sleep',
    description: 'Aim for 7-9 hours of quality sleep each night for better overall health.',
    icon: 'moon',
  },
];
