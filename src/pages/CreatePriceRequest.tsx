import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Plus, ArrowLeft, 
  Info, AlertCircle, Eye
} from 'lucide-react';
import { createPriceRequest } from '../services/backendApi';
import { sendEmail } from '../services/emailService';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import Modal from '../components/common/Modal';

// Utility function to convert plain text to HTML for email sending
const convertTextToHtml = (text: string): string => {
  const lines = text.split('\n');
  let html = '';
  let inContactInfo = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.length === 0) {
      // Skip empty lines but add spacing
      continue;
    }
    
    // Detect contact information section
    if (line.includes('D&D Design Center')) {
      inContactInfo = true;
      html += `<div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #007bff; font-family: Arial, sans-serif;">`;
      html += `<div style="font-weight: 600; color: #212529; margin-bottom: 8px;">${line}</div>`;
      continue;
    }
    
    if (inContactInfo) {
      // Handle contact info with better styling
      if (line.includes('Tel:')) {
        html += `<div style="color: #495057; margin: 2px 0;">${line}</div>`;
      } else if (line.includes('www.')) {
        html += `<div style="margin: 4px 0;"><a href="http://${line}" target="_blank" style="color: #007bff; text-decoration: none;">${line}</a></div>`;
        html += `</div>`; // Close the contact info div
        inContactInfo = false;
      } else {
        html += `<div style="color: #495057; margin: 2px 0;">${line}</div>`;
      }
    } else {
      // Regular content
      if (line.includes('[YOUR LINE ITEMS WILL APPEAR HERE AS A TABLE]')) {
        html += `<div style="margin: 20px 0;">[YOUR LINE ITEMS WILL APPEAR HERE AS A TABLE]</div>`;
      } else {
        html += `<p style="margin: 10px 0; color: #212529; font-family: Arial, sans-serif;">${line}</p>`;
      }
    }
  }
  
  // Wrap everything in a container
  return `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #212529;">${html}</div>`;
};

// Define types for the form
interface LineItem {
  id: string;
  productName: string;
  productLink: string;
  description: string;
  quantity: number;
  supplierId: string; // Changed from optional to required with default
  specifications?: string;
  imageFile?: File;
  imageUrl?: string; // For preview
}

interface Partner {
  id: string;
  name: string;
  email: string;
  template?: string;
  contact?: string;
  isCustom?: boolean; // To distinguish custom suppliers
}

interface CustomEmailBody {
  [partnerId: string]: string;
}

function CreatePriceRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentProfile } = useProfile();
  
  // Section 1: Project Details
  const [projectName, setProjectName] = useState('');
  const [projectNotes, setProjectNotes] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  
  // Section 2: Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: crypto.randomUUID(),
      productName: '',
      productLink: '',
      description: '',
      quantity: 1,
      supplierId: '' // Default empty supplier
    }
  ]);
  
  // Available Partners (now used directly in line items)
  const [partners, setPartners] = useState<Partner[]>([
    { id: '1', name: 'Arketipo', email: 'martisuvorov12@gmail.com' },
    { id: '2', name: 'Aster', email: 'effidigital@gmail.com' },
    { id: '3', name: 'Cattelan Italia', email: '' },
    { id: '4', name: 'Fiam Italia', email: '' },
    { id: '5', name: 'Gallotti & Radice', email: '' },
    { id: '6', name: 'Tonelli Design', email: '' }
  ]);
  
  // Custom supplier form state
  const [showCustomSupplierForm, setShowCustomSupplierForm] = useState(false);
  const [customSupplierName, setCustomSupplierName] = useState('');
  const [customSupplierEmail, setCustomSupplierEmail] = useState('');
  
  // Section 3: Email & Send (now section 3, was section 4)
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMode, setEmailMode] = useState<'template' | 'custom'>('template');
  const [emailBody, setEmailBody] = useState(
    `Hello [SUPPLIER NAME],

Please let us know the price for the following items:

[YOUR LINE ITEMS WILL APPEAR HERE AS A TABLE]

Thanks,
[YOUR NAME]

D&D Design Center
2615 East 17 street
Brooklyn NY 11235

Tel: (718) 934-7100
www.dnddesigncenter.com`
  );
  const [customEmailBodies, setCustomEmailBodies] = useState<CustomEmailBody>({});
  
  // Form validation
  const [errors, setErrors] = useState<{
    projectName?: string;
    orderNumber?: string;
    lineItems?: string;
    emailSubject?: string;
    emailBody?: string;
    customEmails?: string;
  }>({});
  
  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Email preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewPartnerName, setPreviewPartnerName] = useState('');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  
  // Derived state - get unique suppliers from line items
  const getSelectedSupplierIds = () => {
    const supplierIds = lineItems
      .map(item => item.supplierId)
      .filter(id => id !== ''); // Filter out empty supplier IDs
    
    return [...new Set(supplierIds)]; // Return unique supplier IDs
  };
  
  // Set default email subject when project name changes
  useEffect(() => {
    if (projectName) {
      setEmailSubject(`RFQ: ${projectName}`);
    } else {
      setEmailSubject('');
    }
  }, [projectName]);
  
  // Initialize custom email bodies when selected suppliers change
  useEffect(() => {
    const selectedSupplierIds = getSelectedSupplierIds();
    
    // Initialize custom email bodies for each selected supplier
    const initialCustomBodies: CustomEmailBody = {};
    selectedSupplierIds.forEach(supplierId => {
      if (!customEmailBodies[supplierId]) {
        const partner = partners.find(p => p.id === supplierId);
        initialCustomBodies[supplierId] = 
          `Hello ${partner?.name},

Please let us know the price for the following items:

[YOUR LINE ITEMS WILL APPEAR HERE AS A TABLE]

Thanks,
[YOUR NAME]

D&D Design Center
2615 East 17 street
Brooklyn NY 11235

Tel: (718) 934-7100
www.dnddesigncenter.com`;
      }
    });
    
    // Keep existing custom bodies for suppliers that are still selected
    const updatedBodies = { ...initialCustomBodies };
    Object.keys(customEmailBodies).forEach(supplierId => {
      if (selectedSupplierIds.includes(supplierId)) {
        updatedBodies[supplierId] = customEmailBodies[supplierId];
      }
    });
    
    setCustomEmailBodies(updatedBodies);
  }, [lineItems, partners]);
  
  // Add a new line item
  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: crypto.randomUUID(),
        productName: '',
        productLink: '',
        description: '',
        quantity: 1,
        supplierId: '' // Default empty supplier
      }
    ]);
  };
  
  // Remove a line item
  const handleRemoveLineItem = (idToRemove: string) => {
    setLineItems(items => {
      const itemToRemove = items.find(item => item.id === idToRemove);
      // Clean up image URL if it exists
      if (itemToRemove?.imageUrl) {
        URL.revokeObjectURL(itemToRemove.imageUrl);
      }
      return items.filter(item => item.id !== idToRemove);
    });
  };
  
  // Update a line item
  const handleLineItemChange = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };
   // Update custom email body for a specific supplier
  const handleCustomEmailChange = (supplierId: string, body: string) => {
    setCustomEmailBodies(prev => ({
      ...prev,
      [supplierId]: body
    }));
  };
  
  // Add custom supplier
  const handleAddCustomSupplier = () => {
    if (!customSupplierName.trim() || !customSupplierEmail.trim()) {
      alert('Please fill in both supplier name and email');
      return;
    }
    
    const newSupplier: Partner = {
      id: crypto.randomUUID(),
      name: customSupplierName,
      email: customSupplierEmail,
      isCustom: true
    };
    
    setPartners(prev => [...prev, newSupplier]);
    setCustomSupplierName('');
    setCustomSupplierEmail('');
    setShowCustomSupplierForm(false);
  };
  
  // Handle image upload for line items
  const handleImageUpload = (itemId: string, file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file must be smaller than 5MB');
      return;
    }
    
    // Create preview URL
    const imageUrl = URL.createObjectURL(file);
    
    setLineItems(items => items.map(item => 
      item.id === itemId 
        ? { ...item, imageFile: file, imageUrl } 
        : item
    ));
  };
  
  // Remove image from line item
  const handleRemoveImage = (itemId: string) => {
    setLineItems(items => items.map(item => 
      item.id === itemId 
        ? { ...item, imageFile: undefined, imageUrl: undefined } 
        : item
    ));
  };
  
  // Convert image to base64 for email embedding
  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Convert binary data to base64 using a more robust method
          let binaryString = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binaryString += String.fromCharCode(uint8Array[i]);
          }
          
          // Now we can safely use btoa since we have a proper binary string
          const base64Data = btoa(binaryString);
          resolve(base64Data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      // Use readAsArrayBuffer instead of readAsDataURL for better binary handling
      reader.readAsArrayBuffer(file);
    });
  };

  // Validate form
  const validateForm = (isDraft = false) => {
    const newErrors: typeof errors = {};
    
    if (!projectName.trim()) {
      newErrors.projectName = 'Project name is required';
    }
    
    if (lineItems.length === 0) {
      newErrors.lineItems = 'At least one line item is required';
    } else {
      for (const item of lineItems) {
        if (!item.productName.trim()) {
          newErrors.lineItems = 'All line items must have a product name';
          break;
        }
        if (item.quantity < 1) {
          newErrors.lineItems = 'Quantity must be at least 1 for all line items';
          break;
        }
      }
    }
    
    // Check if at least one line item has a supplier
    const hasSupplier = lineItems.some(item => item.supplierId !== '');
    if (!hasSupplier) {
      newErrors.lineItems = 'At least one line item must have a supplier selected';
    }

    // Only validate email fields if not saving as draft
    if (!isDraft) {
      if (!emailSubject.trim()) {
        newErrors.emailSubject = 'Email subject is required';
      }
      
      if (emailMode === 'template') {
        if (!emailBody.trim()) {
          newErrors.emailBody = 'Email body is required';
        }
      } else {
        // Check all custom email bodies
        const selectedSupplierIds = getSelectedSupplierIds();
        let hasEmptyCustomEmail = false;
        selectedSupplierIds.forEach(supplierId => {
          if (!customEmailBodies[supplierId]?.trim()) {
            hasEmptyCustomEmail = true;
          }
        });
        
        if (hasEmptyCustomEmail) {
          newErrors.customEmails = 'All email bodies must be filled';
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Get line items for a specific supplier (used for custom emails)
  const getLineItemsForSupplier = (supplierId: string) => {
    return lineItems.filter(item => 
      item.supplierId === supplierId
    );
  };
  
  // Helper function to create HTML table from line items
  const createLineItemsTable = async (items: LineItem[], isPreview = false) => {
    // Process images and create attachments
    const attachments: Array<{ name: string; mimeType: string; data: string; cid: string }> = [];
    
    let tableRows = '';
    for (const item of items) {
      let imageCellContent = '-';
      
      if (item.imageFile) {
        try {
          if (isPreview) {
            // For preview, use the blob URL directly
            imageCellContent = `<img src="${item.imageUrl}" alt="${item.productName}" style="max-width: 120px; max-height: 80px; object-fit: cover; border-radius: 4px;" />`;
          } else {
            // For email, use CID reference and create attachment
            const base64Data = await convertImageToBase64(item.imageFile);
            const cid = `image_${item.id}`;
            
            // Add to attachments for email
            attachments.push({
              name: `${item.productName}_image.jpg`,
              mimeType: item.imageFile.type,
              data: base64Data,
              cid: cid
            });
            
            // Create inline image reference
            imageCellContent = `<img src="cid:${cid}" alt="${item.productName}" style="max-width: 120px; max-height: 80px; object-fit: cover; border-radius: 4px;" />`;
          }
        } catch (error) {
          console.error('Error processing image:', error);
          imageCellContent = 'Image error';
        }
      }
      
      tableRows += `
        <tr style="border-bottom: 1px solid #dee2e6;">
          <td style="padding: 12px 8px; border: 1px solid #dee2e6; vertical-align: top; text-align: center; width: 120px;">
            ${imageCellContent}
          </td>
          <td style="padding: 12px 8px; border: 1px solid #dee2e6; vertical-align: top;">
            <div style="font-weight: 600; color: #212529; margin-bottom: 4px;">${item.productName}</div>
            ${item.productLink ? `<a href="${item.productLink}" target="_blank" style="color: #007bff; text-decoration: none; font-size: 14px;">View Product Details →</a>` : ''}
          </td>
          <td style="padding: 12px 8px; border: 1px solid #dee2e6; vertical-align: top; color: #495057;">${item.description || '-'}</td>
          <td style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: center; vertical-align: top; font-weight: 600; color: #212529;">${item.quantity}</td>
        </tr>
      `;
    }

    const htmlTable = `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-family: Arial, sans-serif;">
      <thead>
        <tr style="background-color: #f8f9fa;">
          <th style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: center; font-weight: 600; color: #495057; width: 120px;">Image</th>
          <th style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: left; font-weight: 600; color: #495057;">Product</th>
          <th style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: left; font-weight: 600; color: #495057;">Description</th>
          <th style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: center; font-weight: 600; color: #495057; width: 80px;">Quantity</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
    `;
    
    return { html: htmlTable, attachments };
  };
  
  // Process email template with placeholders
  const processEmailTemplate = async (template: string, partnerName: string, isPreview = false) => {
    // Convert plain text to HTML first
    const htmlTemplate = convertTextToHtml(template);
    
    // Replace user-friendly placeholders
    let processed = htmlTemplate
      .replace(/\[SUPPLIER NAME\]/g, partnerName)
      .replace(/\[YOUR NAME\]/g, currentProfile?.name || user?.email || 'Me');
    
    let attachments: Array<{ name: string; mimeType: string; data: string; cid: string }> = [];
    
    // Replace line items table placeholder
    if (processed.includes('[YOUR LINE ITEMS WILL APPEAR HERE AS A TABLE]')) {
      const relevantItems = emailMode === 'custom' 
        ? getLineItemsForSupplier(partners.find(p => p.name === partnerName)?.id || '')
        : lineItems;
        
      const tableResult = await createLineItemsTable(relevantItems, isPreview);
      processed = processed.replace(
        '[YOUR LINE ITEMS WILL APPEAR HERE AS A TABLE]',
        tableResult.html
      );
      attachments = tableResult.attachments;
    }
    
    // Add signature if available
    if (currentProfile?.signature) {
      processed += currentProfile.signature;
    }
    
    return { html: processed, attachments };
  };
  
  // Preview email content
  const generateEmailPreview = async () => {
    const selectedSupplierIds = getSelectedSupplierIds();
    if (selectedSupplierIds.length === 0) {
      return { content: 'Please select suppliers for your line items first.', partnerName: 'No Supplier Selected' };
    }
    
    // Use the first selected supplier for preview
    const firstSupplierId = selectedSupplierIds[0];
    const partner = partners.find(p => p.id === firstSupplierId);
    if (!partner) {
      return { content: 'Supplier not found.', partnerName: 'Unknown' };
    }
    
    let emailResult: { html: string; attachments: any[] };
    if (emailMode === 'template') {
      emailResult = await processEmailTemplate(emailBody, partner.name, true); // isPreview = true
    } else {
      emailResult = await processEmailTemplate(customEmailBodies[firstSupplierId] || '', partner.name, true); // isPreview = true
    }
    
    return { content: emailResult.html, partnerName: partner.name };
  };

  // Handle preview modal
  const handleShowPreview = async () => {
    setIsGeneratingPreview(true);
    
    // Small delay to show loading state for better UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const preview = await generateEmailPreview();
    setPreviewContent(preview.content);
    setPreviewPartnerName(preview.partnerName);
    setShowPreviewModal(true);
    setIsGeneratingPreview(false);
  };

  // Handle form submission with draft option
  const handleSubmit = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();
    
    if (!validateForm(saveAsDraft)) {
      // Scroll to the first error
      const firstError = document.querySelector('.error-message');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get unique supplier IDs from line items
      const selectedSupplierIds = getSelectedSupplierIds();
      
      // Track thread IDs for each team
      const teamThreadIds: Record<string, string> = {};
      
      // Send emails only if not saving as draft and if there are suppliers with emails
      if (!saveAsDraft) {
        for (const supplierId of selectedSupplierIds) {
          const partner = partners.find(p => p.id === supplierId);
          if (!partner || !partner.email) continue;
          
          // Get relevant line items for this supplier
          const supplierLineItems = getLineItemsForSupplier(supplierId);
          if (supplierLineItems.length === 0) continue;
          
          // Process email content with attachments
          let emailResult: { html: string; attachments: any[] };
          if (emailMode === 'template') {
            emailResult = await processEmailTemplate(emailBody, partner.name);
          } else {
            emailResult = await processEmailTemplate(customEmailBodies[supplierId] || '', partner.name);
          }
          
          // Send email with attachments
          const emailSendResult = await sendEmail({
            from: { name: 'Me', email: user?.email || 'me@example.com' },
            to: [{ name: partner.name, email: partner.email }],
            subject: emailSubject,
            body: emailResult.html
          }, emailResult.attachments);
          
          if (emailSendResult.success && emailSendResult.threadId) {
            teamThreadIds[supplierId] = emailSendResult.threadId;
          }
        }
      }
      
      // Prepare teams data for the database
      const teams = selectedSupplierIds.map(supplierId => {
        const partner = partners.find(p => p.id === supplierId);
        return {
          id: crypto.randomUUID(),
          name: partner?.name || '',
          email: partner?.email || '',
          submitted: false,
          requestedOn: new Date().toISOString(),
          threadId: teamThreadIds[supplierId] // Include thread ID if available
        };
      });
      
      // Prepare price request data for Supabase
      const priceRequestData = {
        projectName,
        type: 'Price Request' as const,
        status: saveAsDraft ? 'Draft' as const : 'Sent' as const,
        createdBy: user?.email || 'anonymous',
        teams,
        description: projectNotes,
        orderNumber,
        customerName: '', // Could add customer name field later
        orderDate: new Date().toISOString().split('T')[0],
        expectedDueDate: undefined,
        orderAmount: undefined,
        paymentOption: undefined,
        paymentStatus: undefined,
        productDetails: lineItems.map(item => 
          `${item.productName} (Qty: ${item.quantity})`
        ).join(', '),
        user: user?.email || 'anonymous',
        // Include any master thread ID if applicable
        threadId: teams.length === 1 ? teams[0].threadId : undefined
      };
      
      // Create the price request in Supabase
      const result = await createPriceRequest(priceRequestData);
      
      if (result) {
        // Navigate to the orders page on success
        navigate('/orders');
      } else {
        throw new Error('Failed to create price request');
      }
    } catch (error) {
      console.error('Error submitting price request:', error);
      alert('There was an error creating the price request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fade-in h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center p-4 bg-white border-b border-gray-200 flex-shrink-0">
        <button 
          onClick={() => navigate('/orders')}
          className="mr-4 p-2 rounded-full hover:bg-gray-200"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-semibold text-gray-800">Create Price Request</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="flex-1 flex overflow-hidden">
        {/* Kanban Columns */}
        <div className="flex flex-1 gap-4 p-4 overflow-hidden">
          
          {/* Column 1: Project Details */}
          <div className="flex-1 bg-blue-50 rounded-lg border border-blue-200 flex flex-col overflow-hidden">
            <div className="p-4 bg-blue-100 border-b border-blue-200 flex-shrink-0">
              <h2 className="text-lg font-semibold text-blue-800 flex items-center">
                📋 Project Details
              </h2>
              <p className="text-sm text-blue-600 mt-1">Basic project information</p>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="project-name"
                    className={`w-full px-3 py-2 border ${errors.projectName ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                    placeholder="Smith Residence – Living Room"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                  {errors.projectName && (
                    <p className="mt-1 text-xs text-red-600 error-message">{errors.projectName}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="order-number" className="block text-sm font-medium text-gray-700 mb-1">
                    Order Number
                  </label>
                  <input
                    type="text"
                    id="order-number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g., ORD-12345"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    <Info size={10} className="inline mr-1" />
                    Internal reference number
                  </p>
                </div>
                
                <div>
                  <label htmlFor="project-notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Project Notes
                  </label>
                  <textarea
                    id="project-notes"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Optional notes (e.g. 'Need April install')"
                    value={projectNotes}
                    onChange={(e) => setProjectNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Line Items */}
          <div className="flex-1 bg-green-50 rounded-lg border border-green-200 flex flex-col overflow-hidden">
            <div className="p-4 bg-green-100 border-b border-green-200 flex-shrink-0">
              <h2 className="text-lg font-semibold text-green-800 flex items-center">
                📦 Line Items
              </h2>
              <p className="text-sm text-green-600 mt-1">Products to request pricing for</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {errors.lineItems && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md flex items-start">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-xs text-red-600 error-message">{errors.lineItems}</p>
                </div>
              )}
              
              <div className="space-y-3">
                {lineItems.map((item) => (
                  <div key={item.id} className="p-3 bg-white border border-green-200 rounded-md relative shadow-sm">
                    <div className="absolute top-2 right-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(item.id)}
                        className="text-gray-400 hover:text-red-500 text-xs"
                        disabled={lineItems.length === 1}
                        aria-label="Remove item"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Product Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                          placeholder="Product name"
                          value={item.productName}
                          onChange={(e) => handleLineItemChange(item.id, 'productName', e.target.value)}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Quantity <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Supplier <span className="text-red-500">*</span>
                          </label>
                          <select
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                            value={item.supplierId || ''}
                            onChange={(e) => {
                              if (e.target.value === 'add-custom') {
                                setShowCustomSupplierForm(true);
                              } else {
                                handleLineItemChange(item.id, 'supplierId', e.target.value);
                              }
                            }}
                          >
                            <option value="">Select</option>
                            {partners.map(partner => (
                              <option key={partner.id} value={partner.id}>
                                {partner.name} {partner.isCustom ? '(Custom)' : ''}
                              </option>
                            ))}
                            <option value="add-custom">+ Add Custom Supplier</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          rows={2}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                          placeholder="Product details..."
                          value={item.description}
                          onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                        ></textarea>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Product Link
                        </label>
                        <input
                          type="url"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                          placeholder="https://example.com/product"
                          value={item.productLink}
                          onChange={(e) => handleLineItemChange(item.id, 'productLink', e.target.value)}
                        />
                      </div>
                      
                      {/* Product Image Upload */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Product Image
                        </label>
                        {item.imageUrl ? (
                          <div className="relative">
                            <img 
                              src={item.imageUrl} 
                              alt={item.productName}
                              className="w-full h-20 object-cover rounded border border-gray-300"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(item.id)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ) : (
                          <label className="block">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleImageUpload(item.id, file);
                                }
                              }}
                            />
                            <div className="w-full h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-500 hover:border-gray-400 cursor-pointer">
                              Click to upload image
                            </div>
                          </label>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                          Optional - Max 5MB, will be included in email
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="w-full py-2 border-2 border-dashed border-green-300 rounded-md text-xs font-medium text-green-600 hover:text-green-800 hover:border-green-400 flex items-center justify-center bg-white"
                >
                  <Plus size={14} className="mr-1" />
                  Add Item
                </button>
              </div>
            </div>
          </div>

          {/* Column 3: Email & Send */}
          <div className="flex-1 bg-purple-50 rounded-lg border border-purple-200 flex flex-col overflow-hidden">
            <div className="p-4 bg-purple-100 border-b border-purple-200 flex-shrink-0">
              <h2 className="text-lg font-semibold text-purple-800 flex items-center">
                ✉️ Email & Send
              </h2>
              <p className="text-sm text-purple-600 mt-1">Optional - Send emails or save as draft</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                
                {/* Save as Draft Option */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-start">
                    <Info size={14} className="text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-xs text-amber-800">
                      <p className="font-medium">💡 Save as Draft</p>
                      <p className="mt-1">You can save this price request as a draft and send emails later, or skip email and manage manually.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="email-subject" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    id="email-subject"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    placeholder="Optional - leave blank to save as draft"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                  {errors.emailSubject && (
                    <p className="mt-1 text-xs text-red-600 error-message">{errors.emailSubject}</p>
                  )}
                </div>
                
                {emailSubject.trim() && (
                  <>
                    {/* Email Mode Selection - Only show if subject is filled */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700">Email Mode:</p>
                      <div className="space-y-2">
                        <label className="flex items-center p-2 border border-gray-200 rounded text-xs cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            className="h-3 w-3 text-purple-600 focus:ring-purple-500"
                            checked={emailMode === 'template'}
                            onChange={() => setEmailMode('template')}
                          />
                          <span className="ml-2">📝 One template for all</span>
                        </label>
                        <label className="flex items-center p-2 border border-gray-200 rounded text-xs cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            className="h-3 w-3 text-purple-600 focus:ring-purple-500"
                            checked={emailMode === 'custom'}
                            onChange={() => setEmailMode('custom')}
                            disabled={getSelectedSupplierIds().length === 0}
                          />
                          <span className="ml-2">✏️ Custom per supplier</span>
                        </label>
                      </div>
                    </div>

                    {/* Template Email Mode */}
                    {emailMode === 'template' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Template
                        </label>
                        <textarea
                          rows={8}
                          className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          placeholder="Type your email message here..."
                        ></textarea>
                      </div>
                    )}

                    {/* Custom Email Mode */}
                    {emailMode === 'custom' && getSelectedSupplierIds().length > 0 && (
                      <div className="space-y-3">
                        {getSelectedSupplierIds().slice(0, 2).map(supplierId => {
                          const partner = partners.find(p => p.id === supplierId);
                          return (
                            <div key={supplierId} className="border border-gray-200 rounded p-2">
                              <h4 className="text-xs font-medium text-gray-900 mb-1">{partner?.name}</h4>
                              <textarea
                                rows={4}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                                value={customEmailBodies[supplierId] || ''}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleCustomEmailChange(supplierId, e.target.value)}
                                placeholder={`Email to ${partner?.name}...`}
                              ></textarea>
                            </div>
                          );
                        })}
                        {getSelectedSupplierIds().length > 2 && (
                          <p className="text-xs text-gray-500">+{getSelectedSupplierIds().length - 2} more suppliers...</p>
                        )}
                      </div>
                    )}

                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={handleShowPreview}
                      disabled={getSelectedSupplierIds().length === 0 || isGeneratingPreview}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white text-sm font-medium rounded transition-colors"
                    >
                      {isGeneratingPreview ? 'Generating...' : '👀 Preview Email'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Fixed Bottom Actions */}
      <div className="p-4 bg-white border-t border-gray-200 flex justify-between items-center flex-shrink-0">
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            className="px-4 py-2 bg-amber-600 border border-transparent rounded text-sm font-medium text-white hover:bg-amber-700 flex items-center"
            disabled={isSubmitting}
          >
            💾 Save as Draft
          </button>
          
          <button
            type="button"
            onClick={(e) => handleSubmit(e, false)}
            className="px-4 py-2 bg-blue-600 border border-transparent rounded text-sm font-medium text-white hover:bg-blue-700 flex items-center"
            disabled={isSubmitting || !emailSubject.trim()}
          >
            {isSubmitting && (
              <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSubmitting ? 'Sending...' : '📧 Send Emails'}
          </button>
        </div>
      </div>

      {/* Email Preview Modal */}
      {showPreviewModal && (
        <Modal 
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title={`Email Preview - ${previewPartnerName}`}
          size="full"
        >
          <div className="max-w-4xl mx-auto space-y-6 p-6">
            {/* Subject Preview */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                📧 Email Subject
              </label>
              <div className="bg-white rounded-md border border-gray-300 px-4 py-3 text-gray-900 font-medium shadow-sm">
                {emailSubject || 'No subject'}
              </div>
            </div>

            {/* Email Content Preview */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                <label className="block text-sm font-semibold text-gray-800">
                  ✉️ Email Content (Final Rendered Version)
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  This is exactly how the email will appear to the recipient
                </p>
              </div>
              
              <div className="p-8 bg-gradient-to-br from-gray-50 to-white">
                <div className="max-w-3xl mx-auto">
                  <div 
                    className="bg-white rounded-lg shadow-sm border-2 border-gray-100 p-8 min-h-96 transition-all duration-300 hover:shadow-md"
                    style={{
                      fontFamily: 'Arial, sans-serif',
                      lineHeight: '1.6',
                      color: '#212529',
                      fontSize: '15px'
                    }}
                    dangerouslySetInnerHTML={{ __html: previewContent }}
                  />
                  
                  {/* Visual indicator that this is a preview */}
                  <div className="mt-4 text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      <Eye size={12} className="mr-1" />
                      Live Preview - This is how recipients will see your email
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPreviewModal(false);
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Continue Editing
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Custom Supplier Modal */}
      {showCustomSupplierForm && (
        <Modal 
          isOpen={showCustomSupplierForm}
          onClose={() => {
            setShowCustomSupplierForm(false);
            setCustomSupplierName('');
            setCustomSupplierEmail('');
          }}
          title="Add Custom Supplier"
          size="md"
        >
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="custom-supplier-name" className="block text-sm font-medium text-gray-700 mb-1">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="custom-supplier-name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., ABC Furniture Co."
                value={customSupplierName}
                onChange={(e) => setCustomSupplierName(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="custom-supplier-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="custom-supplier-email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="contact@abcfurniture.com"
                value={customSupplierEmail}
                onChange={(e) => setCustomSupplierEmail(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowCustomSupplierForm(false);
                  setCustomSupplierName('');
                  setCustomSupplierEmail('');
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomSupplier}
                disabled={!customSupplierName.trim() || !customSupplierEmail.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-md transition-colors duration-200"
              >
                Add Supplier
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default CreatePriceRequest;