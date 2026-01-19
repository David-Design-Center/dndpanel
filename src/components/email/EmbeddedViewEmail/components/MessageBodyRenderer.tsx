/**
 * MessageBodyRenderer - Memoized component for rendering email body content
 * 
 * Memoized to prevent re-processing HTML on parent re-renders (e.g., window resize).
 * Only re-renders when the message body or image loading state actually changes.
 * 
 * @module EmbeddedViewEmail/components/MessageBodyRenderer
 */

import React, { memo, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { stripQuotedText } from '@/utils/emailContentProcessing';
import type { Email } from '@/types';

interface MessageBodyRendererProps {
  /** The email message to render */
  message: Email;
  /** Whether images have been loaded for this message */
  imagesLoaded: boolean;
  /** Callback to store quoted content when discovered */
  onQuotedContentFound?: (messageId: string, quotedContent: string) => void;
}

// Skeleton SVG for loading images (created once, reused)
const SKELETON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
    <defs>
      <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#f0f0f0">
          <animate attributeName="offset" values="-2;1" dur="1.5s" repeatCount="indefinite"/>
        </stop>
        <stop offset="50%" style="stop-color:#e0e0e0">
          <animate attributeName="offset" values="-1;2" dur="1.5s" repeatCount="indefinite"/>
        </stop>
        <stop offset="100%" style="stop-color:#f0f0f0">
          <animate attributeName="offset" values="0;3" dur="1.5s" repeatCount="indefinite"/>
        </stop>
      </linearGradient>
    </defs>
    <rect width="200" height="150" rx="8" fill="url(#shimmer)"/>
    <rect x="75" y="55" width="50" height="40" rx="4" fill="#d0d0d0" opacity="0.5"/>
    <polygon points="100,65 85,90 115,90" fill="#c0c0c0" opacity="0.6"/>
    <circle cx="115" cy="70" r="8" fill="#c0c0c0" opacity="0.6"/>
  </svg>
`.trim().replace(/\s+/g, ' ');

const PLACEHOLDER_DATA_URI = `data:image/svg+xml;base64,${btoa(SKELETON_SVG)}`;

function MessageBodyRendererInner({ message, imagesLoaded, onQuotedContentFound }: MessageBodyRendererProps) {
  const htmlBody = message.body || '';

  if (!htmlBody) {
    return <div className="text-gray-500 text-sm italic">No content</div>;
  }

  // Strip quoted content (Gmail/Outlook reply history)
  const { cleanBody, quotedContent } = stripQuotedText(htmlBody);

  // Report quoted content to parent via effect (not during render)
  useEffect(() => {
    if (quotedContent && onQuotedContentFound) {
      onQuotedContentFound(message.id, quotedContent);
    }
  }, [message.id, quotedContent, onQuotedContentFound]);

  // Replace cid: references with skeleton placeholder while images load
  let processedBody = cleanBody;
  const hasUnloadedImages = message.inlineAttachments && 
                            message.inlineAttachments.length > 0 && 
                            !imagesLoaded;
  
  if (hasUnloadedImages) {
    // Replace all cid: references with the placeholder
    processedBody = cleanBody.replace(/cid:[^"'\s>]+/gi, PLACEHOLDER_DATA_URI);
  }

  // Sanitize with email-safe config - preserve formatting and images
  const sanitizedHtml = DOMPurify.sanitize(processedBody, {
    ADD_TAGS: ['style', 'link'],
    ADD_ATTR: ['target', 'style', 'class', 'id', 'width', 'height', 'src', 'href', 'alt', 'title', 'align', 'valign', 'border', 'cellpadding', 'cellspacing', 'bgcolor', 'color', 'size', 'face'],
    ALLOW_DATA_ATTR: true,
  });

  // Wrap in constrained HTML with forced responsive CSS
  const wrappedHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="referrer" content="no-referrer">
      <base target="_blank">
      <style>
        * { 
          font-size: 12px !important; 
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        body { 
          margin: 0; 
          padding: 16px; 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          overflow-x: hidden;
          word-wrap: break-word;
          font-size: 12px !important;
        }
        img { 
          max-width: 100% !important; 
          height: auto !important; 
          display: block;
        }
        table { 
          max-width: 100% !important;
          border-collapse: collapse;
        }
        td, th {
          word-wrap: break-word;
          font-size: 12px !important;
        }
        a {
          color: #1a73e8;
          font-size: 12px !important;
        }
        p, div, span, li {
          font-size: 12px !important;
        }
      </style>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          document.addEventListener('click', function(e) {
            if (e.target.tagName === 'A' || e.target.closest('a')) {
              const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
              if (link.href) {
                e.preventDefault();
                window.open(link.href, '_blank', 'noopener,noreferrer');
              }
            }
          });
        });
      </script>
    </head>
    <body>
      ${sanitizedHtml}
    </body>
    </html>
  `;

  return (
    <iframe
      srcDoc={wrappedHtml}
      title="Email content"
      className="w-full border-0"
      style={{ minHeight: '50px', height: 'auto' }}
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      onLoad={(e) => {
        const iframe = e.target as HTMLIFrameElement;
        if (iframe.contentDocument) {
          const body = iframe.contentDocument.body;
          const height = body ? body.scrollHeight : iframe.contentDocument.documentElement.scrollHeight;
          iframe.style.height = `${height + 5}px`;
        }
      }}
    />
  );
}

// Memoize to prevent re-renders on parent state changes (like window resize)
// Only re-render when message body or image loading state changes
export const MessageBodyRenderer = memo(MessageBodyRendererInner, (prevProps, nextProps) => {
  // Return true if props are equal (should NOT re-render)
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.body === nextProps.message.body &&
    prevProps.imagesLoaded === nextProps.imagesLoaded
  );
});
