export type OrderStatus = 
  | "Pending"
  | "In Progress" 
  | "Ready for QC"
  | "Ready for Delivery"
  | "Delivered";

export type RestorationType = 
  | "Crown"
  | "Bridge"
  | "Zirconia Layer"
  | "Zirco-Max"
  | "Zirconia"
  | "E-max"
  | "PFM"
  | "Metal"
  | "Acrylic";

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
