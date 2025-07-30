import { AdmissionService, AttendanceService } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    const { date } = await request.json();
    const checkDate = date || new Date().toISOString().split('T')[0];
    
    // Get all students with active admissions
    const admissions = await AdmissionService.getWhere('admissions', 'paymentStatus', '==', 'paid');

    // Get all attendance records for the date
    const attendanceRecords = await AttendanceService.getWhere('attendance', 'date', '==', checkDate);

    const absentStudents = [];
    const currentTime = new Date();
    const currentHour = currentTime.getHours();

    // Check each student's shifts
    for (const admission of admissions) {
      for (const shift of admission.selectedShifts) {
        // Check if shift has ended
        let shiftEnded = false;
        
        switch (shift) {
          case 'morning':
            shiftEnded = currentHour >= 11; // 11:00 AM
            break;
          case 'noon':
            shiftEnded = currentHour >= 16; // 04:00 PM
            break;
          case 'evening':
            shiftEnded = currentHour >= 21; // 09:00 PM
            break;
          case 'night':
            // Night shift ends at 5:00 AM next day
            shiftEnded = currentHour >= 5 && currentHour < 21;
            break;
        }

        if (shiftEnded) {
          // Check if student checked in for this shift
          const hasCheckedIn = attendanceRecords?.some(
            record => 
              record.userId === admission.userId && 
              record.shift === shift && 
              record.checkInTime
          );

          if (!hasCheckedIn) {
            absentStudents.push({
              userId: admission.userId,
              shift,
              date: checkDate,
              status: 'absent',
              reason: 'no_checkin'
            });
          }
        }
      }
    }

    // Log absent students (you could store this in a separate table if needed)
    console.log(`Found ${absentStudents.length} absent students for ${checkDate}:`, absentStudents);

    return Response.json({
      success: true,
      date: checkDate,
      absentCount: absentStudents.length,
      absentStudents
    });

  } catch (error) {
    console.error('Error checking absent students:', error);
    return Response.json(
      { error: 'Failed to check absent students' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  
  // Redirect to POST with the date
  return POST(new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date })
  }));
}