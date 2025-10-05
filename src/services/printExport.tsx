import React from 'react';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import InvoicePrintView, { type Invoice as InvoiceDoc } from '@/components/invoice/InvoicePrintView';
import SupplierOrderPrintView, { type SupplierOrderDoc } from '@/components/invoice/SupplierOrderPrintView';

// A helper to mount a React element offscreen, render it, rasterize to canvas, and return a PDF blob
const renderElementToPDF = async (element: React.ReactElement, options?: { scale?: number }): Promise<Blob> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.background = 'white';
  container.style.zIndex = '0';
  document.body.appendChild(container);

  const root = createRoot(container);
  const WRAPPER_ID = `pdf-export-wrapper-${Date.now()}`;
  await new Promise<void>((resolve) => {
    root.render(<div id={WRAPPER_ID}>{element}</div>);
    requestAnimationFrame(() => resolve());
  });

  // Allow images (logo) a moment to load
  await new Promise(res => setTimeout(res, 120));

  const node = container.querySelector(`#${WRAPPER_ID}`) as HTMLElement | null;
  if (!node) {
    root.unmount();
    document.body.removeChild(container);
    throw new Error('Failed to render print element');
  }

  const scale = options?.scale ?? 2; // Higher scale for sharper PDF
  const canvas = await html2canvas(node, {
    scale,
    backgroundColor: '#ffffff',
    useCORS: true,
    allowTaint: true,
    logging: false,
    windowWidth: 794,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  // Calculate dimensions to fit A4 (595x842pt)
  const pageWidth = pdf.internal.pageSize.getWidth();
  // const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth; // full width
  const ratio = canvas.height / canvas.width;
  const imgHeight = imgWidth * ratio;

  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');

  const blob = pdf.output('blob');

  root.unmount();
  document.body.removeChild(container);
  return blob;
};

export const exportInvoiceDocToPDF = async (invoice: InvoiceDoc): Promise<Blob> => {
  const element = (
    <div style={{ width: 794 }}>
      <InvoicePrintView invoice={invoice} />
    </div>
  );
  return renderElementToPDF(element);
};

export const exportSupplierOrderToPDF = async (order: SupplierOrderDoc): Promise<Blob> => {
  const element = (
    <div style={{ width: 794 }}>
      <SupplierOrderPrintView order={order} />
    </div>
  );
  return renderElementToPDF(element);
};
