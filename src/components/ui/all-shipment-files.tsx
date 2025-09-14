import React, { useState, useEffect } from 'react';
import { FileText, Image, Film, FileSpreadsheet, Eye, Download, Trash2, Package, FolderOpen, Paperclip } from 'lucide-react';
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
  doc: ShipmentDocument;
  onPreview: (doc: ShipmentDocument) => void;
  onDownload: (doc: ShipmentDocument) => void;
  onDelete: (doc: ShipmentDocument) => void;
  isDeleting: boolean;
  isSelected: boolean;
  onSelect: (documentId: string, selected: boolean) => void;
  isAdmin: boolean; // Admin status for permission control
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  doc,
  onPreview,
  onDownload,
  onDelete,
  isDeleting,
  isSelected,
  onSelect,
  isAdmin
}) => {
  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <FileText className="w-4 h-4 text-gray-500" />;
    
    if (fileType.includes('image')) {
      return <Image className="w-4 h-4 text-blue-500" />;
    } else if (fileType.includes('video')) {
      return <Film className="w-4 h-4 text-purple-500" />;
    } else if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
      return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
    } else {
      return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getDocumentStatus = (doc: ShipmentDocument) => {
    if (doc.shipment_id === null) {
      return {
        label: 'Unassigned',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Paperclip className="w-3 h-3" />
      };
    } else {
      return {
        label: `Shipment #${doc.shipment_id}`,
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: <Package className="w-3 h-3" />
      };
    }
  };

  const status = getDocumentStatus(doc);

  return (
    <div className={`border rounded-lg p-3 transition-colors ${isSelected && isAdmin ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'}`}>
      {/* Selection checkbox and File Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center flex-1 min-w-0">
          {/* Only show checkbox for admin users */}
          {isAdmin && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(doc.id, e.target.checked)}
              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          )}
          {getFileIcon(doc.file_type)}
          <div className="ml-2 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate" title={doc.file_name}>
              {doc.file_name}
            </p>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-2">
        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${status.className}`}>
          {status.icon}
          <span className="ml-1">{status.label}</span>
        </span>
      </div>

      {/* File Info */}
      <div className="text-xs text-gray-500 mb-3">
        <div>{formatFileSize(doc.file_size)}</div>
        <div>{new Date(doc.uploaded_at).toLocaleDateString()}</div>
        {doc.uploaded_by && <div>by {doc.uploaded_by}</div>}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1">
          <button
            onClick={() => onPreview(doc)}
            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
            title="Preview"
          >
            <Eye className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDownload(doc)}
            className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            title="Download"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>
        
        {/* Only show delete button for admin users */}
        {isAdmin && (
          <button
            onClick={() => onDelete(doc)}
            disabled={isDeleting}
            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded disabled:opacity-50"
            title="Delete"
          >
            {isDeleting ? (
              <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
          </button>
        )}
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
  const [allDocuments, setAllDocuments] = useState<ShipmentDocument[]>([]);
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
      setAllDocuments(documents);
      
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
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FolderOpen className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">All Shipment Files</h3>
            <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
              {allDocuments.length} files
            </span>
            {selectedDocuments.size > 0 && isAdmin && (
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                {selectedDocuments.size} selected
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* Bulk Actions - Only for admin */}
            {selectedDocuments.size > 0 && isAdmin && (
              <>
                <button
                  onClick={() => setSelectedDocuments(new Set())}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear Selection
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
              </>
            )}
            
            {/* Regular Actions */}
            <button
              onClick={fetchAllDocuments}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Package className="w-4 h-4 mr-1 text-green-600" />
              <span>{assignedDocuments.length} assigned</span>
            </div>
            <div className="flex items-center">
              <Paperclip className="w-4 h-4 mr-1 text-yellow-600" />
              <span>{unassignedDocuments.length} unassigned</span>
            </div>
          </div>
          
          {/* Select All Checkbox - Only for admin */}
          {allDocuments.length > 0 && isAdmin && (
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedDocuments.size === allDocuments.length && allDocuments.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Select All</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {allDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No documents found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Unassigned Documents Section */}
              {unassignedDocuments.length > 0 && (
                <div>
                  <div className="flex items-center mb-3">
                    <Paperclip className="w-4 h-4 text-yellow-600 mr-2" />
                    <h4 className="text-sm font-medium text-gray-900">
                      Unassigned Documents ({unassignedDocuments.length})
                    </h4>
                    <span className="ml-2 text-xs text-gray-500">
                      • Bulk uploaded files waiting for assignment
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                    {unassignedDocuments.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
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

              {/* Assigned Documents Section */}
              {assignedDocuments.length > 0 && (
                <div>
                  <div className="flex items-center mb-3">
                    <Package className="w-4 h-4 text-green-600 mr-2" />
                    <h4 className="text-sm font-medium text-gray-900">
                      Assigned Documents ({assignedDocuments.length})
                    </h4>
                    <span className="ml-2 text-xs text-gray-500">
                      • Documents linked to specific shipments
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {assignedDocuments.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
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
