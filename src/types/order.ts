export const ORDER_STATUSES = [
  "Pending",
  "In Progress",
  "Ready for QC",
  "Ready for Delivery",
  "Delivered",
  "Cancelled",
] as const;

export const RESTORATION_TYPES = [
  "Zirconia",
  "Zirconia Layer",
  "Zirco-Max",
  "PFM",
  "Acrylic",
  "E-max",
] as const;

export const URGENCY_LEVELS = ["Normal", "Urgent"] as const;

export const SHADE_SYSTEMS = ["VITA Classical", "VITA 3D-Master"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type RestorationType = (typeof RESTORATION_TYPES)[number];
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];
export type ShadeSystem = (typeof SHADE_SYSTEMS)[number];

export interface Order {
  id: string;
  timestamp: Date;
  doctorName: string;
  patientName: string;
  restorationType: RestorationType;
  teethShade: string;
  teethNumber: string;
  biologicalNotes: string;
  urgency: UrgencyLevel;
  photosLink?: string;
  htmlExport?: string;
  shadeSystem?: ShadeSystem;
  price?: number;
  status: OrderStatus;
  shipmentTracking?: string;
  deliveryDate?: Date;
}

export interface OrderFilters {
  status?: OrderStatus;
  doctorName?: string;
  patientName?: string;
  urgency?: UrgencyLevel;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface OrderQueryOptions {
  limit?: number;
  offset?: number;
  filters?: OrderFilters;
  sortBy?: keyof Order;
  sortOrder?: "asc" | "desc";
}
