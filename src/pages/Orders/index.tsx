import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { InvoiceCards } from '@/components/invoice/InvoiceCards';
import { useProfile } from '../../contexts/ProfileContext';
import { useAuth } from '../../contexts/AuthContext';
import { deleteOrder } from '../../services/ordersService';
import { searchInvoicesForList } from '../../utils/searchUtils';

// Using shared Supabase client

interface SupplierInvoice {
  id: string;
  supplierName: string;
  companyName?: string;
  orderNumber: string;
  date: string;
  status: 'received' | 'pending';
  isEdited?: boolean;
  originalInvoiceId?: string;
  supplierAddress?: string;
  supplierCity?: string;
  supplierState?: string;
  supplierZip?: string;
  supplierEmail?: string;
  supplierPhones: string[];
  amount: number; // Keep for compatibility with shared utilities
  balance: number;
  customerName: string; // Alias used by shared search utility
}

function Orders() {
  const navigate = useNavigate();
  const { currentProfile } = useProfile();
  const { isGmailSignedIn } = useAuth();
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [filteredSupplierInvoices, setFilteredSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<string | null>(null);

  useEffect(() => {
    const loadSupplierInvoices = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('orders')
          .select('*, suppliers(*)');

        if (currentProfile?.name === 'David') {
          query = query.order('created_at', { ascending: false });
        } else if (currentProfile?.name && ['Marti', 'Natalia', 'Dimitry'].includes(currentProfile.name)) {
          query = query
            .eq('created_by', currentProfile.name)
            .order('created_at', { ascending: false });
        } else {
          setSupplierInvoices([]);
          setFilteredSupplierInvoices([]);
          setLoading(false);
          return;
        }

  const { data: orderData, error: orderError } = await query;

        if (orderError) {
          throw orderError;
        }

        const ordersFromDb = orderData || [];

        const transformed: SupplierInvoice[] = ordersFromDb.map((order: any) => {
          const supplier = order.suppliers || {};
          const supplierName = supplier.display_name || supplier.company_name || 'Unknown Supplier';
          const phones = [supplier.phone_primary, supplier.phone_secondary].filter((p: string) => !!p && typeof p === 'string');
          const email = supplier.email as string | undefined;

          return {
            id: order.id,
            supplierName,
            companyName: supplier.company_name || undefined,
            orderNumber: order.order_number || 'N/A',
            date: order.order_date || order.created_at,
            status: (order.status === 'received' ? 'received' : 'pending') as 'received' | 'pending',
            isEdited: false,
            originalInvoiceId: undefined,
            supplierAddress: supplier.address_line1 || undefined,
            supplierCity: supplier.city || undefined,
            supplierState: supplier.state || undefined,
            supplierZip: supplier.postal_code || undefined,
            supplierEmail: email,
            supplierPhones: phones as string[],
            amount: 0,
            balance: 0,
            customerName: supplierName,
          };
        });

        setSupplierInvoices(transformed);
        setFilteredSupplierInvoices(transformed);
      } catch (err) {
        console.error('Error loading supplier invoices:', err);
        setError('Failed to load supplier invoices. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadSupplierInvoices();
  }, [currentProfile?.name]);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);

    if (!term.trim()) {
      setFilteredSupplierInvoices(supplierInvoices);
      return;
    }

    setIsSearching(true);
    try {
      const filtered = await searchInvoicesForList<SupplierInvoice>(supplierInvoices, term);
      setFilteredSupplierInvoices(filtered);
    } catch (err) {
      console.error('Error searching supplier invoices:', err);
      setFilteredSupplierInvoices(supplierInvoices);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (searchTerm.trim()) {
      handleSearch(searchTerm);
    } else {
      setFilteredSupplierInvoices(supplierInvoices);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierInvoices]);

  const supplierInvoiceCards = useMemo(() => {
    const invoiceGroups = new Map<string, { original: SupplierInvoice; edited?: SupplierInvoice }>();

    filteredSupplierInvoices.forEach(invoice => {
      const groupKey = invoice.orderNumber || invoice.id;

      if (!invoiceGroups.has(groupKey)) {
        if (invoice.originalInvoiceId) {
          const originalInvoice = filteredSupplierInvoices.find(inv => inv.orderNumber === invoice.orderNumber && !inv.originalInvoiceId);
          if (originalInvoice) {
            invoiceGroups.set(groupKey, { original: originalInvoice, edited: invoice });
          } else {
            invoiceGroups.set(groupKey, { original: invoice });
          }
        } else {
          invoiceGroups.set(groupKey, { original: invoice });
        }
      } else {
        const existing = invoiceGroups.get(groupKey)!;
        if (invoice.originalInvoiceId && !existing.edited) {
          existing.edited = invoice;
        } else if (!invoice.originalInvoiceId && existing.original.originalInvoiceId) {
          existing.edited = existing.original;
          existing.original = invoice;
        }
      }
    });

    const buildCardPayload = (invoice: SupplierInvoice) => {
      const description = buildReadableAddress(invoice);
      const contactItems = buildContactItems(invoice);

      return {
        id: invoice.id,
        name: invoice.supplierName,
        price: '',
        date: new Date(invoice.date).toLocaleDateString(),
        orderNumber: invoice.orderNumber,
        description,
        items: contactItems,
      };
    };

    return Array.from(invoiceGroups.entries()).map(([poNumber, group]) => ({
      id: poNumber,
      originalInvoice: buildCardPayload(group.original),
      editedInvoice: group.edited ? buildCardPayload(group.edited) : undefined,
      editReason: group.edited ? 'Supplier invoice was modified' : undefined,
      editDate: group.edited ? new Date(group.edited.date).toLocaleDateString() : undefined,
    }));
  }, [filteredSupplierInvoices]);

  const handleEditInvoice = (invoiceId: string) => {
    // Navigate to supplier order generator with edit state
    navigate('/supplier-order-generator', {
      state: {
        editOrder: {
          orderId: invoiceId,
        },
      },
    });
  };

  const handleDeleteInvoice = async (invoiceId: string, orderNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete supplier order ${orderNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingInvoice(invoiceId);

      const success = await deleteOrder(invoiceId);

      if (success) {
        setSupplierInvoices(prev => prev.filter(invoice => invoice.id !== invoiceId));
        setFilteredSupplierInvoices(prev => prev.filter(invoice => invoice.id !== invoiceId));
      } else {
        alert('Failed to delete invoice. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting supplier invoice:', err);
      alert('Failed to delete invoice. Please try again.');
    } finally {
      setDeletingInvoice(null);
    }
  };

  const handleCreateSupplierInvoice = () => {
    navigate('/supplier-order-generator');
  };

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
              Please connect to Gmail to access Supplier Invoices. This page requires Gmail integration to manage your vendor billing.
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

  if (loading) {
    return (
      <div className="fade-in pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Supplier Invoices</h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-gray-600">Loading supplier invoices...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-in pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Supplier Invoices</h1>
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Supplier Invoices</h1>
        <Button onClick={handleCreateSupplierInvoice}>
          <Plus className="h-4 w-4 mr-2" />
          Create Supplier Invoice
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by supplier, PO #, date, or brand..."
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
            Showing {filteredSupplierInvoices.length} of {supplierInvoices.length} supplier invoices
          </p>
        )}
      </div>

      {filteredSupplierInvoices.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No supplier invoices found' : 'No supplier invoices yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm 
              ? 'Try adjusting your search terms.' 
              : 'Create your first supplier invoice to get started.'
            }
          </p>
          {!searchTerm && (
            <Button onClick={handleCreateSupplierInvoice}>
              <Plus className="h-4 w-4 mr-2" />
              Create Supplier Invoice
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-500">
            Showing {supplierInvoiceCards.length} supplier invoice{supplierInvoiceCards.length !== 1 ? 's' : ''}
          </div>
          <InvoiceCards
            invoices={supplierInvoiceCards}
            onEditInvoice={handleEditInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            showDeleteButton={currentProfile?.name === 'David'}
            deletingInvoice={deletingInvoice}
            hidePrice
            dataSource="orders"
          />
        </>
      )}
    </div>
  );
}

function buildReadableAddress(invoice: SupplierInvoice): string {
  const parts = [invoice.supplierAddress, invoice.supplierCity, invoice.supplierState, invoice.supplierZip]
    .map(part => part?.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'No supplier address provided';
}

function buildContactItems(invoice: SupplierInvoice): string[] {
  const items: string[] = [];

  if (invoice.companyName) {
    items.push(invoice.companyName);
  }

  if (invoice.supplierEmail) {
    items.push(`Email: ${invoice.supplierEmail}`);
  }

  invoice.supplierPhones.forEach((phone, index) => {
    if (index === 0) {
      items.push(`Phone: ${phone}`);
    } else {
      items.push(`Alt: ${phone}`);
    }
  });

  return items;
}

export default Orders;
