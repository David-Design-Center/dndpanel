import { useState, useRef, useEffect } from 'react';
import { useContacts } from '../../contexts/ContactsContext';
import { Loader } from 'lucide-react';

interface EmailContactsDropdownProps {
  value: string;
  onChange: (email: string) => void;
  placeholder?: string;
  className?: string;
}

export default function EmailContactsDropdown({
  value,
  onChange,
  className = ''
}: EmailContactsDropdownProps) {
  const { contacts, isLoading } = useContacts();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate dropdown position
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
      
      const handleUpdate = () => updateDropdownPosition();
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);

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

  // Filter contacts based on search term
  const filteredContacts = contacts.filter(contact => {
    if (!value.trim()) return true;
    const searchLower = value.toLowerCase();
    return (
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.name?.toLowerCase().includes(searchLower)
    );
  }).slice(0, 10); // Limit to 10 results

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Show dropdown if user is typing
    if (!isOpen) {
      setIsOpen(true);
      updateDropdownPosition();
    }
  };

  const handleContactSelect = (email: string) => {
    onChange(email);
    setIsOpen(false);
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
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />

      {isOpen && (
        <div
          className="fixed z-[10000] bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
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
          ) : filteredContacts.length > 0 ? (
            <>
              {filteredContacts.map((contact, index) => (
                <button
                  key={contact.email || index}
                  type="button"
                  onClick={() => handleContactSelect(contact.email)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                >
                  <div className="truncate font-medium text-gray-900">{contact.name}</div>
                  <div className="truncate text-xs text-gray-500">{contact.email}</div>
                </button>
              ))}
            </>
          ) : (
            <div className="p-3 text-sm text-gray-600 text-center">
              {value.trim() ? 'No contacts found' : 'Start typing to search contacts'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
