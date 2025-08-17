import { useEffect, useRef } from 'react';

interface IsolatedEmailContentProps {
  htmlContent: string;
  className?: string;
}

function IsolatedEmailContent({ htmlContent, className = '' }: IsolatedEmailContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !htmlContent) return;

    // Create a completely isolated document fragment
    const container = containerRef.current;
    
    // Clear any existing content
    container.innerHTML = '';

    // Create an isolated iframe-like container
    const isolatedContainer = document.createElement('div');
    
    // Apply ultra-strong isolation styles directly
    isolatedContainer.style.cssText = `
      all: initial !important;
      display: block !important;
      width: 100% !important;
      height: auto !important;
      box-sizing: border-box !important;
      isolation: isolate !important;
      contain: layout style paint size !important;
      overflow: hidden !important;
      position: relative !important;
      z-index: 0 !important;
      transform: translateZ(0) !important;
      will-change: transform !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif !important;
      font-size: 14px !important;
      line-height: 1.5 !important;
      color: #374151 !important;
      background: white !important;
      padding: 1rem !important;
      border-radius: 0.5rem !important;
      margin: 0 !important;
      max-width: 100% !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
    `;

    // Sanitize and set the HTML content
    const sanitizedHtml = sanitizeForIsolation(htmlContent);
    isolatedContainer.innerHTML = sanitizedHtml;

    // Add click handler for links
    isolatedContainer.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'A') {
        const link = target as HTMLAnchorElement;
        const href = link.getAttribute('href');
        if (href && href.trim() !== '' && href !== '#') {
          event.preventDefault();
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      }
    });

    // Apply isolation to all child elements
    const applyIsolationToChildren = (element: Element) => {
      Array.from(element.children).forEach(child => {
        const htmlChild = child as HTMLElement;
        
        // Force safe positioning and sizing
        if (htmlChild.style) {
          htmlChild.style.position = 'static';
          htmlChild.style.zIndex = 'auto';
          htmlChild.style.maxWidth = '100%';
          htmlChild.style.boxSizing = 'border-box';
          
          // Remove dangerous positioning and layout styles
          htmlChild.style.removeProperty('position');
          htmlChild.style.removeProperty('z-index');
          htmlChild.style.removeProperty('top');
          htmlChild.style.removeProperty('left');
          htmlChild.style.removeProperty('right');
          htmlChild.style.removeProperty('bottom');
          htmlChild.style.removeProperty('fixed');
          htmlChild.style.removeProperty('absolute');
        }

        // Recursively apply to nested children
        if (child.children.length > 0) {
          applyIsolationToChildren(child);
        }
      });
    };

    applyIsolationToChildren(isolatedContainer);

    // Append to the container
    container.appendChild(isolatedContainer);

    // Cleanup function
    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [htmlContent]);

  return (
    <div 
      ref={containerRef} 
      className={`isolated-email-content ${className}`}
      style={{
        isolation: 'isolate',
        contain: 'layout style paint',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 0,
        transform: 'translateZ(0)'
      }}
    />
  );
}

// Enhanced sanitization for complete isolation
function sanitizeForIsolation(html: string): string {
  if (!html) return '';

  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Remove all dangerous elements and attributes
    const dangerousElements = tempDiv.querySelectorAll('script, style, link, meta, title, head, html, body, iframe, object, embed, applet, form, input, button, select, textarea');
    dangerousElements.forEach(el => el.remove());

    // Remove all event handlers and dangerous attributes
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach(el => {
      // Remove event handlers
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('on') || 
            attr.name === 'style' ||
            attr.name === 'class' ||
            attr.name === 'id') {
          el.removeAttribute(attr.name);
        }
      });

      // Remove inline styles that could affect layout
      el.removeAttribute('style');
      el.removeAttribute('class');
      el.removeAttribute('id');
    });

    // Handle images safely
    const images = tempDiv.querySelectorAll('img');
    images.forEach(img => {
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '10px 0';
    });

    // Handle tables safely
    const tables = tempDiv.querySelectorAll('table');
    tables.forEach(table => {
      table.style.maxWidth = '100%';
      table.style.tableLayout = 'auto';
      table.style.wordBreak = 'break-word';
      table.style.borderCollapse = 'collapse';
    });

    // Handle links safely - make them open in new tabs
    const links = tempDiv.querySelectorAll('a');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.trim() !== '' && href !== '#') {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });

    return tempDiv.innerHTML;
  } catch (error) {
    console.warn('Error sanitizing email content for isolation:', error);
    return '';
  }
}

export default IsolatedEmailContent;
