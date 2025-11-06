import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';
import { useFilterCreation } from '../../contexts/FilterCreationContext';
import { GmailLabel } from '../../types';
import { 
  listGmailFilters, 
  createGmailFilter, 
  deleteGmailFilter, 
  fetchGmailLabels 
} from '../../integrations/gapiService';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '../ui/sheet';
import LabelSelector from './LabelSelector'; // Expert's isolated component solution
import EmailContactsDropdown from '../common/EmailContactsDropdown';
import { 
  Filter, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  Edit
} from 'lucide-react';

// Debounce hook for performance optimization
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface FilterFormData {
  criteria: {
    from?: string;
    to?: string;
    subject?: string;
    hasTheWord?: string;
    doesNotHave?: string;
    hasAttachment?: boolean;
    excludeChats?: boolean;
    size?: number;
    sizeComparison?: 'larger' | 'smaller';
  };
  action: {
    addLabelIds?: string[];
    removeLabelIds?: string[];
    forward?: string;
    markAsRead?: boolean;
    markAsImportant?: boolean;
    neverSpam?: boolean;
    neverMarkAsImportant?: boolean;
    alwaysMarkAsImportant?: boolean;
    delete?: boolean;
  };
}

// Memoized FilterItem component to prevent unnecessary re-renders
const FilterItem = memo(({ 
  filter, 
  isSelected,
  onSelect,
  onEdit,
  onDelete, 
  isDeleting 
}: {
  filter: any;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting: string | null;
}) => {
  const getFilterName = (filter: any) => {
    // Generate a descriptive name based on criteria
    const criteria = filter.criteria;
    if (criteria.from) return `from:(${criteria.from})`;
    if (criteria.to) return `to:(${criteria.to})`;
    if (criteria.subject) return `subject:(${criteria.subject})`;
    if (criteria.query) return `${criteria.query}`;
    if (criteria.hasAttachment) return 'has:attachment';
    return 'Filter rule';
  };

  const getFilterAction = (filter: any) => {
    const action = filter.action;
    if (!action) return 'No action';
    
    const actions = [];
    if (action.delete) actions.push('Delete it');
    if (action.markAsRead) actions.push('Mark as read');
    if (action.markAsSpam) actions.push('Mark as spam');
    if (action.markAsImportant) actions.push('Mark as important');
    if (action.addLabelIds?.length) actions.push(`Add labels`);
    if (action.removeLabelIds?.length) actions.push(`Remove labels`);
    if (action.forward) actions.push(`Forward to ${action.forward}`);
    if (action.neverSpam) actions.push('Never mark as spam');
    return actions.length > 0 ? `Do this: ${actions.join(', ')}` : 'No action';
  };

  return (
    <TableRow className="hover:bg-gray-50">
      <TableCell className="w-12">
        <input
          type="checkbox"
          checked={isSelected}
          disabled={isDeleting === 'bulk'}
          onChange={(e) => onSelect(filter.id, e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
        />
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="text-sm font-medium">
            Matches: {getFilterName(filter)}
          </div>
          <div className="text-sm text-gray-600">
            {getFilterAction(filter)}
          </div>
        </div>
      </TableCell>
      <TableCell className="w-24">
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(filter.id)}
            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(filter.id)}
            disabled={isDeleting === filter.id || isDeleting === 'bulk'}
            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
          >
            {isDeleting === filter.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});
FilterItem.displayName = 'FilterItem';

function SettingsFilters() {
  const { isGmailSignedIn } = useAuth();
  const { currentProfile } = useProfile();
  const { filterCreation, clearFilterCreation, markCreateOpened } = useFilterCreation();
  
  // State for filters
  const [filters, setFilters] = useState<any[]>([]);
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editStep, setEditStep] = useState<'criteria' | 'actions' | null>(null);
  const [editFormData, setEditFormData] = useState<FilterFormData>({
    criteria: {
      from: '',
      hasAttachment: false
    },
    action: {
      addLabelIds: [],
      delete: false
    }
  });
  const [formData, setFormData] = useState<FilterFormData>({
    criteria: {
      from: '',
      hasAttachment: false
    },
    action: {
      addLabelIds: [],
      delete: false
    }
  });
  
  // Form validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Performance optimizations - Create label lookup map
  const labelsMap = useMemo(() => {
    return new Map(labels.map(label => [label.id, label]));
  }, [labels]);

  // Debounce form data to prevent expensive operations during typing (expert's 500ms recommendation)
  const debouncedFormData = useDebouncedValue(formData, 500);

  // Memoized filtered labels for dropdowns - use debounced data to prevent re-calc on every keystroke
  const availableLabelsForAdd = useMemo(() => {
    const addLabelIds = debouncedFormData.action.addLabelIds || [];
    return labels.filter(label => !addLabelIds.includes(label.id));
  }, [labels, debouncedFormData.action.addLabelIds]);

  // Expert's approach: Debounced validation - only run expensive operations after user stops typing
  useEffect(() => {
    // Only run validation on debounced data (after user stops typing for 500ms)
    if (debouncedFormData && (debouncedFormData.criteria.from || 
                             debouncedFormData.criteria.hasAttachment)) {
      
      // Simple validation only for the remaining fields
      const errors: Record<string, string> = {};
      
      // No complex validation needed for our simplified fields
      setFormErrors(errors);
    } else {
      // Clear errors when fields are empty
      setFormErrors({});
    }
  }, [debouncedFormData]); // Only depend on debounced data

  // Memoized operations to prevent unnecessary re-renders
  const loadFilters = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const filterList = await listGmailFilters();
      setFilters(filterList);
    } catch (err) {
      console.error('Error loading filters:', err);
      setError('Failed to load Gmail filters. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load filters and labels on mount - ONLY ONCE
  useEffect(() => {
    let mounted = true;
    
    if (isGmailSignedIn && currentProfile) {
      // Prevent multiple calls
      const loadData = async () => {
        try {
          setIsLoading(true);
          const [filterList, labelList] = await Promise.all([
            listGmailFilters(),
            fetchGmailLabels()
          ]);
          
          if (mounted) {
            setFilters(filterList);
            setLabels(labelList);
          }
        } catch (err) {
          if (mounted) {
            console.error('Error loading data:', err);
            setError('Failed to load Gmail data. Please try again.');
          }
        } finally {
          if (mounted) {
            setIsLoading(false);
          }
        }
      };
      
      loadData();
    }
    
    return () => {
      mounted = false;
    };
  }, [isGmailSignedIn, currentProfile]);

  // Handle filter creation from context (when coming from email list item)
  useEffect(() => {
    if (filterCreation.isCreating && filterCreation.emailData && filterCreation.shouldOpenCreate) {
      // Auto-fill the form with email data
      setFormData(prev => ({
        ...prev,
        criteria: {
          ...prev.criteria,
          from: filterCreation.emailData?.from.email || ''
        }
      }));
      
      // Open the create form
      setShowCreateForm(true);
      
      // Mark as opened so it doesn't keep reopening
      markCreateOpened();
    }
  }, [filterCreation.isCreating, filterCreation.emailData, filterCreation.shouldOpenCreate, markCreateOpened]);

  const handleSelectFilter = useCallback((filterId: string, selected: boolean) => {
    setSelectedFilters(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(filterId);
      } else {
        newSet.delete(filterId);
      }
      return newSet;
    });
  }, []);

  // Handle closing the create form
  const handleCloseCreateForm = useCallback(() => {
    setShowCreateForm(false);
    // Clear the filter creation context when closing
    if (filterCreation.isCreating) {
      clearFilterCreation();
    }
    // Reset form data
    setFormData({
      criteria: {
        from: '',
        hasAttachment: false
      },
      action: {
        addLabelIds: [],
        delete: false
      }
    });
  }, [filterCreation.isCreating, clearFilterCreation]);

  const handleEditFilter = useCallback((filterId: string) => {
    const filter = filters.find(f => f.id === filterId);
    if (filter) {
      // Pre-populate edit form with current filter data
      setEditFormData({
        criteria: {
          from: filter.criteria.from || '',
          hasAttachment: filter.criteria.hasAttachment || false
        },
        action: {
          addLabelIds: filter.action.addLabelIds || [],
          delete: filter.action.delete || false
        }
      });
      setEditStep('criteria');
    }
  }, [filters]);

  const deleteFilter = useCallback(async (filterId: string) => {
    if (!confirm('Are you sure you want to delete this filter?')) {
      return;
    }
    
    try {
      setIsDeleting(filterId);
      setError(null);
      await deleteGmailFilter(filterId);
      
      setSuccess('Filter deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Reload filters
      loadFilters();
      
    } catch (err) {
      console.error('Error deleting filter:', err);
      setError('Failed to delete filter. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  }, [loadFilters]);

  const validateForm = useCallback((): boolean => {
    // Expert's approach: Only validate on form submission, not during typing
    // This function should be fast and only check for critical errors
    const errors: Record<string, string> = {};
    
    // At least one criteria should be specified
    const hasCriteria = formData.criteria.from || 
                       formData.criteria.hasAttachment;
    
    if (!hasCriteria) {
      errors.criteria = 'At least one filter criteria must be specified';
    }
    
    // At least one action should be specified
    const hasAction = (formData.action.addLabelIds?.length || 0) > 0 ||
                     formData.action.delete;
    
    if (!hasAction) {
      errors.action = 'At least one filter action must be specified';
    }
    
    // Include current validation errors from debounced validation
    const allErrors = { ...formErrors, ...errors };
    
    setFormErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  }, [formData, formErrors]); // Only depend on actual formData for submission validation

  const createFilter = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsCreating(true);
      setError(null);
      
      // Build criteria object (only include non-empty values)
      const criteria: any = {};
      if (formData.criteria.from) criteria.from = formData.criteria.from;
      if (formData.criteria.hasAttachment) criteria.hasAttachment = true;
      
      // Build action object (only include specified actions)
      const action: any = {};
      if (formData.action.addLabelIds && formData.action.addLabelIds.length > 0) action.addLabelIds = formData.action.addLabelIds;
      if (formData.action.delete) action.delete = true;
      
      await createGmailFilter(criteria, action);
      
      setSuccess('Filter created successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Reset form and reload filters
      setFormData({
        criteria: {
          from: '',
          hasAttachment: false
        },
        action: {
          addLabelIds: [],
          delete: false
        }
      });
      setShowCreateForm(false);
      loadFilters();
      
    } catch (err) {
      console.error('Error creating filter:', err);
      setError('Failed to create filter. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Edit form update functions
  const updateEditCriteria = useCallback((field: keyof FilterFormData['criteria'], value: any) => {
    setEditFormData(prev => ({
      ...prev,
      criteria: {
        ...prev.criteria,
        [field]: value
      }
    }));
  }, []);

  const updateEditAction = useCallback((field: keyof FilterFormData['action'], value: any) => {
    setEditFormData(prev => ({
      ...prev,
      action: {
        ...prev.action,
        [field]: value
      }
    }));
  }, []);

  // Expert's approach: Ultra-fast, simple state updates - no side effects
  const updateCriteria = useCallback((field: keyof FilterFormData['criteria'], value: any) => {
    // Only update state - no validation, no side effects, maximum performance
    setFormData(prev => ({
      ...prev,
      criteria: {
        ...prev.criteria,
        [field]: value
      }
    }));
  }, []); // No dependencies - this function never changes

  const updateAction = useCallback((field: keyof FilterFormData['action'], value: any) => {
    // Only update state - no validation, no side effects, maximum performance
    setFormData(prev => ({
      ...prev,
      action: {
        ...prev.action,
        [field]: value
      }
    }));
  }, []); // No dependencies - this function never changes

  // Expert's solution: Stable callbacks for isolated LabelSelector components
  const handleAddLabelsChange = useCallback((newLabelIds: string[]) => {
    updateAction('addLabelIds', newLabelIds);
  }, [updateAction]); // updateAction is already memoized

  const deleteBulkFilters = useCallback(async () => {
    const selectedCount = selectedFilters.size;
    if (selectedCount === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedCount} filter${selectedCount > 1 ? 's' : ''}?`)) {
      return;
    }
    
    try {
      setIsDeleting('bulk');
      setError(null);
      
      // Delete all selected filters in parallel
      await Promise.all(
        Array.from(selectedFilters).map(filterId => deleteGmailFilter(filterId))
      );
      
      setSuccess(`${selectedCount} filter${selectedCount > 1 ? 's' : ''} deleted successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Clear selection and reload filters
      setSelectedFilters(new Set());
      loadFilters();
      
    } catch (err) {
      console.error('Error deleting filters:', err);
      setError('Failed to delete some filters. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  }, [selectedFilters, loadFilters]);

  if (!isGmailSignedIn) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
        <div className="text-sm text-yellow-800">
          Please connect to Gmail to manage your email signature.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-6 pb-6">
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={isLoading}
          className="flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Rule
        </Button>
     </div>

      {/* Bulk Actions */}
      {selectedFilters.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-blue-700 text-sm">
              {selectedFilters.size} filter{selectedFilters.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFilters(new Set())}
                className="text-blue-600 border-blue-300 hover:bg-blue-100"
              >
                Clear selection
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteBulkFilters}
                disabled={isDeleting === 'bulk'}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting === 'bulk' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete {selectedFilters.size > 1 ? selectedFilters.size : 'filter'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Create Filter Form */}
        {showCreateForm && (
          <Card>
            <CardContent className="space-y-8">
              {/* Filter Criteria */}
              <div>
                {formErrors.criteria && (
                  <p className="text-red-500 text-xs mb-2">{formErrors.criteria}</p>
                )}
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="from">From</Label>
                    <EmailContactsDropdown
                      value={formData.criteria.from || ''}
                      onChange={(email) => updateCriteria('from', email)}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="hasAttachment"
                      checked={formData.criteria.hasAttachment}
                      onChange={(e) => updateCriteria('hasAttachment', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <Label htmlFor="hasAttachment" className="cursor-pointer">Has attachment</Label>
                  </div>
                </div>
              </div>

              {/* Filter Actions */}
              <div>
                {formErrors.action && (
                  <p className="text-red-500 text-xs mb-2">{formErrors.action}</p>
                )}
                <div className="space-y-4 pt-4">
                  {/* Add Labels */}
                  <LabelSelector
                    type="add"
                    allLabels={labelsMap}
                    availableLabels={availableLabelsForAdd}
                    selectedLabelIds={formData.action.addLabelIds || []}
                    onLabelChange={handleAddLabelsChange}
                    disabled={isCreating}
                  />

                  {/* Delete Action */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="delete"
                      checked={formData.action.delete}
                      onChange={(e) => updateAction('delete', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <Label htmlFor="delete" className="cursor-pointer">Delete</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={handleCloseCreateForm}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createFilter}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Rule'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters List */}
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Loading filters...</span>
            </div>
          ) : filters.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Filter className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No Gmail filters found.</p>
              <p className="text-sm">Create your first filter to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedFilters.size === filters.length && filters.length > 0}
                      disabled={isDeleting === 'bulk'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFilters(new Set(filters.map(f => f.id)));
                        } else {
                          setSelectedFilters(new Set());
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                    />
                  </TableHead>
                  <TableHead>Rules</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filters.map((filter) => (
                  <FilterItem
                    key={filter.id}
                    filter={filter}
                    isSelected={selectedFilters.has(filter.id)}
                    onSelect={handleSelectFilter}
                    onEdit={handleEditFilter}
                    onDelete={deleteFilter}
                    isDeleting={isDeleting}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Edit Filter Dialog - All fields in one dialog */}
      <Sheet open={editStep === 'criteria'} onOpenChange={(open) => !open && setEditStep(null)}>
        <SheetContent className="w-[600px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Edit Filter</SheetTitle>
            <SheetDescription>
              Update the criteria and actions for your Gmail filter
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-8 py-6">
            {/* Filter Criteria */}
            <div>
              <h3 className="text-sm font-semibold mb-4">Filter Criteria</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-from">From</Label>
                  <EmailContactsDropdown
                    value={editFormData.criteria.from || ''}
                    onChange={(email) => updateEditCriteria('from', email)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-hasAttachment"
                    checked={editFormData.criteria.hasAttachment}
                    onChange={(e) => updateEditCriteria('hasAttachment', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <Label htmlFor="edit-hasAttachment" className="cursor-pointer">Has attachment</Label>
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div>
              <h3 className="text-sm font-semibold mb-4">Filter Actions</h3>
              <div className="space-y-4">
                {/* Add Labels */}
                <LabelSelector
                  type="add"
                  allLabels={labelsMap}
                  availableLabels={labels.filter(label => !(editFormData.action.addLabelIds || []).includes(label.id))}
                  selectedLabelIds={editFormData.action.addLabelIds || []}
                  onLabelChange={(newLabelIds) => updateEditAction('addLabelIds', newLabelIds)}
                  disabled={false}
                />

                {/* Delete Action */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-delete"
                    checked={editFormData.action.delete}
                    onChange={(e) => updateEditAction('delete', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <Label htmlFor="edit-delete" className="cursor-pointer">Delete</Label>
                </div>
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setEditStep(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                // TODO: Implement filter update
                console.log('Update filter with:', editFormData);
                setEditStep(null);
              }}
            >
              Update Filter
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default SettingsFilters;
