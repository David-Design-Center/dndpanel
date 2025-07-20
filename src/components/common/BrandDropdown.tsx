import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import { useBrand } from '../../contexts/BrandContext';

interface BrandDropdownProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export default function BrandDropdown({ 
  value, 
  onChange, 
  className = '', 
  placeholder = 'Select brand' 
}: BrandDropdownProps) {
  const { brands, addBrand, isAddingBrand } = useBrand();
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

  // Filter brands based on input value
  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(value.toLowerCase())
  );

  const handleBrandSelect = (brandName: string) => {
    onChange(brandName);
    setIsOpen(false);
  };

  const handleAddBrand = async () => {
    if (!value.trim()) return;
    
    try {
      await addBrand(value.trim());
      setShowAddForm(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Error adding brand:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
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
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showAddForm) {
        handleAddBrand();
      } else if (value && !filteredBrands.find(brand => 
        brand.name.toLowerCase() === value.toLowerCase()
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
          {/* Add new brand section - moved to top */}
          {value && !filteredBrands.find(brand => 
            brand.name.toLowerCase() === value.toLowerCase()
          ) && (
            <div>
              {!showAddForm ? (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center min-w-0"
                >
                  <Plus size={16} className="mr-2 flex-shrink-0" />
                  <span className="truncate">Add "{value}" as new brand</span>
                </button>
              ) : (
                <div className="p-3 bg-blue-50">
                  <div className="text-sm text-gray-700 mb-2 truncate">
                    Add "{value}" as new brand
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddBrand}
                      disabled={isAddingBrand}
                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
                    >
                      {isAddingBrand ? 'Adding...' : 'Add Brand'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 flex-shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {filteredBrands.length > 0 && <div className="border-t border-gray-200" />}
            </div>
          )}
          
          {/* Existing brands - moved to bottom */}
          {filteredBrands.length > 0 && (
            <>
              {filteredBrands.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => handleBrandSelect(brand.name)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none min-w-0"
                >
                  <span className="truncate block">{brand.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
