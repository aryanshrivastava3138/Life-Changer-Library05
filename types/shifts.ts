export interface Shift {
  id: 'morning' | 'noon' | 'evening' | 'night';
  name: string;
  timeRange: string;
  price: number;
}

export const SHIFTS: Shift[] = [
  { id: 'morning', name: 'Morning', timeRange: '06:00 AM – 11:00 AM', price: 299 },
  { id: 'noon', name: 'Noon', timeRange: '11:00 AM – 04:00 PM', price: 349 },
  { id: 'evening', name: 'Evening', timeRange: '04:00 PM – 09:00 PM', price: 299 },
  { id: 'night', name: 'Night', timeRange: '09:00 PM – 05:00 AM', price: 299 },
];

export const SHIFT_COMBINATIONS = {
  // Single shifts
  'morning': 299,
  'noon': 349,
  'evening': 299,
  'night': 299,
  
  // Two shift combinations
  'morning,noon': 549,
  'noon,evening': 549,
  'morning,evening': 549,
  'noon,night': 549,
  'evening,night': 549,
  'morning,night': 549,
  
  // Three shift combinations
  'morning,noon,evening': 749,
  'morning,noon,night': 749,
  'morning,evening,night': 749,
  'noon,evening,night': 749,
  
  // All four shifts
  'morning,noon,evening,night': 999,
};

export const REGISTRATION_FEE = 50;