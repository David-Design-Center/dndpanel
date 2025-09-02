import { PriceRequest, OrderStatus, CustomerOrder, Shipment, GeneralDocument, ShipmentDocument, SupabaseInvoice, SupabaseInvoiceLineItem } from '../types';
import { supabase } from '../lib/supabase'; // Use the centralized Supabase client
import { getUnreadEmails, markEmailAsRead } from './emailService';
import { emitLabelUpdateEvent } from '../utils/labelUpdateEvents';

// Cache for price requests
const priceRequestsCache: {
  data: PriceRequest[];
  timestamp: number;
} = {
  data: [],
  timestamp: 0
};

// Cache for customer orders
const customerOrdersCache: {
  data: CustomerOrder[];
  timestamp: number;
} = {
  data: [],
  timestamp: 0
};

// Cache for dashboard metrics
const dashboardMetricsCache: {
  data: DashboardMetrics | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

// Cache for monthly revenue
const monthlyRevenueCache: {
  data: MonthlyRevenue[] | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

// Cache for recent orders
const recentOrdersCache: {
  data: RecentOrder[] | null;
  date: string | null;
  timestamp: number;
} = {
  data: null,
  date: null,
  timestamp: 0
};

// Cache for shipments
const shipmentsCache: {
  data: Shipment[] | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

// Cache for general documents
const generalDocumentsCache: {
  data: GeneralDocument[] | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

// Cache for invoice by order ID
const invoiceByOrderIdCache: {
  [orderId: string]: {
    data: SupabaseInvoice | null;
    lineItems: SupabaseInvoiceLineItem[];
    timestamp: number;
  };
} = {};

// Cache for under-deposit invoices
let underDepositInvoicesCache: {
  invoices: any[];
  timestamp: number;
} | null = null;

// Cache for brand analytics
let brandAnalyticsCache: {
  data: BrandAnalytics[];
  timestamp: number;
} | null = null;

// Cache for item analytics
let itemAnalyticsCache: {
  data: ItemAnalytics[];
  timestamp: number;
} | null = null;

// Variable to track the current fetch operation
let currentFetchPromise: Promise<PriceRequest[]> | null = null;
let currentCustomerOrdersFetchPromise: Promise<CustomerOrder[]> | null = null;
let currentDashboardFetchPromise: Promise<DashboardMetrics> | null = null;
let currentMonthlyRevenueFetchPromise: Promise<MonthlyRevenue[]> | null = null;
let currentRecentOrdersFetchPromise: Promise<RecentOrder[]> | null = null;
let currentShipmentsFetchPromise: Promise<Shipment[]> | null = null;
let currentGeneralDocumentsFetchPromise: Promise<GeneralDocument[]> | null = null;

// Cache duration: 12 hours in milliseconds
const CACHE_DURATION_MS = 12 * 60 * 60 * 1000;

// Dashboard metrics interface
export interface DashboardMetrics {
  totalOrders: number;
  customerOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalCustomers: number;
  staffMetrics: {
    [staffName: string]: {
      totalOrders: number;
      customerOrders: number;
      totalRevenue: number;
      customers: number;
    };
  };
  statusBreakdown: {
    [status: string]: number;
  };
  paymentStatusBreakdown: {
    [status: string]: {
      count: number;
      totalAmount: number;
    };
  };
}

// Monthly revenue interface
export interface MonthlyRevenue {
  month: string; // e.g., "Jan"
  total: number;
}

// Recent order interface
export interface RecentOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  date: string;
  createdBy: string;
}

// Brand analytics interface
export interface BrandAnalytics {
  brandName: string;
  totalItems: number;
  totalRevenue: number;
  itemCount: number;
  averageItemValue: number;
}

// Item analytics interface
export interface ItemAnalytics {
  itemDescription: string;
  brand: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
  averagePrice: number;
}

/**
 * Check if the cache is valid
 * @returns Boolean indicating if the cache is valid
 */
const isCacheValid = (cache: { data: any; timestamp: number }): boolean => {
  return (
    cache.data &&
    Date.now() - cache.timestamp < CACHE_DURATION_MS
  );
};

/**
 * Clear the price requests cache
 */
export const clearPriceRequestsCache = (): void => {
  priceRequestsCache.data = [];
  priceRequestsCache.timestamp = 0;
};

/**
 * Clear the customer orders cache
 */
export const clearCustomerOrdersCache = (): void => {
  customerOrdersCache.data = [];
  customerOrdersCache.timestamp = 0;
};

/**
 * Clear the dashboard metrics cache
 */
export const clearDashboardMetricsCache = (): void => {
  dashboardMetricsCache.data = null;
  dashboardMetricsCache.timestamp = 0;
};

/**
 * Clear the monthly revenue cache
 */
export const clearMonthlyRevenueCache = (): void => {
  monthlyRevenueCache.data = null;
  monthlyRevenueCache.timestamp = 0;
};

/**
 * Clear the recent orders cache
 */
export const clearRecentOrdersCache = (): void => {
  recentOrdersCache.data = null;
  recentOrdersCache.date = null;
  recentOrdersCache.timestamp = 0;
};

/**
 * Clear the shipments cache
 */
export const clearShipmentsCache = (): void => {
  shipmentsCache.data = null;
  shipmentsCache.timestamp = 0;
};

/**
 * Clear the general documents cache
 */
export const clearGeneralDocumentsCache = (): void => {
  generalDocumentsCache.data = null;
  generalDocumentsCache.timestamp = 0;
};

/**
 * Clear the invoice cache for a specific order ID
 */
export const clearInvoiceByOrderIdCache = (orderId: string): void => {
  if (invoiceByOrderIdCache[orderId]) {
    delete invoiceByOrderIdCache[orderId];
  }
};

/**
 * Fetch invoices that don't have the standard 50% deposit
 */
export const fetchUnderDepositInvoices = async (forceRefresh = false, profileName?: string): Promise<any[]> => {
  // Return cached data if valid and not forcing refresh
  if (!forceRefresh && underDepositInvoicesCache && (Date.now() - underDepositInvoicesCache.timestamp < CACHE_DURATION_MS)) {
    console.log('Returning cached under-deposit invoices');
    return underDepositInvoicesCache.invoices;
  }

  try {
    // Build query based on user role
    let query = supabase
      .from('invoices')
      .select('*');

    // Role-based filtering
    if (profileName === 'David') {
      // David (admin) can see all invoices
      query = query.order('invoice_date', { ascending: false });
    } else if (profileName && ['Marti', 'Natalia', 'Dimitry'].includes(profileName)) {
      // Staff can only see their own invoices
      query = query
        .eq('created_by', profileName)
        .order('invoice_date', { ascending: false });
    } else {
      // If no valid profile, query all (for backward compatibility)
      query = query.order('invoice_date', { ascending: false });
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching under-deposit invoices:', error);
      throw error;
    }
    
    // Filter invoices where deposit is less than 50% of total amount
    const underDepositInvoices = (data || []).filter(invoice => {
      const totalAmount = parseFloat(invoice.total_amount) || 0;
      
      // Calculate deposit from payments_history
      let depositAmount = 0;
      if (invoice.payments_history && Array.isArray(invoice.payments_history)) {
        depositAmount = invoice.payments_history.reduce((sum: number, payment: any) => {
          return sum + (parseFloat(payment.amount) || 0);
        }, 0);
      }
      
      // Check if deposit is less than 50% of total
      const requiredDeposit = totalAmount * 0.5;
      return depositAmount < requiredDeposit;
    });
    
    // Update cache
    underDepositInvoicesCache = {
      invoices: underDepositInvoices,
      timestamp: Date.now()
    };
    
    console.log(`Fetched ${underDepositInvoices.length} under-deposit invoices`);
    return underDepositInvoices;
  } catch (error) {
    console.error('Error in fetchUnderDepositInvoices:', error);
    // If in development or testing, return mock data for easier development
    if (import.meta.env.DEV) {
      console.log('Returning mock under-deposit invoices for development');
      const mockData = [
        {
          id: '1',
          po_number: 'INV-001',
          invoice_date: '2025-07-15',
          customer_name: 'Johnson Residence',
          total_amount: 5000,
          deposit_amount: 1000,
          balance_due: 4000
        },
        {
          id: '2',
          po_number: 'INV-002',
          invoice_date: '2025-07-12',
          customer_name: 'Smith Renovation',
          total_amount: 8500,
          deposit_amount: 2500,
          balance_due: 6000
        }
      ];
      return mockData;
    }
    throw error;
  }
};

/**
 * Generate the next sequential order number in the format "PO XXXXX"
 * @returns Promise<string> The next order number (e.g., "PO 10701")
 */
export const generateNextOrderNumber = async (): Promise<string> => {
  try {
    console.log('Generating next order number...');
    
    // Query all customer orders to find existing order numbers
    const { data, error } = await supabase
      .from('invoices')
      .select('order_number')
      .eq('type', 'Customer Order')
      .not('order_number', 'is', null);

    if (error) {
      console.error('Error fetching order numbers:', error);
      throw error;
    }

    let maxNumber = 10699; // Start at 10699 so the first PO will be 10700
    
    if (data && data.length > 0) {
      // Parse all existing PO numbers and find the maximum
      for (const row of data) {
        const orderNumber = row.order_number;
        if (orderNumber && typeof orderNumber === 'string' && orderNumber.startsWith('PO ')) {
          const numberPart = orderNumber.substring(3).trim(); // Remove "PO " prefix
          const parsedNumber = parseInt(numberPart, 10);
          
          if (!isNaN(parsedNumber) && parsedNumber > maxNumber) {
            maxNumber = parsedNumber;
          }
        }
      }
    }

    const nextNumber = maxNumber + 1;
    const nextOrderNumber = `PO ${nextNumber}`;
    
    console.log(`Generated next order number: ${nextOrderNumber}`);
    return nextOrderNumber;

  } catch (error) {
    console.error('Error generating next order number:', error);
    // Fallback to timestamp-based number if there's an error
    const timestamp = Date.now().toString().slice(-6);
    return `PO ${timestamp}`;
  }
};

/**
 * Convert Supabase row to PriceRequest object
 * @param row The database row
 * @returns A properly formatted PriceRequest object
 */
const convertRowToPriceRequest = (row: any): PriceRequest => {
  return {
    id: row.id,
    projectName: row.project_name,
    type: 'Price Request',
    status: row.status as OrderStatus,
    date: row.created_at,
    createdBy: row.created_by,
    teams: row.teams || [],
    description: row.description,
    threadId: row.thread_id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    orderDate: row.order_date,
    orderAmount: row.order_amount ? parseFloat(row.order_amount) : undefined,
    paymentStatus: row.payment_status,
    productDetails: row.product_details,
    user: row.user_email,
    depositAmount: row.deposit_amount ? parseFloat(row.deposit_amount) : undefined,
    paymentsHistory: row.payments_history || []
  };
};

/**
 * Convert Supabase row to CustomerOrder object
 * @param row The database row
 * @returns A properly formatted CustomerOrder object
 */
const convertRowToCustomerOrder = (row: any): CustomerOrder => {
  return {
    id: row.id,
    projectName: row.project_name,
    type: 'Customer Order',
    status: row.status as OrderStatus,
    date: row.created_at,
    createdBy: row.created_by,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    orderDate: row.order_date,
    orderAmount: row.order_amount ? parseFloat(row.order_amount) : undefined,
    paymentOption: row.payment_option,
    paymentStatus: row.payment_status,
    productDetails: row.product_details,
    depositAmount: row.deposit_amount ? parseFloat(row.deposit_amount) : undefined,
    paymentsHistory: row.payments_history || [],
    isEdited: row.is_edited || false,
    originalInvoiceId: row.original_invoice_id || null,
    customer: {
      name: row.customer_name || '',
      email: row.user_email || '',
      address: undefined
    },
    items: (row.teams || []).map((item: any) => ({
      id: item.id || crypto.randomUUID(),
      description: item.description || '',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      amount: (item.quantity || 1) * (item.unitPrice || 0)
    })),
    total: row.order_amount ? parseFloat(row.order_amount) : 0,
    currency: 'USD'
  };
};

/**
 * Convert Supabase row to Shipment object
 * @param row The database row
 * @returns A properly formatted Shipment object
 */
const convertRowToShipment = (row: any): Shipment => {
  return {
    id: row.id,
    ref: row.ref || '',
    status: row.status || row.shipping_status || '', // Support both old and new field names
    pod: row.pod || '',
    consignee: row.consignee || '',
    vendor: row.vendor || row.shipper || '', // Support both old and new field names
    po: row.po || '',
    pkg: row.pkg || 0,
    kg: row.kg || 0,
    vol: row.vol || 0,
    pickup_date: row.pickup_date || row.etd || null, // Use null instead of empty string for dates
    note: row.note || row.description_of_goods || '', // Support both old and new field names
    // Keep legacy fields for backward compatibility
    shipper: row.shipper || row.vendor || '',
    vessel_carrier: row.vessel_carrier || '',
    etd: row.etd || row.pickup_date || null, // Use null instead of empty string for dates
    eta: row.eta || null, // Use null instead of empty string for dates
    container_n: row.container_n || '',
    description_of_goods: row.description_of_goods || row.note || '',
    shipping_status: row.shipping_status || row.status || ''
  };
};

/**
 * Convert Supabase row to GeneralDocument object
 * @param row The database row
 * @returns A properly formatted GeneralDocument object
 */
const convertRowToGeneralDocument = (row: any): GeneralDocument => {
  return {
    id: row.id,
    file_name: row.file_name || '',
    document_url: row.document_url || '',
    uploaded_at: row.uploaded_at || ''
  };
};

/**
 * Convert Supabase row to ShipmentDocument object
 * @param row The database row
 * @returns A properly formatted ShipmentDocument object
 */
const convertRowToShipmentDocument = (row: any): ShipmentDocument => {
  return {
    id: row.id,
    file_name: row.file_name || '',
    drive_file_id: row.drive_file_id || '',
    drive_file_url: row.drive_file_url || '',
    file_size: row.file_size,
    file_type: row.file_type,
    uploaded_by: row.uploaded_by,
    uploaded_at: row.uploaded_at || ''
  };
};

/**
 * Convert PriceRequest to Supabase row format
 * @param request The PriceRequest object
 * @returns Database row object
 */
const convertPriceRequestToRow = (request: Omit<PriceRequest, 'id' | 'date'>) => {
  return {
    project_name: request.projectName,
    type: request.type,
    status: request.status,
    created_by: request.createdBy,
    order_number: request.orderNumber || null,
    customer_name: request.customerName || null,
    order_date: request.orderDate || null,
    order_amount: request.orderAmount || null,
    payment_option: request.paymentOption || null,
    payment_status: request.paymentStatus || null,
    product_details: request.productDetails || null,
    user_email: request.user || null,
    teams: request.teams || [],
    thread_id: request.threadId || null,
    deposit_amount: request.depositAmount || null,
    payments_history: request.paymentsHistory || null
  };
};

/**
 * Auto-assign contact to invoice based on customer name/email matching
 * @param invoice The invoice to assign a contact to
 */
const assignContactToInvoice = async (invoice: SupabaseInvoice): Promise<void> => {
  try {
    if (!invoice.customer_name && !invoice.customer_email) {
      console.log('No customer name or email to match against contacts');
      return;
    }

    let contactId: string | null = null;

    // First, try to find existing contact by email (most reliable)
    if (invoice.customer_email) {
      const { data: emailContact, error: emailError } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', invoice.customer_email)
        .single();

      if (!emailError && emailContact) {
        contactId = emailContact.id;
        console.log(`Found existing contact by email: ${invoice.customer_email} -> ${contactId}`);
      }
    }

    // If no email match, try to find by exact name match
    if (!contactId && invoice.customer_name) {
      const { data: nameContact, error: nameError } = await supabase
        .from('contacts')
        .select('id')
        .eq('full_name', invoice.customer_name)
        .single();

      if (!nameError && nameContact) {
        contactId = nameContact.id;
        console.log(`Found existing contact by name: ${invoice.customer_name} -> ${contactId}`);
      }
    }

    // If no existing contact found, create a new one
    if (!contactId && invoice.customer_name) {
      console.log(`Creating new contact for: ${invoice.customer_name}`);
      
      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert({
          full_name: invoice.customer_name,
          email: invoice.customer_email || '',
          phone_1: invoice.customer_tel1 || '',
          phone_2: invoice.customer_tel2 || '',
          address: invoice.customer_address || '',
          city: invoice.customer_city || '',
          state: invoice.customer_state || '',
          zip_code: invoice.customer_zip || ''
        })
        .select('id')
        .single();

      if (!createError && newContact) {
        contactId = newContact.id;
        console.log(`Created new contact: ${invoice.customer_name} -> ${contactId}`);
      } else {
        console.error('Error creating new contact:', createError);
      }
    }

    // Link the invoice to the contact
    if (contactId) {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ contact_id: contactId })
        .eq('id', invoice.id);

      if (updateError) {
        console.error('Error linking invoice to contact:', updateError);
      } else {
        console.log(`Successfully linked invoice ${invoice.id} to contact ${contactId}`);
      }
    }

  } catch (error) {
    console.error('Error in assignContactToInvoice:', error);
    // Don't throw error - this is a non-critical operation
  }
};

/**
 * Save invoice data to the new Supabase tables
 * @param invoice The invoice data to save
 * @param lineItems The line items for this invoice
 * @returns The saved invoice data with ID, or null if there was an error
 */
export const saveInvoiceToSupabase = async (
  invoice: SupabaseInvoice, 
  lineItems: Omit<SupabaseInvoiceLineItem, 'invoice_id'>[],
  createdBy?: string
): Promise<SupabaseInvoice | null> => {
  try {
    console.log('Saving invoice to Supabase:', invoice);
    
    // Start a transaction (we'll use single requests since we can't use proper transactions)
    // First, insert or update the invoice
    let result;
    
    if (invoice.id) {
      // Update existing invoice
      console.log('Updating existing invoice:', invoice.id);
      
      const { data, error } = await supabase
        .from('invoices')
        .update({
          po_number: invoice.po_number,
          invoice_date: invoice.invoice_date,
          customer_name: invoice.customer_name,
          customer_address: invoice.customer_address,
          customer_city: invoice.customer_city,
          customer_state: invoice.customer_state,
          customer_zip: invoice.customer_zip,
          customer_tel1: invoice.customer_tel1,
          customer_tel2: invoice.customer_tel2,
          customer_email: invoice.customer_email,
          subtotal: invoice.subtotal,
          tax_amount: invoice.tax_amount,
          total_amount: invoice.total_amount,
          deposit_amount: invoice.deposit_amount,
          balance_due: invoice.balance_due,
          payments_history: invoice.payments_history,
          ...(createdBy && { created_by: createdBy })
        })
        .eq('id', invoice.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating invoice in Supabase:', error);
        throw error;
      }
      
      result = data;
      
      // Delete existing line items for this invoice
      const { error: deleteError } = await supabase
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', invoice.id);
      
      if (deleteError) {
        console.error('Error deleting existing line items:', deleteError);
        throw deleteError;
      }
      
    } else {
      // Create new invoice
      console.log('Creating new invoice');
      
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          po_number: invoice.po_number,
          invoice_date: invoice.invoice_date,
          customer_name: invoice.customer_name,
          customer_address: invoice.customer_address,
          customer_city: invoice.customer_city,
          customer_state: invoice.customer_state,
          customer_zip: invoice.customer_zip,
          customer_tel1: invoice.customer_tel1,
          customer_tel2: invoice.customer_tel2,
          customer_email: invoice.customer_email,
          subtotal: invoice.subtotal,
          discount_amount: invoice.discount_amount,
          tax_amount: invoice.tax_amount,
          total_amount: invoice.total_amount,
          deposit_amount: invoice.deposit_amount,
          balance_due: invoice.balance_due,
          payments_history: invoice.payments_history,
          is_edited: invoice.is_edited || false,
          original_invoice_id: invoice.original_invoice_id,
          created_by: createdBy || 'Unknown Staff'
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating invoice in Supabase:', error);
        throw error;
      }
      
      result = data;
    }
    
    if (!result) {
      throw new Error('No data returned from Supabase for invoice operation');
    }
    
    // Now, insert the line items
    const invoiceId = result.id;
    const lineItemsWithInvoiceId = lineItems.map(item => ({
      ...item,
      invoice_id: invoiceId
    }));
    
    console.log('Inserting invoice line items:', lineItemsWithInvoiceId);
    
    const { error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .insert(lineItemsWithInvoiceId);
    
    if (lineItemsError) {
      console.error('Error inserting invoice line items:', lineItemsError);
      throw lineItemsError;
    }
    
    console.log('Successfully saved invoice and line items to Supabase');
    
    // Auto-assign contact based on customer name/email
    await assignContactToInvoice(result);
    
    // Clear any cache for this invoice
    if (result.id) {
      // If this invoice is associated with an order, clear that cache too
      // This requires an additional query to check for order association
      try {
        const { data: orderData } = await supabase
          .from('invoices')
          .select('id')
          .eq('po_number', result.po_number)
          .eq('type', 'Customer Order')
          .maybeSingle();
        
        if (orderData?.id) {
          clearInvoiceByOrderIdCache(orderData.id);
        }
      } catch (err) {
        console.log('Error checking for order association:', err);
        // Non-critical error, continue
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error saving invoice to Supabase:', error);
    return null;
  }
};

/**
 * Fetch an invoice by ID including its line items
 * @param invoiceId The ID of the invoice to fetch
 * @returns The invoice data with line items, or null if not found or error
 */
export const fetchInvoiceById = async (invoiceId: string): Promise<{
  invoice: SupabaseInvoice;
  lineItems: SupabaseInvoiceLineItem[];
} | null> => {
  try {
    console.log('Fetching invoice by ID from Supabase:', invoiceId);
    
    // Fetch the invoice
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();
    
    if (invoiceError) {
      console.error('Error fetching invoice from Supabase:', invoiceError);
      return null;
    }
    
    if (!invoiceData) {
      console.log('No invoice found with ID:', invoiceId);
      return null;
    }
    
    // Fetch the line items
    const { data: lineItemsData, error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true });
    
    if (lineItemsError) {
      console.error('Error fetching invoice line items from Supabase:', lineItemsError);
      return null;
    }
    
    return {
      invoice: invoiceData,
      lineItems: lineItemsData || []
    };
  } catch (error) {
    console.error('Error fetching invoice by ID from Supabase:', error);
    return null;
  }
};

/**
 * Fetch an invoice for a specific order
 * @param orderId The ID of the order to fetch the invoice for
 * @returns The invoice data with line items, or null if not found or error
 */
export const fetchInvoiceByOrderId = async (orderId: string): Promise<{
  invoice: SupabaseInvoice;
  lineItems: SupabaseInvoiceLineItem[];
} | null> => {
  try {
    // Check if the cache is valid for this order ID
    if (invoiceByOrderIdCache[orderId] && 
        Date.now() - invoiceByOrderIdCache[orderId].timestamp < CACHE_DURATION_MS) {
      console.log('Using cached invoice data for order ID:', orderId);
      return invoiceByOrderIdCache[orderId].data 
        ? { invoice: invoiceByOrderIdCache[orderId].data!, lineItems: invoiceByOrderIdCache[orderId].lineItems } 
        : null;
    }
    
    console.log('Fetching invoice for order ID from Supabase:', orderId);
    
    // First, get the order details to find the order_number
    const { data: orderData, error: orderError } = await supabase
      .from('invoices')
      .select('po_number')
      .eq('id', orderId)
      .eq('type', 'Customer Order')
      .single();
    
    if (orderError) {
      console.error('Error fetching order details from Supabase:', orderError);
      return null;
    }
    
    if (!orderData || !orderData.po_number) {
      console.log('No order found with ID or missing PO number:', orderId);
      return null;
    }
    
    // Now find the invoice with this order number as po_number
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('po_number', orderData.po_number)
      .order('created_at', { ascending: false })
      .maybeSingle(); // Use maybeSingle to get null instead of error if not found
    
    if (invoiceError) {
      console.error('Error fetching invoice from Supabase:', invoiceError);
      return null;
    }
    
    if (!invoiceData) {
      console.log('No invoice found with PO number:', orderData.po_number);
      // Update the cache with a null result
      invoiceByOrderIdCache[orderId] = {
        data: null,
        lineItems: [],
        timestamp: Date.now()
      };
      return null;
    }
    
    // Fetch the line items for this invoice
    const { data: lineItemsData, error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceData.id)
      .order('created_at', { ascending: true });
    
    if (lineItemsError) {
      console.error('Error fetching invoice line items from Supabase:', lineItemsError);
      return null;
    }
    
    // Update the cache
    invoiceByOrderIdCache[orderId] = {
      data: invoiceData,
      lineItems: lineItemsData || [],
      timestamp: Date.now()
    };
    
    return {
      invoice: invoiceData,
      lineItems: lineItemsData || []
    };
  } catch (error) {
    console.error('Error fetching invoice by order ID from Supabase:', error);
    return null;
  }
};

/**
 * Fetch monthly revenue data from Supabase
 * @param forceRefresh If true, bypass the cache and fetch fresh data
 */
export const fetchMonthlyRevenue = async (forceRefresh: boolean = false): Promise<MonthlyRevenue[]> => {
  // Check if there's already a fetch in progress
  if (currentMonthlyRevenueFetchPromise) {
    console.log('Monthly revenue fetch already in progress, returning existing promise');
    return currentMonthlyRevenueFetchPromise;
  }

  // Check if the cache is valid and we're not forcing a refresh
  if (!forceRefresh && isCacheValid(monthlyRevenueCache)) {
    console.log('Using cached monthly revenue data');
    return monthlyRevenueCache.data || [];
  }

  // Create a new promise for this fetch operation
  currentMonthlyRevenueFetchPromise = (async () => {
    try {
      console.log('Fetching monthly revenue data from Supabase');

      // Get the current year
      const currentYear = new Date().getFullYear();
      
      // Fetch all invoices from Supabase
      const { data: invoiceData, error } = await supabase
        .from('invoices')
        .select('*');

      if (error) {
        console.error('Error fetching invoices for monthly revenue:', error);
        throw error;
      }

      if (!invoiceData) {
        console.log('No invoice data returned from Supabase');
        return [];
      }

      // Initialize monthly revenue with all months
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyRevenue = monthNames.map(month => ({ month, total: 0 }));

      // Process the invoice data to calculate monthly revenue
      invoiceData.forEach(invoice => {
        if (invoice.total_amount && invoice.invoice_date) {
          const invoiceDate = new Date(invoice.invoice_date);
          
          // Only include invoices from the current year
          if (invoiceDate.getFullYear() === currentYear) {
            const month = invoiceDate.getMonth(); // 0-11
            const amount = parseFloat(invoice.total_amount);
            
            if (!isNaN(amount)) {
              monthlyRevenue[month].total += amount;
            }
          }
        }
      });

      console.log('Successfully calculated monthly revenue:', monthlyRevenue);
      
      // Update the cache
      monthlyRevenueCache.data = monthlyRevenue;
      monthlyRevenueCache.timestamp = Date.now();
      
      return monthlyRevenue;
    } catch (error) {
      console.error('Error fetching monthly revenue from Supabase:', error);
      
      // If we have cached data and this was not a forced refresh, return the cached data
      if (!forceRefresh && monthlyRevenueCache.data) {
        console.log('Error fetching from Supabase, using cached monthly revenue data instead');
        return monthlyRevenueCache.data;
      }
      
      // Fallback to empty array
      return [];
    } finally {
      // Reset the currentMonthlyRevenueFetchPromise to null when done
      currentMonthlyRevenueFetchPromise = null;
    }
  })();
  
  return currentMonthlyRevenueFetchPromise;
};

/**
 * Fetch recent orders for a specific date
 * @param date The date to fetch recent orders for (if undefined, fetch most recent orders)
 * @param forceRefresh If true, bypass the cache and fetch fresh data
 */
export const fetchRecentOrders = async (date?: Date, forceRefresh: boolean = false, profileName?: string): Promise<RecentOrder[]> => {
  const dateKey = date ? date.toISOString().split('T')[0] : 'latest';
  
  // Check if the cache is valid for the requested date and we're not forcing a refresh
  if (!forceRefresh && 
      isCacheValid(recentOrdersCache) && 
      recentOrdersCache.date === dateKey) {
    console.log('Using cached recent orders data');
    return recentOrdersCache.data || [];
  }

  // Create a new promise for this fetch operation
  currentRecentOrdersFetchPromise = (async () => {
    try {
      console.log('Fetching recent orders from Supabase');

      let query = supabase
        .from('invoices')
        .select('*');
      
      // Role-based filtering
      if (profileName === 'David') {
        // David (admin) can see all orders
        query = query.order('created_at', { ascending: false });
      } else if (profileName && ['Marti', 'Natalia', 'Dimitry'].includes(profileName)) {
        // Staff can only see their own orders
        query = query
          .eq('created_by', profileName)
          .order('created_at', { ascending: false });
      } else {
        // If no valid profile, query all (for backward compatibility)
        query = query.order('created_at', { ascending: false });
      }
      
      // If a specific date is provided, filter invoices by that date
      if (date) {
        const formattedDate = date.toISOString().split('T')[0];
        query = query.eq('invoice_date', formattedDate).limit(10);
      } else {
        // For latest orders, get orders from this week
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        
        query = query
          .gte('invoice_date', startOfWeek.toISOString().split('T')[0])
          .lte('invoice_date', endOfWeek.toISOString().split('T')[0])
          .limit(10);
      }
      
      const { data: invoiceData, error } = await query;

      if (error) {
        console.error('Error fetching recent orders:', error);
        throw error;
      }

      if (!invoiceData) {
        console.log('No recent orders data returned from Supabase');
        return [];
      }

      // Convert the invoice data to RecentOrder objects
      const recentOrders: RecentOrder[] = invoiceData.map(invoice => ({
        id: invoice.id,
        customerName: invoice.customer_name || 'Unknown Customer',
        customerEmail: invoice.customer_email || 'no-email@example.com',
        amount: parseFloat(invoice.total_amount) || 0,
        date: invoice.invoice_date || invoice.created_at.split('T')[0],
        createdBy: invoice.created_by || 'Unknown Staff'
      }));

      console.log('Successfully fetched recent orders:', recentOrders);
      
      // Update the cache
      recentOrdersCache.data = recentOrders;
      recentOrdersCache.date = dateKey;
      recentOrdersCache.timestamp = Date.now();
      
      return recentOrders;
    } catch (error) {
      console.error('Error fetching recent orders from Supabase:', error);
      
      // If we have cached data for this date and this was not a forced refresh, return the cached data
      if (!forceRefresh && recentOrdersCache.data && recentOrdersCache.date === dateKey) {
        console.log('Error fetching from Supabase, using cached recent orders data instead');
        return recentOrdersCache.data;
      }
      
      // Fallback to empty array
      return [];
    } finally {
      // Reset the currentRecentOrdersFetchPromise to null when done
      currentRecentOrdersFetchPromise = null;
    }
  })();
  
  return currentRecentOrdersFetchPromise;
};

/**
 * Fetch dashboard metrics from Supabase
 * @param forceRefresh If true, bypass the cache and fetch fresh data
 */
export const fetchDashboardMetrics = async (forceRefresh: boolean = false): Promise<DashboardMetrics> => {
  // Check if there's already a fetch in progress
  if (currentDashboardFetchPromise) {
    console.log('Dashboard metrics fetch already in progress, returning existing promise');
    return currentDashboardFetchPromise;
  }

  // Check if the cache is valid and we're not forcing a refresh
  if (!forceRefresh && isCacheValid(dashboardMetricsCache)) {
    console.log('Using cached dashboard metrics data');
    return dashboardMetricsCache.data!;
  }

  // Create a new promise for this fetch operation
  currentDashboardFetchPromise = (async () => {
    try {
      console.log('Fetching dashboard metrics from Supabase');
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*');

      if (error) {
        console.error('Error fetching dashboard metrics from Supabase:', error);
        throw error;
      }

      if (!data) {
        console.log('No data returned from Supabase for dashboard metrics');
        return getEmptyDashboardMetrics();
      }

      // Process the data to calculate metrics
      const metrics = calculateDashboardMetrics(data);
      
      console.log('Successfully calculated dashboard metrics:', metrics);
      
      // Update the cache
      dashboardMetricsCache.data = metrics;
      dashboardMetricsCache.timestamp = Date.now();
      
      return metrics;
    } catch (error) {
      console.error('Error fetching dashboard metrics from Supabase:', error);
      
      // If we have cached data and this was not a forced refresh, return the cached data
      if (!forceRefresh && dashboardMetricsCache.data) {
        console.log('Error fetching from Supabase, using cached dashboard metrics instead');
        return dashboardMetricsCache.data;
      }
      
      // Return empty metrics as fallback
      console.log('Falling back to empty dashboard metrics');
      return getEmptyDashboardMetrics();
    } finally {
      // Reset the currentDashboardFetchPromise to null when done
      currentDashboardFetchPromise = null;
    }
  })();
  
  return currentDashboardFetchPromise;
};

/**
 * Calculate dashboard metrics from raw invoice data
 * @param invoices Raw invoice data from Supabase
 * @returns Calculated dashboard metrics
 */
const calculateDashboardMetrics = (invoices: any[]): DashboardMetrics => {
  // Calculate total revenue from all invoices with proper rounding
  const totalRevenue = Math.round(invoices.reduce((sum, invoice) => {
    return sum + (parseFloat(invoice.total_amount) || 0);
  }, 0) * 100) / 100;
  
  // Calculate average order value with proper rounding
  const averageOrderValue = invoices.length > 0 
    ? Math.round((totalRevenue / invoices.length) * 100) / 100 
    : 0;
  
  // Get unique customers (by email or name)
  const uniqueCustomers = new Set();
  invoices.forEach(invoice => {
    const identifier = invoice.customer_email || invoice.customer_name;
    if (identifier) {
      uniqueCustomers.add(identifier.toLowerCase());
    }
  });
  
  // Calculate staff metrics from created_by field
  const staffMetrics: { [staffName: string]: any } = {};
  invoices.forEach(invoice => {
    const staff = invoice.created_by || 'Unknown Staff';
    const totalAmount = parseFloat(invoice.total_amount) || 0;
    const customerIdentifier = invoice.customer_email || invoice.customer_name;
    
    if (!staffMetrics[staff]) {
      staffMetrics[staff] = {
        totalOrders: 0,
        customerOrders: 0,
        totalRevenue: 0,
        customers: new Set()
      };
    }
    
    staffMetrics[staff].totalOrders++;
    staffMetrics[staff].customerOrders++;
    staffMetrics[staff].totalRevenue += totalAmount;
    
    if (customerIdentifier) {
      staffMetrics[staff].customers.add(customerIdentifier.toLowerCase());
    }
  });
  
  // Round staff revenue to avoid floating point precision issues
  Object.keys(staffMetrics).forEach(staff => {
    staffMetrics[staff].totalRevenue = Math.round(staffMetrics[staff].totalRevenue * 100) / 100;
    staffMetrics[staff].customers = staffMetrics[staff].customers.size;
  });
  
  // Calculate payment status breakdown based on balance_due
  const paymentStatusBreakdown: { [status: string]: { count: number; totalAmount: number } } = {
    'Paid in Full': { count: 0, totalAmount: 0 },
    'Order in Progress': { count: 0, totalAmount: 0 }
  };
  
  invoices.forEach(invoice => {
    const totalAmount = parseFloat(invoice.total_amount) || 0;
    const balanceDue = parseFloat(invoice.balance_due) || 0;
    
    if (balanceDue <= 0) {
      paymentStatusBreakdown['Paid in Full'].count++;
      paymentStatusBreakdown['Paid in Full'].totalAmount += totalAmount;
    } else {
      paymentStatusBreakdown['Order in Progress'].count++;
      paymentStatusBreakdown['Order in Progress'].totalAmount += totalAmount;
    }
  });
  
  return {
    totalOrders: invoices.length,
    customerOrders: invoices.length, // All invoices are customer orders
    totalRevenue,
    averageOrderValue,
    totalCustomers: uniqueCustomers.size,
    staffMetrics,
    statusBreakdown: {}, // Could be added later if needed
    paymentStatusBreakdown
  };
};

/**
 * Get empty dashboard metrics as fallback
 * @returns Empty dashboard metrics object
 */
const getEmptyDashboardMetrics = (): DashboardMetrics => {
  return {
    totalOrders: 0,
    customerOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    totalCustomers: 0,
    staffMetrics: {},
    statusBreakdown: {},
    paymentStatusBreakdown: {}
  };
};

/**
 * Fetch shipments from Supabase
 * @param forceRefresh If true, bypass the cache and fetch fresh data
 * @returns An array of Shipment objects
 */
export const fetchShipments = async (forceRefresh: boolean = false): Promise<Shipment[]> => {
  // Check if there's already a fetch in progress
  if (currentShipmentsFetchPromise) {
    console.log('Shipments fetch already in progress, returning existing promise');
    return currentShipmentsFetchPromise;
  }

  // Check if the cache is valid and we're not forcing a refresh
  if (!forceRefresh && isCacheValid(shipmentsCache)) {
    console.log('Using cached shipments data');
    return shipmentsCache.data || [];
  }

  // Create a new promise for this fetch operation
  currentShipmentsFetchPromise = (async () => {
    try {
      console.log('Fetching shipments from Supabase');
      
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('Error fetching shipments from Supabase:', error);
        throw error;
      }

      if (!data) {
        console.log('No shipments data returned from Supabase');
        return [];
      }

      // Convert database rows to Shipment objects
      const shipments = data.map(convertRowToShipment);
      
      console.log(`Successfully fetched ${shipments.length} shipments from Supabase`);
      
      // Update the cache
      shipmentsCache.data = shipments;
      shipmentsCache.timestamp = Date.now();
      
      return shipments;
    } catch (error) {
      console.error('Error fetching shipments from Supabase:', error);
      
      // If we have cached data and this was not a forced refresh, return the cached data
      if (!forceRefresh && shipmentsCache.data) {
        console.log('Error fetching from Supabase, using cached shipments data instead');
        return shipmentsCache.data;
      }
      
      // Fallback to empty array
      return [];
    } finally {
      // Reset the currentShipmentsFetchPromise to null when done
      currentShipmentsFetchPromise = null;
    }
  })();
  
  return currentShipmentsFetchPromise;
};

/**
 * Create a new shipment in Supabase
 * @param shipmentData The shipment data to create
 * @returns The created shipment
 */
export const createShipment = async (shipmentData: {
  ref: string;
  status: string;
  pod: string;
  consignee: string;
  vendor: string;
  po: string;
  pkg: number;
  kg: number;
  vol: number;
  pickup_date: string | null;
  note: string;
}): Promise<Shipment> => {
  try {
    console.log('Creating new shipment:', shipmentData);
    
    const { data, error } = await supabase
      .from('shipments')
      .insert([{
        ref: shipmentData.ref,
        status: shipmentData.status,
        pod: shipmentData.pod,
        consignee: shipmentData.consignee,
        vendor: shipmentData.vendor,
        po: shipmentData.po,
        pkg: shipmentData.pkg,
        kg: shipmentData.kg,
        vol: shipmentData.vol,
        pickup_date: shipmentData.pickup_date,
        note: shipmentData.note,
        documents: [] // Initialize empty documents array
        // Let created_at and updated_at be set automatically by the database
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating shipment:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from shipment creation');
    }

    console.log('Successfully created shipment:', data);
    
    // Convert database row to Shipment object
    const newShipment = convertRowToShipment(data);
    
    // Invalidate cache to force refresh on next fetch
    shipmentsCache.timestamp = 0;
    
    return newShipment;
  } catch (error) {
    console.error('Error creating shipment:', error);
    throw error;
  }
};

/**
 * Import multiple shipments from CSV data
 * @param shipments Array of shipment data to import
 * @returns Promise that resolves when import is complete
 */
export const importShipments = async (shipments: {
  ref: string;
  status: string;
  pod: string;
  consignee: string;
  vendor: string;
  po: string;
  pkg: number;
  kg: number;
  vol: number;
  pickup_date: string | null;
  note: string;
}[]): Promise<void> => {
  try {
    console.log('Importing shipments:', shipments.length);
    
    const shipmentsToInsert = shipments.map(shipment => ({
      ref: shipment.ref,
      status: shipment.status,
      pod: shipment.pod,
      consignee: shipment.consignee,
      vendor: shipment.vendor,
      po: shipment.po,
      pkg: shipment.pkg,
      kg: shipment.kg,
      vol: shipment.vol,
      pickup_date: shipment.pickup_date,
      note: shipment.note,
      documents: []
      // Let created_at and updated_at be set automatically by the database
    }));

    const { error } = await supabase
      .from('shipments')
      .insert(shipmentsToInsert);

    if (error) {
      console.error('Error importing shipments:', error);
      throw error;
    }

    console.log('Successfully imported shipments');
    
    // Invalidate cache to force refresh on next fetch
    shipmentsCache.timestamp = 0;
    
  } catch (error) {
    console.error('Error importing shipments:', error);
    throw error;
  }
};

/**
 * Fetch general documents from Supabase
 * @param forceRefresh If true, bypass the cache and fetch fresh data
 * @returns An array of GeneralDocument objects
 */
export const fetchGeneralDocuments = async (forceRefresh: boolean = false): Promise<GeneralDocument[]> => {
  // Check if there's already a fetch in progress
  if (currentGeneralDocumentsFetchPromise) {
    console.log('General documents fetch already in progress, returning existing promise');
    return currentGeneralDocumentsFetchPromise;
  }

  // Check if the cache is valid and we're not forcing a refresh
  if (!forceRefresh && isCacheValid(generalDocumentsCache)) {
    console.log('Using cached general documents data');
    return generalDocumentsCache.data || [];
  }

  // Create a new promise for this fetch operation
  currentGeneralDocumentsFetchPromise = (async () => {
    try {
      console.log('Fetching general documents from Supabase');
      
      const { data, error } = await supabase
        .from('general_documents')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching general documents from Supabase:', error);
        throw error;
      }

      if (!data) {
        console.log('No general documents data returned from Supabase');
        return [];
      }

      // Convert database rows to GeneralDocument objects
      const documents = data.map(convertRowToGeneralDocument);
      
      console.log(`Successfully fetched ${documents.length} general documents from Supabase`);
      
      // Update the cache
      generalDocumentsCache.data = documents;
      generalDocumentsCache.timestamp = Date.now();
      
      return documents;
    } catch (error) {
      console.error('Error fetching general documents from Supabase:', error);
      
      // If we have cached data and this was not a forced refresh, return the cached data
      if (!forceRefresh && generalDocumentsCache.data) {
        console.log('Error fetching from Supabase, using cached general documents data instead');
        return generalDocumentsCache.data;
      }
      
      // Fallback to empty array
      return [];
    } finally {
      // Reset the currentGeneralDocumentsFetchPromise to null when done
      currentGeneralDocumentsFetchPromise = null;
    }
  })();
  
  return currentGeneralDocumentsFetchPromise;
};

/**
 * Fetch shipment documents for a specific shipment from Supabase
 * @param shipmentId The ID of the shipment
 * @returns An array of ShipmentDocument objects
 */
export const fetchShipmentDocuments = async (shipmentId: number): Promise<ShipmentDocument[]> => {
  try {
    console.log(`Fetching documents for shipment ${shipmentId} from Supabase`);
    
    const { data, error } = await supabase
      .from('shipment_documents')
      .select('*')
      .eq('shipment_id', shipmentId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching shipment documents from Supabase:', error);
      throw error;
    }

    if (!data) {
      console.log('No shipment documents data returned from Supabase');
      return [];
    }

    // Convert database rows to ShipmentDocument objects
    const documents = data.map(convertRowToShipmentDocument);
    
    console.log(`Successfully fetched ${documents.length} documents for shipment ${shipmentId}`);
    
    return documents;
  } catch (error) {
    console.error('Error fetching shipment documents from Supabase:', error);
    return [];
  }
};

/**
 * Check and update price request statuses based on unread emails
 * This function will:
 * 1. Fetch all unread emails from Gmail
 * 2. Fetch all price requests from Supabase
 * 3. Compare email thread IDs with price request thread IDs
 * 4. Update price request statuses when replies are found
 * 5. Mark corresponding emails as read
 */
export const checkAndUpdatePriceRequestStatuses = async (): Promise<void> => {
  try {
    console.log('Starting email activity check for price requests...');
    
    // Fetch unread emails and price requests in parallel
    const [unreadEmails, priceRequests] = await Promise.all([
      getUnreadEmails(true), // Force refresh to get latest unread emails
      fetchPriceRequests(true) // Force refresh to get latest price requests
    ]);
    
    console.log(`Found ${unreadEmails.length} unread emails and ${priceRequests.length} price requests`);
    
    if (unreadEmails.length === 0 || priceRequests.length === 0) {
      console.log('No unread emails or price requests to process');
      return;
    }
    
    // Only process price requests that are currently "Sent" (not already "Reply Received" or "Completed")
    const activePriceRequests = priceRequests.filter(request => request.status === 'Sent');
    console.log(`Processing ${activePriceRequests.length} active price requests`);
    
    let updatesFound = false;
    
    // Check each active price request
    for (const priceRequest of activePriceRequests) {
      let requestUpdated = false;
      const updatedTeams = [...priceRequest.teams];
      const emailsToMarkAsRead: { id: string; email: any }[] = [];
      
      // Check each team in the price request
      for (let i = 0; i < updatedTeams.length; i++) {
        const team = updatedTeams[i];
        
        // Skip teams that have already submitted
        if (team.submitted || !team.threadId) {
          continue;
        }
        
        // Look for unread emails that match this team's thread ID
        const matchingEmails = unreadEmails.filter(email => 
          email.threadId === team.threadId
        );
        
        if (matchingEmails.length > 0) {
          console.log(`Found ${matchingEmails.length} matching emails for team ${team.name} in project ${priceRequest.projectName}`);
          
          // Mark team as submitted
          updatedTeams[i] = {
            ...team,
            submitted: true
          };
          
          requestUpdated = true;
          
          // Collect email IDs and objects to mark as read
          matchingEmails.forEach(email => {
            emailsToMarkAsRead.push({ id: email.id, email });
          });
        }
      }
      
      // If any teams were updated, update the price request
      if (requestUpdated) {
        console.log(`Updating price request ${priceRequest.projectName} with team status changes`);
        
        // Update the price request with new team statuses and change status to "Reply Received"
        const updateResult = await updatePriceRequest(priceRequest.id, {
          teams: updatedTeams,
          status: 'Reply Received' as OrderStatus
        });
        
        if (updateResult) {
          console.log(`Successfully updated price request ${priceRequest.projectName} status to "Reply Received"`);
          updatesFound = true;
          
          // Mark corresponding emails as read
          for (const emailItem of emailsToMarkAsRead) {
            try {
              await markEmailAsRead(emailItem.id);
              console.log(`Marked email ${emailItem.id} as read`);
              
              // Emit event for folder unread counter updates
              if (emailItem.email?.labelIds && emailItem.email.labelIds.length > 0) {
                emitLabelUpdateEvent({
                  labelIds: emailItem.email.labelIds,
                  action: 'mark-read',
                  threadId: emailItem.email.threadId,
                  messageId: emailItem.email.id
                });
              }
            } catch (error) {
              console.error(`Error marking email ${emailItem.id} as read:`, error);
              // Continue processing other emails even if one fails
            }
          }
        } else {
          console.error(`Failed to update price request ${priceRequest.projectName}`);
        }
      }
    }
    
    if (updatesFound) {
      console.log('Email activity check completed with updates found');
      // Clear caches to ensure fresh data on next fetch
      clearPriceRequestsCache();
      clearDashboardMetricsCache();
      clearMonthlyRevenueCache();
      clearRecentOrdersCache();
    } else {
      console.log('Email activity check completed - no updates needed');
    }
    
  } catch (error) {
    console.error('Error checking email activity for price requests:', error);
    // Don't throw the error - this is a background operation
  }
};

/**
 * Fetch price requests from Supabase
 * @param forceRefresh If true, bypass the cache and fetch fresh data
 */
export const fetchPriceRequests = async (forceRefresh: boolean = false): Promise<PriceRequest[]> => {
  // Check if there's already a fetch in progress, return that promise instead of starting a new one
  if (currentFetchPromise) {
    console.log('Fetch already in progress, returning existing promise');
    return currentFetchPromise;
  }

  // Check if the cache is valid and we're not forcing a refresh
  if (!forceRefresh && isCacheValid(priceRequestsCache)) {
    console.log('Using cached price requests data');
    return priceRequestsCache.data;
  }

  // Create a new promise for this fetch operation and store it in the module-level variable
  currentFetchPromise = (async () => {
    try {
      console.log('Fetching price requests from Supabase');
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('type', 'Price Request')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching price requests from Supabase:', error);
        throw error;
      }

      if (!data) {
        console.log('No data returned from Supabase');
        return [];
      }

      const priceRequests = data.map(convertRowToPriceRequest);
      
      console.log('Successfully fetched price requests from Supabase:', priceRequests);
      
      // Update the cache
      priceRequestsCache.data = priceRequests;
      priceRequestsCache.timestamp = Date.now();
      
      return priceRequests;
    } catch (error) {
      console.error('Error fetching price requests from Supabase:', error);
      
      // If we have cached data and this was not a forced refresh, return the cached data
      if (!forceRefresh && priceRequestsCache.data.length > 0) {
        console.log('Error fetching from Supabase, using cached data instead');
        return priceRequestsCache.data;
      }
      
      // Fallback to mock data if Supabase request fails and no cache is available
      console.log('Falling back to mock data');
      const mockDate = new Date();
      
      const mockData = [
        {
          id: 'mock-8',
          projectName: 'Miami Project',
          type: 'Price Request',
          status: 'Sent',
          date: mockDate.toISOString(),
          createdBy: 'Dima',
          teams: [
            { 
              id: 't22', 
              name: 'Interior Design Team', 
              submitted: false,
              requestedOn: new Date(mockDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              email: 'interiordesign@example.com',
              threadId: 'mock_thread_123456'
            },
            { 
              id: 't23', 
              name: 'Furniture Team', 
              submitted: false,
              requestedOn: new Date(mockDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              email: 'furniture@example.com',
              threadId: 'mock_thread_234567'
            },
            { 
              id: 't24', 
              name: 'Entertainment Team', 
              submitted: false,
              requestedOn: new Date(mockDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              email: 'entertainment@example.com',
              threadId: 'mock_thread_345678'
            }
          ],
          description: 'Bathroom remodel',
          threadId: 'mock_thread_main_12345',
          orderNumber: 'ORD-13322',
          customerName: 'Bright S.',
          orderDate: '2025-05-15',
          orderAmount: 6000,
          paymentOption: 'Installments',
          paymentStatus: 'Order in Progress',
          productDetails: 'Bathroom remodel',
          user: 'Dima'
        } as PriceRequest
      ];
      
      // Update the cache with mock data
      priceRequestsCache.data = mockData;
      priceRequestsCache.timestamp = Date.now();
      
      return mockData;
    } finally {
      // Reset the currentFetchPromise to null when done
      currentFetchPromise = null;
    }
  })();
  
  return currentFetchPromise;
};

/**
 * Fetch customer orders from Supabase
 * @param forceRefresh If true, bypass the cache and fetch fresh data
 */
export const fetchCustomerOrders = async (forceRefresh: boolean = false, profileName?: string): Promise<CustomerOrder[]> => {
  // Check if there's already a fetch in progress, return that promise instead of starting a new one
  if (currentCustomerOrdersFetchPromise) {
    console.log('Customer orders fetch already in progress, returning existing promise');
    return currentCustomerOrdersFetchPromise;
  }

  // Check if the cache is valid and we're not forcing a refresh
  if (!forceRefresh && isCacheValid(customerOrdersCache)) {
    console.log('Using cached customer orders data');
    return customerOrdersCache.data;
  }

  // Create a new promise for this fetch operation and store it in the module-level variable
  currentCustomerOrdersFetchPromise = (async () => {
    try {
      console.log('Fetching customer orders from Supabase');
      
      let query = supabase
        .from('invoices')
        .select('*')
        .eq('type', 'Customer Order');

      // Role-based filtering
      if (profileName === 'David') {
        // David (admin) can see all orders
        query = query.order('created_at', { ascending: false });
      } else if (profileName && ['Marti', 'Natalia', 'Dimitry'].includes(profileName)) {
        // Staff can only see their own orders
        query = query
          .eq('created_by', profileName)
          .order('created_at', { ascending: false });
      } else {
        // If no valid profile, query all (for backward compatibility)
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching customer orders from Supabase:', error);
        throw error;
      }

      if (!data) {
        console.log('No customer orders data returned from Supabase');
        return [];
      }

      const customerOrders = data.map(convertRowToCustomerOrder);
      
      console.log('Successfully fetched customer orders from Supabase:', customerOrders);
      
      // Update the cache
      customerOrdersCache.data = customerOrders;
      customerOrdersCache.timestamp = Date.now();
      
      return customerOrders;
    } catch (error) {
      console.error('Error fetching customer orders from Supabase:', error);
      
      // If we have cached data and this was not a forced refresh, return the cached data
      if (!forceRefresh && customerOrdersCache.data.length > 0) {
        console.log('Error fetching from Supabase, using cached customer orders data instead');
        return customerOrdersCache.data;
      }
      
      // Return empty array for customer orders as fallback
      console.log('No customer orders available - returning empty array');
      return [];
    } finally {
      // Reset the currentCustomerOrdersFetchPromise to null when done
      currentCustomerOrdersFetchPromise = null;
    }
  })();
  
  return currentCustomerOrdersFetchPromise;
};

/**
 * Update order status in Supabase
 * @param id The ID of the order to update
 * @param newStatus The new status to set
 * @returns The updated order or null if there was an error
 */
export const updateOrderPaymentStatus = async (
  id: string,
  newStatus: OrderStatus
): Promise<PriceRequest | CustomerOrder | null> => {
  try {
    console.log('Updating payment status in Supabase:', id, newStatus);
    
    const { data, error } = await supabase
      .from('invoices')
      .update({ payment_status: newStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment status in Supabase:', error);
      return null;
    }

    if (!data) {
      console.error('No data returned from Supabase update');
      return null;
    }

    console.log('Successfully updated payment status in Supabase:', data);
    
    // Clear caches to ensure fresh data on next fetch
    clearPriceRequestsCache();
    clearCustomerOrdersCache();
    clearDashboardMetricsCache();
    clearMonthlyRevenueCache();
    clearRecentOrdersCache();
    
    // Return the appropriate type based on the order type
    if (data.type === 'Price Request') {
      return convertRowToPriceRequest(data);
    } else {
      return convertRowToCustomerOrder(data);
    }
  } catch (error) {
    console.error('Error updating order status in Supabase:', error);
    return null;
  }
};

/**
 * Create a new price request in Supabase
 * @param request The price request data to create
 * @returns The created price request or null if there was an error
 */
export const createPriceRequest = async (
  request: Omit<PriceRequest, 'id' | 'date'>
): Promise<PriceRequest | null> => {
  try {
    console.log('Creating price request in Supabase:', request);
    
    const rowData = convertPriceRequestToRow(request);
    
    const { data, error } = await supabase
      .from('invoices')
      .insert([rowData])
      .select()
      .single();

    if (error) {
      console.error('Error creating price request in Supabase:', error);
      return null;
    }

    if (!data) {
      console.error('No data returned from Supabase insert');
      return null;
    }

    console.log('Successfully created price request in Supabase:', data);
    
    // Clear caches to ensure fresh data on next fetch
    clearPriceRequestsCache();
    clearDashboardMetricsCache();
    clearMonthlyRevenueCache();
    clearRecentOrdersCache();
    
    return convertRowToPriceRequest(data);
  } catch (error) {
    console.error('Error creating price request in Supabase:', error);
    return null;
  }
};

/**
 * Update an existing price request in Supabase
 * @param id The ID of the price request to update
 * @param updates The fields to update
 * @returns The updated price request or null if there was an error
 */
export const updatePriceRequest = async (
  id: string,
  updates: Partial<PriceRequest>
): Promise<PriceRequest | null> => {
  try {
    console.log('Updating price request in Supabase:', id, updates);
    
    const rowUpdates: any = {};
    
    // Map PriceRequest fields to database columns
    if (updates.projectName !== undefined) rowUpdates.project_name = updates.projectName;
    if (updates.status !== undefined) rowUpdates.status = updates.status;
    if (updates.orderNumber !== undefined) rowUpdates.order_number = updates.orderNumber;
    if (updates.customerName !== undefined) rowUpdates.customer_name = updates.customerName;
    if (updates.orderDate !== undefined) rowUpdates.order_date = updates.orderDate;
    if (updates.orderAmount !== undefined) rowUpdates.order_amount = updates.orderAmount;
    if (updates.paymentOption !== undefined) rowUpdates.payment_option = updates.paymentOption;
    if (updates.paymentStatus !== undefined) rowUpdates.payment_status = updates.paymentStatus;
    if (updates.productDetails !== undefined) rowUpdates.product_details = updates.productDetails;
    if (updates.user !== undefined) rowUpdates.user_email = updates.user;
    if (updates.teams !== undefined) rowUpdates.teams = updates.teams;
    if (updates.threadId !== undefined) rowUpdates.thread_id = updates.threadId;
    if (updates.depositAmount !== undefined) rowUpdates.deposit_amount = updates.depositAmount;
    if (updates.paymentsHistory !== undefined) rowUpdates.payments_history = updates.paymentsHistory;
    
    const { data, error } = await supabase
      .from('invoices')
      .update(rowUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating price request in Supabase:', error);
      return null;
    }

    if (!data) {
      console.error('No data returned from Supabase update');
      return null;
    }

    console.log('Successfully updated price request in Supabase:', data);
    
    // Clear caches to ensure fresh data on next fetch
    clearPriceRequestsCache();
    clearDashboardMetricsCache();
    clearMonthlyRevenueCache();
    clearRecentOrdersCache();
    
    return convertRowToPriceRequest(data);
  } catch (error) {
    console.error('Error updating price request in Supabase:', error);
    return null;
  }
};

/**
 * Delete a price request from Supabase
 * @param id The ID of the price request to delete
 * @returns Boolean indicating success
 */
export const deletePriceRequest = async (id: string): Promise<boolean> => {
  try {
    console.log('Deleting price request from Supabase:', id);
    
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting price request from Supabase:', error);
      return false;
    }

    console.log('Successfully deleted price request from Supabase');
    
    // Clear caches to ensure fresh data on next fetch
    clearPriceRequestsCache();
    clearDashboardMetricsCache();
    clearMonthlyRevenueCache();
    clearRecentOrdersCache();
    
    return true;
  } catch (error) {
    console.error('Error deleting price request from Supabase:', error);
    return false;
  }
};

/**
 * Save a customer order to the orders table
 * @param orderData The customer order data to save
 * @returns The saved order data with ID, or null if there was an error
 */
export const saveCustomerOrderToSupabase = async (orderData: {
  order_number: string;
  customer_name: string;
  customer_email?: string;
  order_date: string;
  order_amount: number;
  payment_status?: string;
  product_details?: string;
  deposit_amount?: number;
  teams?: any[];
}): Promise<any | null> => {
  try {
    console.log('Saving customer order to Supabase:', orderData);
    
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        project_name: `Order ${orderData.order_number}`,
        type: 'Customer Order',
        status: 'Order in Progress',
        created_by: 'system',
        order_number: orderData.order_number,
        customer_name: orderData.customer_name,
        order_date: orderData.order_date,
        order_amount: orderData.order_amount,
        payment_status: orderData.payment_status || 'Order in Progress',
        product_details: orderData.product_details || null,
        user_email: orderData.customer_email || null,
        deposit_amount: orderData.deposit_amount || null,
        teams: orderData.teams || []
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving customer order to Supabase:', error);
      throw error;
    }
    
    console.log('Successfully saved customer order to Supabase:', data);
    
    // Clear the customer orders cache to force refresh
    clearCustomerOrdersCache();
    
    return data;
  } catch (error) {
    console.error('Error saving customer order:', error);
    return null;
  }
};

/**
 * Check if a thread has been updated (has new replies)
 * @param threadId The thread ID to check
 * @returns Boolean indicating if the thread has new replies
 */
export const checkThreadForUpdates = async (threadId: string): Promise<boolean> => {
  try {
    if (!threadId) {
      console.error('No thread ID provided to checkThreadForUpdates');
      return false;
    }
    
    // For now, just return false since we're not implementing thread checking from Supabase
    // This could be extended later to check Gmail threads for updates
    return false;
  } catch (error) {
    console.error('Error checking thread for updates:', error);
    return false;
  }
};

// Legacy function name for backward compatibility
export const sendPriceRequestToMake = createPriceRequest;

/**
 * Delete a customer order from Supabase
 * @param id The ID of the customer order to delete
 * @returns Boolean indicating success
 */
export const deleteCustomerOrder = async (id: string): Promise<boolean> => {
  try {
    console.log('Deleting customer order from Supabase:', id);
    
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting customer order from Supabase:', error);
      return false;
    }

    console.log('Successfully deleted customer order from Supabase');
    
    // Clear caches to ensure fresh data on next fetch
    clearCustomerOrdersCache();
    clearDashboardMetricsCache();
    clearMonthlyRevenueCache();
    clearRecentOrdersCache();
    
    return true;
  } catch (error) {
    console.error('Error deleting customer order from Supabase:', error);
    return false;
  }
};

/**
 * Delete an invoice from Supabase
 * @param id The ID of the invoice to delete
 * @returns Boolean indicating success
 */
export const deleteInvoice = async (id: string): Promise<boolean> => {
  try {
    console.log('Deleting invoice from Supabase:', id);
    
    // First delete line items associated with the invoice
    const { error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .delete()
      .eq('invoice_id', id);

    if (lineItemsError) {
      console.error('Error deleting invoice line items from Supabase:', lineItemsError);
      return false;
    }

    // Then delete the invoice itself
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting invoice from Supabase:', error);
      return false;
    }

    console.log('Successfully deleted invoice from Supabase');
    
    // Clear caches to ensure fresh data on next fetch
    clearInvoiceByOrderIdCaches();
    clearDashboardMetricsCache();
    clearMonthlyRevenueCache();
    clearRecentOrdersCache();
    
    return true;
  } catch (error) {
    console.error('Error deleting invoice from Supabase:', error);
    return false;
  }
};

/**
 * Clear all invoice by order ID caches
 */
const clearInvoiceByOrderIdCaches = () => {
  Object.keys(invoiceByOrderIdCache).forEach(orderId => {
    delete invoiceByOrderIdCache[orderId];
  });
};

/**
 * Fetch brand analytics from invoice line items
 * @param forceRefresh If true, bypass the cache and fetch fresh data
 * @returns Array of brand analytics
 */
export const fetchBrandAnalytics = async (forceRefresh: boolean = false): Promise<BrandAnalytics[]> => {
  // Check cache validity
  if (!forceRefresh && brandAnalyticsCache && 
      (Date.now() - brandAnalyticsCache.timestamp) < CACHE_DURATION_MS) {
    console.log('Using cached brand analytics data');
    return brandAnalyticsCache.data;
  }

  try {
    console.log('Fetching brand analytics from Supabase');
    
    // Fetch all line items with their brands
    const { data: lineItems, error } = await supabase
      .from('invoice_line_items')
      .select('brand, quantity, unit_price, description');

    if (error) {
      console.error('Error fetching line items for brand analytics:', error);
      return [];
    }

    if (!lineItems) {
      return [];
    }

    // Group by brand and calculate analytics
    const brandMap = new Map<string, {
      totalItems: number;
      totalRevenue: number;
      itemCount: number;
      descriptions: Set<string>;
    }>();

    lineItems.forEach(item => {
      const brand = item.brand || 'Unknown Brand';
      const quantity = item.quantity || 0;
      const unitPrice = item.unit_price || 0;
      const revenue = quantity * unitPrice;

      if (!brandMap.has(brand)) {
        brandMap.set(brand, {
          totalItems: 0,
          totalRevenue: 0,
          itemCount: 0,
          descriptions: new Set()
        });
      }

      const brandData = brandMap.get(brand)!;
      brandData.totalItems += quantity;
      brandData.totalRevenue += revenue;
      brandData.itemCount += 1;
      if (item.description) {
        brandData.descriptions.add(item.description);
      }
    });

    // Convert to analytics format
    const analytics: BrandAnalytics[] = Array.from(brandMap.entries()).map(([brandName, data]) => ({
      brandName,
      totalItems: data.totalItems,
      totalRevenue: data.totalRevenue,
      itemCount: data.itemCount,
      averageItemValue: data.itemCount > 0 ? data.totalRevenue / data.itemCount : 0
    }));

    // Sort by total revenue descending
    analytics.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Cache the results
    brandAnalyticsCache = {
      data: analytics,
      timestamp: Date.now()
    };

    console.log('Successfully calculated brand analytics:', analytics);
    return analytics;
  } catch (error) {
    console.error('Error fetching brand analytics:', error);
    return [];
  }
};

/**
 * Fetch item analytics from invoice line items
 * @param forceRefresh If true, bypass the cache and fetch fresh data
 * @returns Array of item analytics
 */
export const fetchItemAnalytics = async (forceRefresh: boolean = false): Promise<ItemAnalytics[]> => {
  // Check cache validity
  if (!forceRefresh && itemAnalyticsCache && 
      (Date.now() - itemAnalyticsCache.timestamp) < CACHE_DURATION_MS) {
    console.log('Using cached item analytics data');
    return itemAnalyticsCache.data;
  }

  try {
    console.log('Fetching item analytics from Supabase');
    
    // Fetch all line items
    const { data: lineItems, error } = await supabase
      .from('invoice_line_items')
      .select('description, brand, quantity, unit_price, invoice_id');

    if (error) {
      console.error('Error fetching line items for item analytics:', error);
      return [];
    }

    if (!lineItems) {
      return [];
    }

    // Group by item description and calculate analytics
    const itemMap = new Map<string, {
      brand: string;
      totalQuantity: number;
      totalRevenue: number;
      orderCount: number;
      invoiceIds: Set<string>;
    }>();

    lineItems.forEach(item => {
      const description = item.description || 'Unknown Item';
      const brand = item.brand || 'Unknown Brand';
      const quantity = item.quantity || 0;
      const unitPrice = item.unit_price || 0;
      const revenue = quantity * unitPrice;

      if (!itemMap.has(description)) {
        itemMap.set(description, {
          brand,
          totalQuantity: 0,
          totalRevenue: 0,
          orderCount: 0,
          invoiceIds: new Set()
        });
      }

      const itemData = itemMap.get(description)!;
      itemData.totalQuantity += quantity;
      itemData.totalRevenue += revenue;
      if (item.invoice_id) {
        itemData.invoiceIds.add(item.invoice_id);
      }
    });

    // Convert to analytics format
    const analytics: ItemAnalytics[] = Array.from(itemMap.entries()).map(([itemDescription, data]) => ({
      itemDescription,
      brand: data.brand,
      totalQuantity: data.totalQuantity,
      totalRevenue: data.totalRevenue,
      orderCount: data.invoiceIds.size,
      averagePrice: data.totalQuantity > 0 ? data.totalRevenue / data.totalQuantity : 0
    }));

    // Sort by total revenue descending
    analytics.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Cache the results
    itemAnalyticsCache = {
      data: analytics,
      timestamp: Date.now()
    };

    console.log('Successfully calculated item analytics:', analytics);
    return analytics;
  } catch (error) {
    console.error('Error fetching item analytics:', error);
    return [];
  }
};

/**
 * Clear brand analytics cache
 */
export const clearBrandAnalyticsCache = (): void => {
  brandAnalyticsCache = null;
};

/**
 * Clear item analytics cache
 */
export const clearItemAnalyticsCache = (): void => {
  itemAnalyticsCache = null;
};