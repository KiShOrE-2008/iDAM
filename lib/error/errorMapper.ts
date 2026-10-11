import type { AppError, ErrorCategory } from '../../types/index.ts';

/**
 * Generates an 8-character random tracking ID for error correlation
 */
export function generateCorrelationId(): string {
  return 'err_' + Math.random().toString(36).substring(2, 10);
}

/**
 * Sanitizes backend / system errors and transforms them into safe, localized AppErrors.
 * Guarantees that internal SQL strings, schemas, and stack traces are never leaked.
 */
export function mapToAppError(err: unknown, fallbackMessage: string = 'An unexpected error occurred'): AppError {
  const correlationId = generateCorrelationId();

  if (!err) {
    return {
      category: 'UNKNOWN',
      title: 'Unexpected Issue',
      message: fallbackMessage,
      correlationId
    };
  }

  // Already an AppError
  if (typeof err === 'object' && err !== null && 'category' in err && 'title' in err && 'message' in err) {
    const existing = err as AppError;
    return {
      ...existing,
      correlationId: existing.correlationId || correlationId
    };
  }

  // Offline / Network Failure
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      category: 'NETWORK_UNAVAILABLE',
      title: 'No Internet Connection',
      message: 'Please check your mobile data or Wi-Fi connection and try again.',
      actionLabel: 'Retry',
      correlationId
    };
  }

  const rawMessage = (err as any)?.message || String(err);
  const code = (err as any)?.code || (err as any)?.statusCode || (err as any)?.status;

  // Abort / Timeout
  if (rawMessage.includes('aborted') || rawMessage.includes('timeout') || code === 'ABORT_ERR') {
    return {
      category: 'REQUEST_TIMEOUT',
      statusCode: 408,
      title: 'Request Timed Out',
      message: 'The server is taking longer than expected to respond. Please try again.',
      actionLabel: 'Retry',
      correlationId
    };
  }

  // Network Fetch Error
  if (rawMessage.toLowerCase().includes('failed to fetch') || rawMessage.toLowerCase().includes('networkerror')) {
    return {
      category: 'NETWORK_UNAVAILABLE',
      statusCode: 0,
      title: 'Connection Problem',
      message: 'Unable to reach the server. Please verify your connection.',
      actionLabel: 'Retry',
      correlationId
    };
  }

  // Capacity / Double-Booking Conflict
  if (rawMessage.includes('NO_CAPACITY_AVAILABLE') || rawMessage.includes('Capacity full') || code === '409') {
    return {
      category: 'BOOKING_CONFLICT',
      statusCode: 409,
      title: 'Slot No Longer Available',
      message: 'This parking bay was just reserved by another driver. Please choose an alternate time or nearby location.',
      actionLabel: 'Find Nearby Slots',
      fallbackUrl: '/explore',
      correlationId
    };
  }

  // Unauthorized / Session Expired
  if (code === 401 || code === '401' || rawMessage.includes('JWT') || rawMessage.includes('unauthorized')) {
    return {
      category: 'UNAUTHORIZED',
      statusCode: 401,
      title: 'Session Expired',
      message: 'Your session has expired. Please sign in to continue.',
      actionLabel: 'Sign In',
      fallbackUrl: '/login',
      correlationId
    };
  }

  // Forbidden / Permission Denied
  if (code === 403 || code === '403' || rawMessage.includes('row-level security') || rawMessage.includes('permission denied') || rawMessage.includes('WRONG_LOCATION')) {
    return {
      category: 'FORBIDDEN',
      statusCode: 403,
      title: 'Access Restricted',
      message: 'You do not have permission to view or manage this space.',
      actionLabel: 'Go to Home',
      fallbackUrl: '/',
      correlationId
    };
  }

  // Not Found
  if (code === 404 || code === '404' || rawMessage.includes('not found') || rawMessage.includes('PGRST116')) {
    return {
      category: 'NOT_FOUND',
      statusCode: 404,
      title: 'Resource Not Found',
      message: 'The requested parking space, booking, or pass could not be found.',
      actionLabel: 'Browse Spaces',
      fallbackUrl: '/explore',
      correlationId
    };
  }

  // Rate Limiting
  if (code === 429 || code === '429' || rawMessage.includes('Too many requests')) {
    return {
      category: 'RATE_LIMITED',
      statusCode: 429,
      title: 'Too Many Requests',
      message: 'You are making requests too quickly. Please pause for a moment and try again.',
      correlationId
    };
  }

  // PostgreSQL / Database internal errors -> Sanitize completely
  if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) {
    // E.g. PostgreSQL 42P01, 23505, 42703
    return {
      category: 'SERVER_ERROR',
      statusCode: 500,
      title: 'Service Error',
      message: 'We experienced an internal service error. Our operations team has been notified.',
      technicalDetails: `DB_CODE_${code}`,
      actionLabel: 'Try Again',
      correlationId
    };
  }

  return {
    category: 'UNKNOWN',
    title: 'Something Went Wrong',
    message: fallbackMessage,
    technicalDetails: rawMessage.length < 100 ? rawMessage : undefined,
    correlationId
  };
}
