"use client";

import { File, Trash, X, FileText, Image as ImageIcon, FileSpreadsheet, MousePointerClick } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { GoogleDriveService } from "@/services/googleDriveService";
import { useAuth } from "@/contexts/AuthContext";

interface FileWithMetadata {
  file: File;
  eta: string;
  etd: string;
  container: string;
  previewUrl?: string;
}

interface ShipmentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: () => void;
}

export function ShipmentUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
}: ShipmentUploadModalProps) {
  const { user } = useAuth();
  const [reference, setReference] = useState("");
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileWithMetadata | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [hoveredFileIndex, setHoveredFileIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  
  // Shipment-level metadata (for the folder)
  const [shipmentEtd, setShipmentEtd] = useState("");
  const [shipmentEta, setShipmentEta] = useState("");
  const [shipmentContainer, setShipmentContainer] = useState("");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const newFiles: FileWithMetadata[] = acceptedFiles.map((file) => {
        // Generate preview URL for supported file types
        let previewUrl: string | undefined;
        if (file.type.startsWith('image/')) {
          previewUrl = URL.createObjectURL(file);
        } else if (file.type === 'application/pdf') {
          previewUrl = URL.createObjectURL(file);
        }
        
        return {
          file,
          eta: "",
          etd: "",
          container: "",
          previewUrl,
        };
      });
      setFiles((prev) => [...prev, ...newFiles]);
    },
  });

  // Cleanup preview URLs only when component unmounts
  useEffect(() => {
    return () => {
      files.forEach(fileWithMeta => {
        if (fileWithMeta.previewUrl) {
          URL.revokeObjectURL(fileWithMeta.previewUrl);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run cleanup on unmount

  const handleRemoveFile = (index: number) => {
    const fileToRemove = files[index];
    if (fileToRemove.previewUrl) {
      URL.revokeObjectURL(fileToRemove.previewUrl);
    }
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  // COMMENTED OUT - Per-file metadata no longer used (using folder-level metadata instead)
  /*
  const handleUpdateFileMetadata = (
    index: number,
    field: keyof Omit<FileWithMetadata, "file" | "previewUrl">,
    value: string
  ) => {
    setFiles((prevFiles) =>
      prevFiles.map((f, i) =>
        i === index ? { ...f, [field]: value } : f
      )
    );
  };
  */

  const handlePreviewClick = (fileWithMeta: FileWithMetadata) => {
    setPreviewFile(fileWithMeta);
    setPreviewModalOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewModalOpen(false);
    setPreviewFile(null);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return ImageIcon;
    } else if (file.type === 'application/pdf') {
      return FileText;
    } else if (file.type.includes('sheet') || file.type.includes('excel')) {
      return FileSpreadsheet;
    }
    return File;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reference.trim()) {
      setError("Reference is required");
      return;
    }

    if (files.length === 0) {
      setError("Please select at least one file to upload");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // First, create the shipment with the reference
      const { createShipment } = await import("@/services/backendApi");
      
      // Use shipment-level metadata (folder-level, not per-file)
      const newShipment = await createShipment({
        ref: reference.trim(),
        eta: shipmentEta || "",
        etd: shipmentEtd || "",
        container_n: shipmentContainer || "",
        user_id: user?.id, // Add user_id for RLS
      });

      console.log("Created shipment:", newShipment);

      // Initialize progress tracking
      setUploadProgress({ current: 0, total: files.length });

      // Pre-initialize Google Drive and create folder BEFORE parallel uploads
      console.log("🔧 Pre-initializing Google Drive service...");
      await GoogleDriveService.initialize();
      
      // Create the folder structure once
      console.log("📁 Pre-creating shipment folder...");
      // Upload first file to create folder (this ensures folder exists)
      if (files.length > 0) {
        console.log(`📤 Uploading file 1/${files.length} (creates folder): ${files[0].file.name}`);
        await GoogleDriveService.uploadFile(files[0].file, newShipment.id, undefined);
        setUploadProgress({ current: 1, total: files.length });
      }

      // Upload remaining files in parallel (folder now exists)
      if (files.length > 1) {
        console.log(`📤 Uploading remaining ${files.length - 1} file(s) in parallel...`);
        
        let completedCount = 1; // First file already uploaded
        
        const uploadPromises = files.slice(1).map(async (fileWithMeta) => {
          try {
            await GoogleDriveService.uploadFile(fileWithMeta.file, newShipment.id, undefined);
            completedCount++;
            setUploadProgress({ current: completedCount, total: files.length });
            console.log(`✅ Uploaded file ${completedCount}/${files.length}: ${fileWithMeta.file.name}`);
          } catch (uploadErr) {
            console.error(`❌ Error uploading file ${fileWithMeta.file.name}:`, uploadErr);
          }
        });

        await Promise.all(uploadPromises);
      }

      console.log(`✅ Successfully uploaded ${files.length} file(s)`);
      setUploadProgress(null);

      // Reset form
      setReference("");
      setFiles([]);
      setShipmentEtd("");
      setShipmentEta("");
      setShipmentContainer("");
      
      // Notify parent component
      onUploadComplete?.();
      
      // Close modal
      onClose();
    } catch (err) {
      console.error("Error uploading files:", err);
      setError(err instanceof Error ? err.message : "Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setReference("");
    setFiles([]);
    setShipmentEtd("");
    setShipmentEta("");
    setShipmentContainer("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <Card className="mx-4">
          <CardHeader className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              onClick={handleCancel}
              disabled={uploading}
            >
              <X className="h-5 w-5" />
            </Button>
            <CardTitle>Upload Shipment Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Reference Field */}
                <div>
                  <Label htmlFor="reference" className="font-medium">
                    Reference <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    id="reference"
                    name="reference"
                    className="mt-2"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    disabled={uploading}
                    required
                  />
                </div>

                {/* Shipment Metadata Fields (Folder-level) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="shipment-etd" className="font-medium">
                      ETD
                    </Label>
                    <Input
                      type="date"
                      id="shipment-etd"
                      value={shipmentEtd}
                      onChange={(e) => setShipmentEtd(e.target.value)}
                      className="mt-2"
                      disabled={uploading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shipment-eta" className="font-medium">
                      ETA
                    </Label>
                    <Input
                      type="date"
                      id="shipment-eta"
                      value={shipmentEta}
                      onChange={(e) => setShipmentEta(e.target.value)}
                      className="mt-2"
                      disabled={uploading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shipment-container" className="font-medium">
                      Container
                    </Label>
                    <Input
                      type="text"
                      id="shipment-container"
                      value={shipmentContainer}
                      onChange={(e) => setShipmentContainer(e.target.value)}
                      className="mt-2"
                      disabled={uploading}
                    />
                  </div>
                </div>

                {/* File Upload Area */}
                <div>
                  <Label htmlFor="file-upload" className="font-medium">
                    File(s) upload
                  </Label>
                  <div
                    {...getRootProps()}
                    className={cn(
                      isDragActive
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border",
                      "mt-2 flex justify-center rounded-md border border-dashed px-6 py-20 transition-colors duration-200 cursor-pointer"
                    )}
                  >
                    <div>
                      <File
                        className="mx-auto h-12 w-12 text-muted-foreground/80"
                        aria-hidden={true}
                      />
                      <div className="mt-4 flex text-muted-foreground">
                        <p>Drag and drop or</p>
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-sm pl-1 font-medium text-primary hover:text-primary/80 hover:underline hover:underline-offset-4"
                        >
                          <span>choose file(s)</span>
                          <input
                            {...getInputProps()}
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            disabled={uploading}
                          />
                        </label>
                        <p className="pl-1">to upload</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Files List with Metadata */}
                {files.length > 0 && (
                  <>
                    <h4 className="font-medium text-foreground">
                      Files to upload ({files.length})
                    </h4>
                    <div className="space-y-4">
                      {files.map((fileWithMeta, index) => (
                        <Card key={`${fileWithMeta.file.name}-${index}`} className="relative">
                          <div className="absolute right-2 top-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Remove file"
                              onClick={() => handleRemoveFile(index)}
                              disabled={uploading}
                            >
                              <Trash className="h-5 w-5" aria-hidden={true} />
                            </Button>
                          </div>
                          <CardContent className="p-2 pr-12">
                            {/* File Info */}
                            <div className="flex items-center space-x-3">
                              {/* Thumbnail Preview with Hover */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => handlePreviewClick(fileWithMeta)}
                                  onMouseEnter={() => setHoveredFileIndex(index)}
                                  onMouseLeave={() => setHoveredFileIndex(null)}
                                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted hover:bg-muted/80 transition-colors overflow-hidden cursor-pointer border-2 border-transparent hover:border-primary"
                                  title="Click to preview"
                                >
                                  {fileWithMeta.previewUrl && fileWithMeta.file.type.startsWith('image/') ? (
                                    <img
                                      src={fileWithMeta.previewUrl}
                                      alt={fileWithMeta.file.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : fileWithMeta.previewUrl && fileWithMeta.file.type === 'application/pdf' ? (
                                    <MousePointerClick className="h-8 w-8 text-grey-500" aria-hidden={true} />
                                  ) : (
                                    React.createElement(getFileIcon(fileWithMeta.file), {
                                      className: "h-8 w-8 text-foreground",
                                      "aria-hidden": true
                                    })
                                  )}
                                </button>

                                {/* Hover Preview Popup - Simplified approach */}
                                {hoveredFileIndex === index && fileWithMeta.previewUrl && (
                                  <div className="absolute left-20 top-10 z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                                    <div className="rounded-lg border-2 border-primary bg-white shadow-2xl overflow-hidden">
                                      {fileWithMeta.file.type.startsWith('image/') ? (
                                        <img
                                          src={fileWithMeta.previewUrl}
                                          alt={fileWithMeta.file.name}
                                          className="w-[300px] h-auto max-h-[400px] object-contain"
                                        />
                                      ) : fileWithMeta.file.type === 'application/pdf' ? (
                                        <div className="w-[300px] h-[400px] bg-white">
                                          <iframe
                                            src={`${fileWithMeta.previewUrl}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                                            title={fileWithMeta.file.name}
                                            className="w-full h-full border-0"
                                            style={{ pointerEvents: 'none' }}
                                          />
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground truncate">
                                  {fileWithMeta.file.name}
                                </p>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                  {(fileWithMeta.file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>

                            {/* Per-File Metadata Fields - COMMENTED OUT (Using folder-level metadata instead) */}
                            {/* 
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t">
                              <div>
                                <Label htmlFor={`etd-${index}`} className="text-xs text-muted-foreground">
                                  ETD (Optional)
                                </Label>
                                <Input
                                  type="date"
                                  id={`etd-${index}`}
                                  value={fileWithMeta.etd}
                                  onChange={(e) =>
                                    handleUpdateFileMetadata(index, "etd", e.target.value)
                                  }
                                  className="mt-1 h-8 text-sm"
                                  disabled={uploading}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`eta-${index}`} className="text-xs text-muted-foreground">
                                  ETA (Optional)
                                </Label>
                                <Input
                                  type="date"
                                  id={`eta-${index}`}
                                  value={fileWithMeta.eta}
                                  onChange={(e) =>
                                    handleUpdateFileMetadata(index, "eta", e.target.value)
                                  }
                                  className="mt-1 h-8 text-sm"
                                  disabled={uploading}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`container-${index}`} className="text-xs text-muted-foreground">
                                  Container (Optional)
                                </Label>
                                <Input
                                  type="text"
                                  id={`container-${index}`}
                                  placeholder="e.g., ABC123"
                                  value={fileWithMeta.container}
                                  onChange={(e) =>
                                    handleUpdateFileMetadata(index, "container", e.target.value)
                                  }
                                  className="mt-1 h-8 text-sm"
                                  disabled={uploading}
                                />
                              </div>
                            </div>
                            */}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}

                {/* Error Message */}
                {error && (
                  <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 border border-red-200">
                    {error}
                  </div>
                )}

                {/* Upload Progress */}
                {uploadProgress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        Uploading files...
                      </span>
                      <span className="text-muted-foreground">
                        {uploadProgress.current} / {uploadProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      {uploadProgress.current === 0 ? "Preparing..." : 
                       uploadProgress.current === uploadProgress.total ? "Finishing up..." : 
                       "Please wait..."}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={uploading || !reference.trim() || files.length === 0}
                  >
                    {uploading ? `Uploading ${uploadProgress ? `(${uploadProgress.current}/${uploadProgress.total})` : '...'}` : "Upload"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Preview Modal */}
      {previewModalOpen && previewFile && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleClosePreview}
        >
          <div className="relative max-h-[90vh] max-w-[90vw] w-full h-full flex items-center justify-center p-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={handleClosePreview}
            >
              <X className="h-6 w-6" />
            </Button>
            
            <div 
              className="relative bg-white rounded-lg shadow-2xl max-h-full max-w-full overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {previewFile.file.type.startsWith('image/') && previewFile.previewUrl ? (
                <img
                  src={previewFile.previewUrl}
                  alt={previewFile.file.name}
                  className="max-h-[85vh] max-w-full object-contain"
                />
              ) : previewFile.file.type === 'application/pdf' && previewFile.previewUrl ? (
                <iframe
                  src={previewFile.previewUrl}
                  title={previewFile.file.name}
                  className="w-[90vw] h-[85vh]"
                />
              ) : (
                <div className="p-8 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    {React.createElement(getFileIcon(previewFile.file), {
                      className: "h-16 w-16 text-muted-foreground",
                      "aria-hidden": true
                    })}
                    <div>
                      <p className="font-medium text-foreground">{previewFile.file.name}</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Preview not available for this file type
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(previewFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
