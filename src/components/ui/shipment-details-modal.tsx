import { useState, useEffect } from 'react';
import { X, FileText, Package, Edit2, Save, AlertTriangle } from 'lucide-react';
import { Shipment, ShipmentDocument } from '../../types';
import { DocumentsList } from './documents-list';
import { useAuth } from '../../contexts/AuthContext';
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
  
  // Admin check
  const { isAdmin } = useAuth();

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
          etd: editedShipment.etd || null,
          eta: editedShipment.eta || null,
          container_n: editedShipment.container_n || null,
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

  if (!isOpen || !shipment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
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
              /* Only show Edit button for admin users */
              isAdmin && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 flex items-center"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </button>
              )
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
                
                <div className="space-y-4">
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ETD</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editedShipment?.etd || ''}
                          onChange={(e) => setEditedShipment(prev => prev ? { ...prev, etd: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                          {shipment.etd ? new Date(shipment.etd).toLocaleDateString() : 'N/A'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ETA</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editedShipment?.eta || ''}
                          onChange={(e) => setEditedShipment(prev => prev ? { ...prev, eta: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                          {shipment.eta ? new Date(shipment.eta).toLocaleDateString() : 'N/A'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Container</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedShipment?.container_n || ''}
                          onChange={(e) => setEditedShipment(prev => prev ? { ...prev, container_n: e.target.value } : null)}
                          placeholder="e.g., ABC123"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                          {shipment.container_n || 'N/A'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Documents ({documents.length})
              </h3>
              
              <DocumentsList
                documents={documents}
                onDocumentDeleted={onDocumentsUpdate}
                isAdmin={isAdmin}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
