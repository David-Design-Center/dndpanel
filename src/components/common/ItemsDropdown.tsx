import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, X } from 'lucide-react';
import { useItems, Item } from '../../contexts/ItemsContext';

interface ItemsDropdownProps {
  value: string;
  onChange: (value: string | Item) => void;  // Can return string or full Item object
  className?: string;
  placeholder?: string;
  returnFullItem?: boolean;  // If true, onChange returns full Item object
}

export default function ItemsDropdown({ 
  value, 
  onChange, 
  className = '', 
  placeholder = 'Select item',
  returnFullItem = false
}: ItemsDropdownProps) {
  const { items, addItem, isAddingItem } = useItems();
  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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
          setShowAddForm(false);
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

  const filteredItems = items.filter(item =>
    item.description.toLowerCase().includes(value.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    updateDropdownPosition();
  };

  const handleItemSelect = (itemNameOrObject: string | Item) => {
    if (returnFullItem && typeof itemNameOrObject !== 'string') {
      // Find full item object and return it
      const fullItem = items.find(b => b.description === itemNameOrObject.description);
      if (fullItem) {
        onChange(fullItem);
      }
    } else if (typeof itemNameOrObject === 'string') {
      onChange(itemNameOrObject);
    }
    setIsOpen(false);
  };

  const handleAddItem = async () => {
    if (!value.trim()) return;
    
    try {
      await addItem(value.trim());
      setShowAddForm(false);
      setIsOpen(false);
      onChange(value.trim());
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showAddForm) {
        handleAddItem();
      } else if (value && !filteredItems.find(item => 
        item.description.toLowerCase() === value.toLowerCase()
      )) {
        setShowAddForm(true);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setShowAddForm(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className="w-full px-1 py-1 pr-16 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
              setShowAddForm(false);
            }}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            title="Clear selection"
          >
            <X size={16} />
          </button>
        )}
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
          {/* Add new item form */}
          {!showAddForm && value && !filteredItems.find(item => 
            item.description.toLowerCase() === value.toLowerCase()
          ) && (
            <>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-blue-600 font-medium flex items-center gap-2"
              >
                <Plus size={16} />
                Add '{value}' as new item
              </button>
              {filteredItems.length > 0 && <div className="border-t border-gray-200" />}
            </>
          )}
          
          {showAddForm && (
            <div className="p-3 border-b border-gray-200 bg-blue-50">
              <p className="text-xs font-medium text-gray-600 mb-2">Create new item</p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={isAddingItem || !value.trim()}
                  className="w-full px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isAddingItem ? 'Adding...' : 'Add Item'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="w-full px-2 py-1 text-gray-600 text-sm rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {filteredItems.length > 0 && <div className="border-t border-gray-200" />}
          
          {/* Existing items - moved to bottom */}
          {filteredItems.length > 0 && (
            <>
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemSelect(returnFullItem ? item : item.description)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none min-w-0"
                >
                  <span className="truncate block font-medium text-gray-900">{item.description}</span>
                  {item.brand_name && <span className="truncate block text-xs text-gray-500">Brand: {item.brand_name}</span>}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
