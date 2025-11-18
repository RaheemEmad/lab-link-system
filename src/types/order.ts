export type OrderStatus = 
  | "Pending"
  | "In Progress" 
  | "Ready for QC"
  | "Ready for Delivery"
  | "Delivered";

export type CrownType = 
  | "Zirconia"
  | "E-max"
  | "PFM"
  | "Metal"
  | "Acrylic";

export type UrgencyLevel = "Normal" | "Urgent";

export interface Order {
  id: string;
  timestamp: Date;
  doctorName: string;
  patientName: string;
  crownType: CrownType;
  teethShade: string;
  teethNumber: string;
  biologicalNotes: string;
  urgency: UrgencyLevel;
  photosLink?: string;
  price?: number;
  status: OrderStatus;
  shipmentTracking?: string;
  deliveryDate?: Date;
}
