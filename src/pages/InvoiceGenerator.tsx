import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Download, Send } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import html2canvas from 'html2canvas';
import CollapsibleSection from '../components/common/CollapsibleSection';
import InvoicePrintView, { 
  Invoice, 
  InvoiceLineItem, 
  calculateRowTotal,
  calculatePaymentMethodTotals,
  formatCurrency 
} from '../components/InvoicePrintView';

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
  const { orderId: paramOrderId } = useParams<{ orderId: string }>();
  const invoiceFormRef = useRef<HTMLDivElement>(null);
  const invoiceDocumentRef = useRef<HTMLDivElement>(null);
  
  // Use orderId from props if provided (modal mode), otherwise from params (route mode)
  const orderId = propOrderId || paramOrderId;
  
  // State for loading customer order data
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [orderLoadError, setOrderLoadError] = useState<string | null>(null);
  const [isSendingToCustomer, setIsSendingToCustomer] = useState(false);
  
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
        item: '',
        description: '',
        quantity: 1,
        price: 0
      }
    ],
    subtotal: 0,
    tax: 0,
    total: 0,
    deposit: 0,
    balance: 0,
    payments: [] 
  });
  
  // Load customer order data if orderId is provided
  useEffect(() => {
    const loadCustomerOrder = async () => {
      if (!orderId) return;
      
      try {
        setIsLoadingOrder(true);
        setOrderLoadError(null);
        
        console.log('Loading customer order:', orderId);
        
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
                quantity: item.quantity || 1,
                price: item.unitPrice || 0
              }))
            : [{
                id: crypto.randomUUID(),
                item: '1',
                description: '',
                quantity: 1,
                price: 0
              }],
          deposit: data.deposit_amount || 0,
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
  
  // Calculate subtotal, tax, total, and balance when line items, deposit, or payments change
  useEffect(() => {
    const subtotal = invoice.lineItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const tax = subtotal * 0.08875; // NYC sales tax rate (8.875%)
    const total = subtotal + tax;
    const totalPayments = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const balance = total - invoice.deposit - totalPayments;
    
    setInvoice(prev => ({
      ...prev,
      subtotal,
      tax,
      total,
      balance
    }));
  }, [invoice.lineItems, invoice.deposit, invoice.payments]);
  
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
  
  // Handle print/download
  const handlePrintInvoice = () => {
    window.print();
  };

  // Handle send to customer with email composition
  const handleSendToCustomer = async () => {
    if (!invoice.email) {
      alert('Please enter a customer email address before sending.');
      return;
    }

    if (!invoiceDocumentRef.current) {
      alert('Invoice content not found. Please try again.');
      return;
    }

    try {
      setIsSendingToCustomer(true);

      // Capture the InvoicePrintView component directly
      const canvas = await html2canvas(invoiceDocumentRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: 794, // Ensure it captures at the correct dimensions
        height: 1123 // Ensure it captures at the correct dimensions
      });

      // Convert canvas to high-quality data URL
      const imageDataUrl = canvas.toDataURL('image/png', 1.0);
      
      // Extract base64 data (remove data:image/png;base64, prefix)
      const base64Data = imageDataUrl.split(',')[1];
      
      // Generate filename
      const filename = `Invoice_${invoice.poNumber || 'Draft'}_${invoice.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      
      // Create attachment object
      const attachment = {
        name: filename,
        mimeType: 'image/png',
        data: base64Data,
        dataUrl: imageDataUrl // Include data URL for thumbnail preview
      };

      // Prepare email content - plain text version for user editing
      const plainTextBody = `Dear ${invoice.customerName},

Please find attached your invoice ${invoice.poNumber ? `#${invoice.poNumber}` : ''} from D&D Design Center.

Invoice Summary:
Total Amount: $${invoice.total.toFixed(2)}${invoice.deposit > 0 ? `
Deposit: $${invoice.deposit.toFixed(2)}` : ''}${invoice.balance > 0 ? `
Balance Due: $${invoice.balance.toFixed(2)}` : ''}

If you have any questions about this invoice, please don't hesitate to contact us.

Best regards,
D&D Design Center
2615 East 17th Street
Brooklyn, NY 11235
Tel: (718) 934-7100
www.dnddesigncenter.com`;

      // Prepare full HTML version for final sending
      const fullHtmlBody = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Dear ${invoice.customerName},</p>
  
  <p>Please find attached your invoice ${invoice.poNumber ? `#${invoice.poNumber}` : ''} from D&D Design Center.</p>
  
  <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
    <h3 style="margin: 0 0 10px 0; color: #212529;">Invoice Summary</h3>
    <p style="margin: 5px 0;"><strong>Total Amount:</strong> $${invoice.total.toFixed(2)}</p>
    ${invoice.deposit > 0 ? `<p style="margin: 5px 0;"><strong>Deposit:</strong> $${invoice.deposit.toFixed(2)}</p>` : ''}
    ${invoice.balance > 0 ? `<p style="margin: 5px 0;"><strong>Balance Due:</strong> $${invoice.balance.toFixed(2)}</p>` : ''}
  </div>
  
  <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
    <p style="margin: 0;"><strong>D&D Design Center</strong></p>
    <p style="margin: 2px 0;">2615 East 17th Street</p>
    <p style="margin: 2px 0;">Brooklyn, NY 11235</p>
    <p style="margin: 2px 0;">Tel: (718) 934-7100</p>
    <p style="margin: 2px 0;"><a href="http://www.dnddesigncenter.com" style="color: #007bff;">www.dnddesigncenter.com</a></p>
  </div>
</div>`;

      const emailSubject = `Invoice ${invoice.poNumber ? `#${invoice.poNumber}` : ''} from D&D Design Center`;

      // Navigate to compose with pre-filled data and attachment
      navigate('/compose', {
        state: {
          to: invoice.email,
          subject: emailSubject,
          body: plainTextBody, // Plain text for user editing
          originalBody: fullHtmlBody, // HTML for final sending
          attachments: [attachment]
        }
      });

    } catch (error) {
      console.error('Error generating invoice image:', error);
      alert('Failed to generate invoice image. Please try again.');
    } finally {
      setIsSendingToCustomer(false);
    }
  };

  // Handle close/back navigation
  const handleClose = () => {
    if (isModal && onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };
  
  // Show loading state while loading order
  if (isLoadingOrder) {
    return (
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
            <h1 className="text-xl font-semibold text-gray-800 no-print">Invoice Generator</h1>
          </div>
        )}
        
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-gray-600">Loading customer order...</span>
        </div>
      </div>
    );
  }
  
  // Show error state if order loading failed
  if (orderLoadError) {
    return (
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
            <h1 className="text-xl font-semibold text-gray-800 no-print">Invoice Generator</h1>
          </div>
        )}
        
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-800">
          <p>{orderLoadError}</p>
          <button 
            onClick={handleClose}
            className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
          >
            {isModal ? 'Close' : 'Back to Orders'}
          </button>
        </div>
      </div>
    );
  }
  
  return (
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
          <h1 className="text-xl font-semibold text-gray-800 no-print">Invoice Generator</h1>
          {orderId && (
            <span className="ml-4 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full no-print">
              Pre-filled from Order
            </span>
          )}
        </div>
      )}
      
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
                  className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={invoice.poNumber}
                  onChange={(e) => handleInvoiceChange('poNumber', e.target.value)}
                  placeholder="Enter P.O. number"
                />
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
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Item Code</label>
                        <input
                          type="text"
                          className="w-full px-1 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={item.item}
                          onChange={(e) => handleLineItemChange(item.id, 'item', e.target.value)}
                          placeholder={`${index + 1}`}
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
                      <input
                        type="text"
                        className="w-full px-1 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                        placeholder="Item description"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={invoice.deposit}
                    onChange={(e) => handleInvoiceChange('deposit', parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              </div>

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
                            <option value="cheque">Cheque</option>
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
                className="w-full py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 flex items-center justify-center"
              >
                <Plus size={16} className="mr-1" />
                Add Payment
              </button>

              {/* Summary */}
              <div className="pt-3 border-t border-gray-200">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatCurrency(invoice.tax)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(invoice.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deposit:</span>
                    <span>{formatCurrency(invoice.deposit)}</span>
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
                              {methodTotals.cheque > 0 && (
                                <div className="flex justify-between text-xs pl-4">
                                  <span>Cheque:</span>
                                  <span>{formatCurrency(methodTotals.cheque)}</span>
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
              onClick={handlePrintInvoice}
              className="flex-1 px-4 py-2 bg-blue-50 border border-blue-300 rounded-md text-blue-700 font-medium hover:bg-blue-100 flex items-center justify-center"
            >
              <Download size={18} className="mr-2" />
              Print / Download
            </button>
            <button
              type="button"
              onClick={handleSendToCustomer}
              disabled={isSendingToCustomer || !invoice.email}
              className="flex-1 px-4 py-2 bg-green-600 rounded-md text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSendingToCustomer ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Send size={18} className="mr-2" />
                  Send to Customer
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right side - Invoice Preview */}
        <div className="lg:sticky lg:top-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4 text-center">Invoice Preview</h3>
            <div className="invoice-preview-wrapper">
              <InvoicePrintView invoice={invoice} innerRef={invoiceDocumentRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoiceGenerator;