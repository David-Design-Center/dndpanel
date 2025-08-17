import React, { useRef, useState, useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReactToPrint } from 'react-to-print';
import InvoicePrintView from './InvoicePrintView';
import { BrandProvider } from '../../contexts/BrandContext';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Invoice {
  id: string;
  po_number: string;
  invoice_date: string;
  customer_name: string;
  customer_address: string;
  customer_city: string;
  customer_state: string;
  customer_zip: string;
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
}

interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  item_code?: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  brand?: string;  // Added brand field
}

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  lineItems: InvoiceLineItem[];
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  lineItems
}) => {
  const invoiceDocumentRef = useRef<HTMLDivElement>(null);
  const [originalInvoice, setOriginalInvoice] = useState<Invoice | null>(null);
  const [originalLineItems, setOriginalLineItems] = useState<InvoiceLineItem[]>([]);

  // Fetch original invoice data if this is an edited invoice
  useEffect(() => {
    const fetchOriginalInvoice = async () => {
      if (invoice.original_invoice_id) {
        try {
          // Fetch original invoice
          const { data: originalInvoiceData, error: invoiceError } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', invoice.original_invoice_id)
            .single();

          if (invoiceError) throw invoiceError;

          // Fetch original line items
          const { data: originalLineItemsData, error: lineItemsError } = await supabase
            .from('invoice_line_items')
            .select('*')
            .eq('invoice_id', invoice.original_invoice_id);

          if (lineItemsError) throw lineItemsError;

          setOriginalInvoice(originalInvoiceData);
          setOriginalLineItems(originalLineItemsData || []);
        } catch (error) {
          console.error('Error fetching original invoice:', error);
        }
      }
    };

    if (isOpen) {
      fetchOriginalInvoice();
    }
  }, [isOpen, invoice.original_invoice_id]);

  // Function to check if a field has changed
  const isFieldChanged = (field: keyof Invoice, value: any) => {
    if (!invoice.original_invoice_id || !originalInvoice) return false;
    return originalInvoice[field] !== value;
  };

  // Function to check if a line item has changed
  const isLineItemChanged = (lineItem: InvoiceLineItem) => {
    if (!invoice.original_invoice_id || !originalLineItems.length) return false;
    
    const originalItem = originalLineItems.find(item => 
      item.description === lineItem.description || 
      item.id === lineItem.id
    );
    
    if (!originalItem) return true; // New item
    
    return (
      originalItem.description !== lineItem.description ||
      originalItem.quantity !== lineItem.quantity ||
      originalItem.unit_price !== lineItem.unit_price ||
      originalItem.line_total !== lineItem.line_total ||
      originalItem.brand !== lineItem.brand
    );
  };

  const handlePrint = useReactToPrint({
    contentRef: invoiceDocumentRef,
    documentTitle: `Invoice-${invoice.po_number}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 20mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .edit-highlight {
          background-color: transparent !important;
          border: none !important;
        }
        .brand-column {
          display: none !important;
        }
        /* Hide deleted items in print */
        tr[data-field="line-item"]:has(td:contains("[REMOVED]")) {
          display: none !important;
        }
        /* Alternative approach - hide based on opacity */
        tr[style*="opacity: 0.5"] {
          display: none !important;
        }
      }
    `,
  });

  const transformInvoiceData = (invoice: Invoice, lineItems: InvoiceLineItem[]) => {
    // Handle payments_history which might be a string, object, or null
    let payments = [];
    if (invoice.payments_history) {
      try {
        // If it's already an object/array, use it directly
        if (typeof invoice.payments_history === 'object') {
          payments = Array.isArray(invoice.payments_history) ? invoice.payments_history : [];
        } else {
          // If it's a string, try to parse it
          payments = JSON.parse(invoice.payments_history);
        }
      } catch (error) {
        console.warn('Failed to parse payments_history:', error);
        payments = [];
      }
    }

    // Transform current line items and detect new items
    const transformedLineItems = lineItems.map(item => {
      let isNew = false;
      
      // If this is an edited invoice, check if this item is new
      if (invoice.original_invoice_id && originalLineItems.length > 0) {
        const existsInOriginal = originalLineItems.some(originalItem => 
          originalItem.description === item.description ||
          originalItem.id === item.id
        );
        isNew = !existsInOriginal;
      }
      
      return {
        id: item.id,
        item: item.item_code || '',
        description: item.description,
        brand: item.brand,
        quantity: item.quantity,
        price: item.unit_price,
        isDeleted: false,
        isNew
      };
    });

    // If this is an edited invoice, add deleted items from original
    if (invoice.original_invoice_id && originalLineItems.length > 0) {
      // Find items that exist in original but not in current (deleted items)
      const deletedItems = originalLineItems.filter(originalItem => {
        return !lineItems.some(currentItem => 
          currentItem.description === originalItem.description ||
          currentItem.id === originalItem.id
        );
      });

      // Add deleted items with ghost styling
      const transformedDeletedItems = deletedItems.map(item => ({
        id: `deleted-${item.id}`,
        item: item.item_code || '',
        description: item.description,
        brand: item.brand,
        quantity: item.quantity,
        price: item.unit_price,
        isDeleted: true,
        isNew: false
      }));

      // Combine current items with deleted items
      transformedLineItems.push(...transformedDeletedItems);
    }

    return {
      poNumber: invoice.po_number,
      date: invoice.invoice_date,
      customerName: invoice.customer_name,
      address: invoice.customer_address,
      city: invoice.customer_city,
      state: invoice.customer_state,
      zip: invoice.customer_zip,
      tel1: invoice.customer_tel1 || '',
      tel2: invoice.customer_tel2 || '',
      email: invoice.customer_email || '',
      lineItems: transformedLineItems,
      subtotal: invoice.subtotal,
      discount: invoice.discount_amount || 0,
      tax: invoice.tax_amount,
      total: invoice.total_amount,
      balance: invoice.balance_due,
      payments: payments
    };
  };

  const transformedInvoice = transformInvoiceData(invoice, lineItems);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">
                Invoice Preview - PO #{invoice.po_number}
              </h2>
              {/* Only show "Edited" badge if this invoice has original_invoice_id (meaning it's the edited version) */}
              {invoice.original_invoice_id && (
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  Edited
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            <BrandProvider>
              <div className="relative transform scale-75 origin-top-left">
                <InvoicePrintView
                  invoice={transformedInvoice}
                  innerRef={invoiceDocumentRef}
                  showInternalView={true}
                />
                
                {/* Overlay change indicators ONLY for edited invoices (those with original_invoice_id) */}
                {invoice.original_invoice_id && originalInvoice && (
                  <div className="absolute inset-0 pointer-events-none">
                    <style>{`
                      /* Target specific data fields for precise positioning */
                      [data-field="customer-name"],
                      [data-field="customer-address"],
                      [data-field="customer-phone"],
                      [data-field="customer-email"],
                      [data-field="subtotal"],
                      [data-field="tax"],
                      [data-field="total"],
                      [data-field="balance"],
                      [data-field="line-item"] {
                        position: relative;
                      }
                      
                      /* Customer field highlights */
                      /* Customer field highlights */
                      [data-field="customer-name"]::after {
                        content: '';
                        position: absolute;
                        top: 0px;
                        left: 0px;
                        right: 0px;
                        bottom: 0px;
                        background-color: ${isFieldChanged('customer_name', invoice.customer_name) ? 'rgba(239, 68, 68, 0.15)' : 'transparent'};
                        border: ${isFieldChanged('customer_name', invoice.customer_name) ? '1px solid rgba(239, 68, 68, 0.5)' : 'none'};
                        border-radius: 2px;
                        pointer-events: none;
                        z-index: 10;
                      }
                      
                      [data-field="customer-address"]::after {
                        content: '';
                        position: absolute;
                        top: 0px;
                        left: 0px;
                        right: 0px;
                        bottom: 0px;
                        background-color: ${isFieldChanged('customer_address', invoice.customer_address) ? 'rgba(239, 68, 68, 0.15)' : 'transparent'};
                        border: ${isFieldChanged('customer_address', invoice.customer_address) ? '1px solid rgba(239, 68, 68, 0.5)' : 'none'};
                        border-radius: 2px;
                        pointer-events: none;
                        z-index: 10;
                      }
                      
                      [data-field="customer-phone"]::after {
                        content: '';
                        position: absolute;
                        top: 0px;
                        left: 0px;
                        right: 0px;
                        bottom: 0px;
                        background-color: ${(isFieldChanged('customer_tel1', invoice.customer_tel1) || 
                          isFieldChanged('customer_tel2', invoice.customer_tel2)) ? 'rgba(239, 68, 68, 0.15)' : 'transparent'};
                        border: ${(isFieldChanged('customer_tel1', invoice.customer_tel1) || 
                          isFieldChanged('customer_tel2', invoice.customer_tel2)) ? '1px solid rgba(239, 68, 68, 0.5)' : 'none'};
                        border-radius: 2px;
                        pointer-events: none;
                        z-index: 10;
                      }
                      
                      [data-field="customer-email"]::after {
                        content: '';
                        position: absolute;
                        top: 0px;
                        left: 0px;
                        right: 0px;
                        bottom: 0px;
                        background-color: ${isFieldChanged('customer_email', invoice.customer_email) ? 'rgba(239, 68, 68, 0.15)' : 'transparent'};
                        border: ${isFieldChanged('customer_email', invoice.customer_email) ? '1px solid rgba(239, 68, 68, 0.5)' : 'none'};
                        border-radius: 2px;
                        pointer-events: none;
                        z-index: 10;
                      }
                      
                      /* Financial field highlights */
                      [data-field="subtotal"]::after {
                        content: '';
                        position: absolute;
                        top: 0px;
                        left: 0px;
                        right: 0px;
                        bottom: 0px;
                        background-color: ${isFieldChanged('subtotal', invoice.subtotal) ? 'rgba(239, 68, 68, 0.15)' : 'transparent'};
                        border: ${isFieldChanged('subtotal', invoice.subtotal) ? '1px solid rgba(239, 68, 68, 0.5)' : 'none'};
                        border-radius: 2px;
                        pointer-events: none;
                        z-index: 10;
                      }
                      
                      [data-field="tax"]::after {
                        content: '';
                        position: absolute;
                        top: 0px;
                        left: 0px;
                        right: 0px;
                        bottom: 0px;
                        background-color: ${isFieldChanged('tax_amount', invoice.tax_amount) ? 'rgba(239, 68, 68, 0.15)' : 'transparent'};
                        border: ${isFieldChanged('tax_amount', invoice.tax_amount) ? '1px solid rgba(239, 68, 68, 0.5)' : 'none'};
                        border-radius: 2px;
                        pointer-events: none;
                        z-index: 10;
                      }
                      
                      [data-field="total"]::after {
                        content: '';
                        position: absolute;
                        top: 0px;
                        left: 0px;
                        right: 0px;
                        bottom: 0px;
                        background-color: ${isFieldChanged('total_amount', invoice.total_amount) ? 'rgba(239, 68, 68, 0.15)' : 'transparent'};
                        border: ${isFieldChanged('total_amount', invoice.total_amount) ? '1px solid rgba(239, 68, 68, 0.5)' : 'none'};
                        border-radius: 2px;
                        pointer-events: none;
                        z-index: 10;
                      }
                      
                      [data-field="balance"]::after {
                        content: '';
                        position: absolute;
                        top: 0px;
                        left: 0px;
                        right: 0px;
                        bottom: 0px;
                        background-color: ${isFieldChanged('balance_due', invoice.balance_due) ? 'rgba(239, 68, 68, 0.15)' : 'transparent'};
                        border: ${isFieldChanged('balance_due', invoice.balance_due) ? '1px solid rgba(239, 68, 68, 0.5)' : 'none'};
                        border-radius: 2px;
                        pointer-events: none;
                        z-index: 10;
                      }                      [data-field="customer-address"]::after {
                        content: '';
                        position: absolute;
                        top: -2px;
                        left: -2px;
                        right: -2px;
                        bottom: -2px;
                        background-color: ${isFieldChanged('customer_address', invoice.customer_address) ? 'rgba(239, 68, 68, 0.2)' : 'transparent'};
                        border: ${isFieldChanged('customer_address', invoice.customer_address) ? '2px solid rgba(239, 68, 68, 0.6)' : 'none'};
                        border-radius: 4px;
                        box-shadow: ${isFieldChanged('customer_address', invoice.customer_address) ? '0 0 5px rgba(239, 68, 68, 0.4)' : 'none'};
                        pointer-events: none;
                        z-index: 10;
                      }
                      
                      [data-field="customer-phone"]::after {
                        content: '';
                        position: absolute;
                        top: -2px;
                        left: -2px;
                        right: -2px;
                        bottom: -2px;
                        background-color: ${(isFieldChanged('customer_tel1', invoice.customer_tel1) || 
                          isFieldChanged('customer_tel2', invoice.customer_tel2)) ? 'rgba(239, 68, 68, 0.2)' : 'transparent'};
                        border: ${(isFieldChanged('customer_tel1', invoice.customer_tel1) || 
                          isFieldChanged('customer_tel2', invoice.customer_tel2)) ? '2px solid rgba(239, 68, 68, 0.6)' : 'none'};
                        border-radius: 4px;
                        box-shadow: ${(isFieldChanged('customer_tel1', invoice.customer_tel1) || 
                          isFieldChanged('customer_tel2', invoice.customer_tel2)) ? '0 0 5px rgba(239, 68, 68, 0.4)' : 'none'};
                        pointer-events: none;
                        z-index: 10;
                      }
                      
                      [data-field="customer-email"]::after {
                        content: '';
                        position: absolute;
                        top: -2px;
                        left: -2px;
                        right: -2px;
                        bottom: -2px;
                        background-color: ${isFieldChanged('customer_email', invoice.customer_email) ? 'rgba(239, 68, 68, 0.2)' : 'transparent'};
                        border: ${isFieldChanged('customer_email', invoice.customer_email) ? '2px solid rgba(239, 68, 68, 0.6)' : 'none'};
                        border-radius: 4px;
                        box-shadow: ${isFieldChanged('customer_email', invoice.customer_email) ? '0 0 5px rgba(239, 68, 68, 0.4)' : 'none'};
                        pointer-events: none;
                        z-index: 10;
                      }
                      
                      /* Financial field highlights */
                      [data-field="subtotal"]::after {
                        content: '';
                        position: absolute;
                        top: -2px;
                        left: -2px;
                        right: -2px;
                        bottom: -2px;
                        background-color: ${isFieldChanged('subtotal', invoice.subtotal) ? 'rgba(239, 68, 68, 0.2)' : 'transparent'};
                        border: ${isFieldChanged('subtotal', invoice.subtotal) ? '2px solid rgba(239, 68, 68, 0.6)' : 'none'};
                        border-radius: 4px;
                        box-shadow: ${isFieldChanged('subtotal', invoice.subtotal) ? '0 0 5px rgba(239, 68, 68, 0.4)' : 'none'};
                        pointer-events: none;
                        z-index: 10;
                      }
                      
                      [data-field="tax"]::after {
                        content: '';
                        position: absolute;
                        top: -2px;
                        left: -2px;
                        right: -2px;
                        bottom: -2px;
                        background-color: ${isFieldChanged('tax_amount', invoice.tax_amount) ? 'rgba(239, 68, 68, 0.2)' : 'transparent'};
                        border: ${isFieldChanged('tax_amount', invoice.tax_amount) ? '2px solid rgba(239, 68, 68, 0.6)' : 'none'};
                        border-radius: 4px;
                        box-shadow: ${isFieldChanged('tax_amount', invoice.tax_amount) ? '0 0 5px rgba(239, 68, 68, 0.4)' : 'none'};
                        pointer-events: none;
                        z-index: 10;
                      }
                      
                      [data-field="total"]::after {
                        content: '';
                        position: absolute;
                        top: -2px;
                        left: -2px;
                        right: -2px;
                        bottom: -2px;
                        background-color: ${isFieldChanged('total_amount', invoice.total_amount) ? 'rgba(239, 68, 68, 0.2)' : 'transparent'};
                        border: ${isFieldChanged('total_amount', invoice.total_amount) ? '2px solid rgba(239, 68, 68, 0.6)' : 'none'};
                        border-radius: 4px;
                        box-shadow: ${isFieldChanged('total_amount', invoice.total_amount) ? '0 0 5px rgba(239, 68, 68, 0.4)' : 'none'};
                        pointer-events: none;
                        z-index: 10;
                      }
                      
                      [data-field="balance"]::after {
                        content: '';
                        position: absolute;
                        top: -2px;
                        left: -2px;
                        right: -2px;
                        bottom: -2px;
                        background-color: ${isFieldChanged('balance_due', invoice.balance_due) ? 'rgba(239, 68, 68, 0.2)' : 'transparent'};
                        border: ${isFieldChanged('balance_due', invoice.balance_due) ? '2px solid rgba(239, 68, 68, 0.6)' : 'none'};
                        border-radius: 4px;
                        box-shadow: ${isFieldChanged('balance_due', invoice.balance_due) ? '0 0 5px rgba(239, 68, 68, 0.4)' : 'none'};
                        pointer-events: none;
                        z-index: 10;
                      }
                      
                      /* Line item highlights */
                      ${lineItems.map((lineItem, index) => {
                        // Only apply red styling to changed items that are NOT new (added)
                        const isChanged = isLineItemChanged(lineItem);
                        const isNewItem = invoice.original_invoice_id && originalLineItems.length > 0 && 
                          !originalLineItems.some(originalItem => 
                            originalItem.description === lineItem.description ||
                            originalItem.id === lineItem.id
                          );
                        
                        if (isChanged && !isNewItem) {
                          return `
                            [data-field="line-item"]:nth-of-type(${index + 1})::after {
                              content: '';
                              position: absolute;
                              top: -1px;
                              left: -1px;
                              right: -1px;
                              bottom: -1px;
                              background-color: rgba(239, 68, 68, 0.15);
                              border: 2px solid rgba(239, 68, 68, 0.6);
                              border-radius: 3px;
                              box-shadow: 0 0 5px rgba(239, 68, 68, 0.4);
                              pointer-events: none;
                              z-index: 5;
                            }
                          `;
                        }
                        return '';
                      }).join('')}
                      
                      @media print {
                        [data-field="customer-name"]::after,
                        [data-field="customer-address"]::after,
                        [data-field="customer-phone"]::after,
                        [data-field="customer-email"]::after,
                        [data-field="subtotal"]::after,
                        [data-field="tax"]::after,
                        [data-field="total"]::after,
                        [data-field="balance"]::after,
                        [data-field="line-item"]::after {
                          background-color: transparent !important;
                          border: none !important;
                          box-shadow: none !important;
                        }
                      }
                    `}</style>
                  </div>
                )}
              </div>
            </BrandProvider>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};