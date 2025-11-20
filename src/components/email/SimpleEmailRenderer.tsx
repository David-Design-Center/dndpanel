/**
 * SimpleEmailRenderer
 * 
 * Consolidated, reliable email body renderer based on reference system
 * Replaces: EmbeddedViewEmailClean, EmailViewer, MessageCard complexity
 * 
 * Key principles:
 * - Use iframe for security isolation
 * - Simple, aggressive CSS reset
 * - No Shadow DOM complexity
 * - Direct HTML rendering
 */

import React, { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';

interface SimpleEmailRendererProps {
  htmlContent: string;
  className?: string;
  minHeight?: string;
}

export function SimpleEmailRenderer({ 
  htmlContent, 
  className = '',
  minHeight = '200px'
}: SimpleEmailRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current || !htmlContent) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (!doc) return;

    // Sanitize HTML (security)
    const cleanHtml = DOMPurify.sanitize(htmlContent, {
      ADD_TAGS: ['style', 'link'],
      ADD_ATTR: ['target', 'style', 'class', 'id', 'width', 'height', 'src', 'href', 'alt', 'title'],
      ALLOW_DATA_ATTR: false,
    });

    // Wrap in complete HTML document with aggressive CSS reset
    const wrappedHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="referrer" content="no-referrer">
        <base target="_blank">
        <style>
          /* Aggressive reset - based on reference system */
          * {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          
          body {
            margin: 0;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #374151;
            overflow-x: hidden;
            word-wrap: break-word;
            background: white;
          }
          
          /* Images */
          img {
            max-width: 100% !important;
            height: auto !important;
            display: block;
            margin: 0.5em 0;
          }
          
          /* Tables */
          table {
            max-width: 100% !important;
            border-collapse: collapse;
            table-layout: fixed;
          }
          
          td, th {
            word-wrap: break-word;
            padding: 4px 8px;
          }
          
          /* Links */
          a {
            color: #1a73e8;
            text-decoration: none;
          }
          
          a:hover {
            text-decoration: underline;
          }
          
          /* Paragraphs */
          p {
            margin: 0.5em 0;
          }
          
          /* Prevent horizontal scroll */
          pre, code {
            white-space: pre-wrap;
            word-wrap: break-word;
            max-width: 100%;
            overflow-x: auto;
          }
        </style>
        <script>
          // Ensure all links open in new tab
          document.addEventListener('DOMContentLoaded', function() {
            document.addEventListener('click', function(e) {
              const link = e.target.closest('a');
              if (link && link.href) {
                e.preventDefault();
                window.open(link.href, '_blank', 'noopener,noreferrer');
              }
            });
          });
        </script>
      </head>
      <body>
        ${cleanHtml}
      </body>
      </html>
    `;

    // Write to iframe
    doc.open();
    doc.write(wrappedHtml);
    doc.close();

    // Auto-adjust height to content
    const adjustHeight = () => {
      if (doc.body) {
        const height = doc.body.scrollHeight;
        iframe.style.height = `${height + 20}px`;
      }
    };

    // Adjust after load
    setTimeout(adjustHeight, 100);
    
    // Adjust after images load
    const images = doc.querySelectorAll('img');
    images.forEach(img => {
      img.addEventListener('load', adjustHeight);
      img.addEventListener('error', adjustHeight);
    });

    // Adjust after fonts load
    if (doc.fonts) {
      doc.fonts.ready.then(adjustHeight);
    }

  }, [htmlContent]);

  return (
    <iframe
      ref={iframeRef}
      title="Email content"
      className={className}
      style={{
        width: '100%',
        border: 'none',
        minHeight,
        backgroundColor: 'white',
        display: 'block'
      }}
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
    />
  );
}
