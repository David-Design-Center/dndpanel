import { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { FileUpload } from './file-upload';
import { GoogleDriveService } from '../../services/googleDriveService';
import { useProfile } from '../../contexts/ProfileContext';

interface UploadDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: number;
  containerNumber: string;
  onUploadComplete: () => void;
}

export function UploadDocumentsModal({
  isOpen,
  onClose,
  shipmentId,
  containerNumber,
  onUploadComplete
}: UploadDocumentsModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentProfile } = useProfile();

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files);
    setError(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Upload each file
      const uploadPromises = selectedFiles.map(file =>
        GoogleDriveService.uploadFile(file, shipmentId, currentProfile?.id)
      );

      await Promise.all(uploadPromises);

      // Reset state and close modal
      setSelectedFiles([]);
      onUploadComplete();
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
      setSelectedFiles([]);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2 text-blue-600" />
            Upload Documents
          </DialogTitle>
          <DialogDescription>
            Upload documents for container <strong>{containerNumber}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FileUpload
            onFileSelect={handleFileSelect}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            multiple={true}
            maxSize={10}
            disabled={uploading}
          />

          {error && (
            <div className="p-3 text-sm text-red-800 bg-red-100 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || uploading}
              className="min-w-[100px]"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
