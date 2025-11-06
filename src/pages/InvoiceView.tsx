import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Edit3, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import InvoicePrintView, { Invoice } from '@/components/invoice/InvoicePrintView';
import { fetchInvoiceByOrderId } from '@/services/backendApi';

function InvoiceView() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { isGmailSignedIn } = useAuth();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!invoiceId) {
        setError('No invoice ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First try to fetch by invoice ID directly
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select(`
            *,
            invoice_line_items (*)
          `)
          .eq('id', invoiceId)
          .single();

        if (invoiceError && invoiceError.code !== 'PGRST116') {
          throw invoiceError;
        }

        if (invoiceData) {
          // Convert Supabase format to component format
          const transformedInvoice: Invoice = {
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
            lineItems: (invoiceData.invoice_line_items || []).map((item: any) => ({
              id: item.id || crypto.randomUUID(),
              item: item.item_code || '',
              description: item.description || '',
              quantity: Number(item.quantity) || 1,
              price: Number(item.unit_price) || 0
            })),
            subtotal: Number(invoiceData.subtotal) || 0,
            discount: Number(invoiceData.discount_amount) || 0,
            tax: Number(invoiceData.tax_amount) || 0,
            total: Number(invoiceData.total_amount) || 0,
            balance: Number(invoiceData.balance_due) || 0,
            payments: invoiceData.payments_history || []
          };

          setInvoice(transformedInvoice);
        } else {
          // If not found by invoice ID, try to fetch by order ID
          const existingInvoice = await fetchInvoiceByOrderId(invoiceId);
          
          if (existingInvoice) {
            const { invoice: supabaseInvoice, lineItems } = existingInvoice;
            
            const transformedInvoice: Invoice = {
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
              lineItems: lineItems.map(item => ({
                id: item.id || crypto.randomUUID(),
                item: item.item_code || '',
                description: item.description || '',
                quantity: Number(item.quantity) || 1,
                price: Number(item.unit_price) || 0
              })),
              subtotal: Number(supabaseInvoice.subtotal) || 0,
              discount: Number(supabaseInvoice.discount_amount) || 0,
              tax: Number(supabaseInvoice.tax_amount) || 0,
              total: Number(supabaseInvoice.total_amount) || 0,
              balance: Number(supabaseInvoice.balance_due) || 0,
              payments: supabaseInvoice.payments_history || []
            };

            setInvoice(transformedInvoice);
          } else {
            throw new Error('Invoice not found');
          }
        }
      } catch (error) {
        console.error('Error loading invoice:', error);
        setError(error instanceof Error ? error.message : 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  const handleEdit = () => {
    if (!invoice) return;
    
    navigate('/invoice-generator', { 
      state: { 
        editInvoice: {
          invoiceId: invoiceId,
          customerName: invoice.customerName,
          orderNumber: invoice.poNumber,
          date: invoice.date,
          amount: invoice.total,
          balance: invoice.balance,
          status: invoice.balance <= 0 ? 'paid-in-full' : 'order-in-progress'
        }
      }
    });
  };

  const handleBack = () => {
    navigate('/invoices');
  };

  // Check Gmail authentication
  if (!isGmailSignedIn) {
    return (
      <div className="fade-in pb-6">
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Required</h3>
            <p className="text-gray-600 mb-6">
              Please connect to your email account to view invoices. This page requires email integration to access and display invoice details.
            </p>
            <button
              onClick={() => navigate('/inbox')}
              className="btn btn-primary"
            >
              Go to Inbox to Connect Gmail
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fade-in pb-6">
        <div className="flex items-center mb-4">
          <Button variant="ghost" onClick={handleBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
          <h1 className="text-xl font-semibold text-gray-800">Invoice View</h1>
        </div>
        
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-gray-600">Loading invoice...</span>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="fade-in pb-6">
        <div className="flex items-center mb-4">
          <Button variant="ghost" onClick={handleBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
          <h1 className="text-xl font-semibold text-gray-800">Invoice View</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-800">
          <p>{error || 'Invoice not found'}</p>
          <Button 
            onClick={handleBack}
            className="mt-2"
            variant="outline"
          >
            Back to Invoices
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 no-print">
        <div className="flex items-center">
          <Button variant="ghost" onClick={handleBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
          <h1 className="text-xl font-semibold text-gray-800">Invoice View</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={handleEdit} variant="outline">
            <Edit3 className="h-4 w-4 mr-2" />
            Edit Invoice
          </Button>
          <Button onClick={handlePrint}>
            <Download className="h-4 w-4 mr-2" />
            Print / Download
          </Button>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="invoice-preview-wrapper">
          <InvoicePrintView invoice={invoice} innerRef={invoiceRef} />
        </div>
      </div>
    </div>
  );
}

export default InvoiceView;
