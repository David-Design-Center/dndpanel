import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  item_code?: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  brand?: string;
}

export interface Invoice {
  id: string;
  po_number: string;
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
  deposit_amount?: number;
  balance_due: number;
  payments_history?: string | any[] | null;
  is_edited?: boolean;
  original_invoice_id?: string;
  created_at: string;
}

// Cache for line items to avoid repeated fetches
const lineItemsCache = new Map<string, InvoiceLineItem[]>();
const cacheTimeout = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<string, number>();

/**
 * Fetch line items for an invoice with caching
 */
export async function getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
  const now = Date.now();
  const cachedTimestamp = cacheTimestamps.get(invoiceId);
  
  // Check if we have cached data that's still valid
  if (cachedTimestamp && (now - cachedTimestamp) < cacheTimeout && lineItemsCache.has(invoiceId)) {
    return lineItemsCache.get(invoiceId)!;
  }

  try {
    const { data: lineItems, error } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (error) {
      console.error('Error fetching line items:', error);
      return [];
    }

    const items = lineItems || [];
    lineItemsCache.set(invoiceId, items);
    cacheTimestamps.set(invoiceId, now);
    
    return items;
  } catch (error) {
    console.error('Error fetching line items:', error);
    return [];
  }
}

/**
 * Fetch line items for multiple invoices in batch
 */
export async function getBatchInvoiceLineItems(invoiceIds: string[]): Promise<Map<string, InvoiceLineItem[]>> {
  const result = new Map<string, InvoiceLineItem[]>();
  const uncachedIds: string[] = [];
  const now = Date.now();

  // Check cache first
  for (const invoiceId of invoiceIds) {
    const cachedTimestamp = cacheTimestamps.get(invoiceId);
    if (cachedTimestamp && (now - cachedTimestamp) < cacheTimeout && lineItemsCache.has(invoiceId)) {
      result.set(invoiceId, lineItemsCache.get(invoiceId)!);
    } else {
      uncachedIds.push(invoiceId);
    }
  }

  // Fetch uncached items in batch
  if (uncachedIds.length > 0) {
    try {
      const { data: lineItems, error } = await supabase
        .from('invoice_line_items')
        .select('*')
        .in('invoice_id', uncachedIds);

      if (error) {
        console.error('Error fetching batch line items:', error);
      } else {
        // Group by invoice_id
        const groupedItems = new Map<string, InvoiceLineItem[]>();
        
        for (const item of lineItems || []) {
          if (!groupedItems.has(item.invoice_id)) {
            groupedItems.set(item.invoice_id, []);
          }
          groupedItems.get(item.invoice_id)!.push(item);
        }

        // Cache and add to result
        for (const invoiceId of uncachedIds) {
          const items = groupedItems.get(invoiceId) || [];
          lineItemsCache.set(invoiceId, items);
          cacheTimestamps.set(invoiceId, now);
          result.set(invoiceId, items);
        }
      }
    } catch (error) {
      console.error('Error fetching batch line items:', error);
    }
  }

  return result;
}

/**
 * Search invoices by multiple parameters
 */
export async function searchInvoices(
  invoices: Invoice[], 
  searchTerm: string
): Promise<Invoice[]> {
  if (!searchTerm.trim()) {
    return invoices;
  }

  const searchLower = searchTerm.toLowerCase().trim();
  
  // First, get line items for all invoices
  const invoiceIds = invoices.map(invoice => invoice.id);
  const lineItemsMap = await getBatchInvoiceLineItems(invoiceIds);

  const filteredInvoices = invoices.filter(invoice => {
    // Search in basic invoice fields
    const basicFieldsMatch = (
      invoice.customer_name.toLowerCase().includes(searchLower) ||
      invoice.po_number.toLowerCase().includes(searchLower) ||
      formatDateForSearch(invoice.invoice_date).includes(searchLower)
    );

    if (basicFieldsMatch) {
      return true;
    }

    // Search in line items (description, item_code, brand)
    const lineItems = lineItemsMap.get(invoice.id) || [];
    const lineItemsMatch = lineItems.some(item => {
      return (
        (item.description && item.description.toLowerCase().includes(searchLower)) ||
        (item.item_code && item.item_code.toLowerCase().includes(searchLower)) ||
        (item.brand && item.brand.toLowerCase().includes(searchLower))
      );
    });

    return lineItemsMatch;
  });

  return filteredInvoices;
}

/**
 * Search invoices for InvoicesList component (different interface)
 */
export async function searchInvoicesForList<T extends {
  id: string;
  customerName: string;
  orderNumber: string;
  date: string;
}>(
  invoices: T[], 
  searchTerm: string
): Promise<T[]> {
  if (!searchTerm.trim()) {
    return invoices;
  }

  const searchLower = searchTerm.toLowerCase().trim();
  
  // First, get line items for all invoices
  const invoiceIds = invoices.map(invoice => invoice.id);
  const lineItemsMap = await getBatchInvoiceLineItems(invoiceIds);

  const filteredInvoices = invoices.filter(invoice => {
    // Search in basic invoice fields
    const basicFieldsMatch = (
      invoice.customerName.toLowerCase().includes(searchLower) ||
      invoice.orderNumber.toLowerCase().includes(searchLower) ||
      formatDateForSearch(invoice.date).includes(searchLower)
    );

    if (basicFieldsMatch) {
      return true;
    }

    // Search in line items (description, item_code, brand)
    const lineItems = lineItemsMap.get(invoice.id) || [];
    const lineItemsMatch = lineItems.some(item => {
      return (
        (item.description && item.description.toLowerCase().includes(searchLower)) ||
        (item.item_code && item.item_code.toLowerCase().includes(searchLower)) ||
        (item.brand && item.brand.toLowerCase().includes(searchLower))
      );
    });

    return lineItemsMatch;
  });

  return filteredInvoices;
}

/**
 * Format date for search to support multiple date formats
 */
function formatDateForSearch(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr.toLowerCase();
    }
    
    // Return multiple date format strings to match against
    const formats = [
      date.toLocaleDateString(), // MM/DD/YYYY or DD/MM/YYYY depending on locale
      date.toLocaleDateString('en-US'), // MM/DD/YYYY
      date.toLocaleDateString('en-GB'), // DD/MM/YYYY
      date.toISOString().split('T')[0], // YYYY-MM-DD
      date.getFullYear().toString(), // YYYY
      (date.getMonth() + 1).toString(), // M
      date.getDate().toString(), // D
      date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase(), // January, February, etc.
      date.toLocaleDateString('en-US', { month: 'short' }).toLowerCase(), // Jan, Feb, etc.
    ];
    
    return formats.join(' ').toLowerCase();
  } catch (error) {
    return dateStr.toLowerCase();
  }
}

/**
 * Clear the line items cache (useful after updates/deletes)
 */
export function clearLineItemsCache(): void {
  lineItemsCache.clear();
  cacheTimestamps.clear();
}

/**
 * Clear cache for specific invoice
 */
export function clearInvoiceLineItemsCache(invoiceId: string): void {
  lineItemsCache.delete(invoiceId);
  cacheTimestamps.delete(invoiceId);
}
