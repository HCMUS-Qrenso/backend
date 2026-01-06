export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum OrderPaymentStatus {
  NONE = 'none',
  INITIATED = 'initiated',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
}

export enum PayOSStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
  UNDERPAID = 'UNDERPAID',
}
