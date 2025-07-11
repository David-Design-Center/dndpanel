import { useState, useRef, useEffect } from 'react';
import { PlusCircle, ChevronDown } from 'lucide-react';
import { OrderType } from '../../../types';
import { useNavigate } from 'react-router-dom';

interface NewOrderButtonProps {
  onSelectOrderType: (type: OrderType) => void;
}

function NewOrderButton({ onSelectOrderType }: NewOrderButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelection = (type: OrderType) => {
    onSelectOrderType(type);
    setIsOpen(false);
    
    // Navigate based on the selected order type
    if (type === 'Price Request') {
      navigate('/create-price-request');
    } else if (type === 'Customer Order') {
      navigate('/create-customer-order');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="btn btn-primary flex items-center justify-center space-x-1 py-2 px-3 text-sm w-44"
      >
        <PlusCircle size={14} />
        <span>New Order</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 py-1 border border-gray-200 slide-in">
          <button
            onClick={() => handleSelection('Price Request')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Price Request
          </button>
          <button
            onClick={() => handleSelection('Customer Order')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Customer Order
          </button>
        </div>
      )}
    </div>
  );
}

export default NewOrderButton;