import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { sanitizeAndProcessLinks } from '../../utils/sanitize';

// Utility function to process HTML and make links open in new tabs - NOW WITH SANITIZATION
const processLinksInHtml = (html: string): string => {
  return sanitizeAndProcessLinks(html);
};

interface QuotedContentProps {
  quotedContent: string;
}

export const QuotedContent: React.FC<QuotedContentProps> = ({ quotedContent }) => {
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

  if (!quotedContent || quotedContent.trim().length === 0) return null;

  const processedContent = processLinksInHtml(quotedContent);

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 text-xs text-gray-600 hover:text-gray-800 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <span>Show quoted text</span>
      </button>
      
      {isExpanded && (
        <div className="mt-3 pl-4 border-l-2 border-gray-200">
          <div 
            ref={contentRef}
            className="text-sm text-gray-600 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        </div>
      )}
    </div>
  );
};
