import React, { useState, useEffect } from 'react';
import { FileText, Eye, Download, Trash2, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ShipmentDocument } from '../../types';
import { DocumentPreviewModal } from './document-preview-modal';
import { GoogleDriveService } from '../../services/googleDriveService';

interface AllShipmentFilesProps {
  onRefresh?: () => void;
  refreshTrigger?: number; // Add this to force refresh from parent
  isAdmin?: boolean; // Admin status for permission control
  className?: string;
}

export const AllShipmentFiles: React.FC<AllShipmentFilesProps> = ({
  onRefresh,
  refreshTrigger,
  isAdmin = false,
  className = ''
}) => {
  const [allDocuments, setAllDocuments] = useState<(ShipmentDocument & { shipment_ref?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ShipmentDocument | null>(null);
  const [deletingDocuments, setDeletingDocuments] = useState<Set<string>>(new Set());
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded

  useEffect(() => {
    fetchAllDocuments();
  }, []);

  // Watch for refresh trigger from parent
  useEffect(() => {
    if (refreshTrigger) {
      fetchAllDocuments();
    }
  }, [refreshTrigger]);

  const fetchAllDocuments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching all documents from AllShipmentFiles component...');
      const documents = await GoogleDriveService.getAllDocuments();
      console.log('📄 Fetched documents:', documents);
      // Build unique shipment ids (assigned)
      const assignedIds = Array.from(new Set(documents.filter(d => d.shipment_id !== null).map(d => d.shipment_id as number)));
      let refMap: Record<number, string> = {};
      if (assignedIds.length > 0) {
        try {
          const { data: shipmentRows, error: shipmentErr } = await supabase
            .from('shipments')
            .select('id, ref')
            .in('id', assignedIds);
          if (shipmentErr) {
            console.warn('Failed fetching shipment refs', shipmentErr);
          } else if (shipmentRows) {
            shipmentRows.forEach(r => { if (r.ref) refMap[r.id] = r.ref; });
          }
        } catch (e) {
          console.warn('Unexpected error fetching shipment refs', e);
        }
      }
      // Enrich documents with shipment_ref property
      const enriched = documents.map(d => ({
        ...d,
        shipment_ref: d.shipment_id !== null ? refMap[d.shipment_id as number] : undefined
      }));
      setAllDocuments(enriched);
      
      // Auto-expand if there are unassigned documents
      const unassigned = documents.filter(doc => doc.shipment_id === null);
      if (unassigned.length > 0 && !isExpanded) {
        setIsExpanded(true);
      }
    } catch (err) {
      console.error('Error fetching all documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (doc: ShipmentDocument) => {
    setSelectedDocument(doc);
    setPreviewModalOpen(true);
  };

  const handleDownload = (doc: ShipmentDocument) => {
    if (doc.drive_file_url) {
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`;
      const link = window.document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.file_name;
      link.target = '_blank';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    }
  };

  const handleDelete = async (doc: ShipmentDocument) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${doc.file_name}"?`);
    if (!confirmDelete) return;

    setDeletingDocuments(prev => new Set(prev).add(doc.id));

    try {
      await GoogleDriveService.deleteDocument(doc.id);
      await fetchAllDocuments(); // Refresh the list
      onRefresh?.(); // Notify parent to refresh
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    } finally {
      setDeletingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(doc.id);
        return newSet;
      });
    }
  };

  const handleSelectDocument = (documentId: string, selected: boolean) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(documentId);
      } else {
        newSet.delete(documentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedDocuments(new Set(unassignedDocuments.map(doc => doc.id)));
    } else {
      setSelectedDocuments(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedDocuments.size} selected document(s)? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    setBulkDeleting(true);

    try {
      const deletePromises = Array.from(selectedDocuments).map(documentId =>
        GoogleDriveService.deleteDocument(documentId)
      );

      await Promise.all(deletePromises);
      
      // Clear selections and refresh
      setSelectedDocuments(new Set());
      await fetchAllDocuments();
      onRefresh?.();
    } catch (error) {
      console.error('Error in bulk delete:', error);
      alert('Some documents failed to delete. Please try again.');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Only show unassigned documents
  const unassignedDocuments = allDocuments.filter(doc => doc.shipment_id === null);

  // State for assigning a document to a brand new shipment

  const handleAssignNewShipment = (doc: ShipmentDocument) => {
    window.dispatchEvent(new CustomEvent('open-add-shipment-with-doc', { detail: { documentId: doc.id } }));
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading documents...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={fetchAllDocuments}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header (title + summary stats + actions all in one row) */}
      <div className="border-b border-gray-300 p-4">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Title & selection count */}
          <div className="flex items-center">
            <h3 className="text-lg font-medium text-gray-900">Shipment Files</h3>
            {selectedDocuments.size > 0 && isAdmin && (
              <span className="">
              </span>
            )}
          </div>

          {/* Right: Stats + (optional) select all + bulk actions */}
          <div className="flex items-center space-x-6">
            {/* Summary Stats */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{unassignedDocuments.length} unassigned</span>
            </div>

            {/* Select All - only for admin & when documents exist */}
            {unassignedDocuments.length > 0 && isAdmin && (
              <div className="flex items-center text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={selectedDocuments.size === unassignedDocuments.length && unassignedDocuments.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Select All</span>
              </div>
            )}

            {/* Bulk Actions - Only for admin */}
            {selectedDocuments.size > 0 && isAdmin && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedDocuments(new Set())}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center disabled:opacity-50"
                >
                  {bulkDeleting ? (
                    <>
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete ({selectedDocuments.size})
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content - Table */}
      {isExpanded && (
        <div className="overflow-x-auto">
          {unassignedDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No unassigned documents found</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {isAdmin && (
                    <th className="w-8 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.size === unassignedDocuments.length && unassignedDocuments.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocuments(new Set(unassignedDocuments.map(doc => doc.id)));
                          } else {
                            setSelectedDocuments(new Set());
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="w-32 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {unassignedDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    {isAdmin && (
                      <td className="w-8 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedDocuments.has(doc.id)}
                          onChange={(e) => handleSelectDocument(doc.id, e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                        <span className="truncate" title={doc.file_name}>{doc.file_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </td>
                    <td className="w-32 px-4 py-3">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handlePreview(doc)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="text-gray-600 hover:text-gray-800 p-1"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleAssignNewShipment(doc)}
                              className="text-green-600 hover:text-green-800 p-1"
                              title="Assign to Shipment"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(doc)}
                              disabled={deletingDocuments.has(doc.id)}
                              className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
                              title="Delete"
                            >
                              {deletingDocuments.has(doc.id) ? (
                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedDocument && (
        <DocumentPreviewModal
          isOpen={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setSelectedDocument(null);
          }}
          document={selectedDocument}
        />
      )}
    </div>
  );
};
