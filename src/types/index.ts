export * from './order';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'doctor' | 'lab' | 'admin' | 'logistics';

export interface Lab {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  trustScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bid {
  id: string;
  orderId: string;
  labId: string;
  amount: number;
  deliveryDate: Date;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
}

export interface FileUpload {
  id: string;
  orderId: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
