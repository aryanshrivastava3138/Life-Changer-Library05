import { SHIFTS } from '@/types/shifts';

export interface ShiftTimeRange {
  start: { hour: number; minute: number };
  end: { hour: number; minute: number };
  crossesMidnight: boolean;
}

export const getShiftTimeRange = (shiftId: string): ShiftTimeRange | null => {
  const shift = SHIFTS.find(s => s.id === shiftId);
  if (!shift) return null;

  switch (shiftId) {
    case 'morning':
      return {
        start: { hour: 6, minute: 0 },
        end: { hour: 11, minute: 0 },
        crossesMidnight: false
      };
    case 'noon':
      return {
        start: { hour: 11, minute: 0 },
        end: { hour: 16, minute: 0 },
        crossesMidnight: false
      };
    case 'evening':
      return {
        start: { hour: 16, minute: 0 },
        end: { hour: 21, minute: 0 },
        crossesMidnight: false
      };
    case 'night':
      return {
        start: { hour: 21, minute: 0 },
        end: { hour: 5, minute: 0 },
        crossesMidnight: true
      };
    default:
      return null;
  }
};

export const isCurrentTimeInShift = (shiftId: string): boolean => {
  const timeRange = getShiftTimeRange(shiftId);
  if (!timeRange) return false;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  const startTimeInMinutes = timeRange.start.hour * 60 + timeRange.start.minute;
  const endTimeInMinutes = timeRange.end.hour * 60 + timeRange.end.minute;

  if (timeRange.crossesMidnight) {
    // For night shift (21:00 - 05:00), check if current time is after 21:00 OR before 05:00
    return currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes < endTimeInMinutes;
  } else {
    // For other shifts, check if current time is between start and end
    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
  }
};

export const getValidShiftsForCurrentTime = (selectedShifts: string[]): string[] => {
  return selectedShifts.filter(shift => isCurrentTimeInShift(shift));
};

export const formatShiftTime = (shiftId: string): string => {
  const shift = SHIFTS.find(s => s.id === shiftId);
  return shift ? shift.timeRange : '';
};

export const getCurrentTimeString = (): string => {
  return new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};