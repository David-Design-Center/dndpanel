import React from 'react';

export interface SupplierOrderLineItem {
  id: string;
  item: string;
  description: string;
  brand?: string;
  quantity: number;
}

export interface SupplierOrderDoc {
  poNumber: string;
  date: string;
  supplierName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  tel1: string;
  tel2: string;
  email: string;
  lineItems: SupplierOrderLineItem[];
}

interface Props {
  order: SupplierOrderDoc;
  innerRef?: React.RefObject<HTMLDivElement>;
}

function SupplierOrderPrintView({ order, innerRef }: Props) {
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
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: '1px solid #ccc', paddingBottom: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src="https://res.cloudinary.com/designcenter/image/upload/v1757594555/FullLogo_bjxeh8.avif"
              alt="D&D Design Center Logo"
              style={{ height: '100px', width: 'auto', marginRight: '12px' }}
            />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <span style={{ fontWeight: 500, fontSize: '14px' }}>P.O.#</span>
              <span
                style={{
                  marginLeft: '8px',
                  fontSize: '14px',
                  borderBottom: '1px solid #666',
                  padding: '2px 8px',
                  minWidth: '80px',
                  display: 'inline-block',
                }}
                data-field="po-number"
              >
                {order.poNumber}
              </span>
            </div>
            <div>
              <span style={{ fontWeight: 500, fontSize: '14px' }}>Date:</span>{' '}
              <span data-field="invoice-date">{order.date}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Store + Supplier Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        
        {/* Left - Store Info */}
        <div style={{ width: '48%' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Store Information</h4>
          <div style={{ fontSize: '12px' }}>
            <div style={{ fontWeight: 600 }}>D&D Design Center</div>
            <div>2615 East 17th Street</div>
            <div>Brooklyn, NY 11235</div>
            <div>(718) 934-7100</div>
            <div>info@dnddesigncenter.com</div>
            <div>www.dnddesigncenter.com</div>
          </div>
        </div>

        {/* Right - Supplier */}
        <div style={{ width: '48%' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Supplier Information</h4>
          <div style={{ fontSize: '12px' }}>
            <div data-field="supplier-name" style={{ fontWeight: 600 }}>{order.supplierName}</div>
            <div data-field="supplier-address">{order.address}</div>
            {(order.city || order.state || order.zip) && (
              <div>
                {[order.city, order.state, order.zip].filter(Boolean).join(', ')}
              </div>
            )}
            {(order.tel1 || order.tel2) && (
              <div data-field="supplier-phone">{[order.tel1, order.tel2].filter(Boolean).join(' / ')}</div>
            )}
            {order.email && (
              <div data-field="supplier-email">{order.email}</div>
            )}
          </div>
        </div>
      </div>

      {/* Items table (no price columns) */}
      <div style={{ marginTop: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', background: '#f6f6f6', width: '10%' }}>Item</th>
              <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', background: '#f6f6f6' }}>Description</th>
              <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', background: '#f6f6f6', width: '18%' }}>Brand</th>
              <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', background: '#f6f6f6', width: '12%' }}>Qty</th>
            </tr>
          </thead>
          <tbody>
            {order.lineItems.map((item, index) => (
              <tr key={item.id || index}>
                <td style={{ border: '1px solid #ccc', padding: '6px' }} data-field="item-no">{item.item}</td>
                <td style={{ border: '1px solid #ccc', padding: '6px' }} data-field="item-desc">{item.description}</td>
                <td style={{ border: '1px solid #ccc', padding: '6px' }} data-field="item-brand">{item.brand || ''}</td>
                <td style={{ border: '1px solid #ccc', padding: '6px' }} data-field="item-qty">{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SupplierOrderPrintView;
