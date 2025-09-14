import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Package, RefreshCw, Truck, Plus, Upload, FileText, ArrowUpDown, Settings, Download, Trash2, FileSpreadsheet, AlertCircle, Eye } from 'lucide-react';
import { Shipment, ShipmentDocument } from '../types';
import { fetchShipments, createShipment, importShipments } from '../services/backendApi';
import { GoogleDriveService } from '../services/googleDriveService';
import { UploadDocumentsModal } from '../components/ui/upload-documents-modal';
import { AddShipmentModal } from '../components/ui/add-shipment-modal-new';
import { CsvImportModal } from '../components/ui/csv-import-modal';
import { ShipmentDetailsModal } from '../components/ui/shipment-details-modal';
import { ColumnManagerModal } from '../components/ui/column-manager-modal';
import { DocumentPreviewModal } from '../components/ui/document-preview-modal';
import { BulkUploadModal } from '../components/ui/bulk-upload-modal';
import { AllShipmentFiles } from '../components/ui/all-shipment-files';
import { supabase } from '../lib/supabase';

function Shipments() {
  const { isGmailSignedIn, isAdmin } = useAuth();
  
  // Debug admin status
  console.log('🎯 Shipments page - isAdmin:', isAdmin);
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shipmentDocuments, setShipmentDocuments] = useState<Record<number, ShipmentDocument[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [addShipmentModalOpen, setAddShipmentModalOpen] = useState(false);
  const [csvImportModalOpen, setCsvImportModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [columnManagerModalOpen, setColumnManagerModalOpen] = useState(false);
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
  const [documentRefreshTrigger, setDocumentRefreshTrigger] = useState(0);
  const [selectedShipments, setSelectedShipments] = useState<Set<number>>(new Set());
  
  const [selectedShipmentForUpload, setSelectedShipmentForUpload] = useState<{ id: number; containerNumber: string } | null>(null);
  const [selectedShipmentForDetails, setSelectedShipmentForDetails] = useState<Shipment | null>(null);
  const [isExitingButtons, setIsExitingButtons] = useState(false);
  const [documentPreviewModalOpen, setDocumentPreviewModalOpen] = useState(false);
  const [selectedDocumentForPreview, setSelectedDocumentForPreview] = useState<ShipmentDocument | null>(null);
  
  // Dynamic columns state - Updated for simplified schema
  const [visibleColumns, _setVisibleColumns] = useState<string[]>([
    'ref', 'eta', 'etd', 'container_n'
  ]);
  const [allColumns, _setAllColumns] = useState<{[key: string]: string}>({
    ref: 'Reference',
    eta: 'ETA',
    etd: 'ETD', 
    container_n: 'Container Number'
  });

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

  // Handle document preview
  const handleDocumentPreview = (document: ShipmentDocument) => {
    setSelectedDocumentForPreview(document);
    setDocumentPreviewModalOpen(true);
  };

  // Handle closing document preview
  const handleCloseDocumentPreview = () => {
    setDocumentPreviewModalOpen(false);
    setSelectedDocumentForPreview(null);
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
    eta: string;
    etd: string;
    container_n: string;
    documents?: File[];
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

  // Handle bulk file upload
  const handleBulkUpload = async (files: File[]) => {
    try {
      console.log('Starting bulk upload for', files.length, 'files');
      
      // Upload all files to Google Drive without assigning to specific shipments
      // Note: This uploads to a general "Bulk Documents" folder for later assignment
      const uploadPromises = files.map(file => 
        GoogleDriveService.uploadFile(file, 0, undefined) // shipmentId = 0 for bulk uploads
      );
      
      await Promise.all(uploadPromises);
      console.log('Successfully uploaded', files.length, 'files');
      
      // Refresh documents data for all shipments
      await fetchShipmentData(true);
      
      // Trigger refresh of AllShipmentFiles component
      setDocumentRefreshTrigger(prev => prev + 1);
      
      setBulkUploadModalOpen(false);
    } catch (error) {
      console.error('Error in bulk upload:', error);
      throw error;
    }
  };

  // Handle checkbox selection
  const handleSelectShipment = (shipmentId: number, checked: boolean) => {
    const newSelected = new Set(selectedShipments);
    if (checked) {
      newSelected.add(shipmentId);
    } else {
      newSelected.delete(shipmentId);
    }
    
    // Handle exit animation when going from some selected to none selected
    const wasSomeSelected = selectedShipments.size > 0;
    const willBeSomeSelected = newSelected.size > 0;
    
    if (wasSomeSelected && !willBeSomeSelected) {
      setIsExitingButtons(true);
      setTimeout(() => {
        setSelectedShipments(newSelected);
        setIsExitingButtons(false);
      }, 300);
    } else {
      setSelectedShipments(newSelected);
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedShipments(new Set(shipments.map(s => s.id)));
    } else {
      // Handle exit animation when deselecting all
      setIsExitingButtons(true);
      setTimeout(() => {
        setSelectedShipments(new Set());
        setIsExitingButtons(false);
      }, 300);
    }
  };

  // Handle row click to open details modal
  const handleRowClick = (shipment: Shipment) => {
    setSelectedShipmentForDetails(shipment);
    setDetailsModalOpen(true);
  };

  // Handle shipment update from details modal
  const handleShipmentUpdate = (updatedShipment: Shipment) => {
    setShipments(prev => prev.map(s => s.id === updatedShipment.id ? updatedShipment : s));
    setSelectedShipmentForDetails(updatedShipment);
  };

  // Handle column changes from column manager
  const handleColumnsChange = () => {
    // Refresh the shipments data
    fetchShipmentData(true);
  };

  // Export shipments to CSV
  const exportToCSV = (shipmentsToExport: Shipment[] = selectedShipments.size > 0 
    ? shipments.filter(s => selectedShipments.has(s.id))
    : shipments
  ) => {
    const headers = [
      'Reference',
      'ETA', 
      'ETD',
      'Container Number'
    ];
    
    const csvContent = [
      headers.join(','),
      ...shipmentsToExport.map(shipment => [
        `"${shipment.ref || ''}"`,
        `"${shipment.eta || ''}"`,
        `"${shipment.etd || ''}"`,
        `"${shipment.container_n || ''}"`,
      ].join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shipments_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedShipments.size === 0) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedShipments.size} shipment(s)? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    try {
      const shipmentIds = Array.from(selectedShipments);
      
      const { error } = await supabase
        .from('shipments')
        .delete()
        .in('id', shipmentIds);

      if (error) throw error;

      // Refresh the shipments list
      await fetchShipmentData(true);
      
      // Clear selection
      setSelectedShipments(new Set());
    } catch (error) {
      console.error('Error deleting shipments:', error);
      setError('Failed to delete shipments. Please try again.');
    }
  };

  // Function to format a cell value based on column type
  const formatCellValue = (value: any, columnName: string) => {
    if (value === null || value === undefined) return '—';
    
    if (['eta', 'etd'].includes(columnName)) {
      return formatDate(value);
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  };

  // Function to get column width and alignment classes
  const getColumnClasses = (_columnName: string) => {
    const baseClasses = "px-3 py-3 whitespace-nowrap text-xs";
    return `${baseClasses} text-gray-900`;
  };

  // Function to get header classes
  const getHeaderClasses = (_columnName: string) => {
    return "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
  };  // Format date strings for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Check if all shipments are selected
  const isAllSelected = shipments.length > 0 && shipments.every(s => selectedShipments.has(s.id));

  // Check Gmail authentication
  if (!isGmailSignedIn) {
    return (
      <div className="fade-in pb-6">
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Gmail Connection Required</h3>
            <p className="text-gray-600 mb-6">
              Please connect to Gmail to access Shipments. This page requires Gmail integration to manage your shipment tracking and documents.
            </p>
            <button
              onClick={() => navigate('/inbox')}
              className="btn btn-primary"
            >
              Go to Inbox to Connect Gmail
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in pb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="mr-3 p-2 bg-blue-100 rounded-full">
            <Truck className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-800">Shipment Tracking</h1>
        </div>
        <div className="flex items-center space-x-2">
          {/* Export Buttons */}
          <button
            onClick={() => exportToCSV()}
            className={`px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700 flex items-center transition-all duration-300 ${
              (selectedShipments.size > 0 || isExitingButtons) ? 'transform -translate-x-2' : 'transform translate-x-0'
            }`}
          >
            <Download size={14} className="mr-1.5" />
            Export All
          </button>
          
          {/* Export Selected - Admin only */}
          {isAdmin && (selectedShipments.size > 0 || isExitingButtons) && (
            <button
              onClick={() => exportToCSV(shipments.filter(s => selectedShipments.has(s.id)))}
              className={`px-3 py-1.5 text-sm border border-blue-300 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center transition-all duration-300 ${
                isExitingButtons ? 'animate-bounce-down opacity-0 scale-95' : 'animate-bounce-up opacity-100'
              }`}
              style={{
                animation: isExitingButtons ? 'bounceDown 0.3s ease-in-out' : 'bounceUp 0.3s ease-in-out'
              }}
            >
              <FileSpreadsheet size={14} className="mr-1.5" />
              Export Selected ({selectedShipments.size})
            </button>
          )}

          {/* Delete Selected - Admin only */}
          {isAdmin && (selectedShipments.size > 0 || isExitingButtons) && (
            <button
              onClick={handleBulkDelete}
              className={`px-3 py-1.5 text-sm border border-red-300 rounded-md bg-red-50 hover:bg-red-100 text-red-700 flex items-center transition-all duration-300 ${
                isExitingButtons ? 'animate-bounce-down opacity-0 scale-95' : 'animate-bounce-up opacity-100'
              }`}
              style={{
                animation: isExitingButtons 
                  ? 'bounceDown 0.3s ease-in-out 0.1s both' 
                  : 'bounceUp 0.3s ease-in-out 0.1s both'
              }}
            >
              <Trash2 size={14} className="mr-1.5" />
              Delete Selected ({selectedShipments.size})
            </button>
          )}
          
          {/* Admin-only buttons */}
          {isAdmin && (
            <>
              <button
                onClick={() => setAddShipmentModalOpen(true)}
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
              >
                <Plus size={14} className="mr-1.5" />
                Add Shipment
              </button>
              <button
                onClick={() => setBulkUploadModalOpen(true)}
                className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center"
              >
                <Upload size={14} className="mr-1.5" />
                Bulk Upload
              </button>
              <button
                onClick={() => setColumnManagerModalOpen(true)}
                className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md flex items-center"
              >
                <Settings size={14} className="mr-1.5" />
                Manage Columns
              </button>
            </>
          )}
          
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md flex items-center"
            disabled={refreshing}
          >
            <RefreshCw size={14} className={`mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
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
                  <th className="w-8 px-2 py-3 text-left border-r border-gray-200">
                    {/* Only show select all checkbox for admin users */}
                    {isAdmin ? (
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="w-4 h-4"></div> // Empty space to maintain column width
                    )}
                  </th>
                  {visibleColumns.map((columnName, index) => (
                    <th key={columnName} className={`${getHeaderClasses(columnName)} ${
                      index < visibleColumns.length - 1 ? 'border-r border-gray-200' : ''
                    }`}>
                      <div className="flex items-center cursor-pointer">
                        {allColumns[columnName] || columnName}
                        {columnName === 'ref' && <ArrowUpDown className="w-3 h-3 ml-1" />}
                      </div>
                    </th>
                  ))}
                  <th className="w-16 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shipments.map((shipment) => (
                  <tr 
                    key={shipment.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRowClick(shipment)}
                  >
                    <td className="w-8 px-2 py-3 border-r border-gray-200">
                      {/* Only show checkbox for admin users */}
                      {isAdmin ? (
                        <input
                          type="checkbox"
                          checked={selectedShipments.has(shipment.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectShipment(shipment.id, e.target.checked);
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="w-4 h-4"></div> // Empty space to maintain column width
                      )}
                    </td>
                    {visibleColumns.map((columnName, index) => (
                      <td key={columnName} className={`${getColumnClasses(columnName)} ${
                        index < visibleColumns.length - 1 ? 'border-r border-gray-200' : ''
                      }`}>
                        {columnName === 'ref' ? (
                          <div className="max-w-[100px] truncate font-medium" title={formatCellValue(shipment[columnName as keyof Shipment], columnName)}>
                            {formatCellValue(shipment[columnName as keyof Shipment], columnName)}
                          </div>
                        ) : (
                          <div className="max-w-[120px] truncate" title={formatCellValue(shipment[columnName as keyof Shipment], columnName)}>
                            {formatCellValue(shipment[columnName as keyof Shipment], columnName)}
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="w-32 px-3 py-3 whitespace-nowrap text-xs font-medium">
                      <div className="flex items-center justify-center space-x-1">
                        {/* Only show upload button for admin users */}
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUploadClick(shipment.id, shipment.ref);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="Upload Documents"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                        )}
                        
                        {shipmentDocuments[shipment.id]?.length > 0 && (
                          <div className="relative group">
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="text-green-600 hover:text-green-900 p-1 rounded flex items-center"
                              title={`${shipmentDocuments[shipment.id].length} documents`}
                            >
                              <FileText className="w-4 h-4" />
                              <span className="text-xs ml-1">{shipmentDocuments[shipment.id].length}</span>
                            </button>
                            
                            {/* Documents dropdown */}
                            <div className="absolute right-0 top-8 z-10 w-80 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                              <div className="p-3">
                                <h4 className="text-sm font-medium text-gray-900 mb-3">Documents</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {shipmentDocuments[shipment.id].map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                                      <div className="flex items-center flex-1 min-w-0">
                                        <FileText className="w-3 h-3 text-gray-400 mr-2 flex-shrink-0" />
                                        <span className="truncate" title={doc.file_name}>
                                          {doc.file_name}
                                        </span>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDocumentPreview(doc);
                                        }}
                                        className="ml-2 text-blue-600 hover:text-blue-800 p-1"
                                        title="Preview"
                                      >
                                        <Eye className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Footer with selected count - Admin only */}
          {isAdmin && selectedShipments.size > 0 && (
            <div className="bg-gray-50 px-4 py-3 border-t">
              <p className="text-sm text-gray-700">
                {selectedShipments.size} of {shipments.length} shipment(s) selected
              </p>
            </div>
          )}
        </div>
      )}

      {/* All Shipment Files Component */}
      <AllShipmentFiles 
        onRefresh={() => fetchShipmentData(true)}
        refreshTrigger={documentRefreshTrigger}
        isAdmin={isAdmin}
        className="mt-6"
      />
      
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
      
      {/* Shipment Details Modal */}
      <ShipmentDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        shipment={selectedShipmentForDetails}
        documents={selectedShipmentForDetails ? shipmentDocuments[selectedShipmentForDetails.id] || [] : []}
        onUpdate={handleShipmentUpdate}
        onDocumentsUpdate={() => {
          if (selectedShipmentForDetails) {
            fetchShipmentDocumentsData(selectedShipmentForDetails.id);
          }
        }}
      />
      
      {/* Column Manager Modal */}
      <ColumnManagerModal
        isOpen={columnManagerModalOpen}
        onClose={() => setColumnManagerModalOpen(false)}
        onColumnsChanged={handleColumnsChange}
      />

      {/* Document Preview Modal */}
      {selectedDocumentForPreview && (
        <DocumentPreviewModal
          isOpen={documentPreviewModalOpen}
          onClose={handleCloseDocumentPreview}
          document={selectedDocumentForPreview}
        />
      )}

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={bulkUploadModalOpen}
        onClose={() => setBulkUploadModalOpen(false)}
        onUpload={handleBulkUpload}
        title="Bulk File Upload"
      />
    </div>
  );
}

export default Shipments;
