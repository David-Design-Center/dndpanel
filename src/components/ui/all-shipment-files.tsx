import React, { useState, useEffect } from 'react';
import { FileText, Eye, Download, Trash2, MoreHorizontal, Plus } from 'lucide-react';
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

interface DocumentCardProps {
  doc: ShipmentDocument & { shipment_ref?: string };
  onPreview: (doc: ShipmentDocument) => void;
  onDownload: (doc: ShipmentDocument) => void;
  onDelete: (doc: ShipmentDocument) => void;
  isDeleting: boolean;
  isSelected: boolean;
  onSelect: (documentId: string, selected: boolean) => void;
  isAdmin: boolean; // Admin status for permission control
  onAssignNew?: (doc: ShipmentDocument) => void; // open create shipment prefilled with this doc
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  doc,
  onPreview,
  onDownload,
  onDelete,
  isDeleting,
  isSelected,
  onSelect,
  isAdmin,
  onAssignNew
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(prev => !prev);
  };

  const handleCardClick = () => {
    onPreview(doc);
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setMenuOpen(false);
  };


  const baseAssigned = 'bg-green-200 hover:bg-green-100 border-green-300';
  const baseUnassigned = 'bg-yellow-200 hover:bg-yellow-100 border-yellow-300';
  const selectionHighlight = isSelected && isAdmin ? 'ring-2 ring-blue-300' : '';
  const cardColor = doc.shipment_id === null ? baseUnassigned : baseAssigned;

  return (
    <div
      className={`relative border rounded-lg p-3 transition-colors cursor-pointer ${cardColor} ${selectionHighlight}`}
      onClick={handleCardClick}
    >
      {/* Top Row: Checkbox + filename + menu */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
          {isAdmin && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(doc.id, e.target.checked)}
              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <p className="text-sm font-medium text-gray-900 truncate" title={doc.file_name}>
            {doc.file_name}
          </p>
        </div>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
            onClick={toggleMenu}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1 text-sm">
              <button
                className="flex w-full items-center px-3 py-2 hover:bg-gray-100 text-gray-700"
                onClick={(e) => handleAction(e, () => onPreview(doc))}
              >
                <Eye className="w-3 h-3 mr-2" /> Preview
              </button>
              <button
                className="flex w-full items-center px-3 py-2 hover:bg-gray-100 text-gray-700"
                onClick={(e) => handleAction(e, () => onDownload(doc))}
              >
                <Download className="w-3 h-3 mr-2" /> Download
              </button>
              {doc.shipment_id === null && isAdmin && onAssignNew && (
                <button
                  className="flex w-full items-center px-3 py-2 hover:bg-gray-100 text-gray-700"
                  onClick={(e) => handleAction(e, () => onAssignNew(doc))}
                >
                  <Plus className="w-3 h-3 mr-2" /> Assign
                </button>
              )}
              {isAdmin && (
                <button
                  className="flex w-full items-center px-3 py-2 hover:bg-red-50 text-red-600 disabled:opacity-50"
                  onClick={(e) => handleAction(e, () => onDelete(doc))}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <div className="w-3 h-3 mr-2 border border-red-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3 mr-2" />
                  )}
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* File Info */}
      <div className="text-xs text-gray-1000">
        <div>{new Date(doc.uploaded_at).toLocaleDateString()}</div>
      </div>
    </div>
  );
};

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
      setSelectedDocuments(new Set(allDocuments.map(doc => doc.id)));
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

  // Group documents by status
  const assignedDocuments = allDocuments.filter(doc => doc.shipment_id !== null);
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
              <span>{assignedDocuments.length} assigned</span>
              <span>{unassignedDocuments.length} unassigned</span>
            </div>

            {/* Select All - only for admin & when documents exist */}
            {allDocuments.length > 0 && isAdmin && (
              <div className="flex items-center text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={selectedDocuments.size === allDocuments.length && allDocuments.length > 0}
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

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {allDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No documents found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Unassigned Documents Section */}
              {unassignedDocuments.length > 0 && (
                <div>
                  <div className="flex items-center mb-2"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                    {unassignedDocuments.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc as ShipmentDocument & { shipment_ref?: string }}
                        onPreview={handlePreview}
                        onDownload={handleDownload}
                        onDelete={handleDelete}
                        isDeleting={deletingDocuments.has(doc.id)}
                        isSelected={selectedDocuments.has(doc.id)}
                        onSelect={handleSelectDocument}
                        isAdmin={isAdmin}
                        onAssignNew={handleAssignNewShipment}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Assigned Documents Section */}
              {assignedDocuments.length > 0 && (
                <div>
                  <div className="flex items-center">
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {assignedDocuments.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc as ShipmentDocument & { shipment_ref?: string }}
                        onPreview={handlePreview}
                        onDownload={handleDownload}
                        onDelete={handleDelete}
                        isDeleting={deletingDocuments.has(doc.id)}
                        isSelected={selectedDocuments.has(doc.id)}
                        onSelect={handleSelectDocument}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
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
