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
  paymentMethod: 'Razorpay' | 'UPI' | 'Card' | 'Net Banking' | string;
  paymentId?: string;
  razorpayOrderId?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
}

export interface Booking {
  id: string;
  passCode: string; // e.g. IDM-82931
  passToken?: string;
  passTokenHash?: string;
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
  paymentId?: string;
  razorpayOrderId?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  status: 'confirmed' | 'active' | 'completed' | 'cancelled';
  qrData: string;
  createdAt: string;
  checkInAt?: string;
  checkOutAt?: string;
  checkedInBy?: string;
  checkedOutBy?: string;
}

export type PassValidationStatus =
  | 'valid'
  | 'already_active'
  | 'already_completed'
  | 'cancelled'
  | 'expired'
  | 'early_arrival'
  | 'wrong_location'
  | 'unpaid'
  | 'not_found'
  | 'invalid_format';

export interface PassVerificationResult {
  isValid: boolean;
  statusCode: PassValidationStatus;
  message: string;
  booking?: Booking;
  rawPayload?: string;
  passCode?: string;
  locationTitle?: string;
  vehicleNumber?: string;
  checkInAt?: string;
  checkOutAt?: string;
}

export interface SearchFilter {
  query: string;
  vehicleType: VehicleType;
  maxPrice: number;
  sortBy: 'distance' | 'price' | 'rating';
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
}

export interface UserProfile {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  role: 'driver' | 'owner';
  ownerStatus?: 'none' | 'pending' | 'approved' | 'rejected';
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

export type ErrorCategory =
  | 'NETWORK_UNAVAILABLE'
  | 'REQUEST_TIMEOUT'
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BOOKING_CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'UNKNOWN';

export interface AppError {
  category: ErrorCategory;
  statusCode?: number;
  title: string;
  message: string;
  technicalDetails?: string;
  correlationId?: string;
  actionLabel?: string;
  onRetry?: () => void | Promise<void>;
  fallbackUrl?: string;
}

export type RequestState = 'idle' | 'loading' | 'success' | 'empty' | 'error';
