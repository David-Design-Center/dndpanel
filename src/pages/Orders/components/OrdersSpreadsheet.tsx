import { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, DollarSign, FileText } from 'lucide-react';
import { CustomerOrder } from '../../../types';
import { format, parse } from 'date-fns';
import { fetchInvoiceByOrderId } from '../../../services/backendApi';

interface OrdersSpreadsheetProps {
  orders: CustomerOrder[];
  onGenerateInvoice: (orderId: string) => void;
}

function OrdersSpreadsheet({ orders, onGenerateInvoice }: OrdersSpreadsheetProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof CustomerOrder>('orderDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
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

  // Sort and paginate orders
  const sortedOrders = [...orders].sort((a, b) => {
    if (sortField === 'orderDate') {
      const aDate = parseDate(a[sortField] as string);
      const bDate = parseDate(b[sortField] as string);
      return sortDirection === 'asc' 
        ? aDate.getTime() - bDate.getTime()
        : bDate.getTime() - aDate.getTime();
    }
    
    if (sortField === 'orderAmount') {
      const aAmount = a[sortField] as number || 0;
      const bAmount = b[sortField] as number || 0;
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

  const handleSort = (field: keyof CustomerOrder) => {
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

  const getSortIcon = (field: keyof CustomerOrder) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const handleGenerateInvoice = async (orderId: string) => {
    try {
      // Check if an invoice already exists for this order
      const existingInvoice = await fetchInvoiceByOrderId(orderId);
      
      if (existingInvoice) {
        console.log('Found existing invoice for order:', existingInvoice.invoice.id);
        // If an invoice exists, navigate to the invoice editor with the invoice ID
        onGenerateInvoice(orderId);
      } else {
        // If no invoice exists, proceed as normal to create a new one
        onGenerateInvoice(orderId);
      }
    } catch (error) {
      console.error('Error checking for existing invoice:', error);
      // Proceed with normal flow in case of error
      onGenerateInvoice(orderId);
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-lg shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('orderNumber')}
              >
                <div className="flex items-center space-x-1">
                  <span>Order Number</span>
                  {getSortIcon('orderNumber')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('customerName')}
              >
                <div className="flex items-center space-x-1">
                  <span>Customer Name</span>
                  {getSortIcon('customerName')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('orderDate')}
              >
                <div className="flex items-center space-x-1">
                  <span>Order Date</span>
                  {getSortIcon('orderDate')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('orderAmount')}
              >
                <div className="flex items-center space-x-1">
                  <span>Order Amount</span>
                  {getSortIcon('orderAmount')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('paymentOption')}
              >
                <div className="flex items-center space-x-1">
                  <span>Payment Option</span>
                  {getSortIcon('paymentOption')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('paymentStatus')}
              >
                <div className="flex items-center space-x-1">
                  <span>Payment Status</span>
                  {getSortIcon('paymentStatus')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('projectName')}
              >
                <div className="flex items-center space-x-1">
                  <span>Project Name</span>
                  {getSortIcon('projectName')}
                </div>
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
            {paginatedOrders.map((order) => (
              <tr 
                key={order.id} 
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {order.orderNumber || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {order.customerName || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {order.orderDate || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {order.orderAmount ? (
                    <span className="flex items-center">
                      <DollarSign size={14} className="mr-1" />
                      {order.orderAmount.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </span>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {order.paymentOption || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' : 
                      order.paymentStatus === 'Partially Paid' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'}`}>
                    {order.paymentStatus || 'Unknown'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {order.projectName || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleGenerateInvoice(order.id)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    title="Generate Invoice"
                  >
                    <FileText size={14} className="mr-1" />
                    Invoice
                  </button>
                </td>
              </tr>
            ))}
            
            {paginatedOrders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-center text-sm text-gray-500">
                  No customer orders found
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
  );
}

export default OrdersSpreadsheet;