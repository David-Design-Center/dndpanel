import React, { useState, useRef } from 'react';
import { X, Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[]) => Promise<void>;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expected CSV columns in English
  const expectedColumns = [
    'ref', 'status', 'pod', 'vendor', 'po', 'PKG', 'KG', 'VOL', 'pickup_date', 'note'
  ];

  const columnMapping = {
    'ref': 'ref',
    'status': 'status',
    'pod': 'pod',
    'vendor': 'vendor',
    'po': 'po',
    'PKG': 'pkg',
    'KG': 'kg',
    'VOL': 'vol',
    'pickup_date': 'pickup_date',
    'note': 'note'
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setSuccess(false);
      parseCsvFile(selectedFile);
    }
  };

  const parseCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          setError('CSV file must contain at least a header and one data row');
          return;
        }

        // Parse header
        const header = lines[0].split(',').map(col => col.trim().replace(/"/g, ''));
        
        // Validate header columns
        const missingColumns = expectedColumns.filter(col => !header.includes(col));
        if (missingColumns.length > 0) {
          setError(`Missing columns in CSV: ${missingColumns.join(', ')}`);
          return;
        }

        // Parse data rows
        const data = lines.slice(1).map((line) => {
          const values = line.split(',').map(val => val.trim().replace(/"/g, ''));
          const row: any = {};
          
          header.forEach((col, i) => {
            if (columnMapping[col as keyof typeof columnMapping]) {
              const mappedCol = columnMapping[col as keyof typeof columnMapping];
              let value: any = values[i] || '';
              
              // Convert numeric fields
              if (['pkg', 'kg', 'vol'].includes(mappedCol)) {
                value = parseFloat(value) || 0;
              }
              
              // Handle date fields - convert empty strings to null
              if (mappedCol === 'pickup_date') {
                if (!value || value.trim() === '') {
                  value = null; // Use null instead of empty string for dates
                } else {
                  // Validate date format (YYYY-MM-DD)
                  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                  if (!dateRegex.test(value)) {
                    // Try to parse common date formats and convert to YYYY-MM-DD
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                      value = date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
                    } else {
                      value = null; // Invalid date, set to null
                    }
                  }
                }
              }
              
              row[mappedCol] = value;
            }
          });
          
          return row;
        });

        setCsvData(data);
        setPreviewData(data.slice(0, 5)); // Show first 5 rows for preview
        setError(null);
      } catch (err) {
        setError('Error parsing CSV file. Please check the format.');
        console.error('CSV parsing error:', err);
      }
    };
    
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvData.length) {
      setError('No data to import');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      await onImport(csvData);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        resetModal();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error during import');
    } finally {
      setImporting(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setCsvData([]);
    setPreviewData([]);
    setError(null);
    setSuccess(false);
    setImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = [
      expectedColumns.join(','),
      'TEST001,SHIPPED,NEW YORK,Vendor Example,PO12345,57,1091.70,4.000,April-16-2025,Note example'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shipments_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Import Shipments from CSV</h2>
          <button
            onClick={() => { onClose(); resetModal(); }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Template Download */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">CSV Template</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Download the template to see the correct CSV file format
                </p>
              </div>
              <button
                onClick={downloadTemplate}
                className="btn btn-secondary btn-sm flex items-center"
              >
                <Download size={16} className="mr-2" />
                Download Template
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-600">
                  Click to select a CSV file
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  Format: ref,status,pod,vendor,po,PKG,KG,VOL,pickup_date,note
                </span>
              </label>
            </div>
            {file && (
              <p className="mt-2 text-sm text-green-600">
                File selected: {file.name}
              </p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800">Error</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Success Display */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
              <div>
                <h4 className="font-medium text-green-800">Success!</h4>
                <p className="text-sm text-green-700">
                  {csvData.length} shipments imported successfully
                </p>
              </div>
            </div>
          )}

          {/* Preview */}
          {previewData.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">
                Data Preview ({csvData.length} total rows)
              </h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((row, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{row.ref}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvData.length > 5 && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing first 5 rows of {csvData.length} total
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={() => { onClose(); resetModal(); }}
            className="btn btn-secondary"
            disabled={importing}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!csvData.length || importing}
            className="btn btn-primary flex items-center"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload size={16} className="mr-2" />
                Import {csvData.length} Shipments
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
