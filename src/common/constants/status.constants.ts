/**
 * Centralized status constants for orders and payments
 * These enums should be used across the application for consistency
 */

/**
 * Order status throughout the order lifecycle
 */
export const OrderStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  READY: 'ready',
  SERVED: 'served',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  ABANDONED: 'abandoned',
} as const;

export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];

/**
 * Order priority levels
 */
export const OrderPriority = {
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
  VIP: 'vip',
} as const;

export type OrderPriorityType =
  (typeof OrderPriority)[keyof typeof OrderPriority];

/**
 * Payment status for individual payment records
 */
export const PaymentStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export type PaymentStatusType =
  (typeof PaymentStatus)[keyof typeof PaymentStatus];

/**
 * Order payment status for payment lock feature
 * Used to track payment lifecycle and enforce "no add items after payment initiated" rule
 */
export const OrderPaymentStatus = {
  NONE: 'none', // No payment initiated
  INITIATED: 'initiated', // Payment process started (lock adding items)
  PROCESSING: 'processing', // Payment is being processed
  PAID: 'paid', // Payment completed successfully
  FAILED: 'failed', // Payment failed (may allow retry)
} as const;

export type OrderPaymentStatusType =
  (typeof OrderPaymentStatus)[keyof typeof OrderPaymentStatus];

/**
 * PayOS payment gateway status codes
 */
export const PayOSStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  FAILED: 'FAILED',
  UNDERPAID: 'UNDERPAID',
} as const;

export type PayOSStatusType = (typeof PayOSStatus)[keyof typeof PayOSStatus];

/**
 * Payment method types
 */
export const PaymentMethodType = {
  CASH: 'cash',
  QR: 'qr',
} as const;

export type PaymentMethodTypeValue =
  (typeof PaymentMethodType)[keyof typeof PaymentMethodType];
