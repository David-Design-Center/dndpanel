import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Edit3, Download } from 'lucide-react';
import { formatCurrency } from './InvoicePrintView';
import { useNavigate } from 'react-router-dom';

interface Invoice {
  id: string;
  customerName: string;
  orderNumber: string;
  date: string;
  amount: number;
  balance: number;
  status: 'paid-in-full' | 'order-in-progress';
  isEdited?: boolean;
  originalInvoiceId?: string;
  source?: 'invoice' | 'order'; // Add source to distinguish between table origins
}

interface InvoiceCardProps {
  invoice: Invoice;
  onRequestChange?: (invoiceData: {
    customerName: string;
    orderNumber: string;
    date: string;
    amount: number;
  }) => void;
  onDownload: (invoiceId: string) => void;
  onSelect?: (invoiceId: string) => void;
}

function InvoiceCard({ invoice, onDownload, onSelect }: InvoiceCardProps) {
  // Webhook placeholder for future implementation
    const navigate = useNavigate();

  const handleRequestChange = () => {
    // For all invoices now, we need to find the related order and edit it
    // If it's an edited invoice, find the original order via the original_invoice_id
    // If it's an original invoice, find the order that generated this invoice
    
    // For now, navigate to create a new order based on this invoice data
    navigate('/invoice-generator', { 
      state: { 
        editInvoice: {
          invoiceId: invoice.id,
          customerName: invoice.customerName,
          orderNumber: invoice.orderNumber,
          date: invoice.date,
          amount: invoice.amount,
          balance: invoice.balance,
          status: invoice.status
        }
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid-in-full':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'order-in-progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid-in-full':
        return 'Paid in Full';
      case 'order-in-progress':
        return 'Order in Progress';
      default:
        return 'Unknown';
    }
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={() => onSelect?.(invoice.id)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-blue-500" />
            <div>
              <CardTitle className="text-base font-semibold">{invoice.customerName}</CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Order #{invoice.orderNumber}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Badge 
              variant="outline" 
              className={`text-xs ${getStatusColor(invoice.status)}`}
            >
              {getStatusText(invoice.status)}
            </Badge>
            {invoice.isEdited && (
              <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs">
                EDITED
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 pb-3">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">Date:</span>
            <span className="font-medium">{new Date(invoice.date).toLocaleDateString()}</span>
          </div>
          
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">Amount:</span>
            <span className="font-semibold">{formatCurrency(invoice.amount)}</span>
          </div>
          
          {invoice.balance > 0 && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Balance:</span>
              <span className="font-semibold text-red-600">{formatCurrency(invoice.balance)}</span>
            </div>
          )}
          
          <div className="flex space-x-1 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRequestChange();
              }}
              className="flex-1 text-xs h-7"
            >
              <Edit3 className="h-3 w-3 mr-1" />
              Edit Invoice
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(invoice.id);
              }}
              className="flex-1 text-xs h-7"
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default InvoiceCard;
