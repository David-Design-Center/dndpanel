import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

interface SecurityNoteProps {
  banners: string[];
}

export const SecurityNote: React.FC<SecurityNoteProps> = ({ banners }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!banners || banners.length === 0) return null;

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 hover:bg-amber-100 transition-colors"
      >
        <AlertTriangle className="w-3 h-3" />
        <span>Security note</span>
        {isExpanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </button>
      
      {isExpanded && (
        <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
          {banners.map((banner, index) => (
            <p key={index} className="text-xs text-amber-800 mb-1 last:mb-0">
              {banner}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
