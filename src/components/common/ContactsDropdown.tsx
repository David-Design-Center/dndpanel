import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Loader, Plus } from 'lucide-react';
import { fetchContacts, Contact } from '../../services/contactsService';

interface ContactsDropdownProps {
  value: string; // Display the full name
  onChange: (contactData: {
    customerName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    tel1: string;
    tel2: string;
    email: string;
  }) => void;
  className?: string;
  placeholder?: string;
}

export default function ContactsDropdown({
  value,
  onChange,
  className = '',
  placeholder = 'Enter customer name'
}: ContactsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load contacts from Supabase
  useEffect(() => {
    const loadContacts = async () => {
      if (isOpen && contacts.length === 0 && !isLoading) {
        setIsLoading(true);
        setError(null);
        try {
          console.log('🔄 ContactsDropdown: Loading contacts...');
          const data = await fetchContacts();
          if (data) {
            setContacts(data);
            console.log('✅ ContactsDropdown: Loaded', data.length, 'contacts');
          }
        } catch (err) {
          console.error('❌ ContactsDropdown: Error loading contacts:', err);
          setError('Failed to load contacts');
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadContacts();
  }, [isOpen, contacts.length, isLoading]);

  // Calculate dropdown position relative to viewport
  const updateDropdownPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  // Update position when dropdown opens
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      // Update position on scroll or resize
      const handleUpdate = () => updateDropdownPosition();
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);

      // Close dropdown when clicking outside
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);

      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Handle contact selection
  const handleContactSelect = (contact: Contact) => {
    // Build the contact data for autofill
    const contactData = {
      customerName: contact.fullName || '',
      address: contact.address || '',
      city: contact.city || '',
      state: contact.state || '',
      zip: contact.zipCode || '',
      tel1: contact.phone1 ? contact.phone1.replace(/[^\d]/g, '').slice(0, 3) : '',
      tel2: contact.phone2 ? contact.phone2.replace(/[^\d]/g, '').slice(0, 8) : '',
      email: contact.email || ''
    };

    // Call onChange with the full contact data
    onChange(contactData);
    
    // Update display
    setSearchTerm(contact.fullName);
    setIsOpen(false);
  };

  // Filter contacts based on search term
  const filteredContacts = contacts.filter(contact =>
    contact.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);

    // Show dropdown if user is typing
    if (newValue && !isOpen) {
      setIsOpen(true);
      updateDropdownPosition();
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    updateDropdownPosition();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-1 py-1 pr-8 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              updateDropdownPosition();
            }
          }}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1"
        >
          <ChevronDown size={16} className="text-gray-400" />
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto min-w-0"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width || 200,
            minWidth: 200
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader size={16} className="animate-spin mr-2 text-blue-500" />
              <span className="text-sm text-gray-600">Loading contacts...</span>
            </div>
          ) : error ? (
            <div className="p-3 text-sm text-red-600">
              {error}
            </div>
          ) : (
            <>
              {/* Add new contact section - shown when no exact match found */}
              {searchTerm && !filteredContacts.find(contact =>
                contact.fullName.toLowerCase() === searchTerm.toLowerCase()
              ) && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      // Treat typed name as new contact with just the name filled in
                      onChange({
                        customerName: searchTerm,
                        address: '',
                        city: '',
                        state: '',
                        zip: '',
                        tel1: '',
                        tel2: '',
                        email: ''
                      });
                      setIsOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center min-w-0"
                  >
                    <Plus size={16} className="mr-2 flex-shrink-0" />
                    <span className="truncate">Add "{searchTerm}" as new contact</span>
                  </button>
                  {filteredContacts.length > 0 && <div className="border-t border-gray-200" />}
                </div>
              )}

              {/* Existing contacts list */}
              {filteredContacts.length > 0 ? (
                <>
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleContactSelect(contact)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none min-w-0 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="truncate font-medium text-gray-900">{contact.fullName}</div>
                      {contact.email && (
                        <div className="truncate text-xs text-gray-500">{contact.email}</div>
                      )}
                    </button>
                  ))}
                </>
              ) : !searchTerm ? (
                <div className="p-3 text-sm text-gray-600 text-center">
                  Start typing to search contacts
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
