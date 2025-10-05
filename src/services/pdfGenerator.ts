import jsPDF from 'jspdf';

export interface InvoiceData {
  id: string;
  number: string;
  client: string;
  amount: string;
  date: string;
}

export interface OrderData {
  id: string;
  number: string;
  customer: string;
  total: string;
  status: string;
}

/**
 * Generate a PDF for an invoice using jsPDF
 */
export const generateInvoicePDF = async (invoice: InvoiceData): Promise<Blob> => {
  const pdf = new jsPDF();
  
  // Set up fonts and colors
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.setTextColor(37, 99, 235); // Blue color
  
  // Title
  pdf.text('INVOICE', 105, 30, { align: 'center' });
  
  // Company info
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(102, 102, 102); // Gray color
  pdf.text('D&D Design Center', 105, 45, { align: 'center' });
  pdf.text('Professional Interior Design Services', 105, 55, { align: 'center' });
  
  // Invoice details
  pdf.setTextColor(51, 51, 51); // Dark gray
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  
  let yPosition = 80;
  
  pdf.text('Invoice Details:', 20, yPosition);
  yPosition += 15;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  
  // Invoice details table
  const details = [
    ['Invoice Number:', invoice.number],
    ['Date:', invoice.date],
    ['Client:', invoice.client],
    ['Amount:', invoice.amount]
  ];
  
  details.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, 25, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, 80, yPosition);
    yPosition += 12;
  });
  
  // Add a line separator
  pdf.setDrawColor(229, 231, 235); // Light gray
  pdf.line(20, yPosition + 10, 190, yPosition + 10);
  
  // Amount highlight
  yPosition += 30;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(5, 150, 105); // Green color
  pdf.text(`Total Amount: ${invoice.amount}`, 105, yPosition, { align: 'center' });
  
  // Footer
  yPosition = 270;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(102, 102, 102);
  pdf.text('Thank you for your business!', 105, yPosition, { align: 'center' });
  pdf.text('D&D Design Center | Professional Interior Design Services', 105, yPosition + 10, { align: 'center' });
  
  return pdf.output('blob');
};

/**
 * Generate a PDF for an order using jsPDF
 */
export const generateOrderPDF = async (order: OrderData): Promise<Blob> => {
  const pdf = new jsPDF();
  
  // Set up fonts and colors
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.setTextColor(5, 150, 105); // Green color
  
  // Title
  pdf.text('ORDER CONFIRMATION', 105, 30, { align: 'center' });
  
  // Company info
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(102, 102, 102); // Gray color
  pdf.text('D&D Design Center', 105, 45, { align: 'center' });
  pdf.text('Professional Interior Design Services', 105, 55, { align: 'center' });
  
  // Order details
  pdf.setTextColor(51, 51, 51); // Dark gray
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  
  let yPosition = 80;
  
  pdf.text('Order Details:', 20, yPosition);
  yPosition += 15;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  
  // Order details table
  const details = [
    ['Order Number:', order.number],
    ['Customer:', order.customer],
    ['Total:', order.total],
    ['Status:', order.status]
  ];
  
  details.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, 25, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, 80, yPosition);
    yPosition += 12;
  });
  
  // Add a line separator
  pdf.setDrawColor(229, 231, 235); // Light gray
  pdf.line(20, yPosition + 10, 190, yPosition + 10);
  
  // Order description
  yPosition += 30;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(51, 51, 51);
  pdf.text('Order Information:', 20, yPosition);
  
  yPosition += 15;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text('This order confirmation serves as proof of your order placement.', 20, yPosition);
  yPosition += 10;
  pdf.text('Please keep this document for your records.', 20, yPosition);
  
  // Total highlight
  yPosition += 30;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(5, 150, 105); // Green color
  pdf.text(`Order Total: ${order.total}`, 105, yPosition, { align: 'center' });
  
  // Footer
  yPosition = 270;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(102, 102, 102);
  pdf.text('Thank you for choosing D&D Design Center!', 105, yPosition, { align: 'center' });
  pdf.text('D&D Design Center | Professional Interior Design Services', 105, yPosition + 10, { align: 'center' });
  
  return pdf.output('blob');
};

/**
 * Convert a Blob to a File object for attachment
 */
export const blobToFile = (blob: Blob, filename: string): File => {
  return new File([blob], filename, { type: 'application/pdf' });
};