import { useState, useEffect } from 'react';
import { fetchPriceRequests } from '../services/backendApi';
import { PriceRequest } from '../types';
import { ExternalLink, RefreshCw, Package, Box } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function Tracker() {
  const [orders, setOrders] = useState<PriceRequest[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  // Fetch orders on component mount
  useEffect(() => {
    fetchOrders();
  }, []);

  // Function to fetch orders
  const fetchOrders = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await fetchPriceRequests(forceRefresh);
      setOrders(data);
      
      // Select the first order by default if none is selected
      if (!selectedOrderId && data.length > 0) {
        setSelectedOrderId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh button click
  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders(true);
  };

  // Handle order selection
  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
  };

  // Get the selected order details
  const selectedOrder = orders.find(order => order.id === selectedOrderId);

  // Generate order code for tracking URL
  const getOrderCode = (order?: PriceRequest) => {
    if (!order) return '';
    
    // Use the order number if available
    if (order.orderNumber) {
      return order.orderNumber.trim();
    }
    
    // Otherwise, generate a code from project name
    return order.projectName
      .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
      .substring(0, 10) // Limit length
      .toUpperCase();
  };

  return (
    <div className="fade-in h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">Order Tracker</h1>
        <button
          onClick={handleRefresh}
          className="btn btn-secondary flex items-center"
          disabled={refreshing}
        >
          <RefreshCw size={18} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="flex flex-1 bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Left sidebar - Order List */}
        <div className="w-64 border-r border-gray-200 flex flex-col">
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-700">Select Order</h2>
          </div>
          
          {loading && !refreshing ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : orders.length > 0 ? (
            <div className="flex-1 overflow-y-auto">
              {orders.map(order => (
                <button
                  key={order.id}
                  className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedOrderId === order.id ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''
                  }`}
                  onClick={() => handleOrderSelect(order.id)}
                >
                  <div className="flex items-start">
                    <Package size={16} className={`mr-2 mt-1 ${selectedOrderId === order.id ? 'text-primary-500' : 'text-gray-400'}`} />
                    <div>
                      <p className={`text-sm ${selectedOrderId === order.id ? 'font-medium text-primary-700' : 'font-medium text-gray-700'}`}>
                        {order.orderNumber || 'No Order #'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{order.projectName}</p>
                      <div className="flex items-center mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          order.status === 'Completed' 
                            ? 'bg-green-100 text-green-800' 
                            : order.status === 'Sent' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <p className="text-sm text-gray-500">No orders found</p>
            </div>
          )}
        </div>

        {/* Right content - iframe container */}
        <div className="flex-1 flex flex-col">
          {/* Order details header */}
          {selectedOrder && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-medium text-gray-800">
                    {selectedOrder.orderNumber ? `Order #${selectedOrder.orderNumber}` : selectedOrder.projectName}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedOrder.customerName || user?.email || 'No customer name'}
                  </p>
                </div>
                <a 
                  href={`https://board.embassycargo.eu/login.php?order=${getOrderCode(selectedOrder)}`} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <ExternalLink size={14} className="mr-1" />
                  Open in new tab
                </a>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <div className="text-xs bg-gray-100 px-2 py-1 rounded-md flex items-center">
                  <Box size={12} className="mr-1" />
                  <span>{selectedOrder.teams?.length || 0} partners</span>
                </div>
                {selectedOrder.status && (
                  <div className={`text-xs px-2 py-1 rounded-md flex items-center ${
                    selectedOrder.status === 'Completed' 
                      ? 'bg-green-100 text-green-800' 
                      : selectedOrder.status === 'Sent' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    Status: {selectedOrder.status}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Iframe container */}
          <div className="flex-1">
            <iframe 
              src={`https://board.embassycargo.eu/login.php${selectedOrder ? `?order=${getOrderCode(selectedOrder)}` : ''}`}
              className="w-full h-full border-none"
              title="Embassy Cargo Tracker"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Tracker;