import { useState, useEffect } from 'react';
import { Package, RefreshCw, Truck, Plus, Upload, FileText, ArrowUpDown } from 'lucide-react';
import { Shipment } from '../types';
import { fetchShipments, createShipment, importShipments } from '../services/backendApi';
import { GoogleDriveService, ShipmentDocument } from '../services/googleDriveService';
import { UploadDocumentsModal } from '../components/ui/upload-documents-modal';
import { AddShipmentModal } from '../components/ui/add-shipment-modal-new';
import { CsvImportModal } from '../components/ui/csv-import-modal';

function Shipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shipmentDocuments, setShipmentDocuments] = useState<Record<number, ShipmentDocument[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [addShipmentModalOpen, setAddShipmentModalOpen] = useState(false);
  const [csvImportModalOpen, setCsvImportModalOpen] = useState(false);
  const [selectedShipments, setSelectedShipments] = useState<Set<number>>(new Set());
  const [selectedShipmentForUpload, setSelectedShipmentForUpload] = useState<{ id: number; containerNumber: string } | null>(null);

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
  const handleUploadClick = (shipmentId: number, ref: string) => {
    setSelectedShipmentForUpload({ id: shipmentId, containerNumber: ref });
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

  // Handle refresh button click
  const handleRefresh = () => {
    fetchShipmentData(true);
  };

  // Handle creating a new shipment
  const handleCreateShipment = async (shipmentData: {
    ref: string;
    status: string;
    pod: string;
    consignee: string;
    vendor: string;
    po: string;
    pkg: number;
    kg: number;
    vol: number;
    pickup_date: string;
    note: string;
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
      // Re-throw to let the modal handle the error
      throw error;
    }
  };

  // Handle CSV import
  const handleCsvImport = async (csvData: any[]) => {
    try {
      console.log('Importing CSV data:', csvData);
      await importShipments(csvData);
      console.log('Successfully imported CSV data');
      
      // Refresh the shipments list
      await fetchShipmentData(true);
      
      // Close the modal
      setCsvImportModalOpen(false);
    } catch (error) {
      console.error('Error importing CSV:', error);
      throw error;
    }
  };

  // Handle checkbox selection
  const handleSelectShipment = (shipmentId: number) => {
    const newSelected = new Set(selectedShipments);
    if (newSelected.has(shipmentId)) {
      newSelected.delete(shipmentId);
    } else {
      newSelected.add(shipmentId);
    }
    setSelectedShipments(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedShipments.size === shipments.length) {
      setSelectedShipments(new Set());
    } else {
      setSelectedShipments(new Set(shipments.map(s => s.id)));
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
            <Package size={16} className="mr-2" />
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
            There are no shipments in the system yet. Add a new shipment or import from CSV.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedShipments.size === shipments.length && shipments.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center cursor-pointer">
                      Ref
                      <ArrowUpDown className="w-3 h-3 ml-1" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedShipments.has(shipment.id)}
                        onChange={() => handleSelectShipment(shipment.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {shipment.ref}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleUploadClick(shipment.id, shipment.ref)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Upload Documents"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        {shipmentDocuments[shipment.id]?.length > 0 && (
                          <span className="text-green-600 flex items-center">
                            <FileText className="w-4 h-4" />
                            <span className="ml-1 text-xs">{shipmentDocuments[shipment.id].length}</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Footer with selected count */}
          {selectedShipments.size > 0 && (
            <div className="bg-gray-50 px-4 py-3 border-t">
              <p className="text-sm text-gray-700">
                {selectedShipments.size} of {shipments.length} shipment(s) selected
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Upload Documents Modal */}
      {uploadModalOpen && selectedShipmentForUpload && (
        <UploadDocumentsModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
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
      
      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={csvImportModalOpen}
        onClose={() => setCsvImportModalOpen(false)}
        onImport={handleCsvImport}
      />
    </div>
  );
}

export default Shipments;
