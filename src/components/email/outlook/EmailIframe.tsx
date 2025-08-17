import { useEffect, useRef } from 'react';

interface EmailIframeProps {
  html: string;
  className?: string;
}

export default function EmailIframe({ html, className = '' }: EmailIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    // Create a sanitized HTML document
    const srcDoc = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta http-equiv="Content-Security-Policy"
            content="default-src 'none'; img-src data: http: https: cid:; style-src 'unsafe-inline' data: http: https:; font-src data: http: https:;">
          <meta name="color-scheme" content="light">
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 15px;
              line-height: 1.6;
              margin: 16px;
              color: #374151;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            
            a {
              color: #2563eb;
              text-decoration: underline;
            }
            
            a:hover {
              color: #1d4ed8;
            }
            
            img {
              max-width: 100%;
              height: auto;
              border-radius: 8px;
            }
            
            table {
              max-width: 100%;
              border-collapse: collapse;
            }
            
            blockquote {
              border-left: 4px solid #e5e7eb;
              margin: 16px 0;
              padding-left: 16px;
              color: #6b7280;
            }
            
            pre {
              background: #f9fafb;
              border-radius: 8px;
              padding: 12px;
              overflow-x: auto;
              font-size: 14px;
            }
            
            code {
              background: #f3f4f6;
              padding: 2px 4px;
              border-radius: 4px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `;

    iframeRef.current.srcdoc = srcDoc;

    // Handle link clicks to open in new tab and auto-resize
    const handleLoad = () => {
      if (!iframeRef.current?.contentDocument) return;
      
      const links = iframeRef.current.contentDocument.querySelectorAll('a');
      links.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const href = link.getAttribute('href');
          if (href && href.trim() !== '' && href !== '#') {
            window.open(href, '_blank', 'noopener,noreferrer');
          }
        });
      });

      // Auto-resize iframe to content height
      const resizeIframe = () => {
        if (iframeRef.current?.contentDocument?.body) {
          const body = iframeRef.current.contentDocument.body;
          const height = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            60 // minimum height
          );
          iframeRef.current.style.height = `${height + 20}px`; // Add some padding
        }
      };

      // Initial resize
      resizeIframe();
      
      // Resize on content changes
      const observer = new MutationObserver(resizeIframe);
      observer.observe(iframeRef.current.contentDocument.body, {
        childList: true,
        subtree: true,
        attributes: true
      });

      // Cleanup observer
      iframeRef.current.addEventListener('beforeunload', () => {
        observer.disconnect();
      });
    };

    iframeRef.current.addEventListener('load', handleLoad);

    return () => {
      if (iframeRef.current) {
        iframeRef.current.removeEventListener('load', handleLoad);
      }
    };
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      className={`w-full border-0 ${className}`}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      style={{ 
        minHeight: '60px',
        height: 'auto',
        border: 'none',
        borderRadius: '0'
      }}
    />
  );
}
