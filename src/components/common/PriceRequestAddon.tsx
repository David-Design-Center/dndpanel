import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, ChevronDown, Building2, Package, ImageIcon, Link, Hash, FileText, FileSpreadsheet } from 'lucide-react';

// Define types for the form
interface LineItem {
  id: string;
  productName: string;
  productLink: string;
  description: string;
  quantity: number;
  imageFile?: File;
  imageUrl?: string; // For preview
}

interface Partner {
  id: string;
  name: string;
  email: string;
  isCustom?: boolean;
}

interface PriceRequestAddonProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTable: (html: string, recipientEmail?: string, attachments?: Array<{ name: string; mimeType: string; data: string; cid: string }>) => void;
}

const PriceRequestAddon: React.FC<PriceRequestAddonProps> = ({
  isOpen,
  onClose,
  onInsertTable
}) => {
  // Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: crypto.randomUUID(),
      productName: '',
      productLink: '',
      description: '',
      quantity: 1
    }
  ]);
  
  // Available Partners
  const [partners] = useState<Partner[]>([
    { id: '1', name: 'Arketipo', email: 'martisuvorov12@gmail.com' },
    { id: '2', name: 'Aster', email: 'effidigital@gmail.com' },
    { id: '3', name: 'Cattelan Italia', email: 'sales@cattelan.it' },
    { id: '4', name: 'Fiam Italia', email: 'info@fiamitalia.it' },
    { id: '5', name: 'Gallotti & Radice', email: 'info@gallottiradice.it' },
    { id: '6', name: 'Tonelli Design', email: 'info@tonellidesign.com' }
  ]);
  
  // Selected supplier
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  
  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState({
    supplier: true,
    products: true
  });
  
  // Form validation
  const [errors, setErrors] = useState<{
    lineItems?: string;
    supplier?: string;
  }>({});
  
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('useEffect: Modal opened, resetting form');
      // Clean up any existing image URLs
      lineItems.forEach(item => {
        if (item.imageUrl) {
          URL.revokeObjectURL(item.imageUrl);
        }
      });
      
      setLineItems([
        {
          id: crypto.randomUUID(),
          productName: '',
          productLink: '',
          description: '',
          quantity: 1
        }
      ]);
      setSelectedSupplierId('');
      setErrors({});
    }
  }, [isOpen]); // Remove lineItems dependency to prevent infinite loop
  
  // Toggle expandable sections
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Add a new line item
  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: crypto.randomUUID(),
        productName: '',
        productLink: '',
        description: '',
        quantity: 1
      }
    ]);
  };
  
  // Remove a line item
  const handleRemoveLineItem = (idToRemove: string) => {
    if (lineItems.length > 1) {
      setLineItems(items => {
        const itemToRemove = items.find(item => item.id === idToRemove);
        // Clean up image URL if it exists
        if (itemToRemove?.imageUrl) {
          URL.revokeObjectURL(itemToRemove.imageUrl);
        }
        return items.filter(item => item.id !== idToRemove);
      });
    }
  };
  
  // Update a line item
  const handleLineItemChange = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
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
    setLineItems(items => items.map(item => {
      if (item.id === itemId && item.imageUrl) {
        URL.revokeObjectURL(item.imageUrl);
      }
      return item.id === itemId 
        ? { ...item, imageFile: undefined, imageUrl: undefined } 
        : item;
    }));
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!selectedSupplierId) {
      newErrors.supplier = 'Please select a supplier';
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
  
  // Create HTML table from line items with proper email attachments
  const createLineItemsTable = async () => {
    const selectedPartner = partners.find(p => p.id === selectedSupplierId);
    
    // Process images and create attachments for email
    const attachments: Array<{ name: string; mimeType: string; data: string; cid: string }> = [];
    
    let tableRows = '';
    for (const item of lineItems) {
      let imageCellContent = '-';
      
      if (item.imageFile) {
        try {
          // Convert image to base64 for email attachment
          const base64Data = await convertImageToBase64(item.imageFile);
          const cid = `image_${item.id}`;
          
          // Add to attachments for email
          attachments.push({
            name: `${item.productName}_image.jpg`,
            mimeType: item.imageFile.type,
            data: base64Data,
            cid: cid
          });
          
          // For the rich text editor, use base64 data URL (visible in browser)
          // For actual emails, the email service should replace this with CID references
          const dataUrl = `data:${item.imageFile.type};base64,${base64Data}`;
          imageCellContent = `<img src="${dataUrl}" alt="${item.productName}" style="max-width: 120px; max-height: 80px; object-fit: cover; border-radius: 4px;" />`;
        } catch (error) {
          console.error('Error processing image:', error);
          // Fallback to blob URL if base64 conversion fails
          if (item.imageUrl) {
            imageCellContent = `<img src="${item.imageUrl}" alt="${item.productName}" style="max-width: 120px; max-height: 80px; object-fit: cover; border-radius: 4px;" />`;
          } else {
            imageCellContent = '<div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">Image failed to load</div>';
          }
        }
      } else if (item.imageUrl) {
        // For the rich text editor preview (no email), use the blob URL directly
        imageCellContent = `<img src="${item.imageUrl}" alt="${item.productName}" style="max-width: 120px; max-height: 80px; object-fit: cover; border-radius: 4px;" />`;
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
          <th style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: center; font-weight: 600; color: #495057; width: 100px;">Quantity</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
    `;
    
    return { 
      html: htmlTable, 
      recipientEmail: selectedPartner?.email, 
      attachments 
    };
  };
  
  // Handle table insertion
  const handleInsertTable = async () => {
    if (!validateForm()) {
      return;
    }
    
    const { html, recipientEmail, attachments } = await createLineItemsTable();
    onInsertTable(html, recipientEmail, attachments);
    onClose();
  };
  
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Compact Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
            <Package size={14} className="text-purple-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Add Product Table</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors duration-150 p-1 rounded-full hover:bg-white/50"
        >
          <X size={16} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        
        {/* Compact Supplier Selection */}
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
          <button
            type="button"
            onClick={() => toggleSection('supplier')}
            className={`w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-all duration-200 ${
              expandedSections.supplier ? 'bg-gray-50' : ''
            }`}
          >
            <div className="flex items-center space-x-2">
              <Building2 size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-900">Supplier</span>
              {selectedSupplierId && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  ✓ Selected
                </span>
              )}
            </div>
            <ChevronDown size={14} className={`transition-transform duration-200 ${
              expandedSections.supplier ? 'rotate-180' : ''
            }`} />
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${
            expandedSections.supplier ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="p-3 border-t border-gray-100">
              <div className="relative">
                <Building2 size={14} className="absolute left-2 top-2 text-gray-400" />
                <select
                  className="w-full pl-7 pr-8 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs bg-white appearance-none"
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                >
                  <option value="">Choose supplier...</option>
                  {partners.map(partner => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-2 text-gray-400 pointer-events-none" />
              </div>
              {errors.supplier && (
                <p className="mt-1 text-xs text-red-600 flex items-center">
                  <AlertCircle size={10} className="mr-1" />
                  {errors.supplier}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Compact Products Section */}
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
          <button
            type="button"
            onClick={() => toggleSection('products')}
            className={`w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-all duration-200 ${
              expandedSections.products ? 'bg-gray-50' : ''
            }`}
          >
            <div className="flex items-center space-x-2">
              <Package size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-900">Products</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {lineItems.length} item{lineItems.length !== 1 ? 's' : ''}
              </span>
            </div>
            <ChevronDown size={14} className={`transition-transform duration-200 ${
              expandedSections.products ? 'rotate-180' : ''
            }`} />
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${
            expandedSections.products ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="p-3 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="flex items-center text-xs text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md transition-colors"
                >
                  <Plus size={10} className="mr-1" />
                  Add
                </button>
              </div>
              
              {errors.lineItems && (
                <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md flex items-start">
                  <AlertCircle size={12} className="text-red-500 mt-0.5 mr-1 flex-shrink-0" />
                  <p className="text-xs text-red-600">{errors.lineItems}</p>
                </div>
              )}
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="p-2 bg-gray-50 border border-gray-200 rounded-md relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700 flex items-center">
                        <Hash size={10} className="mr-1" />
                        Item {index + 1}
                      </span>
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(item.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          aria-label="Remove item"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {/* Product Name */}
                      <div className="relative">
                        <Package size={12} className="absolute left-2 top-1.5 text-gray-400" />
                        <input
                          type="text"
                          className="w-full pl-7 pr-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Product name *"
                          value={item.productName}
                          onChange={(e) => handleLineItemChange(item.id, 'productName', e.target.value)}
                        />
                      </div>
                      
                      {/* Quantity and Link */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <Hash size={12} className="absolute left-2 top-1.5 text-gray-400" />
                          <input
                            type="number"
                            className="w-full pl-7 pr-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                            placeholder="Qty *"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="relative">
                          <Link size={12} className="absolute left-2 top-1.5 text-gray-400" />
                          <input
                            type="url"
                            className="w-full pl-7 pr-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                            placeholder="Product URL"
                            value={item.productLink}
                            onChange={(e) => handleLineItemChange(item.id, 'productLink', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      {/* Description */}
                      <div className="relative">
                        <FileText size={12} className="absolute left-2 top-1.5 text-gray-400" />
                        <textarea
                          rows={2}
                          className="w-full pl-7 pr-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent resize-none"
                          placeholder="Description (optional)"
                          value={item.description}
                          onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                        ></textarea>
                      </div>
                      
                      {/* Compact Image Upload */}
                      {item.imageUrl ? (
                        <div className="relative">
                          <img 
                            src={item.imageUrl} 
                            alt={item.productName}
                            className="w-full h-12 object-cover rounded border border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(item.id)}
                            className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600 shadow-sm"
                          >
                            <X size={8} />
                          </button>
                        </div>
                      ) : (
                        <label htmlFor={`image-upload-${item.id}`} className="block">
                          <input
                            type="file"
                            id={`image-upload-${item.id}`}
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(item.id, file);
                              }
                            }}
                          />
                          <div className="w-full h-8 border border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-500 hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-colors">
                            <ImageIcon size={12} className="mr-1" />
                            Add image
                          </div>
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Compact Action Buttons */}
        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-all duration-200 text-xs hover:shadow-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleInsertTable}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-md transition-all duration-200 flex items-center text-xs hover:shadow-md transform hover:-translate-y-0.5"
          >
            <FileSpreadsheet size={12} className="mr-1" />
            Insert Table
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriceRequestAddon;
