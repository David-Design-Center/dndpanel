import React, { useState, useCallback } from 'react';
import { Upload, X, FileText, Image, Film, FileSpreadsheet, Trash2, Eye, Download, Plus } from 'lucide-react';
import { DocumentPreviewModal } from './document-preview-modal';
import { ShipmentDocument } from '../../types';

interface FilePoolItem extends File {
  id: string;
  preview?: string; // For image previews
}

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => Promise<void>;
  title?: string;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  title = "Bulk File Upload"
}) => {
  const [filePool, setFilePool] = useState<FilePoolItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<ShipmentDocument | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) {
      return <Image className="w-5 h-5 text-blue-500" />;
    } else if (fileType.includes('video')) {
      return <Film className="w-5 h-5 text-purple-500" />;
    } else if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
      return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    } else {
      return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const processFiles = useCallback((files: FileList | File[]) => {
    const newFiles: FilePoolItem[] = [];
    
    Array.from(files).forEach((file) => {
      const fileWithId: FilePoolItem = Object.assign(file, {
        id: `${file.name}-${Date.now()}-${Math.random()}`
      });

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          fileWithId.preview = e.target?.result as string;
          setFilePool(prev => prev.map(f => f.id === fileWithId.id ? fileWithId : f));
        };
        reader.readAsDataURL(file);
      }

      newFiles.push(fileWithId);
    });

    setFilePool(prev => [...prev, ...newFiles]);
    setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input value so same file can be selected again
    e.target.value = '';
  }, [processFiles]);

  const removeFile = (fileId: string) => {
    setFilePool(prev => prev.filter(f => f.id !== fileId));
  };

  const previewFile = (file: FilePoolItem) => {
    // Convert File to ShipmentDocument format for preview
    const documentForPreview: ShipmentDocument = {
      id: file.id,
      shipment_id: 0, // Not applicable for bulk upload
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      drive_file_id: '', // Not uploaded yet
      drive_file_url: file.preview || URL.createObjectURL(file),
      uploaded_by: 'current_user',
      uploaded_at: new Date().toISOString()
    };

    setSelectedFileForPreview(documentForPreview);
    setPreviewModalOpen(true);
  };

  const downloadFile = (file: FilePoolItem) => {
    const url = URL.createObjectURL(file);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = file.name;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (filePool.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await onUpload(filePool);
      setFilePool([]);
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
      setError(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFilePool([]);
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Upload className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500">
                Upload multiple files at once and manage them in the file pool
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-sm text-gray-500">
              Support for PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG files up to 10MB each
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* File Pool */}
          {filePool.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                File Pool ({filePool.length} files)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filePool.map((file) => (
                  <div
                    key={file.id}
                    className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    {/* File Preview */}
                    <div className="flex items-start space-x-3 mb-3">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="w-12 h-12 object-cover rounded border flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-white rounded border flex items-center justify-center flex-shrink-0">
                          {getFileIcon(file.type)}
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)} • {file.type.split('/')[1]?.toUpperCase() || 'Unknown'}
                        </p>
                      </div>
                    </div>

                    {/* File Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => previewFile(file)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 text-sm text-red-800 bg-red-100 border border-red-200 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {filePool.length > 0 && `${filePool.length} file(s) ready to upload`}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={filePool.length === 0 || uploading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center min-w-[100px]"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {filePool.length > 0 && `(${filePool.length})`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {selectedFileForPreview && (
        <DocumentPreviewModal
          isOpen={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setSelectedFileForPreview(null);
          }}
          document={selectedFileForPreview}
        />
      )}
    </div>
  );
};
