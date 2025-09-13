import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Image, Film, FileSpreadsheet, AlertCircle, Loader2 } from 'lucide-react';
import { ShipmentDocument } from '../../types';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ShipmentDocument;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && document) {
      loadDocumentPreview();
    }
  }, [isOpen, document]);

  const loadDocumentPreview = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // For Google Drive files, we can use the direct preview URL
      if (document.drive_file_id) {
        // Google Drive preview URL format
        const drivePreviewUrl = `https://drive.google.com/file/d/${document.drive_file_id}/preview`;
        setPreviewUrl(drivePreviewUrl);
      } else {
        setError('No preview available for this document');
      }
    } catch (err) {
      console.error('Error loading document preview:', err);
      setError('Failed to load document preview');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.includes('image')) {
      return <Image className="w-5 h-5" />;
    } else if (fileType?.includes('video')) {
      return <Film className="w-5 h-5" />;
    } else if (fileType?.includes('spreadsheet') || fileType?.includes('excel')) {
      return <FileSpreadsheet className="w-5 h-5" />;
    } else {
      return <FileText className="w-5 h-5" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownload = () => {
    if (document.drive_file_url) {
      // Create a download link using the Google Drive export URL
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${document.drive_file_id}`;
      const link = window.document.createElement('a');
      link.href = downloadUrl;
      link.download = document.file_name;
      link.target = '_blank';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            {getFileIcon(document.file_type || '')}
            <div className="ml-3">
              <h2 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                {document.file_name}
              </h2>
              <p className="text-sm text-gray-500">
                {formatFileSize(document.file_size)} • {document.file_type || 'Unknown type'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
              title="Download"
            >
              <Download size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 p-6 overflow-auto" style={{ height: 'calc(90vh - 120px)' }}>
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Loading preview...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Download Instead
                </button>
              </div>
            </div>
          )}

          {!loading && !error && previewUrl && (
            <div className="w-full h-full">
              <iframe
                src={previewUrl}
                className="w-full h-full border-0 rounded-md"
                title={`Preview of ${document.file_name}`}
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setError('Failed to load document preview');
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              Uploaded by {document.uploaded_by} • {new Date(document.uploaded_at).toLocaleDateString()}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleDownload}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Download
              </button>
              <button
                onClick={onClose}
                className="text-gray-600 hover:text-gray-800 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
