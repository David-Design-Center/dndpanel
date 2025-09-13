import React, { useState } from 'react';
import { FileText, Image, Film, FileSpreadsheet, Eye, Download, Trash2 } from 'lucide-react';
import { ShipmentDocument } from '../../types';
import { DocumentPreviewModal } from './document-preview-modal';
import { GoogleDriveService } from '../../services/googleDriveService';

interface DocumentsListProps {
  documents: ShipmentDocument[];
  onDocumentDeleted?: () => void;
  className?: string;
}

export const DocumentsList: React.FC<DocumentsListProps> = ({
  documents,
  onDocumentDeleted,
  className = ''
}) => {
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ShipmentDocument | null>(null);
  const [deletingDocuments, setDeletingDocuments] = useState<Set<string>>(new Set());

  const getFileIcon = (fileType: string) => {
    if (fileType?.includes('image')) {
      return <Image className="w-4 h-4 text-blue-500" />;
    } else if (fileType?.includes('video')) {
      return <Film className="w-4 h-4 text-purple-500" />;
    } else if (fileType?.includes('spreadsheet') || fileType?.includes('excel')) {
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
      onDocumentDeleted?.();
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

  if (documents.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p>No documents uploaded</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center flex-1 min-w-0">
              {getFileIcon(doc.file_type || '')}
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {doc.file_name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(doc.file_size)} • {new Date(doc.uploaded_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePreview(doc)}
                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md"
                title="Preview"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDownload(doc)}
                className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(doc)}
                disabled={deletingDocuments.has(doc.id)}
                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-md disabled:opacity-50"
                title="Delete"
              >
                {deletingDocuments.has(doc.id) ? (
                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

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
