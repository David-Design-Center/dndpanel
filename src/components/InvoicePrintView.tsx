import React from 'react';

// Define the interface for invoice line items
export interface InvoiceLineItem {
  id: string;
  item: string;
  description: string;
  quantity: number;
  price: number;
}

// Define payment method type
export type PaymentMethod = 'cash' | 'cheque' | 'card' | 'other';

// Define payment entry interface
export interface PaymentEntry {
  date: string;
  amount: number;
  method?: PaymentMethod;
}

// Define the interface for the invoice
export interface Invoice {
  poNumber: string;
  date: string;
  customerName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  tel1: string;
  tel2: string;
  email: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  deposit: number;
  balance: number;
  payments: PaymentEntry[];
}

interface InvoicePrintViewProps {
  invoice: Invoice;
  innerRef?: React.RefObject<HTMLDivElement>;
}

// Utility functions
export const calculateRowTotal = (quantity: number, price: number) => {
  return (quantity * price).toFixed(2);
};

export const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });
};

// Calculate payment totals by method
export const calculatePaymentMethodTotals = (payments: PaymentEntry[]) => {
  return payments.reduce((acc, payment) => {
    const method = payment.method || 'other';
    acc[method] += payment.amount;
    return acc;
  }, { cash: 0, cheque: 0, card: 0, other: 0 });
};

function InvoicePrintView({ invoice, innerRef }: InvoicePrintViewProps) {
  return (
    <div 
      ref={innerRef}
      className="invoice-document"
      style={{
        width: '794px',
        background: 'white',
        padding: '40px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        lineHeight: '1.4',
        color: '#000',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #ccc',
        paddingBottom: '20px',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img 
              src="https://res.cloudinary.com/designcenter/image/upload/v1741965462/DnD_Logo_Transparent.svg"
              alt="D&D Design Center Logo"
              style={{
                height: '60px',
                width: 'auto',
                marginRight: '12px'
              }}
            />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              marginBottom: '8px'
            }}>
              <span style={{
                fontWeight: '500',
                fontSize: '14px'
              }}>P.O.#</span>
              <span style={{
                marginLeft: '8px',
                fontSize: '14px',
                borderBottom: '1px solid #666',
                padding: '2px 8px',
                minWidth: '80px',
                display: 'inline-block'
              }}>{invoice.poNumber || ''}</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end'
            }}>
              <span style={{
                fontWeight: '500',
                fontSize: '14px'
              }}>Date:</span>
              <span style={{
                marginLeft: '8px',
                fontSize: '14px',
                borderBottom: '1px solid #666',
                padding: '2px 8px',
                minWidth: '80px',
                display: 'inline-block'
              }}>{invoice.date}</span>
            </div>
          </div>
        </div>
        
        {/* Store Info and Customer Info */}
        <div style={{
          marginTop: '16px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px'
        }}>
          {/* Left column - Store Information */}
          <div>
            <h4 style={{
              margin: '0 0 8px 0',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#333'
            }}>Store Information</h4>
            <p style={{
              margin: '2px 0',
              fontSize: '11px',
              fontWeight: '500'
            }}>2615 East 17th Street</p>
            <p style={{
              margin: '2px 0',
              fontSize: '11px',
              fontWeight: '500'
            }}>Brooklyn, NY 11235</p>
            <p style={{
              margin: '2px 0',
              fontSize: '11px',
              fontWeight: '500'
            }}>info@dnddesigncenter.com</p>
            <p style={{
              margin: '2px 0',
              fontSize: '11px',
              fontWeight: '500'
            }}>Phone: (718) 934-7100</p>
            <p style={{
              margin: '2px 0',
              fontSize: '11px',
              fontWeight: '500'
            }}>www.dnddesigncenter.com</p>
          </div>
          
          {/* Right column - Customer Information */}
          <div>
            <h4 style={{
              margin: '0 0 8px 0',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#333'
            }}>Customer Information</h4>
            <p style={{
              margin: '2px 0',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#666'
              }}>Name: </span>
              <span style={{
                fontSize: '11px',
                fontWeight: '500'
              }}>{invoice.customerName}</span>
            </p>
            <p style={{
              margin: '2px 0',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#666'
              }}>Address: </span>
              <span style={{
                fontSize: '11px'
              }}>{invoice.address}</span>
            </p>
            <p style={{
              margin: '2px 0',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#666'
              }}>Location: </span>
              <span style={{
                fontSize: '11px'
              }}>{invoice.city}, {invoice.state} {invoice.zip}</span>
            </p>
            <p style={{
              margin: '2px 0',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#666'
              }}>Phone: </span>
              <span style={{
                fontSize: '11px'
              }}>{invoice.tel1} {invoice.tel2}</span>
            </p>
            <p style={{
              margin: '2px 0',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#666'
              }}>Email: </span>
              <span style={{
                fontSize: '11px'
              }}>{invoice.email}</span>
            </p>
          </div>
        </div>
      </div>
      
      {/* Line Items */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>Line Items</h3>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #000'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{
                border: '1px solid #000',
                padding: '8px',
                textAlign: 'left',
                fontSize: '11px',
                fontWeight: 'bold',
                width: '60px'
              }}>Item</th>
              <th style={{
                border: '1px solid #000',
                padding: '8px',
                textAlign: 'left',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>Description</th>
              <th style={{
                border: '1px solid #000',
                padding: '8px',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 'bold',
                width: '60px'
              }}>Qty</th>
              <th style={{
                border: '1px solid #000',
                padding: '8px',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 'bold',
                width: '80px'
              }}>Price</th>
              <th style={{
                border: '1px solid #000',
                padding: '8px',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 'bold',
                width: '80px'
              }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map(item => (
              <tr key={item.id}>
                <td style={{
                  border: '1px solid #000',
                  padding: '8px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>{item.item}</td>
                <td style={{
                  border: '1px solid #000',
                  padding: '8px',
                  fontSize: '11px'
                }}>{item.description}</td>
                <td style={{
                  border: '1px solid #000',
                  padding: '8px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>{item.quantity}</td>
                <td style={{
                  border: '1px solid #000',
                  padding: '8px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>${item.price.toFixed(2)}</td>
                <td style={{
                  border: '1px solid #000',
                  padding: '8px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}>${calculateRowTotal(item.quantity, item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Summary and Policy */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ border: '1px solid #000' }}>
          <h3 style={{
            margin: '0',
            padding: '8px',
            backgroundColor: '#f3f4f6',
            fontSize: '12px',
            fontWeight: 'bold',
            borderBottom: '1px solid #000'
          }}>Summary</h3>
          <div style={{ padding: '12px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '4px',
              fontSize: '11px'
            }}>
              <span style={{ fontWeight: '600' }}>Subtotal (before tax):</span>
              <span style={{ fontWeight: 'bold' }}>${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '11px'
            }}>
              <span style={{ fontWeight: '600' }}>NY Sales tax @ 8.875%:</span>
              <span style={{ fontWeight: 'bold' }}>${invoice.tax.toFixed(2)}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              paddingTop: '4px',
              borderTop: '1px solid #ccc',
              fontSize: '11px'
            }}>
              <span style={{ fontWeight: '600' }}>Grand total:</span>
              <span style={{ fontWeight: 'bold' }}>${(invoice.subtotal + invoice.tax).toFixed(2)}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '11px'
            }}>
              <span style={{ fontWeight: '600' }}>Amount paid to date:</span>
              <span style={{ fontWeight: 'bold' }}>${(invoice.deposit + invoice.payments.reduce((sum, payment) => sum + payment.amount, 0)).toFixed(2)}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '4px',
              borderTop: '1px solid #ccc',
              fontSize: '12px'
            }}>
              <span style={{ fontWeight: '600' }}>Balance due:</span>
              <span style={{
                fontWeight: 'bold',
                fontSize: '14px'
              }}>${invoice.balance.toFixed(2)}</span>
            </div>
            {invoice.payments.length > 0 && (
              <div style={{
                marginTop: '12px',
                paddingTop: '8px',
                borderTop: '1px solid #eee'
              }}>
                <div style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  marginBottom: '4px',
                  color: '#666'
                }}>Payment History:</div>
                {invoice.payments.map((payment, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '2px',
                    fontSize: '10px'
                  }}>
                    <span style={{ fontWeight: '500' }}>
                      {payment.date} {payment.method && `(${payment.method.charAt(0).toUpperCase() + payment.method.slice(1)})`}
                    </span>
                    <span style={{ fontWeight: 'bold' }}>${payment.amount.toFixed(2)}</span>
                  </div>
                ))}
                
                {/* Payment method totals */}
                {(() => {
                  const methodTotals = calculatePaymentMethodTotals(invoice.payments);
                  const hasMultipleMethods = Object.values(methodTotals).filter(t => t > 0).length > 1;
                  
                  return hasMultipleMethods && (
                    <div style={{
                      marginTop: '4px',
                      paddingTop: '4px',
                      borderTop: '1px dashed #eee',
                      fontSize: '9px'
                    }}>
                      {methodTotals.cash > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Total Cash:</span>
                          <span>${methodTotals.cash.toFixed(2)}</span>
                        </div>
                      )}
                      {methodTotals.cheque > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Total Cheque:</span>
                          <span>${methodTotals.cheque.toFixed(2)}</span>
                        </div>
                      )}
                      {methodTotals.card > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Total Card:</span>
                          <span>${methodTotals.card.toFixed(2)}</span>
                        </div>
                      )}
                      {methodTotals.other > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Total Other:</span>
                          <span>${methodTotals.other.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
        
        <div style={{ border: '1px solid #000' }}>
          <h3 style={{
            margin: '0',
            padding: '8px',
            backgroundColor: '#f3f4f6',
            fontSize: '12px',
            fontWeight: 'bold',
            borderBottom: '1px solid #000'
          }}>Store Policy</h3>
          <div style={{
            padding: '12px',
            fontSize: '10px'
          }}>
            <ol style={{
              margin: '0',
              paddingLeft: '16px',
              lineHeight: '1.4'
            }}>
              <li style={{ marginBottom: '4px' }}>All special/custom orders require 10 to 12 weeks delivery time.</li>
              <li style={{ marginBottom: '4px' }}>All orders require <strong>50% deposit</strong>.</li>
              <li style={{ marginBottom: '4px' }}>Deposits are <strong>non-refundable</strong> for cancellation on custom and special orders.</li>
              <li style={{ marginBottom: '4px' }}>All cancellations on stock items, store credit only. Deposits are <strong>not refundable</strong>.</li>
              <li style={{ marginBottom: '8px' }}>Merchandise belongs to D&D Design Center until paid in full.</li>
            </ol>
            
            <div style={{
              marginTop: '12px',
              fontSize: '10px'
            }}>
              <p style={{ margin: '0' }}>Customer Agrees to all of the above</p>
              <p style={{
                textAlign: 'right',
                margin: '8px 0 0 0'
              }}>_________________________________</p>
              <p style={{
                textAlign: 'right',
                margin: '2px 0 0 0',
                fontSize: '9px'
              }}>SIGNATURE</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoicePrintView;