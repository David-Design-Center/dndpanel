import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import CollapsibleSection from '../components/common/CollapsibleSection';
import BrandDropdown from '../components/common/BrandDropdown';
import { ItemDropdown } from '../components/common/ItemDropdown';
import InvoicePrintView, { 
  Invoice, 
  InvoiceLineItem, 
  calculateRowTotal,
  calculatePaymentMethodTotals,
  formatCurrency 
} from '../components/InvoicePrintView';
import {
  fetchInvoiceByOrderId,
  saveInvoiceToSupabase,
  saveCustomerOrderToSupabase
} from '../services/backendApi';
import { getNextPoNumber } from '../services/poNumberService';
import { useItems } from '../hooks/useItems';
import { SupabaseInvoice, SupabaseInvoiceLineItem } from '../types';
import { BrandProvider } from '../contexts/BrandContext';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface InvoiceGeneratorProps {
  orderId?: string;
  onClose?: () => void;
  isModal?: boolean;
}

function InvoiceGenerator({ orderId: propOrderId, onClose, isModal = false }: InvoiceGeneratorProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId: paramOrderId } = useParams<{ orderId: string }>();
  const invoiceDocumentRef = useRef<HTMLDivElement>(null);
  useItems(); // Initialize items loading
  
  // Use orderId from props if provided (modal mode), otherwise from params (route mode)
  const orderId = propOrderId || paramOrderId;
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalInvoiceId, setOriginalInvoiceId] = useState<string | null>(null);
  
  // Preview toggle state
  const [showInternalView, setShowInternalView] = useState(false);
  
  // State for loading customer order data
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [orderLoadError, setOrderLoadError] = useState<string | null>(null);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);

  // Tax calculation mode state
  const [isManualTax, setIsManualTax] = useState(false);
  const [manualTaxType, setManualTaxType] = useState<'percentage' | 'amount'>('percentage');
  const [manualTaxPercentage, setManualTaxPercentage] = useState(8.875);
  
  // Discount visibility state
  const [showDiscount, setShowDiscount] = useState(false);
  
  // Tax visibility state
  const [showTax, setShowTax] = useState(true); // Default to true since tax is typically needed

  // Auto-generate PO number on mount for new invoices
  useEffect(() => {
    const generatePoNumber = async () => {
      if (!isEditMode && !orderId) {
        try {
          console.log('Generating new PO number...'); // Debug log
          const nextPoNumber = await getNextPoNumber();
          console.log('Generated PO number:', nextPoNumber); // Debug log
          setInvoice(prev => ({
            ...prev,
            poNumber: nextPoNumber
          }));
        } catch (error) {
          console.error('Error generating PO number:', error);
        }
      }
    };
    
    generatePoNumber();
  }, [isEditMode, orderId]);

  // State for invoice data
  const [invoice, setInvoice] = useState<Invoice>({
    poNumber: '',
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    tel1: '',
    tel2: '',
    email: '',
    lineItems: [
      {
        id: crypto.randomUUID(),
        item: '1',
        description: '',
        brand: '',
        quantity: 1,
        price: 0
      }
    ],
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    balance: 0,
    payments: [] 
  });

  // Handle edit mode from location state
  useEffect(() => {
    if (location.state?.editInvoice) {
      const editInvoice = location.state.editInvoice;
      setIsEditMode(true);
      setOriginalInvoiceId(editInvoice.invoiceId);
      
      // Load the existing invoice data
      const loadExistingInvoice = async () => {
        try {
          setIsLoadingOrder(true);
          
          const { data: invoiceData, error } = await supabase
            .from('invoices')
            .select(`
              *,
              invoice_line_items (*)
            `)
            .eq('id', editInvoice.invoiceId)
            .single();
            
          if (error) throw error;
          
          // Pre-fill form with existing data
          setInvoice({
            poNumber: invoiceData.po_number || '',
            date: invoiceData.invoice_date || new Date().toISOString().split('T')[0],
            customerName: invoiceData.customer_name || '',
            address: invoiceData.customer_address || '',
            city: invoiceData.customer_city || '',
            state: invoiceData.customer_state || '',
            zip: invoiceData.customer_zip || '',
            tel1: invoiceData.customer_tel1 || '',
            tel2: invoiceData.customer_tel2 || '',
            email: invoiceData.customer_email || '',
            lineItems: (invoiceData.invoice_line_items || []).map((item: any, index: number) => ({
              id: item.id || crypto.randomUUID(),
              item: (index + 1).toString(),
              description: item.description || '',
              brand: item.brand || '',
              quantity: Number(item.quantity) || 1,
              price: Number(item.unit_price) || 0
            })),
            subtotal: Number(invoiceData.subtotal) || 0,
            discount: Number(invoiceData.discount_amount) || 0,
            tax: Number(invoiceData.tax_amount) || 0,
            total: Number(invoiceData.total_amount) || 0,
            balance: Number(invoiceData.balance_due) || 0,
            payments: invoiceData.payments_history || []
          });
          
          // Check if tax was manually set by comparing with auto-calculated tax
          const discountedSubtotal = (Number(invoiceData.subtotal) || 0) - (Number(invoiceData.discount_amount) || 0);
          const autoCalculatedTax = discountedSubtotal * 0.08875;
          const actualTax = Number(invoiceData.tax_amount) || 0;
          
          // If tax differs significantly from auto-calculated (more than 1 cent), it's manual
          const isManualTaxDetected = Math.abs(actualTax - autoCalculatedTax) > 0.01;
          setIsManualTax(isManualTaxDetected);
          
          // Show discount checkbox if there's a discount amount
          const hasDiscount = (Number(invoiceData.discount_amount) || 0) > 0;
          setShowDiscount(hasDiscount);
          
          // Show tax checkbox if there's a tax amount
          const hasTax = (Number(invoiceData.tax_amount) || 0) > 0;
          setShowTax(hasTax);
          
          // If manual, try to detect if it's a percentage or fixed amount
          if (isManualTaxDetected && discountedSubtotal > 0) {
            const impliedPercentage = (actualTax / discountedSubtotal) * 100;
            // If the implied percentage is a reasonable tax rate (0-20%) and results in the exact tax amount
            if (impliedPercentage >= 0 && impliedPercentage <= 20) {
              const calculatedTaxFromPercentage = discountedSubtotal * (impliedPercentage / 100);
              if (Math.abs(calculatedTaxFromPercentage - actualTax) < 0.01) {
                setManualTaxType('percentage');
                setManualTaxPercentage(Number(impliedPercentage.toFixed(3)));
              } else {
                setManualTaxType('amount');
              }
            } else {
              setManualTaxType('amount');
            }
          }
        } catch (error) {
          console.error('Error loading invoice for editing:', error);
          setOrderLoadError('Failed to load invoice for editing');
        } finally {
          setIsLoadingOrder(false);
        }
      };
      
      loadExistingInvoice();
    }
  }, [location.state]);
  
  // Load customer order data if orderId is provided
  useEffect(() => {
    const loadCustomerOrder = async () => {
      if (!orderId) return;
      
      try {
        setIsLoadingOrder(true);
        setOrderLoadError(null);
        
        console.log('Loading data for order ID:', orderId);
        
        // First, check if an invoice already exists for this order
        const existingInvoice = await fetchInvoiceByOrderId(orderId);
        
        if (existingInvoice) {
          console.log('Found existing invoice for order:', existingInvoice);
          
          // Convert the Supabase invoice format to our component's format
          const { invoice: supabaseInvoice, lineItems } = existingInvoice;
          
          setInvoice({
            poNumber: supabaseInvoice.po_number || '',
            date: supabaseInvoice.invoice_date || new Date().toISOString().split('T')[0],
            customerName: supabaseInvoice.customer_name || '',
            address: supabaseInvoice.customer_address || '',
            city: supabaseInvoice.customer_city || '',
            state: supabaseInvoice.customer_state || '',
            zip: supabaseInvoice.customer_zip || '',
            tel1: supabaseInvoice.customer_tel1 || '',
            tel2: supabaseInvoice.customer_tel2 || '',
            email: supabaseInvoice.customer_email || '',
            lineItems: lineItems.map((item, index) => ({
              id: item.id || crypto.randomUUID(),
              item: (index + 1).toString(),
              description: item.description || '',
              brand: item.brand || '',
              quantity: Number(item.quantity) || 1,
              price: Number(item.unit_price) || 0
            })),
            subtotal: Number(supabaseInvoice.subtotal) || 0,
            discount: Number(supabaseInvoice.discount_amount) || 0,
            tax: Number(supabaseInvoice.tax_amount) || 0,
            total: Number(supabaseInvoice.total_amount) || 0,
            balance: Number(supabaseInvoice.balance_due) || 0,
            payments: supabaseInvoice.payments_history || []
          });
          
          // Check if tax was manually set by comparing with auto-calculated tax
          const discountedSubtotal = (Number(supabaseInvoice.subtotal) || 0) - (Number(supabaseInvoice.discount_amount) || 0);
          const autoCalculatedTax = discountedSubtotal * 0.08875;
          const actualTax = Number(supabaseInvoice.tax_amount) || 0;
          
          // If tax differs significantly from auto-calculated (more than 1 cent), it's manual
          const isManualTaxDetected = Math.abs(actualTax - autoCalculatedTax) > 0.01;
          setIsManualTax(isManualTaxDetected);
          
          // Show discount checkbox if there's a discount amount
          const hasDiscount = (Number(supabaseInvoice.discount_amount) || 0) > 0;
          setShowDiscount(hasDiscount);
          
          // Show tax checkbox if there's a tax amount
          const hasTax = (Number(supabaseInvoice.tax_amount) || 0) > 0;
          setShowTax(hasTax);
          
          // If manual, try to detect if it's a percentage or fixed amount
          if (isManualTaxDetected && discountedSubtotal > 0) {
            const impliedPercentage = (actualTax / discountedSubtotal) * 100;
            // If the implied percentage is a reasonable tax rate (0-20%) and results in the exact tax amount
            if (impliedPercentage >= 0 && impliedPercentage <= 20) {
              const calculatedTaxFromPercentage = discountedSubtotal * (impliedPercentage / 100);
              if (Math.abs(calculatedTaxFromPercentage - actualTax) < 0.01) {
                setManualTaxType('percentage');
                setManualTaxPercentage(Number(impliedPercentage.toFixed(3)));
              } else {
                setManualTaxType('amount');
              }
            } else {
              setManualTaxType('amount');
            }
          }
          
          setIsLoadingOrder(false);
          return;
        }
        
        // If no existing invoice, load from customer order data
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .eq('type', 'Customer Order')
          .single();
        
        if (error) {
          throw error;
        }
        
        if (!data) {
          throw new Error('Customer order not found');
        }
        
        console.log('Loaded customer order:', data);
        
        // Pre-fill the invoice with order data
        const orderLineItems = data.teams || [];
        
        setInvoice(prev => ({
          ...prev,
          poNumber: data.order_number || '',
          customerName: data.customer_name || '',
          email: data.user_email || '',
          lineItems: orderLineItems.length > 0 
            ? orderLineItems.map((item: any, index: number) => ({
                id: item.id || crypto.randomUUID(),
                item: (index + 1).toString(), // Auto-generate item numbers
                description: item.description || '',
                brand: '', // Brand starts empty for new orders
                quantity: item.quantity || 1,
                price: item.unitPrice || 0
              }))
            : [{
                id: crypto.randomUUID(),
                item: '1',
                description: '',
                brand: '',
                quantity: 1,
                price: 0
              }],
          payments: data.payments_history || []
        }));
        
      } catch (error) {
        console.error('Error loading customer order:', error);
        setOrderLoadError(error instanceof Error ? error.message : 'Failed to load customer order');
      } finally {
        setIsLoadingOrder(false);
      }
    };
    
    loadCustomerOrder();
  }, [orderId]);
  
  // Calculate subtotal, discount, tax, total, and balance when line items, discount, or payments change
  useEffect(() => {
    const subtotal = invoice.lineItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const discountedSubtotal = subtotal - invoice.discount;
    
    // Calculate tax based on mode and visibility
    let tax = 0;
    if (showTax) {
      if (!isManualTax) {
        // Auto mode: use default 8.875%
        tax = discountedSubtotal * 0.08875;
      } else if (manualTaxType === 'percentage') {
        // Manual percentage mode: use custom percentage
        tax = discountedSubtotal * (manualTaxPercentage / 100);
      } else {
        // Manual amount mode: keep the existing tax value
        tax = invoice.tax;
      }
    }
    
    const total = discountedSubtotal + tax;
    const totalPayments = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const balance = total - totalPayments;
    
    setInvoice(prev => ({
      ...prev,
      subtotal,
      tax,
      total,
      balance
    }));
  }, [invoice.lineItems, invoice.discount, invoice.payments, isManualTax, manualTaxType, manualTaxPercentage, invoice.tax, showTax]);
  
  // Add a new line item
  const handleAddLineItem = () => {
    setInvoice(prev => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          id: crypto.randomUUID(),
          item: (prev.lineItems.length + 1).toString(),
          description: '',
          brand: '',
          quantity: 1,
          price: 0
        }
      ]
    }));
  };
  
  // Remove a line item
  const handleRemoveLineItem = (idToRemove: string) => {
    setInvoice(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== idToRemove)
    }));
  };
  
  // Update a line item
  const handleLineItemChange = (id: string, field: keyof InvoiceLineItem, value: any) => {
    setInvoice(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };
  
  // Add a payment
  const handleAddPayment = () => {
    setInvoice(prev => ({
      ...prev,
      payments: [
        ...prev.payments,
        { 
          date: new Date().toISOString().split('T')[0], 
          amount: 0, 
          method: 'cash' 
        }
      ]
    }));
  };
  
  // Remove a payment
  const handleRemovePayment = (index: number) => {
    setInvoice(prev => ({
      ...prev,
      payments: prev.payments.filter((_, i) => i !== index)
    }));
  };
  
  // Update a payment
  const handlePaymentChange = (index: number, field: keyof typeof invoice.payments[0], value: any) => {
    setInvoice(prev => ({
      ...prev,
      payments: prev.payments.map((payment, i) => 
        i === index ? { ...payment, [field]: value } : payment
      )
    }));
  };
  
  // Handle invoice field changes
  const handleInvoiceChange = (field: keyof Invoice, value: any) => {
    setInvoice(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Save invoice to Supabase
  const saveInvoice = async (): Promise<SupabaseInvoice | null> => {
    try {
      setIsSavingInvoice(true);
      
      // Convert component invoice format to Supabase format
      const supabaseInvoice: SupabaseInvoice = {
        // Explicitly don't include id to force creation of new record (especially for edits)
        po_number: invoice.poNumber, // Keep the same PO number for grouping
        invoice_date: invoice.date,
        customer_name: invoice.customerName,
        customer_address: invoice.address,
        customer_city: invoice.city,
        customer_state: invoice.state,
        customer_zip: invoice.zip,
        customer_tel1: invoice.tel1,
        customer_tel2: invoice.tel2,
        customer_email: invoice.email,
        subtotal: invoice.subtotal,
        discount_amount: invoice.discount,
        tax_amount: invoice.tax,
        total_amount: invoice.total,
        balance_due: invoice.balance,
        payments_history: invoice.payments,
        is_edited: isEditMode, // Mark as edited when in edit mode
        original_invoice_id: isEditMode ? (originalInvoiceId || undefined) : undefined
      };
      
      // Convert line items to Supabase format
      const supabaseLineItems: Omit<SupabaseInvoiceLineItem, 'invoice_id'>[] = 
        invoice.lineItems.map(item => ({
          item_code: item.item,
          description: item.description,
          brand: item.brand,
          quantity: item.quantity,
          unit_price: item.price,
          line_total: item.quantity * item.price
        }));
      
      // Save to Supabase - this will create a new record when in edit mode
      const savedInvoice = await saveInvoiceToSupabase(supabaseInvoice, supabaseLineItems);
      
      if (!savedInvoice) {
        throw new Error('Failed to save invoice to database');
      }

      // If this is a new invoice (not an edit), also create a customer order
      if (!isEditMode && !orderId) {
        console.log('Creating customer order for new invoice');
        try {
          const customerOrderData = {
            order_number: invoice.poNumber,
            customer_name: invoice.customerName,
            customer_email: invoice.email,
            order_date: invoice.date,
            order_amount: invoice.total,
            payment_status: invoice.balance > 0 ? 'Order in Progress' : 'Paid',
            product_details: invoice.lineItems.map(item => 
              `${item.description} (${item.brand}) - Qty: ${item.quantity} - $${item.price}`
            ).join(', '),
            deposit_amount: invoice.total - invoice.balance,
            teams: invoice.lineItems.map(item => ({
              description: item.description,
              brand: item.brand,
              quantity: item.quantity,
              unitPrice: item.price
            }))
          };
          
          await saveCustomerOrderToSupabase(customerOrderData);
          console.log('Customer order created successfully');
        } catch (orderError) {
          console.error('Error creating customer order:', orderError);
          // Don't fail the entire save if order creation fails
          // The invoice was saved successfully
        }
      }
      
      return savedInvoice;
    } catch (error) {
      console.error('Error saving invoice:', error);
      throw error;
    } finally {
      setIsSavingInvoice(false);
    }
  };

  // Handle save invoice button click
  const handleSaveInvoice = async () => {
    try {
      const savedInvoice = await saveInvoice();
      if (savedInvoice) {
        if (isEditMode) {
          alert(`Invoice edit created successfully! A new version has been saved with the same PO number.`);
        } else {
          alert('Invoice saved successfully');
        }
        // Navigate to invoices list
        navigate('/invoices');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Failed to save invoice. Please try again.');
    }
  };

  // Handle close/back navigation
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/orders');
    }
  };

  // Handle send to customer with email composition
  
  return (
    <BrandProvider>
      <div className={isModal ? 'p-6' : 'fade-in pb-6'}>
        {!isModal && (
          <div className="flex items-center mb-4">
            <button 
              onClick={handleClose}
              className="mr-4 p-2 rounded-full hover:bg-gray-200 no-print"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-semibold text-gray-800 no-print">
              {isEditMode ? 'Edit Invoice' : 'Create Order & Invoice'}
            </h1>
            {orderId && (
              <span className="ml-4 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full no-print">
                Pre-filled from Order
              </span>
            )}
            {isEditMode && (
              <span className="ml-4 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full no-print">
                Edit Mode - PO#{invoice.poNumber}
              </span>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoadingOrder && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Loading order data...</span>
          </div>
        )}

        {/* Error State */}
        {orderLoadError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex">
              <div className="text-red-400">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading order</h3>
                <p className="text-sm text-red-700 mt-1">{orderLoadError}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Invoice Generator Form with Preview */}
        {!isLoadingOrder && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left side - Form controls */}
          <div className="space-y-4 hide-on-print">
          {/* Invoice Details */}
          <CollapsibleSection title="Invoice Details" defaultExpanded={false}>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">P.O. Number</label>
                <input
                  type="text"
                  className={`w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  value={invoice.poNumber}
                  onChange={(e) => handleInvoiceChange('poNumber', e.target.value)}
                  placeholder="Enter number only (e.g., 10710)"
                  disabled={isEditMode}
                  title={isEditMode ? "PO Number cannot be changed when editing to maintain order grouping" : ""}
                />
                {isEditMode && (
                  <p className="text-xs text-gray-500 mt-1">
                    PO Number is locked to maintain order grouping
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={invoice.date}
                  onChange={(e) => handleInvoiceChange('date', e.target.value)}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Customer Information */}
          <CollapsibleSection title="Customer Information" defaultExpanded={false}>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={invoice.customerName}
                  onChange={(e) => handleInvoiceChange('customerName', e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={invoice.address}
                  onChange={(e) => handleInvoiceChange('address', e.target.value)}
                  placeholder="Street address"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={invoice.city}
                    onChange={(e) => handleInvoiceChange('city', e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={invoice.state}
                    onChange={(e) => handleInvoiceChange('state', e.target.value)}
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
                  <input
                    type="text"
                    className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={invoice.zip}
                    onChange={(e) => handleInvoiceChange('zip', e.target.value)}
                    placeholder="Zip"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm">( </span>
                    <input
                      type="text"
                      className="w-10 px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      value={invoice.tel1}
                      onChange={(e) => handleInvoiceChange('tel1', e.target.value)}
                      placeholder="000"
                      maxLength={3}
                    />
                    <span className="text-sm"> ) </span>
                    <input
                      type="text"
                      className="flex-1 px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={invoice.tel2}
                      onChange={(e) => handleInvoiceChange('tel2', e.target.value)}
                      placeholder="000-0000"
                      maxLength={8}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={invoice.email}
                    onChange={(e) => handleInvoiceChange('email', e.target.value)}
                    placeholder="customer@example.com"
                  />
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Line Items */}
          <CollapsibleSection title="Line Items" defaultExpanded={false}>
            <div className="space-y-3">
              {invoice.lineItems.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-md p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-700">Item #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(item.id)}
                      className="text-red-500 hover:text-red-700"
                      disabled={invoice.lineItems.length === 1}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Item Code</label>
                        <input
                          type="text"
                          className="w-full px-1 py-1 border border-gray-300 rounded text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={index + 1}
                          readOnly
                          title="Auto-generated sequential number"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Brand</label>
                        <BrandDropdown
                          value={item.brand || ''}
                          onChange={(brand) => handleLineItemChange(item.id, 'brand', brand)}
                          placeholder="Select brand"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                        <input
                          type="number"
                          className="w-full px-1 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          min="1"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                      <ItemDropdown
                        value={item.description}
                        onChange={(description) => handleLineItemChange(item.id, 'description', description)}
                        placeholder="Select or enter item description"
                        className="text-sm"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm">$</span>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={item.price}
                            onChange={(e) => handleLineItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Total</label>
                        <div className="px-1 py-1 bg-gray-50 border border-gray-300 rounded text-sm font-semibold">
                          ${calculateRowTotal(item.quantity, item.price)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={handleAddLineItem}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-600 hover:text-gray-800 hover:border-gray-400 flex items-center justify-center"
              >
                <Plus size={16} className="mr-1" />
                Add Line Item
              </button>
            </div>
          </CollapsibleSection>

          {/* Payment Information */}
          <CollapsibleSection title="Payment Information" defaultExpanded={false}>
            <div className="space-y-3">

              {/* Payments */}
              {invoice.payments.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment History</label>
                  <div className="space-y-2">
                    {invoice.payments.map((payment, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 border border-gray-200 rounded">
                        <div className="w-1/4">
                          <input
                            type="date"
                            className="w-full px-1 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={payment.date}
                            onChange={(e) => handlePaymentChange(index, 'date', e.target.value)}
                          />
                        </div>
                        <div className="w-1/4 relative">
                          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm">$</span>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={payment.amount}
                            onChange={(e) => handlePaymentChange(index, 'amount', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                        <div className="w-1/3">
                          <select
                            value={payment.method || 'cash'}
                            onChange={(e) => handlePaymentChange(index, 'method', e.target.value)}
                            className="w-full px-1 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="cash">Cash</option>
                            <option value="check">Check</option>
                            <option value="card">Card</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePayment(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                type="button"
                onClick={handleAddPayment}
                className="w-full py-2 border border-blue-500 rounded-md text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 flex items-center justify-center"
              >
                <Plus size={16} className="mr-1" />
                Add Payment
              </button>

              {/* Discount Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="discount-checkbox"
                  checked={showDiscount}
                  onChange={(e) => {
                    setShowDiscount(e.target.checked);
                    if (!e.target.checked) {
                      // Reset discount to 0 when hiding
                      handleInvoiceChange('discount', 0);
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="discount-checkbox" className="text-sm font-medium text-gray-700">
                  Discount
                </label>
              </div>

              {/* Discount Amount - Conditionally Rendered */}
              {showDiscount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={invoice.discount}
                      onChange={(e) => handleInvoiceChange('discount', parseFloat(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                </div>
              )}

              {/* Tax Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="tax-checkbox"
                  checked={showTax}
                  onChange={(e) => {
                    setShowTax(e.target.checked);
                    if (!e.target.checked) {
                      // Reset tax to 0 when hiding
                      handleInvoiceChange('tax', 0);
                      setIsManualTax(false);
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="tax-checkbox" className="text-sm font-medium text-gray-700">
                  Tax
                </label>
              </div>

              {/* Tax - Conditionally Rendered */}
              {showTax && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Tax Amount</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsManualTax(!isManualTax);
                        if (!isManualTax) {
                          // When switching to manual, keep current calculated tax as starting point
                          const currentTax = invoice.tax;
                          handleInvoiceChange('tax', currentTax);
                          // Default to percentage mode when switching to manual
                          setManualTaxType('percentage');
                        }
                      }}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        isManualTax 
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      }`}
                    >
                      {isManualTax ? 'Manual' : 'Auto (8.875%)'}
                    </button>
                  </div>
                  
                  {/* Manual Tax Type Toggle */}
                  {isManualTax && (
                    <div className="flex bg-gray-100 rounded-md p-1 mb-2">
                      <button
                        type="button"
                        onClick={() => setManualTaxType('percentage')}
                        className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                          manualTaxType === 'percentage'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Percentage
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualTaxType('amount')}
                        className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                          manualTaxType === 'amount'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Fixed Amount
                      </button>
                    </div>
                  )}
                  
                  {/* Tax Input - Percentage Mode */}
                  {isManualTax && manualTaxType === 'percentage' && (
                    <div className="relative mb-2">
                      <input
                        type="number"
                        step="0.001"
                        className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={manualTaxPercentage.toFixed(3)}
                        onChange={(e) => setManualTaxPercentage(parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        placeholder="Enter tax percentage"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm">%</span>
                    </div>
                  )}
                  
                  {/* Tax Input - Amount Mode or Auto Mode */}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      className={`w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isManualTax && manualTaxType === 'amount' ? '' : 'bg-gray-50 cursor-not-allowed'
                      }`}
                      value={isManualTax && manualTaxType === 'amount' ? invoice.tax : invoice.tax.toFixed(2)}
                      onChange={(e) => {
                        if (isManualTax && manualTaxType === 'amount') {
                          handleInvoiceChange('tax', parseFloat(e.target.value) || 0);
                        }
                      }}
                      min="0"
                      disabled={!isManualTax || manualTaxType !== 'amount'}
                      placeholder={
                        !isManualTax 
                          ? "Auto-calculated" 
                          : manualTaxType === 'percentage' 
                            ? "Calculated from percentage"
                            : "Enter tax amount"
                      }
                    />
                  </div>
                  
                  {/* Helper Text */}
                  {!isManualTax && (
                    <p className="text-xs text-gray-500 mt-1">
                      Automatically calculated at 8.875% of discounted subtotal
                    </p>
                  )}
                  {isManualTax && manualTaxType === 'percentage' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Tax calculated at {manualTaxPercentage.toFixed(3)}% of discounted subtotal
                    </p>
                  )}
                  {isManualTax && manualTaxType === 'amount' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Fixed tax amount
                    </p>
                  )}
                </div>
              )}

              {/* Summary */}
              <div className="pt-3 border-t border-gray-200">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(invoice.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatCurrency(invoice.tax)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(invoice.total)}</span>
                  </div>
                  {invoice.payments.length > 0 && (
                    <>
                      <div className="pt-2">
                        <div className="flex justify-between text-xs font-medium text-gray-700 pt-1">
                          <span>Payments by method:</span>
                        </div>
                        {(() => {
                          const methodTotals = calculatePaymentMethodTotals(invoice.payments);
                          return (
                            <>
                              {methodTotals.cash > 0 && (
                                <div className="flex justify-between text-xs pl-4">
                                  <span>Cash:</span>
                                  <span>{formatCurrency(methodTotals.cash)}</span>
                                </div>
                              )}
                              {methodTotals.check > 0 && (
                                <div className="flex justify-between text-xs pl-4">
                                  <span>Check:</span>
                                  <span>{formatCurrency(methodTotals.check)}</span>
                                </div>
                              )}
                              {methodTotals.card > 0 && (
                                <div className="flex justify-between text-xs pl-4">
                                  <span>Card:</span>
                                  <span>{formatCurrency(methodTotals.card)}</span>
                                </div>
                              )}
                              {methodTotals.other > 0 && (
                                <div className="flex justify-between text-xs pl-4">
                                  <span>Other:</span>
                                  <span>{formatCurrency(methodTotals.other)}</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Balance:</span>
                    <span>{formatCurrency(invoice.balance)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleSaveInvoice}
              disabled={isSavingInvoice}
              className="flex-1 px-4 py-2 bg-gray-600 rounded-md text-white font-medium hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center"
            >
              {isSavingInvoice ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  {isEditMode ? 'Update Invoice' : 'Save Invoice'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right side - Invoice Preview */}
        <div className="lg:sticky lg:top-4 flex justify-center">
          <div className="bg-gray-50 rounded-lg p-4 w-full max-w-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-3 text-center">Invoice Preview</h3>
              
              {/* Toggle Buttons */}
              <div className="flex bg-gray-200 rounded-lg p-1 mb-4">
                <button
                  onClick={() => setShowInternalView(false)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    !showInternalView
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Customer Invoice
                </button>
                <button
                  onClick={() => setShowInternalView(true)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    showInternalView
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  D&D Invoice
                </button>
              </div>
            </div>
            
            <div className="invoice-preview-wrapper flex justify-center">
              <InvoicePrintView 
                invoice={invoice} 
                innerRef={invoiceDocumentRef} 
                showInternalView={showInternalView}
              />
            </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </BrandProvider>
  );
}

export default InvoiceGenerator;