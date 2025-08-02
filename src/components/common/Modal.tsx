import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  zIndex?: number; // Allow custom z-index
}

function Modal({ isOpen, onClose, children, title, size = 'xl', zIndex = 50 }: ModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Slight delay to trigger the animation
      const timer = setTimeout(() => setIsVisible(true), 10);
      
      // Add ESC key listener
      const handleEscKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleEscKey);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleEscKey);
      };
    } else {
      setIsVisible(false);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    console.log('Modal backdrop clicked', { target: e.target, currentTarget: e.currentTarget });
    if (e.target === e.currentTarget) {
      console.log('Closing modal due to backdrop click');
      onClose();
    }
  };

  if (!shouldRender) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  };

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: zIndex }}>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black transition-opacity duration-200 ease-out"
        style={{ 
          opacity: isVisible ? 0.5 : 0,
          zIndex: zIndex 
        }}
        onClick={handleBackdropClick}
      />
      
      {/* Modal */}
      <div 
        className="flex min-h-full items-center justify-center p-4"
        onClick={handleBackdropClick}
        style={{ zIndex: zIndex + 1 }}
      >
        <div 
          className={`relative bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden transform transition-all duration-200 ease-out ${
            isVisible 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-95 translate-y-4'
          }`}
          style={{ zIndex: zIndex + 2 }}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
                <span className="hidden sm:inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-600">
                  Press ESC to close
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-150 p-1 rounded-full hover:bg-gray-200"
              >
                <X size={24} />
              </button>
            </div>
          )}
          
          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            {children}
          </div>
          
          {/* Close button if no title */}
          {!title && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-150 z-10 p-2 rounded-full hover:bg-gray-100"
            >
              <X size={24} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal;