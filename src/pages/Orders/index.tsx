import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderBar from './components/HeaderBar';
import NewOrderButton from './components/NewOrderButton';
import KanbanBoard from './components/KanbanBoard';
import PriceRequestsSpreadsheet from './components/PriceRequestsSpreadsheet';
import OrdersSpreadsheet from './components/OrdersSpreadsheet';
import { PriceRequest, CustomerOrder, OrderType } from '../../types';
import { fetchPriceRequests, fetchCustomerOrders, clearPriceRequestsCache, clearCustomerOrdersCache, updateOrderStatus, checkAndUpdatePriceRequestStatuses } from '../../services/backendApi';
import { RefreshCw } from 'lucide-react';

// Cache duration: 12 hours in milliseconds
const AUTO_REFRESH_INTERVAL = 12 * 60 * 60 * 1000;

function Orders() {
  const navigate = useNavigate();
  const [priceRequests, setPriceRequests] = useState<PriceRequest[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Memoize the refresh function to avoid recreation on each render
  const handleRefreshOrders = useCallback(async (forceRefresh: boolean = false) => {
    console.log(`handleRefreshOrders starting, force refresh: ${forceRefresh}`);
    try {
      setIsRefreshing(true);
      
      // Fetch both price requests and customer orders
      const [fetchedPriceRequests, fetchedCustomerOrders] = await Promise.all([
        fetchPriceRequests(forceRefresh),
        fetchCustomerOrders(forceRefresh)
      ]);
      
      console.log('Price requests refreshed successfully:', fetchedPriceRequests);
      console.log('Customer orders refreshed successfully:', fetchedCustomerOrders);
      
      setPriceRequests(fetchedPriceRequests);
      setCustomerOrders(fetchedCustomerOrders);
      setError(null);
      setLastRefreshed(new Date());

      // Check for email activity and update price request statuses
      console.log('Checking email activity for price request updates...');
      await checkAndUpdatePriceRequestStatuses();
      
      // Refresh price requests again after email activity check to get updated statuses
      const updatedPriceRequests = await fetchPriceRequests(true);
      setPriceRequests(updatedPriceRequests);
      console.log('Email activity check completed');
      
    } catch (err) {
      console.error('Error refreshing orders:', err);
      setError('Failed to refresh orders. Please try again later.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Handle completing a price request
  const handleCompletePriceRequest = useCallback(async (id: string) => {
    try {
      console.log('Completing price request:', id);
      
      const result = await updateOrderStatus(id, 'Completed');
      
      if (result) {
        console.log('Successfully completed price request');
        // Refresh the data to show the updated status
        await handleRefreshOrders(true);
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error completing price request:', error);
      alert('Failed to complete price request. Please try again.');
    }
  }, [handleRefreshOrders]);

  // Navigation handlers
  const handleGenerateInvoice = (orderId: string) => {
    navigate(`/invoice/${orderId}`);
  };

  // Manual refresh handler (always force refresh)
  const handleManualRefresh = () => {
    console.log('Manual refresh requested');
    // Clear the caches to ensure we get fresh data
    clearPriceRequestsCache();
    clearCustomerOrdersCache();
    handleRefreshOrders(true);
  };

  // Initial data load and auto-refresh setup
  useEffect(() => {
    console.log('Orders component mounted, loading initial data from Supabase');
    handleRefreshOrders(false); // Initial load, might use cache if available
    
    // Set up auto-refresh every 12 hours
    const autoRefreshInterval = setInterval(() => {
      console.log('Auto-refresh triggered');
      handleRefreshOrders(true); // Force refresh on auto-refresh
    }, AUTO_REFRESH_INTERVAL);
    
    // Clean up interval on component unmount
    return () => {
      console.log('Orders component unmounting, clearing interval');
      clearInterval(autoRefreshInterval);
    };
  }, [handleRefreshOrders]);

  const handleNewOrder = (type: OrderType) => {
    setSelectedOrderType(type);
    // Would trigger a modal or navigate to create form in a real implementation
    console.log(`Creating new ${type}`);
  };

  const handleToggleExpand = (id: string) => {
    setExpandedOrderId(expandedOrderId === id ? null : id);
  };

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
            <NewOrderButton onSelectOrderType={handleNewOrder} />
          </div>
          {lastRefreshed && (
            <span className="text-xs text-gray-500 mt-1">
              Last refreshed: {getLastRefreshedText()}
            </span>
          )}
        </div>
      </div>

      {isRefreshing && priceRequests.length === 0 && customerOrders.length === 0 ? (
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
        <div className="flex-1 space-y-8">
          {/* Price Request Tracking (Kanban Board View) }
          {/* <div>
          {/*   <h2 className="text-xl font-semibold mb-4">Price Request Tracking</h2>
          {/*   <KanbanBoard 
          {/*     orders={priceRequests} 
          {/*     expandedOrderId={expandedOrderId} 
          {/*     onToggleExpand={handleToggleExpand}
          {/*     onCompletePriceRequest={handleCompletePriceRequest}
          {/*   />
          {/* </div>
          
          {/* Price Requests Table View */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Price Requests</h2>
            {priceRequests.length > 0 ? (
              <PriceRequestsSpreadsheet 
                priceRequests={priceRequests} 
              />
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-500 mb-4">No price requests to display</p>
                <p className="text-sm text-gray-400">Price requests will appear here once they are created in the system.</p>
              </div>
            )}
          </div>

          {/* Customer Orders Table View */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Customer Orders</h2>
            {customerOrders.length > 0 ? (
              <OrdersSpreadsheet 
                orders={customerOrders} 
                onGenerateInvoice={handleGenerateInvoice}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-500 mb-4">No customer orders to display</p>
                <p className="text-sm text-gray-400">Customer orders will appear here once they are created in the system.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;