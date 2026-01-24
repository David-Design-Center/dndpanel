import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';
import type { AttachmentPreview } from '../types';
import { PdfViewer } from '../../../common/PdfViewer';

interface AttachmentPreviewModalProps {
  attachment: AttachmentPreview | null;
  onClose: () => void;
}

/**
 * Fullscreen modal for previewing email attachments (images, PDFs, text files)
 */
export function AttachmentPreviewModal({ attachment, onClose }: AttachmentPreviewModalProps) {
  if (!attachment) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    link.click();
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[10000]"
      onClick={onClose}
    >
      <div
        className="relative max-w-7xl max-h-[90vh] w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-75 px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 text-white">
            <h3 className="text-sm font-medium truncate">{attachment.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors text-white"
              title="Download"
            >
              <Download size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors text-white"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg overflow-hidden mt-14 max-h-[calc(90vh-56px)]">
          {attachment.type.startsWith('image/') ? (
            <img
              src={attachment.url}
              alt={attachment.name}
              className="w-full h-full object-contain"
            />
          ) : attachment.type === 'application/pdf' ? (
            <PdfViewer
              url={attachment.url}
              className="h-[calc(90vh-56px)]"
            />
          ) : attachment.type.startsWith('text/') ? (
            <iframe
              src={attachment.url}
              className="w-full h-[calc(90vh-56px)]"
              title={attachment.name}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
              <p className="mb-4">Preview not available for this file type</p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
