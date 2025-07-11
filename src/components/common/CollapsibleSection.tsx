import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

function CollapsibleSection({ 
  title, 
  children, 
  defaultExpanded = false, 
  className = '' 
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 flex items-center">
          {typeof title === 'string' ? (
            <h3 className="text-lg font-medium text-gray-800">{title}</h3>
          ) : (
            title
          )}
        </div>
        {isExpanded ? (
          <ChevronDown size={20} className="text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight size={20} className="text-gray-500 flex-shrink-0" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="border-t border-gray-200 pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export default CollapsibleSection;