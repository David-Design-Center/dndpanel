import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Plus, Info, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';
import { generateNextOrderNumber } from '../services/backendApi';
import CollapsibleSection from '../components/common/CollapsibleSection';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Define interface for line items specific to customer orders
interface CustomerOrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Define interface for payment history
interface PaymentEntry {
  date: string;
  amount: number;
}

function CreateCustomerOrder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Form state
  const [projectName, setProjectName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDueDate, setExpectedDueDate] = useState('');
  const [paymentOption, setPaymentOption] = useState<'Installments' | 'Full payment'>('Full payment');
  const [paymentStatus, setPaymentStatus] = useState<'Unpaid' | 'Paid' | 'Partially Paid'>('Unpaid');
  const [notes, setNotes] = useState('');
  
  // Installment fields
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [paymentsHistory, setPaymentsHistory] = useState<PaymentEntry[]>([]);
  
  // Line items
  const [lineItems, setLineItems] = useState<CustomerOrderItem[]>([
    {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    }
  ]);
  
  // Form validation and submission
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxRate = 0.08875; // NYC sales tax rate
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;
  const totalPayments = paymentsHistory.reduce((sum, payment) => sum + payment.amount, 0);
  const finalBalance = totalAmount - depositAmount - totalPayments;
  
  // Update line item totals when quantity or unit price changes
  useEffect(() => {
    setLineItems(prevItems => 
      prevItems.map(item => ({
        ...item,
        total: item.quantity * item.unitPrice
      }))
    );
  }, []);
  
  // Add new line item
  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0
      }
    ]);
  };
  
  // Remove line item
  const handleRemoveLineItem = (idToRemove: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== idToRemove));
    }
  };
  
  // Update line item
  const handleLineItemChange = (id: string, field: keyof CustomerOrderItem, value: any) => {
    setLineItems(prevItems => 
      prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          // Recalculate total if quantity or unitPrice changed
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  // Add new payment entry
  const handleAddPayment = () => {
    setPaymentsHistory([
      ...paymentsHistory,
      { date: new Date().toISOString().split('T')[0], amount: 0 }
    ]);
  };

  // Remove payment entry
  const handleRemovePayment = (index: number) => {
    setPaymentsHistory(paymentsHistory.filter((_, i) => i !== index));
  };

  // Update payment entry
  const handlePaymentChange = (index: number, field: keyof PaymentEntry, value: any) => {
    setPaymentsHistory(prevPayments =>
      prevPayments.map((payment, i) =>
        i === index ? { ...payment, [field]: value } : payment
      )
    );
  };
  
  // Generate order number automatically
  useEffect(() => {
    const generateOrderNumber = async () => {
      if (!orderNumber) {
        try {
          const nextOrderNumber = await generateNextOrderNumber();
          setOrderNumber(nextOrderNumber);
          console.log('Generated order number:', nextOrderNumber);
        } catch (error) {
          console.error('Error generating order number:', error);
          // Fallback to timestamp-based number
          const timestamp = Date.now().toString().slice(-6);
          setOrderNumber(`ORD-${timestamp}`);
        }
      }
    };

    generateOrderNumber();
  }, [orderNumber]);
  
  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!projectName.trim()) {
      newErrors.projectName = 'Project name is required';
    }
    
    if (!customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }
    
    if (!customerEmail.trim()) {
      newErrors.customerEmail = 'Customer email is required';
    }
    
    if (!orderDate) {
      newErrors.orderDate = 'Order date is required';
    }
    
    // Validate line items
    const invalidItems = lineItems.filter(item => 
      !item.description.trim() || item.quantity < 1 || item.unitPrice < 0
    );
    
    if (invalidItems.length > 0) {
      newErrors.lineItems = 'All line items must have a description, quantity ≥ 1, and unit price ≥ 0';
    }

    // Validate installment amounts if using installments
    if (paymentOption === 'Installments') {
      if (depositAmount < 0) {
        newErrors.depositAmount = 'Deposit amount cannot be negative';
      }
      
      const invalidPayments = paymentsHistory.filter(payment => 
        !payment.date || payment.amount < 0
      );
      
      if (invalidPayments.length > 0) {
        newErrors.paymentsHistory = 'All payment entries must have a valid date and non-negative amount';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      const firstError = document.querySelector('.error-message');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare data for insertion into orders table
      const orderData = {
        project_name: projectName,
        type: 'Customer Order',
        status: 'In Progress',
        created_by: user?.email || 'anonymous',
        order_number: orderNumber,
        customer_name: customerName,
        order_date: orderDate,
        expected_due_date: expectedDueDate || null,
        order_amount: totalAmount,
        payment_option: paymentOption,
        payment_status: paymentStatus,
        product_details: lineItems.map(item => 
          `${item.description} (Qty: ${item.quantity} @ $${item.unitPrice.toFixed(2)})`
        ).join(', '),
        user_email: customerEmail,
        description: notes || null,
        due_date: expectedDueDate ? new Date(expectedDueDate).toISOString() : null,
        // Store line items as JSON for later retrieval
        teams: lineItems.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        })),
        // Installment fields
        deposit_amount: paymentOption === 'Installments' ? depositAmount : null,
        payments_history: paymentOption === 'Installments' && paymentsHistory.length > 0 ? paymentsHistory : null
      };
      
      console.log('Creating customer order:', orderData);
      
      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating customer order:', error);
        throw new Error('Failed to create customer order');
      }
      
      console.log('Customer order created successfully:', data);
      
      // Navigate to orders page on success
      navigate('/orders');
      
    } catch (error) {
      console.error('Error submitting customer order:', error);
      alert('Failed to create customer order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fade-in pb-10">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate('/orders')}
          className="mr-4 p-2 rounded-full hover:bg-gray-200"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-semibold text-gray-800">Create Customer Order</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Information */}
        <CollapsibleSection title="Project Information" defaultExpanded={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="project-name"
                className={`w-full px-3 py-2 border ${errors.projectName ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Johnson Residence - Living Room"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
              {errors.projectName && (
                <p className="mt-1 text-sm text-red-600 error-message">{errors.projectName}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="order-number" className="block text-sm font-medium text-gray-700 mb-1">
                Order Number
              </label>
              <input
                type="text"
                id="order-number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                <Info size={12} className="inline mr-1" />
                Auto-generated if left empty
              </p>
            </div>
          </div>
          
          <div className="mt-4">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Project Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional project details or special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
          </div>
        </CollapsibleSection>
        
        {/* Customer Information */}
        <CollapsibleSection title="Customer Information" defaultExpanded={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="customer-name" className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="customer-name"
                className={`w-full px-3 py-2 border ${errors.customerName ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="John Johnson"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              {errors.customerName && (
                <p className="mt-1 text-sm text-red-600 error-message">{errors.customerName}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="customer-email" className="block text-sm font-medium text-gray-700 mb-1">
                Customer Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="customer-email"
                className={`w-full px-3 py-2 border ${errors.customerEmail ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="john@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
              {errors.customerEmail && (
                <p className="mt-1 text-sm text-red-600 error-message">{errors.customerEmail}</p>
              )}
            </div>
          </div>
          
          <div className="mt-4">
            <label htmlFor="customer-address" className="block text-sm font-medium text-gray-700 mb-1">
              Customer Address
            </label>
            <textarea
              id="customer-address"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123 Main Street, City, State 12345"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
            ></textarea>
          </div>
        </CollapsibleSection>
        
        {/* Order Details */}
        <CollapsibleSection title="Order Details" defaultExpanded={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="order-date" className="block text-sm font-medium text-gray-700 mb-1">
                Order Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="order-date"
                className={`w-full px-3 py-2 border ${errors.orderDate ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
              {errors.orderDate && (
                <p className="mt-1 text-sm text-red-600 error-message">{errors.orderDate}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="expected-due-date" className="block text-sm font-medium text-gray-700 mb-1">
                Expected Due Date
              </label>
              <input
                type="date"
                id="expected-due-date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={expectedDueDate}
                onChange={(e) => setExpectedDueDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="payment-option" className="block text-sm font-medium text-gray-700 mb-1">
                Payment Option
              </label>
              <select
                id="payment-option"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={paymentOption}
                onChange={(e) => setPaymentOption(e.target.value as 'Installments' | 'Full payment')}
              >
                <option value="Full payment">Full Payment</option>
                <option value="Installments">Installments</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="payment-status" className="block text-sm font-medium text-gray-700 mb-1">
                Payment Status
              </label>
              <select
                id="payment-status"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as 'Unpaid' | 'Paid' | 'Partially Paid')}
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>

          {/* Installment Details */}
          {paymentOption === 'Installments' && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-md font-medium text-blue-800 mb-4">Installment Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="deposit-amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Deposit Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      id="deposit-amount"
                      className={`w-full pl-8 pr-3 py-2 border ${errors.depositAmount ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      min="0"
                      step="0.01"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  {errors.depositAmount && (
                    <p className="mt-1 text-sm text-red-600 error-message">{errors.depositAmount}</p>
                  )}
                </div>
              </div>

              {/* Payment History */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Payment History</label>
                  <button
                    type="button"
                    onClick={handleAddPayment}
                    className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                  >
                    <Plus size={14} className="mr-1" />
                    Add Payment
                  </button>
                </div>

                {paymentsHistory.length > 0 && (
                  <div className="space-y-2">
                    {paymentsHistory.map((payment, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-md">
                        <div className="flex-1">
                          <input
                            type="date"
                            value={payment.date}
                            onChange={(e) => handlePaymentChange(index, 'date', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={payment.amount}
                              onChange={(e) => handlePaymentChange(index, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePayment(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {errors.paymentsHistory && (
                  <p className="mt-1 text-sm text-red-600 error-message">{errors.paymentsHistory}</p>
                )}

                {paymentsHistory.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No payment history entries. Add payments to track installment progress.</p>
                )}
              </div>
            </div>
          )}
        </CollapsibleSection>
        
        {/* Line Items */}
        <CollapsibleSection title="Items" defaultExpanded={true}>
          {errors.lineItems && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle size={16} className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-600 error-message">{errors.lineItems}</p>
            </div>
          )}
          
          <div className="space-y-4">
            {lineItems.map((item, index) => (
              <div key={item.id} className="p-4 border border-gray-200 rounded-md relative">
                <div className="absolute top-2 right-2">
                  <button
                    type="button"
                    onClick={() => handleRemoveLineItem(item.id)}
                    className="text-gray-400 hover:text-red-500"
                    disabled={lineItems.length === 1}
                    aria-label="Remove item"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor={`description-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Item Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id={`description-${item.id}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Dining table, oak finish"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor={`quantity-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id={`quantity-${item.id}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor={`unit-price-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        id={`unit-price-${item.id}`}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleLineItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 text-right">
                  <span className="text-sm font-medium text-gray-700">
                    Total: ${item.total.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={handleAddLineItem}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-600 hover:text-gray-800 hover:border-gray-400 flex items-center justify-center"
            >
              <Plus size={18} className="mr-1" />
              Add Item
            </button>
          </div>
        </CollapsibleSection>

        {/* Order Summary */}
        <CollapsibleSection title="Order Summary" defaultExpanded={true}>
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Subtotal:</span>
                  <span className="text-sm font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Tax (8.875%):</span>
                  <span className="text-sm font-medium">${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mb-2">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-lg font-semibold">${totalAmount.toFixed(2)}</span>
                </div>
                
                {/* Show installment breakdown if using installments */}
                {paymentOption === 'Installments' && (
                  <>
                    <div className="flex justify-between text-sm text-blue-600">
                      <span>Deposit:</span>
                      <span>-${depositAmount.toFixed(2)}</span>
                    </div>
                    {totalPayments > 0 && (
                      <div className="flex justify-between text-sm text-blue-600">
                        <span>Payments Made:</span>
                        <span>-${totalPayments.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2 text-lg font-semibold">
                      <span>Remaining Balance:</span>
                      <span className={finalBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                        ${finalBalance.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CollapsibleSection>
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSubmitting ? 'Creating...' : 'Create Customer Order'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateCustomerOrder;