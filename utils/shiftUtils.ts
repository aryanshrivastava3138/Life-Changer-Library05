import { SHIFT_COMBINATIONS, REGISTRATION_FEE } from '@/types/shifts';

export const calculateShiftFee = (selectedShifts: string[]): number => {
  if (selectedShifts.length === 0) return 0;
  
  // Sort shifts to ensure consistent key matching
  const sortedShifts = selectedShifts.sort();
  const key = sortedShifts.join(',');
  
  console.log('Calculating shift fee for:', selectedShifts);
  console.log('Sorted shifts key:', key);
  
  // Check if exact combination exists
  if (SHIFT_COMBINATIONS[key as keyof typeof SHIFT_COMBINATIONS]) {
    const fee = SHIFT_COMBINATIONS[key as keyof typeof SHIFT_COMBINATIONS];
    console.log('Found exact combination, fee:', fee);
    return fee;
  }
  
  // If no exact match, calculate individual shift prices
  let totalFee = 0;
  for (const shift of selectedShifts) {
    const singleShiftFee = SHIFT_COMBINATIONS[shift as keyof typeof SHIFT_COMBINATIONS];
    if (singleShiftFee) {
      totalFee += singleShiftFee;
    }
  }
  
  console.log('No exact combination found, calculated total:', totalFee);
  return totalFee;
};

export const calculateTotalAmount = (selectedShifts: string[]): number => {
  const shiftFee = calculateShiftFee(selectedShifts);
  return REGISTRATION_FEE + shiftFee;
};

export const generateSeatNumbers = (): string[] => {
  return Array.from({ length: 50 }, (_, i) => `S${i + 1}`);
};