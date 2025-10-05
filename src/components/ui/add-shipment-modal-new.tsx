import React, { useState } from 'react';
import { X, Package, AlertCircle } from 'lucide-react';
import { FileUpload } from './file-upload';
import { supabase } from '../../lib/supabase';

export interface NewShipmentData {
  ref: string;
  eta: string;
  etd: string;
  container_n: string; // Match database column name
  documents?: File[]; // Add files array for uploads
  user_id?: string; // Ownership
}

interface AddShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewShipmentData) => Promise<void>;
  assigningDocumentId?: string | null; // If provided, we're creating shipment to attach existing doc
}

export const AddShipmentModal: React.FC<AddShipmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  assigningDocumentId
}) => {
  const [formData, setFormData] = useState<NewShipmentData>({
    ref: '',
    eta: '',
    etd: '',
    container_n: '',
    documents: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [assigningDocumentName, setAssigningDocumentName] = useState<string | null>(null);

  // Fetch existing document metadata if assigning an unassigned document
  React.useEffect(() => {
    let active = true;
    const loadDoc = async () => {
      if (!assigningDocumentId) {
        setAssigningDocumentName(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('id, file_name')
          .eq('id', assigningDocumentId)
          .single();
        if (error) {
          console.warn('Failed to load assigning document metadata', error);
          if (active) setAssigningDocumentName('(unknown file)');
        } else if (data && active) {
          setAssigningDocumentName(data.file_name || '(unnamed file)');
        }
      } catch (e) {
        console.warn('Unexpected error loading document metadata', e);
        if (active) setAssigningDocumentName('(error)');
      }
    };
    loadDoc();
    return () => { active = false; };
  }, [assigningDocumentId]);


  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.ref.trim()) {
      newErrors.ref = 'Reference is required';
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
      // Fetch current user for ownership
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        setErrors({ submit: 'Not authenticated. Please re-login.' });
        setIsSubmitting(false);
        return;
      }

      // Add files + user ownership to the form data before submission
      const submitData: NewShipmentData = {
        ...formData,
        // If we are assigning an existing document, don't include uploads
        documents: assigningDocumentId ? [] : selectedFiles,
        user_id: userId
      };

      await onSubmit(submitData);
      // Reset form on success
      setFormData({
        ref: '',
        eta: '',
        etd: '',
        container_n: '',
        documents: [],
        user_id: undefined
      });
      setSelectedFiles([]);
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

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files);
    setFormData(prev => ({
      ...prev,
      documents: files
    }));
    
    // Clear error when files are selected
    if (errors.documents) {
      setErrors(prev => ({
        ...prev,
        documents: ''
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Package className="w-6 h-6 text-red-500 mr-3" />
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

            {/* Container Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Container Number
              </label>
              <input
                type="text"
                value={formData.container_n}
                onChange={(e) => handleInputChange('container_n', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter container number"
                disabled={isSubmitting}
              />
            </div>

            {/* ETD (Estimated Time of Departure) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ETD
              </label>
              <input
                type="datetime-local"
                value={formData.etd}
                onChange={(e) => handleInputChange('etd', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>

            {/* ETA (Estimated Time of Arrival) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ETA
              </label>
              <input
                type="datetime-local"
                value={formData.eta}
                onChange={(e) => handleInputChange('eta', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>

            {/* Existing document notice OR upload field */}
            <div className="md:col-span-2">
              {assigningDocumentId ? (
                <div className="p-3 border rounded-md bg-blue-50 border-blue-200 text-sm text-blue-800">
                  <p className="truncate" title={assigningDocumentName || ''}>
                    {assigningDocumentName ? assigningDocumentName : 'Loading file name...'}
                  </p>
                </div>
              ) : (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Documents
                  </label>
                  <div className="space-y-2">
                    <FileUpload
                      onFileSelect={handleFileSelect}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      multiple={true}
                      maxSize={10}
                      disabled={isSubmitting}
                      className="w-full"
                    />
                    {selectedFiles.length > 0 && (
                      <div className="text-sm text-gray-600">
                      </div>
                    )}
                    {errors.documents && <p className="mt-1 text-xs text-red-600">{errors.documents}</p>}
                  </div>
                </>
              )}
            </div>
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
