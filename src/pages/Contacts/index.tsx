import { useState, useEffect } from 'react';
import ContactsTable from '../../components/ui/contacts-table';
import { fetchOrdersContacts } from '../../services/ordersContactService';

interface Contact {
  id: string;
  fullName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  tel1: string;
  tel2: string;
  email: string;
  contributors: {
    name: string;
    initials: string;
  }[];
  orderNumbers: string[];
}

function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const contactsData = await fetchOrdersContacts();
      setContacts(contactsData);
    } catch (err) {
      console.error('Error loading contacts:', err);
      setError('Failed to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
                        Total orders: <span className="font-semibold">
                          {contacts.reduce((total, contact) => total + contact.orderNumbers.length, 0)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <ContactsTable contacts={contacts} loading={loading} />
          </>
        )}
      </main>
    </div>
  );
}

export default Contacts;
