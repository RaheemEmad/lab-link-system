export type OrderStatus = 
  | "Pending"
  | "In Progress" 
  | "Ready for QC"
  | "Ready for Delivery"
  | "Delivered"
  | "Cancelled";

export type RestorationType = 
  | "Zirconia"
  | "Zirconia Layer"
  | "Zirco-Max"
  | "PFM"
  | "Acrylic"
  | "E-max";

export type UrgencyLevel = "Normal" | "Urgent";

export type ShadeSystem = "VITA Classical" | "VITA 3D-Master";

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
