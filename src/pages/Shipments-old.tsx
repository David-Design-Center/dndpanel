import { useState, useEffect } from 'react';
import { Package, RefreshCw, Truck, Calendar, Box, Info, FileText, Upload, Download, Trash2, Plus } from 'lucide-react';
import { Shipment } from '../types';
import { fetchShipments, createShipment } from '../services/backendApi';
import { GoogleDriveService, ShipmentDocument } from '../services/googleDriveService';
import { UploadDocumentsModal } from '../components/ui/upload-documents-modal';
import { AddShipmentModal } from '../components/ui/add-shipment-modal';
import CollapsibleSection from '../components/common/CollapsibleSection';
import { useProfile } from '../contexts/ProfileContext';

function Shipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shipmentDocuments, setShipmentDocuments] = useState<Record<number, ShipmentDocument[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [addShipmentModalOpen, setAddShipmentModalOpen] = useState(false);
  const [selectedShipmentForUpload, setSelectedShipmentForUpload] = useState<{ id: number; containerNumber: string } | null>(null);
  
  const { currentProfile } = useProfile();

  // Fetch shipments and documents on component mount
  useEffect(() => {
    fetchShipmentData();
  }, []);

  // Function to fetch shipments
  const fetchShipmentData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      if (forceRefresh) {
        setRefreshing(true);
      }
      
      const data = await fetchShipments(forceRefresh);
      setShipments(data);
      
      // Fetch documents for each shipment
      for (const shipment of data) {
        fetchShipmentDocumentsData(shipment.id);
      }
    } catch (error) {
      console.error('Error fetching shipments:', error);
      setError('Failed to load shipments. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to fetch shipment-specific documents
  const fetchShipmentDocumentsData = async (shipmentId: number) => {
    try {
      console.log(`🔍 Fetching documents for shipment ${shipmentId}...`);
      const data = await GoogleDriveService.getShipmentDocuments(shipmentId);
      console.log(`📋 Retrieved ${data.length} documents for shipment ${shipmentId}:`, data);
      
      setShipmentDocuments(prev => ({
        ...prev,
        [shipmentId]: data
      }));
      
      console.log(`✅ Updated state for shipment ${shipmentId}`);
    } catch (error) {
      console.error('Error fetching shipment documents:', error);
    }
  };

  // Handle opening upload modal
  const handleUploadClick = (shipmentId: number, containerNumber: string) => {
    setSelectedShipmentForUpload({ id: shipmentId, containerNumber });
    setUploadModalOpen(true);
  };

  // Handle upload completion
  const handleUploadComplete = async () => {
    if (selectedShipmentForUpload) {
      console.log(`🔄 Upload completed for shipment ${selectedShipmentForUpload.id}, refreshing...`);
      
      // Small delay to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh documents for this specific shipment
      await fetchShipmentDocumentsData(selectedShipmentForUpload.id);
      
      // Also refresh all shipments data to ensure consistency
      await fetchShipmentData(true);
    }
  };

  // Handle document deletion
  const handleDeleteDocument = async (documentId: string, shipmentId: number) => {
    if (!currentProfile?.id) {
      console.error('User must be logged in to delete documents');
      return;
    }
    
    try {
      await GoogleDriveService.deleteDocument(documentId, shipmentId);
      // Refresh the documents for this shipment
      fetchShipmentDocumentsData(shipmentId);
    } catch (error) {
      console.error('Error deleting document:', error);
      // You could add a toast notification here
    }
  };

  // Handle refresh button click
  const handleRefresh = () => {
    fetchShipmentData(true);
  };

  // Handle creating a new shipment
  const handleCreateShipment = async (shipmentData: {
    ref: string;
    consignee: string;
    shipper: string;
    vessel_carrier: string;
    etd: string;
    eta: string;
    container_n: string;
    description_of_goods: string;
    shipping_status: string;
  }) => {
    try {
      console.log('Creating new shipment:', shipmentData);
      const newShipment = await createShipment(shipmentData);
      console.log('Successfully created shipment:', newShipment);
      
      // Refresh the shipments list to include the new shipment
      await fetchShipmentData(true);
      
      // Close the modal
      setAddShipmentModalOpen(false);
    } catch (error) {
      console.error('Error creating shipment:', error);
      // You could add a toast notification here
      throw error; // Re-throw to let the modal handle the error
    }
  };

  // Group shipments by container number instead of shipper
  const groupedShipments = shipments.reduce<Record<string, Shipment>>((acc, shipment) => {
    const containerKey = shipment.container_n || `unknown-${shipment.id}`;
    acc[containerKey] = shipment;
    return acc;
  }, {});

  // Format date strings for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    
    // Try to parse the date string
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // If not a valid date format, return as is
        return dateStr;
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      // Return the original string if parsing fails
      return dateStr;
    }
  };

  // Format the uploaded_at date
  const formatUploadedAt = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Get color class for shipping status
  const getStatusColorClass = (status: string) => {
    status = status.toLowerCase();
    if (status.includes('delivered') || status.includes('completed')) {
      return 'bg-green-100 text-green-800';
    } else if (status.includes('transit') || status.includes('shipping')) {
      return 'bg-blue-100 text-blue-800';
    } else if (status.includes('delay') || status.includes('issue')) {
      return 'bg-red-100 text-red-800';
    } else if (status.includes('customs') || status.includes('processing')) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  // Get file type icon based on file extension
  const getFileTypeIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (extension === 'pdf') {
      return <FileText className="w-4 h-4 text-red-500" />;
    } else if (['doc', 'docx'].includes(extension || '')) {
      return <FileText className="w-4 h-4 text-blue-500" />;
    } else if (['xls', 'xlsx'].includes(extension || '')) {
      return <FileText className="w-4 h-4 text-green-500" />;
    } else {
      return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="fade-in pb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="mr-3 p-2 bg-blue-100 rounded-full">
            <Truck className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-800">Shipment Tracking</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAddShipmentModalOpen(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus size={18} className="mr-2" />
            Add Shipment
          </button>
          <button
            onClick={handleRefresh}
            className="btn btn-secondary flex items-center"
            disabled={refreshing}
          >
            <RefreshCw size={18} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          <p className="flex items-center">
            <Info size={16} className="mr-2" />
            {error}
          </p>
        </div>
      )}
      
      {loading && !refreshing ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : shipments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-700 mb-2">No Shipments Found</h2>
          <p className="text-gray-500 mb-4">
            There are no shipments in the system yet. New shipments will appear here once they are added.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Shipments grouped by container */}
          {Object.entries(groupedShipments).map(([containerNumber, shipment]) => (
            <CollapsibleSection
              key={containerNumber}
              title={
                <div className="flex items-center justify-between w-full">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Box className="w-5 h-5 text-blue-500 mr-3" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">
                            Container {containerNumber === `unknown-${shipment.id}` ? 'N/A' : containerNumber}
                          </h3>
                          <div className="flex items-center space-x-6 mt-1">
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="w-4 h-4 mr-1" />
                              <span>ETD: {formatDate(shipment.etd)}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="w-4 h-4 mr-1" />
                              <span>ETA: {formatDate(shipment.eta)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-500">{shipment.shipper}</span>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColorClass(shipment.shipping_status)}`}>
                          {shipment.shipping_status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              }
              defaultExpanded={false}
              className="bg-white"
            >
              <div className="mt-4">
                {/* Shipment details */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div>
                    <h5 className="text-xs text-gray-500 uppercase mb-1">Consignee</h5>
                    <p className="text-sm font-medium">{shipment.consignee}</p>
                  </div>
                  <div>
                    <h5 className="text-xs text-gray-500 uppercase mb-1">Vessel/Carrier</h5>
                    <p className="text-sm font-medium">{shipment.vessel_carrier}</p>
                  </div>
                  <div>
                    <h5 className="text-xs text-gray-500 uppercase mb-1">Reference</h5>
                    <p className="text-sm font-medium">{shipment.ref || `Shipment #${shipment.id}`}</p>
                  </div>
                  <div className="md:col-span-2 lg:col-span-3">
                    <h5 className="text-xs text-gray-500 uppercase mb-1">Goods Description</h5>
                    <p className="text-sm font-medium">{shipment.description_of_goods}</p>
                  </div>
                </div>

                {/* Container-specific documents section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-blue-600 mr-2" />
                      <h4 className="text-base font-medium">Container Documents</h4>
                    </div>
                    <button
                      onClick={() => handleUploadClick(shipment.id, containerNumber === `unknown-${shipment.id}` ? 'N/A' : containerNumber)}
                      className="btn btn-secondary btn-sm flex items-center"
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Upload
                    </button>
                  </div>
                  
                  {/* Display uploaded documents */}
                  {shipmentDocuments[shipment.id] && shipmentDocuments[shipment.id].length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {shipmentDocuments[shipment.id].map(doc => (
                        <div
                          key={doc.id}
                          className="flex items-start p-3 border border-gray-200 rounded-lg bg-white"
                        >
                          <div className="mr-3 p-2 bg-gray-100 rounded">
                            {getFileTypeIcon(doc.file_name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate text-sm">
                              {doc.file_name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatUploadedAt(doc.uploaded_at)}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <a
                                href={doc.drive_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                              >
                                <Download className="w-3 h-3 mr-1" />
                                View/Download
                              </a>
                              <button
                                onClick={() => handleDeleteDocument(doc.id, shipment.id)}
                                className="text-xs text-red-600 hover:text-red-800 flex items-center"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-white rounded-lg border border-gray-200">
                      <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No documents uploaded yet</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Click "Upload" to add bills of lading, customs forms, and other documents
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleSection>
          ))}
        </div>
      )}

      {/* Upload Documents Modal */}
      {selectedShipmentForUpload && (
        <UploadDocumentsModal
          isOpen={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false);
            setSelectedShipmentForUpload(null);
          }}
          shipmentId={selectedShipmentForUpload.id}
          containerNumber={selectedShipmentForUpload.containerNumber}
          onUploadComplete={handleUploadComplete}
        />
      )}
      
      {/* Add Shipment Modal */}
      <AddShipmentModal
        isOpen={addShipmentModalOpen}
        onClose={() => setAddShipmentModalOpen(false)}
        onSubmit={handleCreateShipment}
      />
    </div>
  );
}

export default Shipments;