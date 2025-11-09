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
  // Page height calculations (in pixels at 96 DPI)
  const PAGE_HEIGHT = 1123; // A4 height
  const PAGE_PADDING = 80; // Top and bottom padding (40px each)
  const HEADER_HEIGHT = 250; // Approximate header + supplier info height on first page
  const HEADER_HEIGHT_CONTINUATION = 120; // Smaller header on continuation pages (no supplier info)
  const TABLE_HEADER_HEIGHT = 30; // Table header height
  const SAFETY_MARGIN = 50; // Extra margin to prevent overflow
  const AVAILABLE_CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_PADDING - HEADER_HEIGHT - TABLE_HEADER_HEIGHT - SAFETY_MARGIN;
  const AVAILABLE_CONTENT_HEIGHT_CONTINUATION = PAGE_HEIGHT - PAGE_PADDING - HEADER_HEIGHT_CONTINUATION - TABLE_HEADER_HEIGHT - SAFETY_MARGIN;
  
  // Estimate row height based on description length
  const estimateRowHeight = (item: SupplierOrderLineItem): number => {
    const baseHeight = 40; // Minimum row height with padding and borders
    const descriptionLength = item.description?.length || 0;
    
    // More accurate character width estimation
    // Description column width is roughly 400-450px
    // Average character width is ~7px (depends on font, but conservative estimate)
    const descColumnWidthPx = 400;
    const avgCharWidthPx = 7;
    const charsPerLine = Math.floor(descColumnWidthPx / avgCharWidthPx); // ~57 chars per line
    
    const estimatedLines = Math.max(1, Math.ceil(descriptionLength / charsPerLine));
    const lineHeight = 24; // Line height including spacing
    
    return baseHeight + (estimatedLines - 1) * lineHeight;
  };

  // Split items into pages based on content height
  const pages: SupplierOrderLineItem[][] = [];
  let currentPage: SupplierOrderLineItem[] = [];
  let currentPageHeight = 0;
  
  order.lineItems.forEach((item) => {
    const itemHeight = estimateRowHeight(item);
    const maxHeight = pages.length === 0 ? AVAILABLE_CONTENT_HEIGHT : AVAILABLE_CONTENT_HEIGHT_CONTINUATION;
    
    console.log(`Item: "${item.description?.substring(0, 30)}..." - Estimated height: ${itemHeight}px, Current page height: ${currentPageHeight}px, Max: ${maxHeight}px`);
    
    // If adding this item would exceed page height, start a new page
    if (currentPageHeight + itemHeight > maxHeight && currentPage.length > 0) {
      console.log(`🔄 Starting new page! Current page had ${currentPage.length} items with ${currentPageHeight}px height`);
      pages.push(currentPage);
      currentPage = [item];
      currentPageHeight = itemHeight;
    } else {
      currentPage.push(item);
      currentPageHeight += itemHeight;
    }
  });
  
  // Add the last page
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }
  
  // If no items, still show one page
  if (pages.length === 0) {
    pages.push([]);
  }
  
  const totalPages = pages.length;
  const isMultiPage = totalPages > 1;

  // Debug logging
  console.log('📦 Vendor Order Multi-Page Debug (Height-Based):', {
    totalLineItems: order.lineItems.length,
    totalPages: totalPages,
    isMultiPage: isMultiPage,
    pagesArray: pages.map((p, i) => {
      const heights = p.map(item => estimateRowHeight(item));
      const totalHeight = heights.reduce((a, b) => a + b, 0);
      return `Page ${i + 1}: ${p.length} items, ~${totalHeight}px`;
    })
  });

  // Page wrapper style
  const pageStyle: React.CSSProperties = {
    width: '794px',
    minHeight: '1123px', // A4 height in pixels at 96 DPI
    background: 'white',
    padding: '40px',
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    lineHeight: '1.4',
    color: '#000',
    margin: '0 auto 20px auto', // Add margin bottom for visual separation between pages
    boxSizing: 'border-box',
    pageBreakAfter: 'always',
    border: '1px solid #e5e7eb' // Subtle border to show page boundaries
  };

  // Last page shouldn't have page break
  const lastPageStyle: React.CSSProperties = {
    ...pageStyle,
    pageBreakAfter: 'auto',
    marginBottom: '0' // No margin on last page
  };

  // Render header (logo, PO#, date, page number)
  const renderHeader = (pageNum: number, showSupplierInfo: boolean = true) => (
    <>
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
            <div style={{
              marginBottom: isMultiPage ? '8px' : '0'
            }}>
              <span style={{ fontWeight: 500, fontSize: '14px' }}>Date:</span>{' '}
              <span data-field="invoice-date">{order.date}</span>
            </div>
            {isMultiPage && (
              <div style={{
                fontSize: '12px',
                color: '#666',
                marginTop: '4px'
              }}>
                Page {pageNum} of {totalPages}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Store + Supplier Info - only on first page */}
      {showSupplierInfo && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          
          {/* Left - Store Info */}
          <div style={{ width: '48%' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Store Information</h4>
            <div style={{ fontSize: '12px' }}>
              <div style={{ fontWeight: 600 }}>D&D Design Center</div>
              <div>2615 East 17th Street</div>
              <div>Brooklyn, NY 11235</div>
              <div>(718) 934-7100</div>
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
      )}
    </>
  );

  // Render line items table
  const renderLineItemsTable = (items: SupplierOrderLineItem[]) => (
    <div style={{ marginTop: '20px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', background: '#f6f6f6', width: '10%' }}>Item</th>
            <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', background: '#f6f6f6' }}>Description</th>
            <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', background: '#f6f6f6', width: '18%' }}>Brand</th>
            <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', background: '#f6f6f6', width: '12%' }}>Qty</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id || index}>
              <td style={{ border: '1px solid #ccc', padding: '6px' }} data-field="item-no">{item.item}</td>
              <td style={{ 
                border: '1px solid #ccc', 
                padding: '6px',
                wordWrap: 'break-word',
                wordBreak: 'break-word',
                whiteSpace: 'normal',
                maxWidth: '300px'
              }} data-field="item-desc">{item.description}</td>
              <td style={{ border: '1px solid #ccc', padding: '6px' }} data-field="item-brand">{item.brand || ''}</td>
              <td style={{ border: '1px solid #ccc', padding: '6px' }} data-field="item-qty">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div ref={innerRef} className="supplier-order-document">
      {pages.map((pageItems, pageIndex) => {
        const pageNum = pageIndex + 1;
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === pages.length - 1;
        
        return (
          <div 
            key={pageIndex}
            style={isLastPage ? lastPageStyle : pageStyle}
          >
            {renderHeader(pageNum, isFirstPage)}
            {renderLineItemsTable(pageItems)}
          </div>
        );
      })}
    </div>
  );
}

export default SupplierOrderPrintView;
