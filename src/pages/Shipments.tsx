import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Package, RefreshCw, Upload, FileText, ArrowUpDown, Trash2, AlertCircle, MousePointerClick } from 'lucide-react';
import { Shipment, ShipmentDocument } from '../types';
import { fetchShipments } from '../services/backendApi';
import { GoogleDriveService } from '../services/googleDriveService';
import { ShipmentUploadModal } from '../components/ui/shipment-upload-modal';
import { ShipmentDetailsModal } from '../components/ui/shipment-details-modal';
import { ColumnManagerModal } from '../components/ui/column-manager-modal';
import { DocumentPreviewModal } from '../components/ui/document-preview-modal';
import { supabase } from '../lib/supabase';

function Shipments() {
  const { isGmailSignedIn, isAdmin } = useAuth();
  console.log('🎯 Shipments page - isAdmin:', isAdmin);
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shipmentDocuments, setShipmentDocuments] = useState<Record<number, ShipmentDocument[]>>({});
  const [unassignedDocuments, setUnassignedDocuments] = useState<ShipmentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [columnManagerModalOpen, setColumnManagerModalOpen] = useState(false);
  const [selectedShipments, setSelectedShipments] = useState<Set<number>>(new Set());
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [selectedShipmentForDetails, setSelectedShipmentForDetails] = useState<Shipment | null>(null);
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
      
      // Fetch unassigned documents
      await fetchUnassignedDocuments();
    } catch (error) {
      console.error('Error fetching shipments:', error);
      setError('Failed to load shipments. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to fetch unassigned documents
  const fetchUnassignedDocuments = async () => {
    try {
      console.log('🔍 Fetching unassigned documents...');
      const allDocs = await GoogleDriveService.getAllDocuments();
      const unassigned = allDocs.filter(doc => doc.shipment_id === null);
      console.log(`📋 Retrieved ${unassigned.length} unassigned documents`);
      setUnassignedDocuments(unassigned);
    } catch (error) {
      console.error('Error fetching unassigned documents:', error);
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

  // Handle refresh button click
  const handleRefresh = () => {
    fetchShipmentData(true);
  };

  // Handle checkbox selection
  const handleSelectShipment = (shipmentId: number, checked: boolean) => {
    const newSelected = new Set(selectedShipments);
    if (checked) {
      newSelected.add(shipmentId);
    } else {
      newSelected.delete(shipmentId);
    }
    
    setSelectedShipments(newSelected);
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedShipments(new Set(shipments.map(s => s.id)));
      setSelectedDocuments(new Set(unassignedDocuments.map(d => d.id)));
    } else {
      setSelectedShipments(new Set());
      setSelectedDocuments(new Set());
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

  // Handle bulk delete
  const handleBulkDelete = async () => {
    const totalSelected = selectedShipments.size + selectedDocuments.size;
    if (totalSelected === 0) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${totalSelected} item(s)? This will also delete the Google Drive folders and all files. This action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    try {
      // Delete shipments (including Google Drive folders)
      if (selectedShipments.size > 0) {
        const shipmentIds = Array.from(selectedShipments);
        
        // First, delete Google Drive folders for each shipment
        for (const shipmentId of shipmentIds) {
          const shipment = shipments.find(s => s.id === shipmentId);
          if (shipment) {
            try {
              console.log(`🗑️ Deleting Drive folder for shipment: ${shipment.ref}`);
              await GoogleDriveService.deleteShipmentFolder(shipment.id, shipment.ref);
            } catch (driveError) {
              console.error(`Failed to delete Drive folder for ${shipment.ref}:`, driveError);
              // Continue with database deletion even if Drive deletion fails
            }
          }
        }
        
        // Then delete from database
        const { error: shipmentError } = await supabase
          .from('shipments')
          .delete()
          .in('id', shipmentIds);
        if (shipmentError) throw shipmentError;
      }

      // Delete documents
      if (selectedDocuments.size > 0) {
        const documentIds = Array.from(selectedDocuments);
        for (const docId of documentIds) {
          await GoogleDriveService.deleteDocument(docId);
        }
      }

      // Refresh the list
      await fetchShipmentData(true);
      
      // Clear selections
      setSelectedShipments(new Set());
      setSelectedDocuments(new Set());
    } catch (error) {
      console.error('Error deleting items:', error);
      setError('Failed to delete items. Please try again.');
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
    return "px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider";
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

  // Check if all rows are selected
  const isAllSelected = 
    shipments.length > 0 && 
    shipments.every(s => selectedShipments.has(s.id)) &&
    unassignedDocuments.every(d => selectedDocuments.has(d.id));

  // Combine shipments and unassigned documents into one unified list
  const allRows = [
    ...shipments.map(s => ({ type: 'shipment' as const, data: s })),
    ...unassignedDocuments.map(d => ({ type: 'document' as const, data: d }))
  ];

  // Check Gmail authentication
  if (!isGmailSignedIn) {
    return (
      <div className="fade-in pb-6">
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Required</h3>
            <p className="text-gray-600 mb-6">
              Please connect to your email account to access Shipments. This page requires email integration to manage your shipment tracking and documents.
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h1 className="text-2xl font-semibold text-gray-800">Shipments</h1>
        </div>
        <div className="flex items-center space-x-2">
          {/* Delete Selected - Admin only */}
          {isAdmin && (selectedShipments.size > 0 || selectedDocuments.size > 0) && (
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center"
            >
              <Trash2 size={14} className="mr-1.5" />
              Delete Selected ({selectedShipments.size + selectedDocuments.size})
            </button>
          )}
          
          {/* Admin-only upload button */}
          {isAdmin && (
            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-3 py-1.5 text-sm bg-primary hover:bg-primary-950 text-white rounded-md flex items-center"
            >
              <Upload size={14} className="mr-1.5" />
              Upload
            </button>
          )}
          
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 text-sm bg-primary hover:bg-primary-950 text-white rounded-md flex items-center"
            disabled={refreshing}
          >
            <RefreshCw size={20} className={`mr-0 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : ''}
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
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500 border border-gray-300 p-4">
          <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No shipments found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Table */}
          <div className="overflow-x-auto rounded-lg">
            <table className="min-w-full divide-y divide-gray-700">
              <thead
                className="text-white border-b border-gray-700"
                style={{
                  background: "linear-gradient(135deg, #000000 0%, #4b5563 100%)",
                }}
              >
                <tr>
                  <th className="w-8 px-2 py-3 text-left border-r border-white/20">
                    {/* Only show select all checkbox for admin users */}
                    {isAdmin ? (
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-white/40 bg-white/20 text-blue-600 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="w-4 h-4"></div> // Empty space to maintain column width
                    )}
                  </th>
                  {visibleColumns.map((columnName, index) => (
                    <th key={columnName} className={`${getHeaderClasses(columnName)} ${
                      index < visibleColumns.length - 1 ? 'border-r border-white/20' : ''
                    }`}>
                      <div className="flex items-center cursor-pointer">
                        {allColumns[columnName] || columnName}
                        {columnName === 'ref' && <ArrowUpDown className="w-3 h-3 ml-1" />}
                      </div>
                    </th>
                  ))}
                  <th className="w-16 px-3 py-3 text-center text-xs font-medium text-gray-900 uppercase tracking-wider">
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allRows.map((row) => {
                  if (row.type === 'shipment') {
                    const shipment = row.data;
                    return (
                      <tr 
                        key={`shipment-${shipment.id}`} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleRowClick(shipment)}
                      >
                        <td className="w-8 px-2 py-3 border-r border-gray-200">
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
                            <div className="w-4 h-4"></div>
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
                            <MousePointerClick className="w-6 h-6 text-primary" style={{ animation: 'subtleZoom 2.5s ease-in-out infinite' }} />
                          </div>
                        </td>
                      </tr>
                    );
                  } else {
                    const doc = row.data;
                    return (
                      <tr 
                        key={`document-${doc.id}`}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleDocumentPreview(doc)}
                      >
                        <td className="w-8 px-2 py-3 border-r border-gray-200">
                          {isAdmin ? (
                            <input
                              type="checkbox"
                              checked={selectedDocuments.has(doc.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newSelected = new Set(selectedDocuments);
                                if (e.target.checked) {
                                  newSelected.add(doc.id);
                                } else {
                                  newSelected.delete(doc.id);
                                }
                                setSelectedDocuments(newSelected);
                              }}
                            />
                          ) : (
                            <div className="w-4 h-4"></div>
                          )}
                        </td>
                        {visibleColumns.map((columnName, index) => (
                          <td key={columnName} className={`${getColumnClasses(columnName)} ${
                            index < visibleColumns.length - 1 ? 'border-r border-gray-200' : ''
                          }`}>
                            {columnName === 'ref' ? (
                              <div className="max-w-[100px] truncate font-medium flex items-center" title={doc.file_name}>
                                <FileText className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                                <span className="truncate">{doc.file_name}</span>
                              </div>
                            ) : (
                              <div className="max-w-[120px] truncate text-gray-400">
                                —
                              </div>
                            )}
                          </td>
                        ))}
                        <td className="w-32 px-3 py-3 whitespace-nowrap text-xs font-medium">
                          <div className="flex items-center justify-center space-x-1">
                            <MousePointerClick className="w-4 h-4 text-gray-400" style={{ animation: 'subtleZoom 2.5s ease-in-out infinite' }} />
                          </div>
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Shipment Upload Modal */}
      <ShipmentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadComplete={() => {
          fetchShipmentData(true);
        }}
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

      {/* Custom CSS for subtle click icon animation */}
      <style>{`
        @keyframes subtleZoom {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.15);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default Shipments;
