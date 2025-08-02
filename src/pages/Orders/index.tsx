import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import HeaderBar from './components/HeaderBar';
import NewOrderButton from './components/NewOrderButton';
import OrdersSpreadsheet from './components/OrdersSpreadsheet';
import { RefreshCw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { createClient } from '@supabase/supabase-js';
import { searchInvoices } from '../../utils/searchUtils';

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

// Cache duration: 12 hours in milliseconds
const AUTO_REFRESH_INTERVAL = 12 * 60 * 60 * 1000;

function Orders() {
  const navigate = useNavigate();
  const location = useLocation();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Handle invoice editing from navigation state
  useEffect(() => {
    if (location.state?.editInvoice) {
      console.log('Navigating to edit invoice:', location.state.editInvoice);
      navigate('/invoice-generator', { 
        state: { 
          editInvoice: location.state.editInvoice
        },
        replace: true 
      });
    }
  }, [location.state, navigate]);

  // Fetch invoices from database
  const fetchInvoices = async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      // Fetch invoices from the database
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (invoiceError) {
        throw invoiceError;
      }

      setInvoices(invoiceData || []);
      setFilteredInvoices(invoiceData || []);
      setLastRefreshed(new Date());
      
      console.log('Invoices refreshed successfully:', invoiceData);
      
    } catch (err) {
      console.error('Error refreshing invoices:', err);
      setError('Failed to refresh invoices. Please try again later.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Memoize the refresh function to avoid recreation on each render
  const handleRefreshOrders = useCallback(async (forceRefresh: boolean = false) => {
    console.log(`handleRefreshOrders starting, force refresh: ${forceRefresh}`);
    await fetchInvoices();
  }, []);

  // Handle search functionality
  const handleSearch = useCallback(async (term: string) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      setFilteredInvoices(invoices);
      return;
    }

    setIsSearching(true);
    try {
      const filtered = await searchInvoices(invoices, term);
      setFilteredInvoices(filtered);
    } catch (error) {
      console.error('Error searching invoices:', error);
      setFilteredInvoices(invoices); // Fallback to showing all invoices
    } finally {
      setIsSearching(false);
    }
  }, [invoices]);

  // Update filtered invoices when invoices change
  useEffect(() => {
    if (searchTerm.trim()) {
      handleSearch(searchTerm);
    } else {
      setFilteredInvoices(invoices);
    }
  }, [invoices, searchTerm, handleSearch]);

  // Navigation handlers
  const handleOrderUpdate = useCallback((updatedInvoice: Invoice) => {
    setInvoices(prevInvoices => 
      prevInvoices.map(invoice => 
        invoice.id === updatedInvoice.id ? updatedInvoice : invoice
      )
    );
  }, []);

  const handleOrderDeleted = useCallback((deletedOrderId: string) => {
    setInvoices(prevInvoices => 
      prevInvoices.filter(invoice => invoice.id !== deletedOrderId)
    );
  }, []);

  const handleViewInvoices = (_invoiceId: string) => {
    navigate('/invoices');
  };

  // Manual refresh handler (always force refresh)
  const handleManualRefresh = () => {
    handleRefreshOrders(true);
  };

  // Initial data load and auto-refresh setup
  useEffect(() => {
    handleRefreshOrders(false); // Initial load
    
    // Set up auto-refresh every 12 hours
    const autoRefreshInterval = setInterval(() => {
      handleRefreshOrders(true); // Force refresh on auto-refresh
    }, AUTO_REFRESH_INTERVAL);
    
    // Clean up interval on component unmount
    return () => {
      console.log('Orders component unmounting, clearing interval');
      clearInterval(autoRefreshInterval);
    };
  }, [handleRefreshOrders]);

  // Format the last refreshed time for display
  const getLastRefreshedText = () => {
    if (!lastRefreshed) return 'Never refreshed';
    
    const now = new Date();
    const diffMs = now.getTime() - lastRefreshed.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  return (
    <div className="fade-in h-full flex flex-col overflow-auto pb-10">
      <div className="flex items-center justify-between mb-6">
        <HeaderBar />
        <div className="flex flex-col items-end">
          <div className="flex space-x-2">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="btn btn-secondary flex items-center"
            >
              <RefreshCw size={18} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <NewOrderButton />
          </div>
          {lastRefreshed && (
            <span className="text-xs text-gray-500 mt-1">
              Last refreshed: {getLastRefreshedText()}
            </span>
          )}
        </div>
      </div>

      {isRefreshing && invoices.length === 0 ? (
        <div className="flex justify-center items-center flex-grow">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-800">
          <p>{error}</p>
          <button 
            onClick={handleManualRefresh}
            className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="flex-1">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by customer, order #, date, items, or brand..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-500"></div>
                </div>
              )}
            </div>
            {searchTerm && (
              <p className="text-sm text-gray-500 mt-2">
                Showing {filteredInvoices.length} of {invoices.length} orders
              </p>
            )}
          </div>
          
          {/* Invoices Table View */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Invoices</h2>
            {filteredInvoices.length > 0 ? (
              <OrdersSpreadsheet 
                orders={filteredInvoices} 
                onViewInvoices={handleViewInvoices}
                onOrderUpdate={handleOrderUpdate}
                onOrderDeleted={handleOrderDeleted}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                {searchTerm ? (
                  <>
                    <p className="text-gray-500 mb-4">No orders found matching "{searchTerm}"</p>
                    <p className="text-sm text-gray-400">Try adjusting your search terms or clearing the search.</p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500 mb-4">No invoices to display</p>
                    <p className="text-sm text-gray-400">Invoices will appear here once they are created in the system.</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;