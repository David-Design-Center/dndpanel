import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import CollapsibleSection from '../components/common/CollapsibleSection';
import BrandDropdown from '../components/common/BrandDropdown';
import ItemsDropdown from '../components/common/ItemsDropdown';
import SupplierOrderPrintView, { SupplierOrderDoc, SupplierOrderLineItem } from '../components/invoice/SupplierOrderPrintView';
import { BrandProvider } from '../contexts/BrandContext';
import { ItemsProvider } from '../contexts/ItemsContext';
import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { Brand } from '../contexts/BrandContext';

interface SupplierOrderGeneratorProps {
  orderId?: string;
  onClose?: () => void;
  isModal?: boolean;
}

function SupplierOrderGenerator({ orderId: propOrderId, onClose, isModal = false }: SupplierOrderGeneratorProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId: paramOrderId } = useParams<{ orderId: string }>();
  const orderDocumentRef = useRef<HTMLDivElement>(null);
  const { currentProfile } = useProfile();
  const { isGmailSignedIn, user } = useAuth();
  
  // Use orderId from props if provided (modal mode), otherwise from params (route mode)
  const orderId = propOrderId || paramOrderId;
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalOrderId, setOriginalOrderId] = useState<string | null>(null);
  
  // State for loading supplier order data
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [orderLoadError, setOrderLoadError] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Auto-generate PO number on mount for new orders
  useEffect(() => {
    const generateOrderNumber = async () => {
      if (!isEditMode && !orderId) {
        try {
          console.log('Generating new order number...'); // Debug log
          // Simple timestamp-based order number for suppliers
          const orderNumber = `SO-${Date.now()}`;
          console.log('Generated order number:', orderNumber); // Debug log
          setOrder(prev => ({
            ...prev,
            poNumber: orderNumber
          }));
        } catch (error) {
          console.error('Error generating order number:', error);
        }
      }
    };
    
    generateOrderNumber();
  }, [isEditMode, orderId]);

  // State for order data
  const [order, setOrder] = useState<SupplierOrderDoc>({
    poNumber: '',
    date: new Date().toISOString().split('T')[0],
    supplierName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    tel1: '',
    tel2: '',
    email: '',
    lineItems: [
      {
        id: crypto.randomUUID(),
        item: '1',
        description: '',
        brand: '',
        quantity: 1
      }
    ]
  });

  // Track original brand values when selected from dropdown
  const [originalBrandValues, setOriginalBrandValues] = useState<Partial<SupplierOrderDoc> | null>(null);
  
  // Track if vendor info has been modified
  const [isVendorInfoModified, setIsVendorInfoModified] = useState(false);

  // Handle edit mode from location state
  useEffect(() => {
    if (location.state?.editOrder) {
      const editOrder = location.state.editOrder;
      setIsEditMode(true);
      setOriginalOrderId(editOrder.orderId);
      
      // Load the existing order data
      const loadExistingOrder = async () => {
        try {
          setIsLoadingOrder(true);
          
          const { data: orderData, error } = await supabase
            .from('orders')
            .select(`
              *,
              suppliers (*),
              orders_line_items (*)
            `)
            .eq('id', editOrder.orderId)
            .single();
            
          if (error) throw error;
          
          // Pre-fill form with existing data
          setOrder({
            poNumber: orderData.order_number || '',
            date: orderData.order_date || new Date().toISOString().split('T')[0],
            supplierName: orderData.suppliers?.display_name || '',
            address: orderData.suppliers?.address_line1 || '',
            city: orderData.suppliers?.city || '',
            state: orderData.suppliers?.state || '',
            zip: orderData.suppliers?.postal_code || '',
            tel1: orderData.suppliers?.phone_primary || '',
            tel2: '', // Not used anymore
            email: orderData.suppliers?.email || '',
            lineItems: (orderData.orders_line_items || []).map((item: any, index: number) => ({
              id: item.id || crypto.randomUUID(),
              item: (index + 1).toString(),
              description: item.description || '',
              brand: item.brand || '',
              quantity: Number(item.quantity) || 1
            }))
          });
          
        } catch (error) {
          console.error('Error loading order for editing:', error);
          setOrderLoadError('Failed to load order for editing');
        } finally {
          setIsLoadingOrder(false);
        }
      };
      
      loadExistingOrder();
    }
  }, [location.state]);
  
  // Add a new line item
  const handleAddLineItem = () => {
    setOrder(prev => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          id: crypto.randomUUID(),
          item: (prev.lineItems.length + 1).toString(),
          description: '',
          brand: '',
          quantity: 1
        }
      ]
    }));
  };
  
  // Remove a line item
  const handleRemoveLineItem = (idToRemove: string) => {
    setOrder(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== idToRemove)
    }));
  };
  
  // Update a line item
  const handleLineItemChange = (id: string, field: keyof SupplierOrderLineItem, value: any) => {
    setOrder(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };
  
  // Handle order field changes
  const handleOrderChange = (field: keyof SupplierOrderDoc, value: any) => {
    setOrder(prev => {
      const updated = {
        ...prev,
        [field]: value
      };

      // Check if vendor info fields have been modified
      const vendorFields = ['supplierName', 'address', 'city', 'state', 'zip', 'tel1', 'tel2', 'email'];
      if (vendorFields.includes(field) && originalBrandValues) {
        // Check if any vendor field has changed from original
        const hasChanges = vendorFields.some(f => {
          const current = updated[f as keyof SupplierOrderDoc];
          const original = originalBrandValues[f as keyof SupplierOrderDoc];
          const currentStr = String(current || '').trim();
          const originalStr = String(original || '').trim();
          return currentStr !== originalStr;
        });
        
        console.log(`Field "${field}" changed to "${value}". Has changes: ${hasChanges}`);
        setIsVendorInfoModified(hasChanges);
      }

      return updated;
    });
  };

  // Helper function to check if a field has been modified
  const isFieldModified = (field: string): boolean => {
    if (!originalBrandValues) return false;
    const current = String(order[field as keyof SupplierOrderDoc] || '').trim();
    const original = String(originalBrandValues[field as keyof SupplierOrderDoc] || '').trim();
    return current !== original;
  };
  const handleBrandSelect = (brandOrString: Brand | string) => {
    // If it's a Brand object (from BrandDropdown with returnFullBrand=true)
    if (typeof brandOrString === 'object' && brandOrString !== null) {
      const brand = brandOrString as Brand;
      
      console.log('🔍 Brand selected:', brand);
      
      // Extract phone number - keep full number in tel1
      let tel1 = '';
      
      if (brand.phonePrimary) {
        // Store full phone number as-is
        tel1 = brand.phonePrimary;
      } else if (brand.phoneSecondary) {
        // Fallback to secondary if primary doesn't exist
        tel1 = brand.phoneSecondary;
      }
      
      // Store original brand values for change detection
      const brandValues = {
        supplierName: brand.name,
        address: brand.addressLine1 || '',
        city: brand.city || '',
        state: brand.state || '',
        zip: brand.postalCode || '',
        tel1: tel1,
        tel2: '', // Keep tel2 empty for backwards compatibility with SupplierOrderDoc
        email: brand.email || ''
      };
      
      console.log('📋 Brand values to set:', brandValues);
      
      setOriginalBrandValues(brandValues);
      setIsVendorInfoModified(false); // Reset modification flag
      
      setOrder(prev => ({
        ...prev,
        ...brandValues,
        // Also auto-fill brand in first line item
        lineItems: prev.lineItems.map((item, idx) => 
          idx === 0 ? { ...item, brand: brand.name } : item
        )
      }));
    } else if (typeof brandOrString === 'string') {
      // If it's just a brand name string (new brand), just set the name
      setOrder(prev => ({
        ...prev,
        supplierName: brandOrString,
        // Also auto-fill brand in first line item
        lineItems: prev.lineItems.map((item, idx) => 
          idx === 0 ? { ...item, brand: brandOrString } : item
        )
      }));
      setOriginalBrandValues(null); // No original values for new brand
      setIsVendorInfoModified(false);
    }
  };
  
  // Save order to Supabase
  const saveOrder = async () => {
    try {
      setIsSavingOrder(true);

      // Find or create brand and get its ID for supplier_id
      let supplierId = null;
      let shouldUpdateBrand = false;
      
      if (order.supplierName) {
        // Try to find existing brand
        const { data: existingBrand, error: findErr } = await supabase
          .from('brands')
          .select('*')  // Select all fields to check if they're empty
          .ilike('name', order.supplierName)
          .limit(1);

        if (findErr) throw findErr;

        if (existingBrand && existingBrand.length > 0) {
          supplierId = existingBrand[0].id;
          
          // Check if brand has empty/null fields and we have data in the form
          const brandHasEmptyFields = !existingBrand[0].address_line1 && !existingBrand[0].email && !existingBrand[0].phone_primary;
          const formHasData = order.address || order.email || order.tel1 || order.city || order.state || order.zip;
          
          // Update brand if it has empty fields and we have form data, OR if user modified vendor info
          if ((brandHasEmptyFields && formHasData) || isVendorInfoModified) {
            shouldUpdateBrand = true;
          }
        } else {
          // Brand doesn't exist - create it FIRST to get the ID
          console.log('Creating new brand:', order.supplierName);
          
          const phonePrimary = order.tel1 || null;
          
          const brandData: any = {
            name: order.supplierName,
            user_id: currentProfile?.id || 'default',
            email: order.email || null,
            phone_primary: phonePrimary,
            address_line1: order.address || null,
            city: order.city || null,
            state: order.state || null,
            postal_code: order.zip || null
          };

          const { data: newBrand, error: createErr } = await supabase
            .from('brands')
            .insert([brandData])
            .select('id')
            .single();

          if (createErr) throw createErr;
          supplierId = newBrand.id;
          console.log('New brand created with ID:', supplierId);
        }
      }

      // supplier_id is now guaranteed to have a value before we create the order
      if (!supplierId) {
        throw new Error('No supplier selected. Please select a vendor.');
      }

      // Upsert order
      const orderData: any = {
        order_number: order.poNumber,
        order_date: order.date,
        supplier_id: supplierId,
        status: 'pending',
        created_by: currentProfile?.name || 'Unknown Staff'
      };

      // Only include id if in edit mode (and it's a valid UUID)
      if (isEditMode && originalOrderId) {
        orderData.id = originalOrderId;
      }

      const { data: orderRow, error: orderErr } = await supabase
        .from('orders')
        .upsert(orderData)
        .select()
        .single();
      if (orderErr) throw orderErr;

      // Replace line items
      if (isEditMode) {
        await supabase.from('orders_line_items').delete().eq('order_id', orderRow.id);
      }
      
      const itemsPayload = order.lineItems.map((it, idx) => ({
        order_id: orderRow.id,
        line_index: idx,
        description: it.description,
        quantity: it.quantity,
        brand: it.brand || ''
      }));
      
      if (itemsPayload.length) {
        const { error: itemsErr } = await supabase.from('orders_line_items').insert(itemsPayload);
        if (itemsErr) throw itemsErr;
      }

      // Update brand info if needed
      try {
        if (order.supplierName && shouldUpdateBrand) {
          // First, fetch the brand to see its current user_id
          const { data: currentBrand } = await supabase
            .from('brands')
            .select('*')
            .eq('id', supplierId)
            .single();
          
          console.log('🔍 Current brand before update:', currentBrand);
          console.log('👤 Current user:', user);
          console.log('👤 Current profile:', currentProfile);
          
          // Update brand with form data
          const updateData: any = {
            address_line1: order.address || null,
            city: order.city || null,
            state: order.state || null,
            postal_code: order.zip || null,
            email: order.email || null,
            phone_primary: order.tel1 || null
          };

          console.log('🔄 Updating brand with ID:', supplierId, 'Type:', typeof supplierId, 'Data:', updateData);

          const { data: updateResult, error: updateErr, count } = await supabase
            .from('brands')
            .update(updateData)
            .eq('id', supplierId)
            .select();

          console.log('📊 Update result:', { data: updateResult, error: updateErr, count });

          if (updateErr) {
            console.error('❌ Error updating brand:', updateErr);
            throw updateErr;
          } else {
            console.log('✅ Brand updated successfully. Rows affected:', updateResult?.length || 0);
            if (!updateResult || updateResult.length === 0) {
              console.warn('⚠️ Warning: Update executed but no rows were affected. Brand ID may not exist or RLS policy is blocking the update.');
            }
          }
        }
      } catch (error) {
        console.error('Error in brand update section:', error);
        throw error; // Re-throw to see the error
      }

      // Also handle field-by-field updates if user modified specific fields
      try {
        if (order.supplierName && isVendorInfoModified && originalBrandValues && !shouldUpdateBrand) {
          // User modified vendor info - update only changed fields
          const { data: existingBrands, error: fetchErr } = await supabase
            .from('brands')
            .select('*')
            .ilike('name', order.supplierName)
            .limit(1);

          if (fetchErr) throw fetchErr;

          if (existingBrands && existingBrands.length > 0) {
            const existingBrand = existingBrands[0];
            const updateData: any = {};
            
            // Compare each field and only include changed ones
            if (order.supplierName !== originalBrandValues.supplierName) {
              updateData.name = order.supplierName;
            }
            if (order.address !== originalBrandValues.address) {
              updateData.address_line1 = order.address || null;
            }
            if (order.city !== originalBrandValues.city) {
              updateData.city = order.city || null;
            }
            if (order.state !== originalBrandValues.state) {
              updateData.state = order.state || null;
            }
            if (order.zip !== originalBrandValues.zip) {
              updateData.postal_code = order.zip || null;
            }
            if (order.email !== originalBrandValues.email) {
              updateData.email = order.email || null;
            }
            
            // Handle phone number - now it's just tel1 (full phone number)
            if (order.tel1 !== originalBrandValues.tel1) {
              updateData.phone_primary = order.tel1 || null;
            }
            
            // Only update if there are changes
            if (Object.keys(updateData).length > 0) {
              console.log('Updating vendor info for:', order.supplierName, 'Changes:', updateData);
              
              await supabase
                .from('brands')
                .update(updateData)
                .eq('id', existingBrand.id);
              
              console.log('Vendor updated successfully');
            } else {
              console.log('No changes detected for vendor:', order.supplierName);
            }
          } else {
            console.log('Vendor exists and no modifications detected:', order.supplierName);
          }
        }
      } catch (brandCreateError) {
        console.error('Error creating/updating brand:', brandCreateError);
        // Don't fail the entire save if brand creation/update fails
        // The order was saved successfully
      }

      return orderRow;
    } catch (error) {
      console.error('Error saving order:', error);
      throw error;
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Handle save order button click
  const handleSaveOrder = async () => {
    try {
      const savedOrder = await saveOrder();
      if (savedOrder) {
        if (isEditMode) {
          alert(`Order updated successfully!`);
        } else {
          alert('Order saved successfully');
        }
        // Navigate to orders list or close modal
        if (onClose) {
          onClose();
        } else {
          navigate('/orders');
        }
      }
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Failed to save order. Please try again.');
    }
  };

  // Handle close/back navigation
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/orders');
    }
  };

  // Check Gmail authentication
  if (!isGmailSignedIn) {
    if (isModal && onClose) {
      // In modal mode, call onClose to close the modal and show the error in parent
      onClose();
      return null;
    }
    
    return (
      <div className="fade-in pb-6">
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Gmail Connection Required</h3>
            <p className="text-gray-600 mb-6">
              Please connect to Gmail to access Supplier Order Generator. This page requires Gmail integration to create and manage supplier orders.
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
  
  return (
    <BrandProvider>
      <ItemsProvider>
        <div className={isModal ? 'p-6' : 'fade-in pb-6'}>
      {!isModal && (
        <div className="flex items-center mb-4">
          <button 
            onClick={handleClose}
            className="mr-4 p-2 rounded-full hover:bg-gray-200 no-print"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold text-gray-800 no-print">
            {isEditMode ? 'Edit Supplier Order' : 'Create Vendor Order'}
          </h1>
          {isEditMode && (
            <span className="ml-4 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full no-print">
              Edit Mode - Order#{order.poNumber}
            </span>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoadingOrder && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading order data...</span>
        </div>
      )}

      {/* Error State */}
      {orderLoadError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex">
            <div className="text-red-400">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading order</h3>
              <p className="text-sm text-red-700 mt-1">{orderLoadError}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Order Generator Form with Preview */}
      {!isLoadingOrder && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left side - Form controls */}
        <div className="space-y-4 hide-on-print">
        {/* Order Details */}
        <CollapsibleSection title="Order Details" defaultExpanded={false}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
              <input
                type="text"
                className={`w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                value={order.poNumber}
                onChange={(e) => handleOrderChange('poNumber', e.target.value)}
                placeholder="Enter order number"
                disabled={isEditMode}
                title={isEditMode ? "Order Number cannot be changed when editing to maintain order grouping" : ""}
              />
              {isEditMode && (
                <p className="text-xs text-gray-500 mt-1">
                  Order Number is locked to maintain order grouping
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={order.date}
                onChange={(e) => handleOrderChange('date', e.target.value)}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Supplier Information */}
        <CollapsibleSection title="Vendor Information" defaultExpanded={true}>
          {isVendorInfoModified && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md flex items-start gap-2">
              <AlertCircle size={18} className="text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-800">Vendor Information Modified</p>
                <p className="text-xs text-orange-700 mt-0.5">Changes to vendor information will be saved when you save this order.</p>
              </div>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
              <BrandDropdown
                value={order.supplierName}
                onChange={handleBrandSelect}
                returnFullBrand={true}
                className="text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={order.address}
                onChange={(e) => handleOrderChange('address', e.target.value)}
              />
              {isFieldModified('address') && (
                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                  <span className="text-orange-500">●</span> This field has been changed
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={order.city}
                  onChange={(e) => handleOrderChange('city', e.target.value)}
                />
                {isFieldModified('city') && (
                  <p className="text-xs text-orange-600 mt-1">Changed</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={order.state}
                  onChange={(e) => handleOrderChange('state', e.target.value)}
                />
                {isFieldModified('state') && (
                  <p className="text-xs text-orange-600 mt-1">Changed</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
                <input
                  type="text"
                  className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={order.zip}
                  onChange={(e) => handleOrderChange('zip', e.target.value)}
                />
                {isFieldModified('zip') && (
                  <p className="text-xs text-orange-600 mt-1">Changed</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={order.tel1}
                onChange={(e) => handleOrderChange('tel1', e.target.value)}
              />
              {isFieldModified('tel1') && (
                <p className="text-xs text-orange-600 mt-1">Changed</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={order.email}
                onChange={(e) => handleOrderChange('email', e.target.value)}
              />
              {isFieldModified('email') && (
                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                  <span className="text-orange-500">●</span> This field has been changed
                </p>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* Line Items */}
        <CollapsibleSection title="Line Items" defaultExpanded={true}>
          <div className="space-y-3">
            {order.lineItems.map((item) => (
              <div key={item.id} className="p-3 border border-gray-200 rounded-md bg-gray-50">
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
                    <input
                      type="text"
                      className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      value={item.item}
                      onChange={(e) => handleLineItemChange(item.id, 'item', e.target.value)}
                    />
                  </div>
                  
                  <div className="col-span-6">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <ItemsDropdown
                      value={item.description}
                      onChange={(desc) => handleLineItemChange(item.id, 'description', desc)}
                    />
                  </div>
                  
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Vendor</label>
                    <BrandDropdown
                      value={item.brand || ''}
                      onChange={(brand) => handleLineItemChange(item.id, 'brand', brand)}
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Qty</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="col-span-1 flex justify-end">
                    {order.lineItems.length > 1 && (
                      <button
                        onClick={() => handleRemoveLineItem(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            <button
              onClick={handleAddLineItem}
              className="w-full py-2 px-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors flex items-center justify-center"
            >
              <Plus size={16} className="mr-1" />
              Add Item
            </button>
          </div>
        </CollapsibleSection>

                 {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleSaveOrder}
              disabled={isSavingOrder}
              className="flex-1 px-4 py-2 bg-gray-600 rounded-md text-white font-medium hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center"
            >
              {isSavingOrder ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  {isEditMode ? 'Update Order' : 'Save Order'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right side - Order Preview */}
        <div className="lg:sticky lg:top-4 flex justify-center">
          <div className="bg-gray-50 rounded-lg p-4 w-full max-w-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-3">Vendor Order Preview</h3>
            </div>
            
            <div className="invoice-preview-wrapper flex justify-center">
              <SupplierOrderPrintView 
                order={order} 
                innerRef={orderDocumentRef} 
              />
            </div>
            </div>
          </div>
        </div>
        )}
      </div>
      </ItemsProvider>
    </BrandProvider>
  );
}

export default SupplierOrderGenerator;
