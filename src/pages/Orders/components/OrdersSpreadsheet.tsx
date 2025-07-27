import { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, DollarSign, FileText, ChevronDown, Eye, Trash2 } from 'lucide-react';
import { parse } from 'date-fns';
import { createClient } from '@supabase/supabase-js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { InvoicePreviewModal } from '../../../components/InvoicePreviewModal';
import { useProfile } from '../../../contexts/ProfileContext';
import { deleteCustomerOrder } from '../../../services/backendApi';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Invoice {
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

interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  item_code?: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  brand?: string;
}

// Interface that matches InvoicePreviewModal's expected format
interface InvoiceForModal {
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

type PaymentStatus = 'Order in Progress' | 'Paid in Full';
type SortField = 'po_number' | 'customer_name' | 'invoice_date' | 'total_amount' | 'balance_due';

interface OrdersSpreadsheetProps {
  orders: Invoice[];
  onViewInvoices: (orderId: string) => void;
  onOrderUpdate?: (updatedOrder: Invoice) => void;
  onOrderDeleted?: (orderId: string) => void;
}

function OrdersSpreadsheet({ orders, onViewInvoices, onOrderUpdate, onOrderDeleted }: OrdersSpreadsheetProps) {
  const { currentProfile } = useProfile();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('invoice_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<{ invoice: InvoiceForModal; lineItems: InvoiceLineItem[] } | null>(null);
  const itemsPerPage = 10;

  // Function to parse date strings that might be in different formats
  const parseDate = (dateStr: string | undefined): Date => {
    if (!dateStr) return new Date(0);
    
    // Check if it's an ISO string (from API)
    if (dateStr.includes('T')) {
      return new Date(dateStr);
    }
    
    // Try to parse dates like "5/15/2025"
    try {
      return parse(dateStr, 'M/d/yyyy', new Date());
    } catch (e) {
      return new Date(0);
    }
  };

  // Calculate payment status based on balance
  const getPaymentStatus = (invoice: Invoice): PaymentStatus => {
    return invoice.balance_due <= 0 ? 'Paid in Full' : 'Order in Progress';
  };

  // Sort and paginate orders
  const sortedOrders = [...orders].sort((a, b) => {
    if (sortField === 'invoice_date') {
      const aDate = parseDate(a.invoice_date);
      const bDate = parseDate(b.invoice_date);
      return sortDirection === 'asc' 
        ? aDate.getTime() - bDate.getTime()
        : bDate.getTime() - aDate.getTime();
    }
    
    if (sortField === 'total_amount' || sortField === 'balance_due') {
      const aAmount = a[sortField] || 0;
      const bAmount = b[sortField] || 0;
      return sortDirection === 'asc' ? aAmount - bAmount : bAmount - aAmount;
    }
    
    const aValue = a[sortField] || '';
    const bValue = b[sortField] || '';
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return 0;
  });

  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = sortedOrders.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  // Update payment status by updating the balance_due field
  const handlePaymentStatusUpdate = async (invoiceId: string, newStatus: PaymentStatus) => {
    setUpdatingStatus(invoiceId);
    
    try {
      // Update the balance_due based on payment status
      const newBalanceDue = newStatus === 'Paid in Full' ? 0 : 
        orders.find(o => o.id === invoiceId)?.total_amount || 0;
      
      const { data, error } = await supabase
        .from('invoices')
        .update({ balance_due: newBalanceDue })
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;

      if (data && onOrderUpdate) {
        // Update the local invoice data
        onOrderUpdate(data as Invoice);
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Handle viewing invoice details
  const handleViewInvoice = async (invoice: Invoice) => {
    try {
      // Fetch line items for this invoice
      const { data: lineItems, error } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (error) throw error;

      // Convert the invoice to match InvoicePreviewModal interface
      const convertedInvoice: InvoiceForModal = {
        ...invoice,
        customer_address: invoice.customer_address || '',
        customer_city: invoice.customer_city || '',
        customer_state: invoice.customer_state || '',
        customer_zip: invoice.customer_zip || ''
      };

      setSelectedInvoice({
        invoice: convertedInvoice,
        lineItems: lineItems || []
      });
    } catch (error) {
      console.error('Error fetching invoice details:', error);
    }
  };

  // Handle deleting an order
  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete order ${orderNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingOrder(orderId);
      
      const success = await deleteCustomerOrder(orderId);
      
      if (success) {
        // Notify parent component that order was deleted
        if (onOrderDeleted) {
          onOrderDeleted(orderId);
        }
      } else {
        alert('Failed to delete order. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order. Please try again.');
    } finally {
      setDeletingOrder(null);
    }
  };

  const PaymentStatusCell = ({ invoice }: { invoice: Invoice }) => {
    const isUpdating = updatingStatus === invoice.id;
    const status = getPaymentStatus(invoice);

    const getStatusBadgeClasses = (status: PaymentStatus) => {
      const baseClasses = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full transition-colors";
      
      if (status === 'Paid in Full') {
        return `${baseClasses} bg-green-100 text-green-800 hover:bg-green-200`;
      } else {
        return `${baseClasses} bg-yellow-100 text-yellow-800 hover:bg-yellow-200`;
      }
    };

    if (isUpdating) {
      return (
        <div className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-600">
          Updating...
        </div>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={`${getStatusBadgeClasses(status)} cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1`}>
            {status}
            <ChevronDown className="ml-1 h-3 w-3 inline" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[160px]">
          <DropdownMenuItem 
            onClick={() => handlePaymentStatusUpdate(invoice.id, 'Order in Progress')}
            className="cursor-pointer"
          >
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></span>
              Order in Progress
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handlePaymentStatusUpdate(invoice.id, 'Paid in Full')}
            className="cursor-pointer"
          >
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-green-400 mr-2"></span>
              Paid in Full
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      <div className="flex flex-col bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('po_number')}
                >
                  <div className="flex items-center space-x-1">
                    <span>PO Number</span>
                    {getSortIcon('po_number')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('customer_name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Customer Name</span>
                    {getSortIcon('customer_name')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('invoice_date')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Invoice Date</span>
                    {getSortIcon('invoice_date')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('total_amount')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Total Amount</span>
                    {getSortIcon('total_amount')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('balance_due')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Balance Due</span>
                    {getSortIcon('balance_due')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Payment Status
                </th>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedOrders.map((invoice) => (
                <tr 
                  key={invoice.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleViewInvoice(invoice)}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.po_number || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {invoice.customer_name || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    <span className="flex items-center">
                      <DollarSign size={14} className="mr-1" />
                      {invoice.total_amount.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    <span className="flex items-center">
                      <DollarSign size={14} className="mr-1" />
                      {invoice.balance_due.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <PaymentStatusCell invoice={invoice} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        title="View Invoice Details"
                      >
                        <Eye size={14} className="mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => onViewInvoices(invoice.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        title="Go to Invoices Tab"
                      >
                        <FileText size={14} className="mr-1" />
                        Invoices
                      </button>
                      {/* Delete button - Only visible for David */}
                      {currentProfile?.name === 'David' && (
                        <button
                          onClick={() => handleDeleteOrder(invoice.id, invoice.po_number)}
                          disabled={deletingOrder === invoice.id}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                          title="Delete Order"
                        >
                          <Trash2 size={14} className="mr-1" />
                          {deletingOrder === invoice.id ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              
              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-center text-sm text-gray-500">
                    No invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between mt-auto bg-gray-50">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || totalPages === 0}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(startIndex + itemsPerPage, sortedOrders.length)}
                </span>{' '}
                of <span className="font-medium">{sortedOrders.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                
                {/* Page number display */}
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  {currentPage} / {totalPages || 1}
                </span>
                
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      {selectedInvoice && (
        <InvoicePreviewModal
          isOpen={true}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice.invoice}
          lineItems={selectedInvoice.lineItems}
        />
      )}
    </>
  );
}

export default OrdersSpreadsheet;