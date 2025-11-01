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
  internalDate: any;
  id: string;
  from: {
    name: string;
    email: string;
  };
  to: {
    name: string;
    email: string;
  }[];
  cc?: {
    name: string;
    email: string;
  }[];
  subject: string;
  body: string;
  preview: string;
  isRead: boolean;
  isImportant?: boolean;
  isStarred?: boolean;
  date: string;
  labelIds?: string[]; // Gmail label IDs assigned to this email
  attachments?: {
    name: string;
    url: string;
    size: number;
    mimeType: string;
    attachmentId?: string;
    partId?: string;
  }[];
  inlineAttachments?: {
    cid: string;
    attachmentId: string;
    mimeType: string;
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
  isOutOfOffice: boolean;
  autoReplyMessage: string;
}

export interface Profile {
  id: string;
  name: string;
  passcode?: string;
  avatar?: string;
  userEmail?: string;
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
export type PaymentStatus = 'Order in Progress' | 'Paid in Full';

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
  orderAmount?: number;
  paymentOption?: PaymentOption;
  paymentStatus?: PaymentStatus;
  productDetails?: string;
  user?: string;
  depositAmount?: number;
  paymentsHistory?: Array<{
    date: string;
    amount: number;
    method?: PaymentMethod;
  }>;
}

export interface PriceRequest extends Order {
  type: 'Price Request';
  teams: PriceRequestTeam[];
  description?: string;
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
  isEdited?: boolean;
  originalInvoiceId?: string;
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
  paymentStatus?: 'Order in Progress' | 'Paid in Full';
}

// Payment method type
export type PaymentMethod = 'cash' | 'check' | 'card' | 'other';

// Payment entry interface
export interface PaymentEntry {
  date: string;
  amount: number;
  method?: PaymentMethod;
}

// Database-specific interfaces for the new Supabase tables
export interface SupabaseInvoice {
  id?: string; // Optional for new records
  po_number?: string;
  invoice_date: string;
  customer_name: string;
  customer_address?: string;
  customer_city?: string;
  customer_state?: string;
  customer_zip?: string;
  customer_tel1?: string;
  customer_tel2?: string;
  customer_email?: string;
  subtotal: number;
  discount_amount?: number;
  tax_amount: number;
  total_amount: number;
  deposit_amount?: number; // Made optional
  balance_due: number;
  payments_history?: PaymentEntry[];
  is_edited?: boolean;
  original_invoice_id?: string;
  order_id?: string; // Link back to order if needed
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseInvoiceLineItem {
  id?: string; // Optional for new records
  invoice_id: string;
  item_code?: string;
  description: string;
  brand?: string; // Brand field for internal invoices
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at?: string;
}

export interface SupabaseSupplier {
  id?: string;
  display_name: string;
  company_name?: string;
  email?: string;
  phone_primary?: string;
  phone_secondary?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  contact_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseOrder {
  id?: string;
  order_number?: string;
  order_date: string;
  due_date?: string;
  supplier_id: string;
  external_ref?: string;
  status?: string;
  terms?: string;
  currency?: string;
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  shipping_amount?: number;
  total_amount?: number;
  deposit_amount?: number;
  balance_due?: number;
  notes?: string;
  attachments?: any;
  payments_history?: PaymentEntry[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseOrderWithSupplier extends SupabaseOrder {
  suppliers?: SupabaseSupplier;
}

export interface SupabaseOrderLineItem {
  id?: string;
  order_id: string;
  line_index?: number;
  item_code?: string;
  description: string;
  quantity: number;
  unit_price?: number;
  line_total?: number;
  brand?: string;
  created_at?: string;
}

export interface InvoiceItem {
  id: string;
  item?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Shipment {
  id: number;
  ref: string; // Reference/ritiro_id
  etd?: string | null; // Allow null for empty dates
  eta?: string | null; // Allow null for empty dates
  container_n?: string;
}

// Document-related types
export interface GeneralDocument {
  id: string;
  file_name: string;
  document_url: string;
  uploaded_at: string;
}

export interface ShipmentDocument {
  id: string;
  shipment_id: number | null; // Foreign key to shipments table, null for bulk uploads
  file_name: string;
  drive_file_id: string; // Google Drive file ID
  drive_file_url?: string; // Google Drive viewable URL
  file_size?: number;
  file_type?: string;
  uploaded_by?: string;
  uploaded_at: string;
}

// Contact-related types
export interface Contact {
  name: string;
  email: string;
  isFrequentlyContacted?: boolean;
  photoUrl?: string;
}

// Gmail Filter-related types
export interface GmailFilterCriteria {
  from?: string;
  to?: string;
  subject?: string;
  query?: string;
  hasAttachment?: boolean;
  size?: number;
  sizeComparison?: 'larger' | 'smaller';
  excludeChats?: boolean;
}

export interface GmailFilterAction {
  addLabelIds?: string[];
  removeLabelIds?: string[];
  forward?: string;
  markAsRead?: boolean;
  markAsSpam?: boolean;
  markAsImportant?: boolean;
  delete?: boolean;
  neverSpam?: boolean;
}

export interface GmailFilter {
  id: string;
  criteria: GmailFilterCriteria;
  action: GmailFilterAction;
}
