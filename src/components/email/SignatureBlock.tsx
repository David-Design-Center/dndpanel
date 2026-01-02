import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { sanitizeAndProcessLinks } from '../../utils/sanitize';

// Utility function to process HTML and make links open in new tabs - NOW WITH SANITIZATION
const processLinksInHtml = (html: string): string => {
  return sanitizeAndProcessLinks(html);
};

interface SignatureBlockProps {
  signatures: string[];
}

export const SignatureBlock: React.FC<SignatureBlockProps> = ({ signatures }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Add click handler for links
  useEffect(() => {
    if (isExpanded && contentRef.current) {
      const handleClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target.tagName === 'A') {
          const link = target as HTMLAnchorElement;
          const href = link.getAttribute('href');
          if (href && href.trim() !== '' && href !== '#') {
            event.preventDefault();
            window.open(href, '_blank', 'noopener,noreferrer');
          }
        }
      };

      contentRef.current.addEventListener('click', handleClick);
      return () => {
        if (contentRef.current) {
          contentRef.current.removeEventListener('click', handleClick);
        }
      };
    }
  }, [isExpanded]);

  if (!signatures || signatures.length === 0) return null;

  return (
    <div className="mt-4 border-t border-gray-100 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <span>Signature</span>
      </button>
      
      {isExpanded && (
        <div ref={contentRef} className="mt-2">
          {signatures.map((signature, index) => (
            <div 
              key={index}
              className="text-xs"
              dangerouslySetInnerHTML={{ __html: processLinksInHtml(signature) }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
