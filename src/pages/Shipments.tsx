import { useState, useEffect } from 'react';
import { Package, RefreshCw, Truck, Calendar, Box, Info, ExternalLink, FileText } from 'lucide-react';
import { Shipment, GeneralDocument } from '../types';
import { fetchShipments, fetchGeneralDocuments } from '../services/backendApi';
import CollapsibleSection from '../components/common/CollapsibleSection';

function Shipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [documents, setDocuments] = useState<GeneralDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  // Fetch shipments and documents on component mount
  useEffect(() => {
    fetchShipmentData();
    fetchDocumentData();
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
    } catch (error) {
      console.error('Error fetching shipments:', error);
      setError('Failed to load shipments. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to fetch documents
  const fetchDocumentData = async (forceRefresh = false) => {
    try {
      setDocumentsLoading(true);
      setDocumentsError(null);
      
      const data = await fetchGeneralDocuments(forceRefresh);
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocumentsError('Failed to load documents. Please try again.');
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Handle refresh button click
  const handleRefresh = () => {
    fetchShipmentData(true);
    fetchDocumentData(true);
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
        <button
          onClick={handleRefresh}
          className="btn btn-secondary flex items-center"
          disabled={refreshing}
        >
          <RefreshCw size={18} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {/* Documents Section */}
      <CollapsibleSection
        title={
          <div className="flex items-center">
            <div className="mr-3 p-1 bg-gray-100 rounded">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-medium">Shipping Documents</h2>
              <p className="text-sm text-gray-500">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        }
        defaultExpanded={true}
        className="mb-6 bg-white"
      >
        {documentsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-800">
            <p className="flex items-center">
              <Info size={16} className="mr-2" />
              {documentsError}
            </p>
          </div>
        )}
        
        {documentsLoading ? (
          <div className="flex justify-center items-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No documents available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {documents.map(doc => (
              <a
                key={doc.id}
                href={doc.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="mr-3 p-2 bg-gray-100 rounded">
                  {getFileTypeIcon(doc.file_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {doc.file_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Uploaded: {formatUploadedAt(doc.uploaded_at)}
                  </p>
                </div>
                <ExternalLink size={14} className="text-gray-400 mt-1" />
              </a>
            ))}
          </div>
        )}
      </CollapsibleSection>
      
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
                  <div className="flex items-center mb-4">
                    <FileText className="w-5 h-5 text-blue-600 mr-2" />
                    <h4 className="text-base font-medium">Container Documents</h4>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                    <div className="flex items-start">
                      <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-blue-800 font-medium mb-2">
                          Feature Coming Soon
                        </p>
                        <p className="text-blue-700">
                          Documents specific to container <strong>{containerNumber === `unknown-${shipment.id}` ? 'this container' : containerNumber}</strong> will 
                          appear here once the necessary database and API changes are implemented. This will include 
                          bills of lading, customs forms, inspection certificates, and other container-specific documentation.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          ))}
        </div>
      )}
    </div>
  );
}

export default Shipments;