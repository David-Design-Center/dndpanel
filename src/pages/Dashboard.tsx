import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  DollarSign,
  Users,
  ClipboardList,
  TrendingUp,
  Calendar as CalendarIcon, // Renamed to avoid conflict with Shadcn Calendar
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';
import { 
  fetchDashboardMetrics,
  DashboardMetrics,
  fetchMonthlyRevenue,
  MonthlyRevenue,
  fetchRecentOrders,
  RecentOrder,
  fetchUnderDepositInvoices
} from '../services/backendApi';

// Shadcn UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';

// Recharts for the graph
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// Date formatting for calendar
import { format } from 'date-fns';

function Dashboard() {
  const { currentProfile } = useProfile();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date()); // For the calendar

  // State for monthly revenue and recent orders
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<{ name: string; total: number }[]>([]);
  const [recentOrdersList, setRecentOrdersList] = useState<RecentOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [underDepositInvoices, setUnderDepositInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Placeholder for graph data - fallback if API fetch fails
  const graphData = [
    { name: 'Jan', total: 4000 },
    { name: 'Feb', total: 3000 },
    { name: 'Mar', total: 2000 },
    { name: 'Apr', total: 2780 },
    { name: 'May', total: 1890 },
    { name: 'Jun', total: 2390 },
    { name: 'Jul', total: 3490 },
    { name: 'Aug', total: 4000 },
    { name: 'Sep', total: 3000 },
    { name: 'Oct', total: 2000 },
    { name: 'Nov', total: 2780 },
    { name: 'Dec', total: 1890 },
  ];

  // Redirect if not David
  useEffect(() => {
    if (currentProfile && currentProfile.name !== 'David') {
      navigate('/inbox');
      return;
    }
  }, [currentProfile, navigate]);

  // Fetch dashboard data
  const fetchData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);

      setError(null);

      // Fetch dashboard metrics and monthly revenue in parallel
      const [metricsData, revenueData] = await Promise.all([
        fetchDashboardMetrics(forceRefresh), 
        fetchMonthlyRevenue(forceRefresh),
        fetchUnderDepositInvoices(forceRefresh)
      ]);
      
      const [dashboardMetrics, monthlyRevenue, underDeposit] = [metricsData, revenueData, revenueData[2]];

      setMetrics(dashboardMetrics);

      // Convert monthly revenue data format for the chart
      const formattedRevenueData = monthlyRevenue.map(item => ({
        name: item.month,
        total: item.total
      }));
      setMonthlyRevenueData(formattedRevenueData);
      
      // Set under deposit invoices
      try {
        setLoadingInvoices(true);
        const invoicesData = await fetchUnderDepositInvoices(forceRefresh);
        setUnderDepositInvoices(invoicesData);
      } catch (error) {
        console.error('Error fetching under-deposit invoices:', error);
      } finally {
        setLoadingInvoices(false);
      }

      // If we have a date selected, fetch orders for that date
      if (date) {
        await fetchOrdersForDate(date, forceRefresh);
      } else {
        // Otherwise fetch the latest orders
        const recentOrders = await fetchRecentOrders(undefined, forceRefresh);
        setRecentOrdersList(recentOrders);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to fetch orders for a specific date
  const fetchOrdersForDate = async (selectedDate: Date, forceRefresh = false) => {
    try {
      setLoadingOrders(true);
      const orders = await fetchRecentOrders(selectedDate, forceRefresh);
      setRecentOrdersList(orders);
    } catch (error) {
      console.error('Error fetching orders for date:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Effect to fetch data when profile is available
  useEffect(() => {
    if (currentProfile?.name === 'David') {
      fetchData();
    }
  }, [currentProfile]);

  // Effect to fetch orders when date changes
  useEffect(() => {
    if (date && currentProfile?.name === 'David') {
      fetchOrdersForDate(date);
    }
  }, [date, currentProfile?.name]);

  const handleRefresh = () => {
    fetchData(true);
  };

  // If not David, show access denied
  if (currentProfile && currentProfile.name !== 'David') {
    return (
      <div className="fade-in">
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-6">
              This dashboard is only accessible to authorized users.
            </p>
            <button
              onClick={() => navigate('/inbox')}
              className="btn btn-primary"
            >
              Go to Inbox
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fade-in">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-in">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-800">
          <p>{error}</p>
          <button
            onClick={() => fetchData(true)}
            className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="fade-in">
        <div className="text-center py-8 text-gray-500">
          <p>No dashboard data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Business Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Overview of orders, revenue, and performance metrics
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn btn-secondary flex items-center"
        >
          <RefreshCw size={18} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
                <CardDescription>Total revenue over time.</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                {/* Date Picker */}
                <div className="mb-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={`w-[280px] justify-start text-left font-normal ${!date && "text-muted-foreground"}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {/* Bar Chart */}
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={monthlyRevenueData.length > 0 ? monthlyRevenueData : graphData}>
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip cursor={{ fill: 'transparent' }} formatter={(value: number) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>
                  {date 
                    ? `Orders for ${format(date, "PP")}`
                    : `You made ${metrics.customerOrders} customer orders this period.`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Recent Orders */}
                <div className="space-y-8">
                  {loadingOrders ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mr-2"></div>
                      <span className="text-gray-500 text-sm">Loading orders...</span>
                    </div>
                  ) : recentOrdersList.length > 0 ? (
                    recentOrdersList.map((order) => {
                      // Create initials from customer name
                      const initials = order.customerName
                        .split(' ')
                        .map(name => name[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || 'NA';
                      
                      return (
                        <div key={order.id} className="flex items-center">
                          <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                            {initials}
                          </div>
                          <div className="ml-4 space-y-1">
                            <p className="text-sm font-medium leading-none">{order.customerName}</p>
                            <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
                            <p className="text-xs text-gray-500">Created by: {order.createdBy}</p>
                          </div>
                          <div className="ml-auto font-medium">+${order.amount.toLocaleString()}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">
                        {date ? `No orders found for ${format(date, "PP")}` : "No recent orders found"}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* New Card: Invoices Missing 50% Deposit */}
          <Card className="col-span-4 mt-4">
            <CardHeader>
              <CardTitle>Invoices Missing 50% Deposit</CardTitle>
              <CardDescription>
                Orders that don't meet the required 50% deposit policy
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingInvoices ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mr-2"></div>
                  <span className="text-gray-500 text-sm">Loading invoices...</span>
                </div>
              ) : underDepositInvoices.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice #
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Deposit
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          % Paid
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {underDepositInvoices.map((invoice) => {
                        // Calculate deposit percentage
                        const depositPercentage = invoice.total_amount > 0 
                          ? (invoice.deposit_amount / invoice.total_amount) * 100 
                          : 0;
                        
                        // Format date
                        const formattedDate = new Date(invoice.invoice_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });
                        
                        return (
                          <tr key={invoice.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {invoice.po_number || '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {invoice.customer_name}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {formattedDate}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                              ${invoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                              ${invoice.deposit_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  depositPercentage >= 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {depositPercentage.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/invoice-generator/${invoice.id}`)}
                              >
                                View Invoice
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No under-deposit invoices</h3>
                  <p className="mt-1 text-sm text-gray-500">All current invoices have at least 50% deposit.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="metrics" className="space-y-4">
          {/* Key Metrics Cards (Existing) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Orders */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                    <dd className="text-lg font-semibold text-gray-900">{metrics.totalOrders}</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {metrics.priceRequests} Price Requests • {metrics.customerOrders} Customer Orders
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      ${metrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                From {metrics.customerOrders} customer orders
              </div>
            </div>

            {/* Average Order Value */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Avg Order Value</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      ${metrics.averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Based on customer orders
              </div>
            </div>

            {/* Active Customers */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                    <Users className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Customers</dt>
                    <dd className="text-lg font-semibold text-gray-900">{metrics.totalCustomers}</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Unique customer count
              </div>
            </div>
          </div>

          {/* Staff Performance & Order Status Overview (Existing) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Staff Performance */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <BarChart3 className="w-5 h-5 text-gray-400 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Staff Performance</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {Object.entries(metrics.staffMetrics).map(([staffName, staffData]) => (
                    <div key={staffName} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{staffName}</h4>
                        <span className="text-sm font-medium text-blue-600">
                          {staffData.totalOrders} orders
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Revenue</div>
                          <div className="font-medium text-gray-900">
                            ${staffData.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Customers</div>
                          <div className="font-medium text-gray-900">{staffData.customers}</div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <div className="text-gray-500">Price Requests</div>
                          <div className="font-medium text-blue-600">{staffData.priceRequests}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Customer Orders</div>
                          <div className="font-medium text-green-600">{staffData.customerOrders}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Status Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <CalendarIcon className="w-5 h-5 text-gray-400 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Order Status Overview</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {Object.entries(metrics.statusBreakdown).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          status === 'Completed' ? 'bg-green-500' :
                          status === 'Sent' ? 'bg-blue-500' :
                          status === 'Reply Received' ? 'bg-yellow-500' :
                          status === 'In Progress' ? 'bg-orange-500' :
                          'bg-gray-500'
                        }`}></div>
                        <span className="font-medium text-gray-900">{status}</span>
                      </div>
                      <span className="text-lg font-semibold text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Status Overview (Existing) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Payment Status Overview</h3>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(metrics.paymentStatusBreakdown).map(([status, data]) => (
                  <div key={status} className="text-center p-4 border border-gray-200 rounded-lg">
                    <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 ${
                      status === 'Paid' ? 'bg-green-100' :
                      status === 'Partially Paid' ? 'bg-yellow-100' :
                      'bg-red-100'
                    }`}>
                      <DollarSign className={`w-6 h-6 ${
                        status === 'Paid' ? 'text-green-600' :
                        status === 'Partially Paid' ? 'text-yellow-600' :
                        'text-red-600'
                      }`} />
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{status}</h4>
                    <p className="text-lg font-semibold text-gray-900">{data.count} orders</p>
                    <p className="text-sm text-gray-500">
                      ${data.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity Summary (Existing) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Summary Insights</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Most Active Staff</h4>
                  {(() => {
                    const topStaff = Object.entries(metrics.staffMetrics)
                      .sort(([,a], [,b]) => b.totalOrders - a.totalOrders)[0];
                    return topStaff ? (
                      <div>
                        <p className="text-blue-700 font-semibold">{topStaff[0]}</p>
                        <p className="text-blue-600">{topStaff[1].totalOrders} orders</p>
                      </div>
                    ) : <p className="text-blue-600">No data available</p>;
                  })()}
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">Top Revenue Generator</h4>
                  {(() => {
                    const topRevenue = Object.entries(metrics.staffMetrics)
                      .sort(([,a], [,b]) => b.totalRevenue - a.totalRevenue)[0];
                    return topRevenue ? (
                      <div>
                        <p className="text-green-700 font-semibold">{topRevenue[0]}</p>
                        <p className="text-green-600">${topRevenue[1].totalRevenue.toLocaleString()}</p>
                      </div>
                    ) : <p className="text-green-600">No data available</p>;
                  })()}
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-800 mb-2">Outstanding Payments</h4>
                  <div>
                    <p className="text-orange-700 font-semibold">
                      {(metrics.paymentStatusBreakdown['Unpaid']?.count || 0) +
                       (metrics.paymentStatusBreakdown['Partially Paid']?.count || 0)} orders
                    </p>
                    <p className="text-orange-600">
                      ${((metrics.paymentStatusBreakdown['Unpaid']?.totalAmount || 0) +
                         (metrics.paymentStatusBreakdown['Partially Paid']?.totalAmount || 0))
                         .toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Dashboard;