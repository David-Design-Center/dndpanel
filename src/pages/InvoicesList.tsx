import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@supabase/supabase-js';
import { InvoiceCards } from '../components/InvoiceCards';
import { useProfile } from '../contexts/ProfileContext';
import { deleteInvoice } from '../services/backendApi';
import { searchInvoicesForList } from '../utils/searchUtils';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Invoice {
  id: string;
  customerName: string;
  orderNumber: string;
  date: string;
  amount: number;
  balance: number;
  status: 'paid-in-full' | 'order-in-progress';
  isEdited?: boolean;
  originalInvoiceId?: string;
  source?: 'invoice' | 'order'; // Add source to distinguish between table origins
}

function InvoicesList() {
  const navigate = useNavigate();
  const { currentProfile } = useProfile();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<string | null>(null);

  // Load invoices from database
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query based on user role
        let query = supabase
          .from('invoices')
          .select(`
            id,
            po_number,
            invoice_date,
            customer_name,
            total_amount,
            balance_due,
            is_edited,
            original_invoice_id,
            created_by,
            created_at
          `);

        // Role-based filtering
        if (currentProfile?.name === 'David') {
          // David (admin) can see all invoices
          query = query.order('created_at', { ascending: false });
        } else if (currentProfile?.name && ['Marti', 'Natalia', 'Dimitry'].includes(currentProfile.name)) {
          // Staff can only see their own invoices
          query = query
            .eq('created_by', currentProfile.name)
            .order('created_at', { ascending: false });
        } else {
          // If no valid profile, return empty array
          setInvoices([]);
          setFilteredInvoices([]);
          setLoading(false);
          return;
        }

        const { data: invoiceData, error: invoiceError } = await query;

        if (invoiceError) {
          throw invoiceError;
        }

        // Transform the data to match our interface
        const transformedInvoices: Invoice[] = (invoiceData || []).map((invoice) => {
          const balance = Number(invoice.balance_due) || 0;
          const total = Number(invoice.total_amount) || 0;
          
          let status: 'paid-in-full' | 'order-in-progress' = 'order-in-progress';
          if (balance <= 0) {
            status = 'paid-in-full';
          }

          return {
            id: invoice.id,
            customerName: invoice.customer_name || 'Unknown Customer',
            orderNumber: invoice.po_number || 'N/A',
            date: invoice.invoice_date || invoice.created_at,
            amount: total,
            balance: balance,
            status: status,
            isEdited: invoice.is_edited || false,
            originalInvoiceId: invoice.original_invoice_id || undefined,
            source: 'invoice' // All invoices now come from invoices table
          };
        });
        
        setInvoices(transformedInvoices);
        setFilteredInvoices(transformedInvoices);
        
        console.log('Loaded invoices from Supabase:', transformedInvoices); // Debug log
        
        // Remove auto-selection since we're removing the preview panel
      } catch (error) {
        console.error('Error loading invoices:', error);
        setError('Failed to load invoices. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, [currentProfile?.name]); // Re-load when profile changes

  // Handle search functionality
  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      setFilteredInvoices(invoices);
      return;
    }

    setIsSearching(true);
    try {
      const filtered = await searchInvoicesForList(invoices, term);
      setFilteredInvoices(filtered);
    } catch (error) {
      console.error('Error searching invoices:', error);
      setFilteredInvoices(invoices); // Fallback to showing all invoices
    } finally {
      setIsSearching(false);
    }
  };

  // Update filtered invoices when invoices change
  useEffect(() => {
    if (searchTerm.trim()) {
      handleSearch(searchTerm);
    } else {
      setFilteredInvoices(invoices);
    }
  }, [invoices]);

  // Transform invoices for the 3D cards component
  const transformedInvoicesFor3D = (() => {
    // Group invoices by PO number (order ID)
    const invoiceGroups = new Map<string, { original: Invoice; edited?: Invoice }>();
    
    filteredInvoices.forEach(invoice => {
      const poNumber = invoice.orderNumber; // This is the PO number/order ID
      
      if (!invoiceGroups.has(poNumber)) {
        // First time seeing this PO number
        if (invoice.originalInvoiceId) {
          // This is an edited invoice (has original_invoice_id) - we need to find its original
          const originalInvoice = filteredInvoices.find(inv => 
            inv.orderNumber === poNumber && !inv.originalInvoiceId
          );
          if (originalInvoice) {
            invoiceGroups.set(poNumber, { 
              original: originalInvoice, 
              edited: invoice 
            });
          } else {
            // No original found, treat edited as standalone (shouldn't happen but handle gracefully)
            invoiceGroups.set(poNumber, { original: invoice });
          }
        } else {
          // This is an original invoice (no original_invoice_id)
          invoiceGroups.set(poNumber, { original: invoice });
        }
      } else {
        // Already have an entry for this PO number
        const existingGroup = invoiceGroups.get(poNumber)!;
        
        if (invoice.originalInvoiceId && !existingGroup.edited) {
          // This is the edited version (has original_invoice_id), add it to the right side
          existingGroup.edited = invoice;
        } else if (!invoice.originalInvoiceId && existingGroup.original.originalInvoiceId) {
          // Current "original" is actually edited (has original_invoice_id), swap them
          existingGroup.edited = existingGroup.original;
          existingGroup.original = invoice;
        }
      }
    });

    console.log('Invoice groups by PO number:', Array.from(invoiceGroups.entries())); // Debug log

    // Convert groups to the format expected by InvoiceCards
    return Array.from(invoiceGroups.entries()).map(([poNumber, group]) => {
      console.log('Creating card for PO:', poNumber, 
        'Original has originalInvoiceId:', !!group.original.originalInvoiceId, 
        'Edited exists:', !!group.edited,
        'Edited has originalInvoiceId:', !!group.edited?.originalInvoiceId); // Debug log
      
      return {
        id: poNumber, // Use PO number as the group ID
        originalInvoice: {
          id: group.original.id,
          name: group.original.customerName,
          price: `$${group.original.amount.toFixed(2)}`,
          date: new Date(group.original.date).toLocaleDateString(),
          orderNumber: group.original.orderNumber,
          status: group.original.status === 'paid-in-full' ? 'paid' as const : 'pending' as const,
          description: `Balance: $${group.original.balance.toFixed(2)}`,
          items: []
        },
        editedInvoice: group.edited ? {
          id: group.edited.id,
          name: group.edited.customerName,
          price: `$${group.edited.amount.toFixed(2)}`,
          date: new Date(group.edited.date).toLocaleDateString(),
          orderNumber: group.edited.orderNumber,
          status: group.edited.status === 'paid-in-full' ? 'paid' as const : 'pending' as const,
          description: `Balance: $${group.edited.balance.toFixed(2)} (Edited)`,
          items: []
        } : undefined,
        editReason: group.edited ? 'Invoice was modified' : undefined,
        editDate: group.edited ? new Date(group.edited.date).toLocaleDateString() : undefined
      };
    });
  })();

  const handleEditInvoice = (invoiceId: string) => {
    // Navigate to invoice generator in edit mode
    navigate('/invoice-generator', {
      state: {
        editInvoice: {
          invoiceId: invoiceId
        }
      }
    });
  };

  const handleDeleteInvoice = async (invoiceId: string, orderNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${orderNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingInvoice(invoiceId);
      
      const success = await deleteInvoice(invoiceId);
      
      if (success) {
        // Remove the deleted invoice from both lists
        setInvoices(prev => prev.filter(invoice => invoice.id !== invoiceId));
        setFilteredInvoices(prev => prev.filter(invoice => invoice.id !== invoiceId));
      } else {
        alert('Failed to delete invoice. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice. Please try again.');
    } finally {
      setDeletingInvoice(null);
    }
  };

  const handleCreateOrder = () => {
    navigate('/invoice-generator');
  };

  if (loading) {
    return (
      <div className="fade-in pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Invoices</h1>
        </div>
        
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-gray-600">Loading invoices...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-in pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Invoices</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-800">
          <p>{error}</p>
          <Button 
            onClick={() => window.location.reload()}
            className="mt-2"
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Invoices</h1>
        <Button onClick={handleCreateOrder}>
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Search and filters */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by customer, order #, date, items, or brand..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          )}
        </div>
        {searchTerm && (
          <p className="text-sm text-gray-500 mt-2">
            Showing {filteredInvoices.length} of {invoices.length} invoices
          </p>
        )}
      </div>

      {/* Invoice cards grid */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No invoices found' : 'No invoices yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm 
              ? 'Try adjusting your search terms.' 
              : 'Create your first order or invoice to get started.'
            }
          </p>
          {!searchTerm && (
            <Button onClick={handleCreateOrder}>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice/Order
            </Button>
          )}
        </div>
      ) : (
        <>
        {/* Debug: Log the transformed data */}
        {console.log('transformedInvoicesFor3D:', transformedInvoicesFor3D)}
        
        {/* 3D Cards View */}
        <InvoiceCards 
          invoices={transformedInvoicesFor3D} 
          onEditInvoice={handleEditInvoice} 
          onDeleteInvoice={handleDeleteInvoice}
          showDeleteButton={currentProfile?.name === 'David'}
          deletingInvoice={deletingInvoice}
        />
        </>
      )}

      {/* Footer info */}
      {transformedInvoicesFor3D.length > 0 && (
        <div className="mt-6 text-sm text-gray-500 text-center">
          Showing {transformedInvoicesFor3D.length} invoice{transformedInvoicesFor3D.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

export default InvoicesList;
