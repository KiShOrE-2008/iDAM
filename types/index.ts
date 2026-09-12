export type VehicleType = 'car' | 'bike' | 'all';

export type Language = 'en' | 'ta';

export interface ParkingLocation {
  id: string;
  title: string;
  titleTa?: string;
  address: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  hourlyRateCar: number;
  hourlyRateBike: number;
  totalSpots: number;
  availableSpots: number;
  amenities: string[];
  operatingHours: string;
  imageUrl: string;
  rating: number;
  reviewsCount: number;
  distanceMeters?: number;
  isVerified?: boolean;
}

export interface BookingRequest {
  parkingLocationId: string;
  vehicleType: 'car' | 'bike';
  bookingDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationHours: number;
  basePrice: number;
  platformFee: number;
  totalAmount: number;
  paymentMethod: 'UPI' | 'Card' | 'Net Banking';
}

export interface Booking {
  id: string;
  passCode: string; // e.g. IDM-82931
  parkingLocation: ParkingLocation;
  vehicleType: 'car' | 'bike';
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  basePrice: number;
  platformFee: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: 'completed' | 'pending' | 'failed';
  status: 'confirmed' | 'active' | 'completed' | 'cancelled';
  qrData: string;
  createdAt: string;
}

export interface SearchFilter {
  query: string;
  vehicleType: VehicleType;
  maxPrice: number;
  sortBy: 'distance' | 'price' | 'rating';
}

export interface UserProfile {
  name: string;
  phone: string;
  email?: string;
  role: 'driver' | 'owner';
  vehicleNumber?: string;
  vehicleType?: 'car' | 'bike';
  // Owner info
  propertyName?: string;
  propertyAddress?: string;
  totalSpots?: number;
  availableSpots?: number;
  hourlyRateCar?: number;
  hourlyRateBike?: number;
}

export interface ParkingInvoice {
  invoiceNumber: string;
  bookingId: string;
  date: string;
  locationName: string;
  address: string;
  durationHours: number;
  baseAmount: number;
  gstAmount: number;
  platformFee: number;
  totalAmount: number;
  paymentMethod: string;
  vehicleNumber: string;
}
