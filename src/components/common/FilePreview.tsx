import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Image, Film, Music, Archive, File } from 'lucide-react';
import { getAttachmentDownloadUrl } from '../../services/emailService';

interface FilePreviewProps {
  attachment: {
    name: string;
    mimeType: string;
    size: number;
    attachmentId?: string;
    partId?: string;
  };
  emailId: string;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({
  attachment,
  emailId,
  isOpen,
  onClose,
  onDownload
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      loadPreview();
    } else {
      // Clean up preview URL when modal closes
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  }, [isOpen, attachment.attachmentId]);

  const loadPreview = async () => {
    if (!attachment.attachmentId) {
      setError('No attachment ID available');
      return;
    }

    setLoading(true);
    try {
      // For images, PDFs, and text files, we can create a preview
      if (canPreview(attachment.mimeType)) {
        const url = await getAttachmentDownloadUrl(
          emailId,
          attachment.attachmentId,
          attachment.name,
          attachment.mimeType
        );
        setPreviewUrl(url);
      } else {
        setError('Preview not available for this file type');
      }
    } catch (err) {
      console.error('Error loading preview:', err);
      setError('Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const canPreview = (mimeType: string): boolean => {
    return (
      mimeType.startsWith('image/') ||
      mimeType === 'application/pdf' ||
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/xml' ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('document') ||
      mimeType.includes('presentation')
    );
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-6 h-6" />;
    if (mimeType === 'application/pdf') return <FileText className="w-6 h-6" />;
    if (mimeType.startsWith('video/')) return <Film className="w-6 h-6" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-6 h-6" />;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return <Archive className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-gray-500">
          <div className="text-gray-400 mb-4">
            {getFileIcon(attachment.mimeType)}
          </div>
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-2">File type: {attachment.mimeType}</p>
        </div>
      );
    }

    if (!previewUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-gray-500">
          <div className="text-gray-400 mb-4">
            {getFileIcon(attachment.mimeType)}
          </div>
          <p className="text-sm">Preview not available</p>
        </div>
      );
    }

    // Handle different file types
    if (attachment.mimeType.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center min-h-96 bg-gray-50">
          <img
            src={previewUrl}
            alt={attachment.name}
            className="max-w-full max-h-96 object-contain"
            onError={() => setError('Failed to load image')}
          />
        </div>
      );
    }

    if (attachment.mimeType === 'application/pdf') {
      return (
        <div className="h-96">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title={attachment.name}
            onError={() => setError('Failed to load PDF')}
          />
        </div>
      );
    }

    if (attachment.mimeType.startsWith('text/') || 
        attachment.mimeType === 'application/json' || 
        attachment.mimeType === 'application/xml') {
      return (
        <div className="h-96 bg-gray-50 p-4 overflow-auto">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0 bg-white"
            title={attachment.name}
            onError={() => setError('Failed to load text file')}
          />
        </div>
      );
    }

    // For Office documents, we can try to use Office Online viewer
    if (attachment.mimeType.includes('spreadsheet') || 
        attachment.mimeType.includes('document') || 
        attachment.mimeType.includes('presentation') ||
        attachment.mimeType.includes('excel') ||
        attachment.mimeType.includes('word') ||
        attachment.mimeType.includes('powerpoint')) {
      
      // Microsoft Office Online viewer
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`;
      
      return (
        <div className="h-96">
          <iframe
            src={officeViewerUrl}
            className="w-full h-full border-0"
            title={attachment.name}
            onError={() => setError('Preview not available for this document type')}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <div className="text-gray-400 mb-4">
          {getFileIcon(attachment.mimeType)}
        </div>
        <p className="text-sm">Preview not supported for this file type</p>
        <p className="text-xs mt-2">{attachment.mimeType}</p>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="text-gray-600">
                {getFileIcon(attachment.mimeType)}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {attachment.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {(attachment.size / 1024).toFixed(1)} KB • {attachment.mimeType}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download size={16} className="mr-2" />
                  Download
                </button>
              )}
              
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center w-8 h-8 text-gray-400 bg-transparent hover:text-gray-500 focus:outline-none focus:text-gray-500 transition ease-in-out duration-150"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Preview Content */}
          <div className="mt-4">
            {renderPreview()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePreview;
