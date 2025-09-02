import React, { useState } from 'react';
import { X, Package, AlertCircle } from 'lucide-react';

export interface NewShipmentData {
  ref: string;
  status: string;
  pod: string;
  consignee: string;
  vendor: string;
  po: string;
  pkg: number;
  kg: number;
  vol: number;
  pickup_date: string;
  note: string;
}

interface AddShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewShipmentData) => Promise<void>;
}

export const AddShipmentModal: React.FC<AddShipmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<NewShipmentData>({
    ref: '',
    status: 'PENDING',
    pod: '',
    consignee: '',
    vendor: '',
    po: '',
    pkg: 0,
    kg: 0,
    vol: 0,
    pickup_date: '',
    note: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusOptions = [
    'PENDING',
    'SHIPPED', 
    'IN_TRANSIT',
    'DELIVERED',
    'DELAYED',
    'CANCELLED'
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.ref.trim()) {
      newErrors.ref = 'Reference is required';
    }

    if (!formData.pod.trim()) {
      newErrors.pod = 'Port of Delivery is required';
    }

    if (!formData.consignee.trim()) {
      newErrors.consignee = 'Consignee is required';
    }

    if (!formData.vendor.trim()) {
      newErrors.vendor = 'Vendor is required';
    }

    if (!formData.po.trim()) {
      newErrors.po = 'Purchase Order is required';
    }

    if (formData.pkg <= 0) {
      newErrors.pkg = 'Packages must be greater than 0';
    }

    if (formData.kg <= 0) {
      newErrors.kg = 'Weight must be greater than 0';
    }

    if (formData.vol <= 0) {
      newErrors.vol = 'Volume must be greater than 0';
    }

    if (!formData.pickup_date.trim()) {
      newErrors.pickup_date = 'Pickup date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({
        ref: '',
        status: 'PENDING',
        pod: '',
        consignee: '',
        vendor: '',
        po: '',
        pkg: 0,
        kg: 0,
        vol: 0,
        pickup_date: '',
        note: ''
      });
      setErrors({});
    } catch (error) {
      console.error('Error submitting shipment:', error);
      setErrors({ submit: 'Failed to create shipment. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof NewShipmentData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Package className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold">Add New Shipment</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {errors.submit && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference *
              </label>
              <input
                type="text"
                value={formData.ref}
                onChange={(e) => handleInputChange('ref', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.ref ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter reference number"
                disabled={isSubmitting}
              />
              {errors.ref && <p className="mt-1 text-xs text-red-600">{errors.ref}</p>}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Port of Delivery */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Port of Delivery *
              </label>
              <input
                type="text"
                value={formData.pod}
                onChange={(e) => handleInputChange('pod', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.pod ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., NEW YORK"
                disabled={isSubmitting}
              />
              {errors.pod && <p className="mt-1 text-xs text-red-600">{errors.pod}</p>}
            </div>

            {/* Consignee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consignee *
              </label>
              <input
                type="text"
                value={formData.consignee}
                onChange={(e) => handleInputChange('consignee', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.consignee ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter consignee name"
                disabled={isSubmitting}
              />
              {errors.consignee && <p className="mt-1 text-xs text-red-600">{errors.consignee}</p>}
            </div>

            {/* Vendor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor *
              </label>
              <input
                type="text"
                value={formData.vendor}
                onChange={(e) => handleInputChange('vendor', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.vendor ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter vendor name"
                disabled={isSubmitting}
              />
              {errors.vendor && <p className="mt-1 text-xs text-red-600">{errors.vendor}</p>}
            </div>

            {/* Purchase Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Order *
              </label>
              <input
                type="text"
                value={formData.po}
                onChange={(e) => handleInputChange('po', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.po ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter PO number"
                disabled={isSubmitting}
              />
              {errors.po && <p className="mt-1 text-xs text-red-600">{errors.po}</p>}
            </div>

            {/* Packages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Packages (PKG) *
              </label>
              <input
                type="number"
                min="1"
                value={formData.pkg}
                onChange={(e) => handleInputChange('pkg', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.pkg ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter number of packages"
                disabled={isSubmitting}
              />
              {errors.pkg && <p className="mt-1 text-xs text-red-600">{errors.pkg}</p>}
            </div>

            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (KG) *
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={formData.kg}
                onChange={(e) => handleInputChange('kg', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.kg ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter weight in kg"
                disabled={isSubmitting}
              />
              {errors.kg && <p className="mt-1 text-xs text-red-600">{errors.kg}</p>}
            </div>

            {/* Volume */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volume (VOL) *
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={formData.vol}
                onChange={(e) => handleInputChange('vol', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.vol ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter volume"
                disabled={isSubmitting}
              />
              {errors.vol && <p className="mt-1 text-xs text-red-600">{errors.vol}</p>}
            </div>

            {/* Pickup Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Date *
              </label>
              <input
                type="date"
                value={formData.pickup_date}
                onChange={(e) => handleInputChange('pickup_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.pickup_date ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
              {errors.pickup_date && <p className="mt-1 text-xs text-red-600">{errors.pickup_date}</p>}
            </div>
          </div>

          {/* Notes - Full Width */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => handleInputChange('note', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter any additional notes or comments"
              disabled={isSubmitting}
            />
          </div>
        </form>

        <div className="border-t px-6 py-4 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn btn-primary flex items-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Package size={16} className="mr-2" />
                Create Shipment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
