export interface User {
  id: string;
  email: string;
}

export interface Session {
  user: User;
  access_token: string;
  refresh_token?: string;
}

export interface Email {
  id: string;
  from: {
    name: string;
    email: string;
  };
  to: {
    name: string;
    email: string;
  }[];
  subject: string;
  body: string;
  preview: string;
  isRead: boolean;
  isImportant?: boolean;
  date: string;
  attachments?: {
    name: string;
    url: string;
    size: number;
    mimeType: string;
    attachmentId?: string;
    partId?: string;
  }[];
  threadId?: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  messageListVisibility?: 'show' | 'hide';
  labelListVisibility?: 'labelShow' | 'labelHide' | 'labelShowIfUnread';
  type?: 'system' | 'user';
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
}

export interface OutOfOfficeSettings {
  forwardToEmail: string;
  autoReplyMessage: string;
}

export interface Profile {
  id: string;
  name: string;
  passcode?: string;
  avatar?: string;
  gmail_access_token?: string;
  gmail_refresh_token?: string;
  gmail_token_expiry?: string;
  signature?: string;
  out_of_office_settings?: OutOfOfficeSettings;
}

// Order-related types
export type OrderStatus = 'Pending' | 'Sent' | 'Reply Received' | 'Completed' | 'In Progress' | 'Draft';
export type OrderType = 'Price Request' | 'Customer Order' | 'Customer Invoice';
export type PaymentOption = 'Installments' | 'Full payment';
export type PaymentStatus = 'Unpaid' | 'Paid' | 'Partially Paid';

export interface Order {
  id: string;
  projectName: string;
  type: OrderType;
  status: OrderStatus;
  date: string;
  createdBy: string;
  
  // New fields from webhook response
  orderNumber?: string;
  customerName?: string;
  orderDate?: string;
  expectedDueDate?: string;
  orderAmount?: number;
  paymentOption?: PaymentOption;
  paymentStatus?: PaymentStatus;
  productDetails?: string;
  user?: string;
  depositAmount?: number;
  paymentsHistory?: Array<{ date: string; amount: number }>;
}

export interface PriceRequest extends Order {
  type: 'Price Request';
  teams: PriceRequestTeam[];
  description?: string;
  dueDate?: string;
  threadId?: string;
}

export interface CustomerOrder extends Order {
  type: 'Customer Order';
  customer: {
    name: string;
    email: string;
    address?: string;
  };
  items: InvoiceItem[];
  total: number;
  currency: string;
  paymentDue?: string;
}

export interface PriceRequestTeam {
  id: string;
  name: string;
  submitted: boolean;
  amount?: number;
  currency?: string;
  comments?: string;
  requestedOn: string;
  email: string;
  threadId?: string;
}

export interface CustomerInvoice extends Order {
  type: 'Customer Invoice';
  customer: {
    name: string;
    email: string;
    address?: string;
  };
  items: InvoiceItem[];
  total: number;
  currency: string;
  paymentDue?: string;
  paymentStatus?: 'Unpaid' | 'Partially Paid' | 'Paid';
}

export interface InvoiceItem {
  id: string;
  item?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

// Shipment-related types
export interface Shipment {
  id: number;
  ref: string;
  consignee: string;
  shipper: string;
  vessel_carrier: string;
  etd: string; // Estimated Time of Departure
  eta: string; // Estimated Time of Arrival
  container_n: string;
  description_of_goods: string;
  shipping_status: string;
}

// Document-related types
export interface GeneralDocument {
  id: string;
  file_name: string;
  document_url: string;
  uploaded_at: string;
}

// Contact-related types
export interface Contact {
  name: string;
  email: string;
  isFrequentlyContacted?: boolean;
  photoUrl?: string;
}