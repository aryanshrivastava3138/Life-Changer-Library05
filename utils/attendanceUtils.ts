export interface AbsentRecord {
  user_id: string;
  shift: string;
  date: string;
  status: 'absent';
  reason: 'no_checkin';
  created_at: string;
}

export const getShiftEndTime = (shift: string): { hour: number; minute: number } => {
  switch (shift) {
    case 'morning':
      return { hour: 11, minute: 0 }; // 11:00 AM
    case 'noon':
      return { hour: 16, minute: 0 }; // 04:00 PM
    case 'evening':
      return { hour: 21, minute: 0 }; // 09:00 PM
    case 'night':
      return { hour: 5, minute: 0 };  // 05:00 AM (next day)
    default:
      return { hour: 0, minute: 0 };
  }
};

export const isShiftEnded = (shift: string): boolean => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  const endTime = getShiftEndTime(shift);
  const endTimeInMinutes = endTime.hour * 60 + endTime.minute;
  
  if (shift === 'night') {
    // Night shift ends at 5:00 AM next day
    // If current time is after 5:00 AM, night shift has ended
    return currentTimeInMinutes >= endTimeInMinutes;
  } else {
    // For other shifts, check if current time is past end time
    return currentTimeInMinutes >= endTimeInMinutes;
  }
};

export const formatAbsentMessage = (shift: string): string => {
  const shiftName = shift.charAt(0).toUpperCase() + shift.slice(1);
  return `You are absent ${shiftName} shift`;
};

export const getAbsentStatusColor = (): string => '#EF4444'; // Red color for absent status

export const shouldMarkAbsent = (shift: string, hasCheckedIn: boolean): boolean => {
  return isShiftEnded(shift) && !hasCheckedIn;
};