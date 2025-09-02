import { useState, useEffect } from 'react';
import { X, FileText, Download, Calendar, Package, Truck, Edit2, Save, AlertTriangle, Trash2 } from 'lucide-react';
import { Shipment } from '../../types';
import { ShipmentDocument, GoogleDriveService } from '../../services/googleDriveService';
import { supabase } from '../../lib/supabase';

interface ShipmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: Shipment | null;
  documents: ShipmentDocument[];
  onUpdate?: (updatedShipment: Shipment) => void;
  onDocumentsUpdate?: () => void;
}

export function ShipmentDetailsModal({ isOpen, onClose, shipment, documents, onUpdate, onDocumentsUpdate }: ShipmentDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedShipment, setEditedShipment] = useState<Shipment | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  useEffect(() => {
    if (shipment) {
      setEditedShipment({ ...shipment });
    }
  }, [shipment]);

  const handleSave = async () => {
    if (!editedShipment) return;

    try {
      setSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('shipments')
        .update({
          ref: editedShipment.ref,
          status: editedShipment.status,
          pod: editedShipment.pod,
          vendor: editedShipment.vendor,
          po: editedShipment.po,
          pkg: editedShipment.pkg,
          kg: editedShipment.kg,
          vol: editedShipment.vol,
          pickup_date: editedShipment.pickup_date,
          note: editedShipment.note,
          updated_at: new Date().toISOString()
        })
        .eq('id', editedShipment.id);

      if (updateError) throw updateError;

      // Call the onUpdate callback if provided
      if (onUpdate) {
        onUpdate(editedShipment);
      }

      setIsEditing(false);
    } catch (err: any) {
      console.error('Error updating shipment:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedShipment(shipment ? { ...shipment } : null);
    setIsEditing(false);
    setError(null);
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!shipment) return;
    
    const confirmDelete = window.confirm('Are you sure you want to delete this document? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      setDeletingDocumentId(documentId);
      setError(null);

      await GoogleDriveService.deleteDocument(documentId, shipment.id);
      
      // Call the documents update callback to refresh the documents list
      if (onDocumentsUpdate) {
        onDocumentsUpdate();
      }
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setError(`Failed to delete document: ${err.message}`);
    } finally {
      setDeletingDocumentId(null);
    }
  };

  if (!isOpen || !shipment) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getStatusColorClass = (status: string) => {
    status = status.toLowerCase();
    if (status.includes('delivered') || status.includes('shipped')) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (status.includes('transit') || status.includes('pending')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (status.includes('delay') || status.includes('cancelled')) {
      return 'bg-red-100 text-red-800 border-red-200';
    } else {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDocumentClick = (document: ShipmentDocument) => {
    if (document.drive_file_url) {
      window.open(document.drive_file_url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Truck className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? 'Edit Shipment' : 'Shipment Details'}
              </h2>
              <p className="text-sm text-gray-500">Reference: {shipment.ref}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 flex items-center"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shipment Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Shipment Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedShipment?.ref || ''}
                        onChange={(e) => setEditedShipment(prev => prev ? { ...prev, ref: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 font-mono bg-gray-50 px-3 py-2 rounded">{shipment.ref}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedShipment?.status || ''}
                        onChange={(e) => setEditedShipment(prev => prev ? { ...prev, status: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColorClass(shipment.status)}`}>
                        {shipment.status}
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Port of Discharge</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedShipment?.pod || ''}
                        onChange={(e) => setEditedShipment(prev => prev ? { ...prev, pod: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{shipment.pod || 'N/A'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Consignee</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedShipment?.consignee || ''}
                        onChange={(e) => setEditedShipment(prev => prev ? { ...prev, consignee: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{shipment.consignee || 'N/A'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedShipment?.vendor || ''}
                        onChange={(e) => setEditedShipment(prev => prev ? { ...prev, vendor: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{shipment.vendor || 'N/A'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Order</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedShipment?.po || ''}
                        onChange={(e) => setEditedShipment(prev => prev ? { ...prev, po: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 font-mono">{shipment.po || 'N/A'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Packages</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedShipment?.pkg || 0}
                        onChange={(e) => setEditedShipment(prev => prev ? { ...prev, pkg: parseInt(e.target.value) || 0 } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{shipment.pkg?.toLocaleString() || '0'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (KG)</label>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editedShipment?.kg || 0}
                        onChange={(e) => setEditedShipment(prev => prev ? { ...prev, kg: parseFloat(e.target.value) || 0 } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{shipment.kg?.toLocaleString() || '0'} kg</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Volume</label>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editedShipment?.vol || 0}
                        onChange={(e) => setEditedShipment(prev => prev ? { ...prev, vol: parseFloat(e.target.value) || 0 } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{shipment.vol?.toLocaleString() || '0'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Pickup Date
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editedShipment?.pickup_date || ''}
                        onChange={(e) => setEditedShipment(prev => prev ? { ...prev, pickup_date: e.target.value || null } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{formatDate(shipment.pickup_date)}</p>
                    )}
                  </div>
                </div>
                
                {shipment.note && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    {isEditing ? (
                      <textarea
                        value={editedShipment?.note || ''}
                        onChange={(e) => setEditedShipment(prev => prev ? { ...prev, note: e.target.value } : null)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter notes..."
                      />
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{shipment.note}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Documents Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Documents ({documents.length})
              </h3>
              
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div 
                        className="flex items-center min-w-0 flex-1 cursor-pointer"
                        onClick={() => handleDocumentClick(document)}
                      >
                        <FileText className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {document.file_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {document.file_size ? `${(document.file_size / 1024 / 1024).toFixed(2)} MB` : ''} 
                            {document.uploaded_at && ` • ${formatDate(document.uploaded_at)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                        {!isEditing ? (
                          <Download className="w-4 h-4 text-gray-400" />
                        ) : (
                          <>
                            <button
                              onClick={() => handleDocumentClick(document)}
                              className="p-1 text-blue-600 hover:text-blue-800 rounded"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDocument(document.id);
                              }}
                              disabled={deletingDocumentId === document.id}
                              className="p-1 text-red-600 hover:text-red-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete Document"
                            >
                              {deletingDocumentId === document.id ? (
                                <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No documents uploaded yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
