import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useContacts } from '../../contexts/ContactsContext';
import { AlertCircle } from 'lucide-react';
import ContactsTable from '../../components/ui/contacts-table';
import { EditContactModal } from '../../components/ui/edit-contact-modal';
import { 
  fetchContacts, 
  deleteContact, 
  deleteContacts, 
  updateContact,
  createContact,
  Contact
} from '../../services/contactsService';

function Contacts() {
  const { isGmailSignedIn } = useAuth();
  const { setShouldLoadContacts } = useContacts();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    // Expert optimization: Trigger contact loading when navigating to Contacts page (user intent)
    setShouldLoadContacts(true);
    loadContacts();
  }, [setShouldLoadContacts]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Starting to fetch contacts...');
      
      const contactsData = await fetchContacts();
      console.log('📊 Contacts data from service:', contactsData);
      
      // The service already transforms the data, so we can use it directly
      setContacts(contactsData);
    } catch (err) {
      console.error('❌ Error loading contacts:', err);
      setError('Failed to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setIsEditModalOpen(true);
  };

  const handleSaveContact = async (updatedContact: any) => {
    try {
      console.log('💾 Saving contact to database:', updatedContact);
      
      if (updatedContact.id) {
        // Update existing contact
        await updateContact(updatedContact.id, {
          fullName: updatedContact.fullName,
          email: updatedContact.email,
          phone1: updatedContact.phone1,
          phone2: updatedContact.phone2,
          address: updatedContact.address,
          city: updatedContact.city,
          state: updatedContact.state,
          zipCode: updatedContact.zipCode,
        });

        // Update the contact in the local state only after successful database update
        setContacts(prev => prev.map(c => 
          c.id === updatedContact.id 
            ? {
                ...c,
                fullName: updatedContact.fullName,
                email: updatedContact.email,
                tel1: updatedContact.phone1,
                tel2: updatedContact.phone2,
                address: updatedContact.address,
                city: updatedContact.city,
                state: updatedContact.state,
                zip: updatedContact.zipCode,
              }
            : c
        ));

        console.log('✅ Contact updated successfully');
        alert('Contact updated successfully!');
      } else {
        // Create new contact
        const newContactData = await createContact({
          fullName: updatedContact.fullName,
          email: updatedContact.email,
          phone1: updatedContact.phone1,
          phone2: updatedContact.phone2,
          address: updatedContact.address,
          city: updatedContact.city,
          state: updatedContact.state,
          zipCode: updatedContact.zipCode,
          // Backward compatibility aliases
          zip: updatedContact.zipCode,
          tel1: updatedContact.phone1,
          tel2: updatedContact.phone2,
          orderNumbers: [],
          contributors: [],
          poNumbers: [],
          invoiceCount: 0,
        });

        // Add the new contact to local state
        const newContact: Contact = {
          id: newContactData.id,
          fullName: newContactData.full_name,
          email: newContactData.email || '',
          phone1: newContactData.phone_1 || '',
          phone2: newContactData.phone_2 || '',
          address: newContactData.address || '',
          city: newContactData.city || '',
          state: newContactData.state || '',
          zipCode: newContactData.zip_code || '',
          // Backward compatibility aliases
          zip: newContactData.zip_code || '',
          tel1: newContactData.phone_1 || '',
          tel2: newContactData.phone_2 || '',
          orderNumbers: [],
          contributors: [],
          poNumbers: [],
          invoiceCount: 0,
          createdAt: newContactData.created_at,
          updatedAt: newContactData.updated_at,
        };

        setContacts(prev => [newContact, ...prev]);
        console.log('✅ Contact created successfully');
        alert('Contact created successfully!');
      }
    } catch (error) {
      console.error('❌ Error saving contact:', error);
      alert(updatedContact.id ? 'Failed to update contact. Please try again.' : 'Failed to create contact. Please try again.');
      throw error; // Re-throw to let the modal handle the error state
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (confirm('Are you sure you want to delete this contact? This action cannot be undone.')) {
      try {
        await deleteContact(contactId);
        // Remove from local state
        setContacts(prev => prev.filter(c => c.id !== contactId));
        alert('Contact deleted successfully!');
      } catch (error) {
        console.error('Error deleting contact:', error);
        alert('Failed to delete contact. Please try again.');
      }
    }
  };

  const handleDeleteSelected = async (contactIds: string[]) => {
    if (confirm(`Are you sure you want to delete ${contactIds.length} contacts? This action cannot be undone.`)) {
      try {
        await deleteContacts(contactIds);
        // Remove from local state
        setContacts(prev => prev.filter(c => !contactIds.includes(c.id)));
        alert(`${contactIds.length} contacts deleted successfully!`);
      } catch (error) {
        console.error('Error deleting contacts:', error);
        alert('Failed to delete contacts. Please try again.');
      }
    }
  };

  // Check Gmail authentication
  if (!isGmailSignedIn) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Gmail Connection Required</h3>
            <p className="text-gray-600 mb-6">
              Please connect to Gmail to access Contacts. This page requires Gmail integration to manage your customer contacts.
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
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <header className="flex-none bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Contacts</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage customer contacts from orders
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setEditingContact(null);
                setIsEditModalOpen(true);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Contact</span>
            </button>
            <button
              onClick={loadContacts}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-gray-50 p-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {!loading && (
              <div className="mb-6">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">Contact Summary</h2>
                      <p className="text-sm text-gray-600">
                        Total contacts: <span className="font-semibold">{contacts.length}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Total invoices: <span className="font-semibold">
                          {contacts.reduce((total, contact) => total + (contact.invoiceCount || 0), 0)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <ContactsTable 
              contacts={contacts} 
              loading={loading}
              onEditContact={handleEditContact}
              onDeleteContact={handleDeleteContact}
              onDeleteSelected={handleDeleteSelected}
            />
          </>
        )}
      </main>

      {/* Edit Contact Modal */}
      <EditContactModal
        contact={editingContact}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingContact(null);
        }}
        onSave={handleSaveContact}
      />
    </div>
  );
}

export default Contacts;
