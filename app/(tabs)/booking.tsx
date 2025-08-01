import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { SeatBookingService } from '@/lib/firebase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SHIFTS } from '@/types/shifts';
import { generateSeatNumbers } from '@/utils/shiftUtils';
import { MapPin, Clock, CircleCheck as CheckCircle, CircleAlert as AlertCircle, CreditCard, Banknote, X } from 'lucide-react-native';

export default function BookingScreen() {
  const { user } = useAuth();
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [seatBookings, setSeatBookings] = useState<any[]>([]);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const seatNumbers = generateSeatNumbers();
  const availableShifts = ['morning', 'noon', 'evening', 'night']; // All shifts available for approved users

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Set default shift
      if (availableShifts.length > 0) {
        setSelectedShift(availableShifts[0]);
      }

      // Fetch all seat bookings for today
      const today = new Date().toISOString().split('T')[0];
      const bookingsData = await SeatBookingService.getBookingsByDate(today);
      const bookedBookings = bookingsData.filter(booking => booking.bookingStatus === 'booked');

      if (bookedBookings) {
        setSeatBookings(bookedBookings);
        
        // Filter user's bookings
        const userBookingsData = bookedBookings.filter(booking => booking.userId === user.id);
        setUserBookings(userBookingsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeatBooking = () => {
    if (!user || !selectedSeat || !selectedShift) return;

    // Check if user already has a booking for this shift
    const existingBooking = userBookings.find(booking => booking.shift === selectedShift);
    if (existingBooking) {
      Alert.alert(
        'Already Booked',
        `You've already booked seat ${existingBooking.seatNumber} for the ${selectedShift} shift.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Direct booking for approved users
    handleDirectBooking();
  };

  const handleDirectBooking = async () => {
    if (!user || !selectedSeat || !selectedShift) return;

    setBooking(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const bookingData = await SeatBookingService.createBooking({
          userId: user.id,
          shift: selectedShift,
          seatNumber: selectedSeat,
          bookingStatus: 'booked',
          bookingDate: today,
        });

      Alert.alert(
        'Booking Confirmed!',
        `Your seat ${selectedSeat} for ${selectedShift} shift has been booked successfully!`,
        [{ text: 'OK' }]
      );

      // Refresh bookings
      await fetchData();
      setSelectedSeat('');
    } catch (error) {
      console.error('Error booking seat:', error);
      Alert.alert('Booking Failed', 'Unable to book the seat. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  const isSeatBooked = (seatNumber: string, shift: string): boolean => {
    return seatBookings.some(
      booking => 
        booking.seatNumber === seatNumber && 
        booking.shift === shift && 
        booking.bookingStatus === 'booked'
    );
  };

  const isUserSeat = (seatNumber: string, shift: string): boolean => {
    return userBookings.some(
      booking => 
        booking.seatNumber === seatNumber && 
        booking.shift === shift && 
        booking.bookingStatus === 'booked'
    );
  };

  const hasUserBookedShift = (shift: string): boolean => {
    return userBookings.some(booking => booking.shift === shift);
  };

  const getUserSeatForShift = (shift: string): string | null => {
    const booking = userBookings.find(booking => booking.shift === shift);
    return booking ? booking.seatNumber : null;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user?.approvalStatus !== 'approved') {
    return (
      <View style={styles.container}>
        <Card style={styles.messageCard}>
          <Text style={styles.messageTitle}>Account Approval Required</Text>
          <Text style={styles.messageText}>
            Your account needs to be approved by an administrator before you can book seats.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Book Your Seat</Text>
        <Text style={styles.subtitle}>Select a shift and choose your preferred seat</Text>
      </View>

      {/* Shift Selection */}
      <Card style={styles.shiftCard}>
        <Text style={styles.sectionTitle}>Select Shift</Text>
        <View style={styles.shiftGrid}>
          {SHIFTS.map((shift) => {
            const isBooked = hasUserBookedShift(shift.id);
            const bookedSeat = getUserSeatForShift(shift.id);
            
            return (
              <TouchableOpacity
                key={shift.id}
                style={[
                  styles.shiftOption,
                  selectedShift === shift.id && styles.shiftOptionSelected,
                  isBooked && styles.shiftOptionBooked
                ]}
                onPress={() => {
                  setSelectedShift(shift.id);
                  setSelectedSeat('');
                }}
              >
                <View style={styles.shiftHeader}>
                  <Clock size={20} color={
                    isBooked ? '#10B981' :
                    selectedShift === shift.id ? '#FFFFFF' : '#2563EB'
                  } />
                  {isBooked && <CheckCircle size={20} color="#10B981" />}
                </View>
                <Text style={[
                  styles.shiftName,
                  selectedShift === shift.id && styles.shiftNameSelected,
                  isBooked && styles.shiftNameBooked
                ]}>
                  {shift.name}
                </Text>
                <Text style={[
                  styles.shiftTime,
                  selectedShift === shift.id && styles.shiftTimeSelected,
                  isBooked && styles.shiftTimeBooked
                ]}>
                  {shift.timeRange}
                </Text>
                {isBooked && (
                  <Text style={styles.bookedSeatText}>
                    Booked: {bookedSeat}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Seat Selection */}
      {selectedShift && (
        <Card style={styles.seatCard}>
          <Text style={styles.sectionTitle}>Choose Your Seat</Text>
          
          {/* Booking Status Alert */}
          {hasUserBookedShift(selectedShift) && (
            <View style={styles.alertCard}>
              <AlertCircle size={20} color="#10B981" />
              <Text style={styles.alertText}>
                You've already booked seat {getUserSeatForShift(selectedShift)} for this shift.
              </Text>
            </View>
          )}
          
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>Booked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#2563EB' }]} />
              <Text style={styles.legendText}>Your Seat</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>Selected</Text>
            </View>
          </View>
          
          <View style={styles.seatGrid}>
            {seatNumbers.map((seatNumber) => {
              const isBooked = isSeatBooked(seatNumber, selectedShift);
              const isUserBooked = isUserSeat(seatNumber, selectedShift);
              const userHasBookedShift = hasUserBookedShift(selectedShift);
              
              return (
                <TouchableOpacity
                  key={seatNumber}
                  style={[
                    styles.seat,
                    isUserBooked ? styles.seatUserBooked :
                    isBooked ? styles.seatBooked :
                    selectedSeat === seatNumber ? styles.seatSelected :
                    styles.seatAvailable
                  ]}
                  onPress={() => {
                    if (userHasBookedShift) {
                      Alert.alert(
                        'Already Booked',
                        `You've already booked a seat for the ${selectedShift} shift.`
                      );
                      return;
                    }
                    
                    if (!isBooked && !isUserBooked) {
                      setSelectedSeat(selectedSeat === seatNumber ? '' : seatNumber);
                    }
                  }}
                  disabled={isBooked || userHasBookedShift}
                >
                  {isUserBooked && <CheckCircle size={12} color="#FFFFFF" />}
                  <Text style={[
                    styles.seatText,
                    (isBooked || isUserBooked || selectedSeat === seatNumber) && styles.seatTextSelected
                  ]}>
                    {seatNumber}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedSeat && !hasUserBookedShift(selectedShift) && (
            <Button
              title={booking ? 'Submitting...' : `Submit Booking for Seat ${selectedSeat}`}
              onPress={handleSeatBooking}
              disabled={booking}
              style={styles.bookButton}
            />
          )}
        </Card>
      )}

      {/* Booking Summary */}
      {userBookings.length > 0 && (
        <Card style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Your Booking Requests</Text>
          {userBookings.map((booking) => (
            <View key={booking.id} style={styles.bookingItem}>
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingShift}>{booking.shift.toUpperCase()}</Text>
                <Text style={styles.bookingSeat}>Seat {booking.seatNumber}</Text>
                <Text style={[
                  styles.bookingStatus,
                  { color: booking.bookingStatus === 'booked' ? '#10B981' : '#F59E0B' }
                ]}>
                  {booking.bookingStatus === 'booked' ? 'Approved' : 'Pending Approval'}
                </Text>
              </View>
              {booking.bookingStatus === 'booked' ? (
                <CheckCircle size={20} color="#10B981" />
              ) : (
                <Clock size={20} color="#F59E0B" />
              )}
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },
  messageCard: {
    margin: 16,
    alignItems: 'center',
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  shiftCard: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  shiftGrid: {
    gap: 12,
  },
  shiftOption: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  shiftOptionSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  shiftOptionBooked: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shiftName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  shiftNameSelected: {
    color: '#FFFFFF',
  },
  shiftNameBooked: {
    color: '#10B981',
  },
  shiftTime: {
    fontSize: 14,
    color: '#64748B',
  },
  shiftTimeSelected: {
    color: '#FFFFFF',
  },
  shiftTimeBooked: {
    color: '#059669',
  },
  bookedSeatText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 4,
  },
  seatCard: {
    margin: 16,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  alertText: {
    fontSize: 14,
    color: '#059669',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#64748B',
  },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 24,
  },
  seat: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'column',
  },
  seatAvailable: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  seatBooked: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  seatUserBooked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  seatSelected: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  seatText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  seatTextSelected: {
    color: '#FFFFFF',
  },
  bookButton: {
    marginTop: 16,
  },
  summaryCard: {
    margin: 16,
    marginBottom: 32,
  },
  bookingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 8,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingShift: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  bookingSeat: {
    fontSize: 14,
    color: '#64748B',
  },
  bookingStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  pendingPaymentsCard: {
    margin: 16,
    marginBottom: 32,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingPaymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    marginBottom: 8,
  },
  pendingPaymentInfo: {
    flex: 1,
  },
  pendingPaymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
  },
  pendingPaymentType: {
    fontSize: 12,
    color: '#92400E',
  },
  pendingPaymentDate: {
    fontSize: 10,
    color: '#92400E',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pendingText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  pendingNote: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
});
