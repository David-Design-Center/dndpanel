import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default?: string | null;
  isCustom: boolean;
}

interface ColumnManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onColumnsChanged: () => void;
}

export function ColumnManagerModal({ isOpen, onClose, onColumnsChanged }: ColumnManagerModalProps) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newColumn, setNewColumn] = useState({
    name: '',
    type: 'text',
    nullable: true,
    default: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);

  // Core columns that cannot be deleted
  const coreColumns = ['id', 'ref', 'status', 'created_at', 'updated_at'];

  useEffect(() => {
    if (isOpen) {
      fetchColumns();
    }
  }, [isOpen]);

  const fetchColumns = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try to use the get_table_columns function
      const { data, error } = await supabase.rpc('get_table_columns', {
        table_name_param: 'shipments'
      });

      if (error) {
        console.warn('get_table_columns function not available, using fallback method:', error);
        // Fallback: Try to get a sample record to determine existing columns
        const { data: sampleData, error: sampleError } = await supabase
          .from('shipments')
          .select('*')
          .limit(1);

        if (sampleError) {
          throw sampleError;
        }

        // Get column names from the sample data or use predefined list
        let columnNames: string[] = [];
        if (sampleData && sampleData.length > 0) {
          columnNames = Object.keys(sampleData[0]);
        } else {
          // Fallback to known columns
          columnNames = ['id', 'ref', 'status', 'pod', 'vendor', 'po', 'pkg', 'kg', 'vol', 'pickup_date', 'note', 'documents', 'consignee', 'created_at', 'updated_at'];
        }

        // Create column definitions
        const columnList: Column[] = columnNames.map(name => {
          // Determine if it's a custom column
          const isCustom = !coreColumns.includes(name) && 
                          !['pod', 'vendor', 'po', 'pkg', 'kg', 'vol', 'pickup_date', 'note', 'documents', 'consignee'].includes(name);
          
          // Determine type based on known columns
          let type = 'text';
          if (['id', 'pkg'].includes(name)) type = 'integer';
          if (['kg', 'vol'].includes(name)) type = 'numeric';
          if (name === 'pickup_date') type = 'date';
          if (name === 'documents') type = 'jsonb';
          if (name.includes('_at')) type = 'timestamp';
          
          return {
            name,
            type,
            nullable: !['id'].includes(name), // Only id is not nullable
            default: null,
            isCustom
          };
        });

        setColumns(columnList);
      } else {
        // Use the data from get_table_columns function
        const columnList: Column[] = data.map((col: any) => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          default: col.column_default,
          isCustom: !coreColumns.includes(col.column_name) && 
                    !['pod', 'vendor', 'po', 'pkg', 'kg', 'vol', 'pickup_date', 'note', 'documents', 'consignee'].includes(col.column_name)
        }));

        setColumns(columnList);
      }
    } catch (err: any) {
      console.error('Error fetching columns:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addColumn = async () => {
    if (!newColumn.name.trim()) {
      setError('Column name is required');
      return;
    }

    // Validate column name (only letters, numbers, underscore)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newColumn.name)) {
      setError('Column name must start with a letter or underscore and contain only letters, numbers, and underscores');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Map frontend types to PostgreSQL types
      const pgTypeMap: { [key: string]: string } = {
        'text': 'TEXT',
        'number': 'DECIMAL(10,2)',
        'integer': 'INTEGER',
        'date': 'DATE',
        'boolean': 'BOOLEAN',
        'json': 'JSONB'
      };

      const pgType = pgTypeMap[newColumn.type] || 'TEXT';
      const nullable = newColumn.nullable ? '' : ' NOT NULL';
      const defaultValue = newColumn.default ? ` DEFAULT '${newColumn.default}'` : '';

      // Execute SQL to add column
      const { error } = await supabase.rpc('execute_sql', {
        sql: `ALTER TABLE shipments ADD COLUMN ${newColumn.name} ${pgType}${nullable}${defaultValue};`
      });

      if (error) throw error;

      // Refresh columns
      await fetchColumns();
      
      // Reset form
      setNewColumn({ name: '', type: 'text', nullable: true, default: '' });
      setShowAddForm(false);
      
      // Notify parent component
      onColumnsChanged();

    } catch (err: any) {
      console.error('Error adding column:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteColumn = async (columnName: string) => {
    if (coreColumns.includes(columnName)) {
      setError('Cannot delete core columns');
      return;
    }

    if (!confirm(`Are you sure you want to delete column "${columnName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Execute SQL to drop column
      const { error } = await supabase.rpc('execute_sql', {
        sql: `ALTER TABLE shipments DROP COLUMN IF EXISTS ${columnName};`
      });

      if (error) throw error;

      // Refresh columns
      await fetchColumns();
      
      // Notify parent component
      onColumnsChanged();

    } catch (err: any) {
      console.error('Error deleting column:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage Table Columns</h2>
            <p className="text-sm text-gray-500">Add, remove, or modify table columns</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Add New Column Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Column</h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="btn btn-primary btn-sm flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Column
              </button>
            </div>

            {showAddForm && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Column Name</label>
                    <input
                      type="text"
                      value={newColumn.name}
                      onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="column_name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={newColumn.type}
                      onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number (Decimal)</option>
                      <option value="integer">Integer</option>
                      <option value="date">Date</option>
                      <option value="boolean">Boolean</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Value</label>
                    <input
                      type="text"
                      value={newColumn.default}
                      onChange={(e) => setNewColumn({ ...newColumn, default: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="nullable"
                      checked={newColumn.nullable}
                      onChange={(e) => setNewColumn({ ...newColumn, nullable: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="nullable" className="ml-2 text-sm text-gray-700">Allow NULL</label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addColumn}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Add Column
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Existing Columns */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Columns</h3>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Column Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nullable</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Default</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {columns.map((column) => (
                      <tr key={column.name} className={coreColumns.includes(column.name) ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {column.name}
                          {coreColumns.includes(column.name) && (
                            <span className="ml-2 text-xs text-blue-600">(Core)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{column.type}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {column.nullable ? 'Yes' : 'No'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {column.default || '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          {!coreColumns.includes(column.name) && (
                            <button
                              onClick={() => deleteColumn(column.name)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete Column"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
