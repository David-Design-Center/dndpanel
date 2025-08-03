import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Reply, Trash, Paperclip, Tag, ChevronDown, Forward, Users } from 'lucide-react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { getAttachmentDownloadUrl, markEmailAsTrash, applyLabelsToEmail, deleteDraft } from '../services/emailService';
import { optimizedEmailService } from '../services/optimizedEmailService';
import { Email } from '../types';
import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { useLabel } from '../contexts/LabelContext';
import { getProfileInitial } from '../lib/utils';
import FileThumbnail from '../components/common/FileThumbnail';
import FilePreview from '../components/common/FilePreview';

// Clean quoted content from email body using DOM manipulation (more reliable than regex)
// Optimized for performance with large messages
const stripQuotedContent = (html: string): string => {
  if (!html) return html;
  
  // For very large messages, use a more efficient approach
  if (html.length > 50000) {
    // Use regex-based approach for very large messages to avoid DOM manipulation overhead
    try {
      // Remove common Gmail quote patterns first
      let cleaned = html.replace(/<div class="gmail_quote"[\s\S]*?<\/div>/gi, '');
      cleaned = cleaned.replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '');
      cleaned = cleaned.replace(/<div[^>]*class="[^"]*quote[^"]*"[\s\S]*?<\/div>/gi, '');
      
      // Remove "On ... wrote:" patterns
      cleaned = cleaned.replace(/On\s+[^<]*wrote:\s*<br[^>]*>/gi, '');
      cleaned = cleaned.replace(/<p[^>]*>On\s+[^<]*wrote:[\s\S]*?<\/p>/gi, '');
      
      return cleaned.trim().length > 20 ? cleaned : html;
    } catch (error) {
      console.warn('Error with regex cleaning, falling back to original:', error);
      return html;
    }
  }
  
  // Use DOM manipulation for smaller messages (more accurate)
  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Remove Gmail quote containers and blockquotes
    const quotedElements = tempDiv.querySelectorAll('.gmail_quote, blockquote, [class*="quote"]');
    quotedElements.forEach(el => el.remove());
    
    // Remove "On [date], [person] wrote:" patterns at the end
    const textContent = tempDiv.textContent || '';
    if (textContent.match(/\n\s*On\s+.+wrote:\s*$/gi)) {
      const htmlContent = tempDiv.innerHTML;
      const cleanedHtml = htmlContent.replace(/<[^>]*>On\s+[^<]*wrote:[^<]*<\/[^>]*>[\s\S]*$/gi, '');
      if (cleanedHtml.trim().length > 20) {
        tempDiv.innerHTML = cleanedHtml;
      }
    }
    
    const result = tempDiv.innerHTML.trim();
    return result.length > 20 ? result : html;
  } catch (error) {
    console.warn('Error cleaning quoted content:', error);
    return html;
  }
};

// Minimal sanitization - only remove the most dangerous elements that could break containment
const sanitizeEmailHtml = (html: string): string => {
  if (!html) return html;
  
  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Remove external stylesheets and scripts only
    const linkTags = tempDiv.querySelectorAll('link[rel="stylesheet"]');
    linkTags.forEach(tag => tag.remove());
    
    const scriptTags = tempDiv.querySelectorAll('script');
    scriptTags.forEach(tag => tag.remove());
    
    // Only modify the most dangerous positioning that could break out of isolation
    const elementsWithStyle = tempDiv.querySelectorAll('[style*="position: fixed"], [style*="position: absolute"]');
    elementsWithStyle.forEach(el => {
      const style = el.getAttribute('style') || '';
      // Convert fixed/absolute to relative to keep them contained
      const cleanedStyle = style
        .replace(/position\s*:\s*fixed/gi, 'position: relative')
        .replace(/position\s*:\s*absolute/gi, 'position: relative');
      
      el.setAttribute('style', cleanedStyle);
    });
    
    return tempDiv.innerHTML;
  } catch (error) {
    console.warn('Error sanitizing email HTML:', error);
    return html;
  }
};

// Process thread emails - Gmail API already gives us separated messages
const processThreadMessages = async (
  threadEmails: Email[], 
  onProgress?: (current: number, total: number) => void
): Promise<Email[]> => {
  if (!threadEmails || threadEmails.length === 0) return [];
  
  console.log(`✨ Processing ${threadEmails.length} pre-separated Gmail messages`);
  
  // Sort by date (newest to oldest - newest emails at the top)
  const sortedEmails = [...threadEmails].sort((a, b) => {
    const aTime = new Date(a.date).getTime();
    const bTime = new Date(b.date).getTime();
    return bTime - aTime; // Reversed: newest first
  });
  
  // Clean quoted content from each message (Gmail already separated the messages for us)
  const cleanedMessages: Email[] = [];
  const isLargeThread = sortedEmails.length > 50; // Reduce logging for large threads
  
  for (let index = 0; index < sortedEmails.length; index++) {
    const email = sortedEmails[index];
    
    // Only log every 10th message for large threads to reduce console spam
    if (!isLargeThread || index % 10 === 0) {
      console.log(`📧 Message ${index + 1}: ${email.from.name} (${email.body.length} chars)`);
    }
    
    // Report progress
    if (onProgress) {
      onProgress(index + 1, sortedEmails.length);
    }
    
    const cleanedBody = stripQuotedContent(email.body);
    const sanitizedBody = sanitizeEmailHtml(cleanedBody);
    const charsRemoved = email.body.length - cleanedBody.length;
    
    // Only log cleaning stats for large removals or every 10th message in large threads
    if (charsRemoved > 1000 && (!isLargeThread || index % 10 === 0)) {
      console.log(`🧹 Cleaned ${charsRemoved} quoted chars from message ${index + 1}`);
    }
    
    cleanedMessages.push({
      ...email,
      body: sanitizedBody,
      preview: sanitizedBody.substring(0, 100).replace(/<[^>]*>/g, '') + '...'
    });
    
    // Add small delay to prevent blocking the UI for very large threads
    if (index % 5 === 0 && index > 0) {
      await new Promise(resolve => setTimeout(resolve, 5));
    }
  }
  
  console.log(`✅ Successfully processed ${cleanedMessages.length} thread messages`);
  return cleanedMessages;
};

// Function to generate consistent colors for email senders
const getSenderColor = (email: string): string => {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600', 
    'from-purple-500 to-purple-600',
    'from-pink-500 to-pink-600',
    'from-indigo-500 to-indigo-600',
    'from-red-500 to-red-600',
    'from-yellow-500 to-yellow-600',
    'from-teal-500 to-teal-600',
    'from-orange-500 to-orange-600',
    'from-cyan-500 to-cyan-600'
  ];
  
  // Generate a consistent hash from the email address
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use the hash to pick a color consistently
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

// Function to extract preview text from HTML content
const extractPreviewText = (html: string, maxLength: number = 120): string => {
  if (!html) return 'No content available';
  
  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Remove quoted content for preview
    const quotedElements = tempDiv.querySelectorAll('.gmail_quote, blockquote, [class*="quote"]');
    quotedElements.forEach(el => el.remove());
    
    // Remove script and style tags
    const scriptElements = tempDiv.querySelectorAll('script, style');
    scriptElements.forEach(el => el.remove());
    
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    const cleanText = textContent.replace(/\s+/g, ' ').trim();
    
    if (!cleanText || cleanText.length === 0) {
      return 'No text content available';
    }
    
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.substring(0, maxLength).trim() + '...';
  } catch (error) {
    console.warn('Error extracting preview text:', error);
    return 'Preview unavailable';
  }
};

// Component for rendering email content in an iframe for maximum isolation
const IframeEmailRenderer = ({ 
  html, 
  className, 
  attachments = [] 
}: { 
  html: string; 
  className?: string; 
  attachments?: Array<{ name: string; url: string; size: number; mimeType: string; attachmentId?: string; partId?: string; }>;
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Process CID references and replace with data URLs
  const processCidImages = useCallback(async (htmlContent: string): Promise<string> => {
    if (!attachments || attachments.length === 0) {
      return htmlContent;
    }
    
    let processedHtml = htmlContent;
    
    // Find all img tags with cid: sources
    const cidRegex = /<img[^>]*src="cid:([^"]+)"[^>]*>/gi;
    const matches = Array.from(htmlContent.matchAll(cidRegex));
    
    console.log(`🔍 Found ${matches.length} CID image references`);
    
    for (const match of matches) {
      const fullMatch = match[0];
      const cid = match[1];
      
      console.log(`📎 Processing CID: ${cid}`);
      
      // Find corresponding attachment by CID or filename
      const attachment = attachments.find(att => {
        // Check if the CID matches the attachment ID, name, or contains the CID
        return att.attachmentId === cid || 
               att.name.includes(cid) || 
               cid.includes(att.name) ||
               att.name.toLowerCase().includes('image') // Fallback for image attachments
      });
      
      if (attachment) {
        console.log(`✅ Found attachment for CID ${cid}: ${attachment.name}`);
        
        // For now, we can only use the URL since we don't have base64 data here
        // In the future, we could fetch the attachment data if needed
        if (attachment.url) {
          processedHtml = processedHtml.replace(fullMatch, fullMatch.replace(`src="cid:${cid}"`, `src="${attachment.url}"`));
          console.log(`🔗 Replaced CID ${cid} with attachment URL`);
        } else {
          console.warn(`⚠️ No URL available for attachment: ${attachment.name}`);
        }
      } else {
        console.warn(`⚠️ No attachment found for CID: ${cid}`);
      }
    }
    
    return processedHtml;
  }, [attachments]);
  
  useEffect(() => {
    const setupIframe = async () => {
      if (iframeRef.current) {
        const iframe = iframeRef.current;
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        
        if (doc) {
          // Process CID images first
          const processedHtml = await processCidImages(html);
          
          // Debug: Log the HTML content to see if images are there
          console.log('🖼️ IframeEmailRenderer: Processing HTML content');
          console.log('📝 Original HTML length:', html.length);
          console.log('📝 Processed HTML length:', processedHtml.length);
          console.log('🔍 Contains img tags:', processedHtml.includes('<img'));
          console.log('🔍 Contains data: URLs:', processedHtml.includes('data:'));
          console.log('🔍 Contains cid: URLs:', processedHtml.includes('cid:'));
          console.log('📄 HTML preview:', processedHtml.substring(0, 500));
        
        // Create a complete HTML document with proper styling
        const fullHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                color: #374151;
                background: white;
                word-wrap: break-word;
                overflow-wrap: break-word;
                hyphens: auto;
                max-width: 100%;
                box-sizing: border-box;
              }
              
              /* Typography improvements */
              h1, h2, h3, h4, h5, h6 {
                margin: 1.5em 0 0.5em 0;
                line-height: 1.3;
                font-weight: 600;
                color: #1f2937;
              }
              
              p {
                margin: 0.75em 0;
                line-height: 1.6;
                max-width: 100%;
              }
              
              /* Improved image handling */
              img {
                max-width: 100% !important;
                height: auto !important;
                display: block !important;
                margin: 15px auto !important;
                border-radius: 6px !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
              }
              
              img[src=""], img:not([src]) {
                display: none !important;
              }
              
              /* Handle broken images gracefully */
              img:broken {
                display: none !important;
              }
              
              /* Responsive image sizes */
              img.inline-image-small { max-width: 200px !important; }
              img.inline-image-medium { max-width: 400px !important; }
              img.inline-image-large { max-width: 600px !important; }
              img.inline-image-full { max-width: 100% !important; }
              
              /* Table improvements */
              table {
                max-width: 100% !important;
                width: 100% !important;
                table-layout: auto !important;
                border-collapse: collapse !important;
                margin: 1em 0 !important;
              }
              
              td, th {
                padding: 8px 12px !important;
                vertical-align: top !important;
                word-wrap: break-word !important;
                max-width: 300px !important;
              }
              
              /* Link styling */
              a {
                color: #3b82f6 !important;
                text-decoration: underline !important;
                word-wrap: break-word !important;
              }
              
              a:hover {
                color: #1d4ed8 !important;
              }
              
              /* Text content improvements */
              div, span, p {
                max-width: 100% !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                hyphens: auto !important;
              }
              
              /* List styling */
              ul, ol {
                margin: 1em 0 !important;
                padding-left: 2em !important;
              }
              
              li {
                margin: 0.5em 0 !important;
                line-height: 1.5 !important;
              }
              
              /* Blockquote styling */
              blockquote {
                margin: 1em 0 !important;
                padding: 1em 1.5em !important;
                border-left: 4px solid #e5e7eb !important;
                background: #f9fafb !important;
                font-style: italic !important;
                border-radius: 0 6px 6px 0 !important;
              }
              
              /* Force all elements to respect container width */
              * {
                max-width: 100% !important;
                box-sizing: border-box !important;
                position: static !important;
              }
              
              /* Hide any elements that might cause overflow */
              [style*="position: fixed"],
              [style*="position: absolute"] {
                position: relative !important;
              }
              
              /* Ensure long URLs don't break layout */
              *[href] {
                word-break: break-all !important;
              }
            </style>
            <script>
              // Enhanced image handling with debugging
              document.addEventListener('DOMContentLoaded', function() {
                console.log('🖼️ Iframe: DOM loaded, checking images...');
                const images = document.querySelectorAll('img');
                console.log('🖼️ Iframe: Found', images.length, 'images');
                
                images.forEach((img, index) => {
                  console.log('🖼️ Iframe: Image', index + 1, '- src:', img.src ? img.src.substring(0, 100) + '...' : 'empty');
                  console.log('🖼️ Iframe: Image', index + 1, '- alt:', img.alt);
                  console.log('🖼️ Iframe: Image', index + 1, '- class:', img.className);
                  
                  img.onload = function() {
                    console.log('✅ Iframe: Image', index + 1, 'loaded successfully');
                  };
                  
                  img.onerror = function() {
                    console.error('❌ Iframe: Image', index + 1, 'failed to load:', img.src);
                    this.style.display = 'none';
                  };
                });
              });
            </script>
          </head>
          <body>
            ${processedHtml}
          </body>
          </html>
        `;
        
        doc.open();
        doc.write(fullHtml);
        doc.close();
        
        // Adjust iframe height to content with responsive max height
        const resizeIframe = () => {
          if (doc.body) {
            const contentHeight = Math.min(doc.body.scrollHeight, window.innerHeight * 0.6); // Max 60% of viewport
            iframe.style.height = Math.max(contentHeight, 200) + 'px'; // Min height of 200px
          }
        };
        
        // Initial resize
        setTimeout(resizeIframe, 100);
        
        // Listen for image loads to adjust height
        const images = doc.querySelectorAll('img');
        images.forEach(img => {
          img.addEventListener('load', resizeIframe);
          img.addEventListener('error', resizeIframe);
        });
        
        // Listen for font loads
        if (doc.fonts) {
          doc.fonts.ready.then(resizeIframe);
        }
        }
      }
    };
    
    setupIframe();
  }, [html, attachments, processCidImages]);
  
  return (
    <iframe
      ref={iframeRef}
      className={className}
      style={{
        width: '100%',
        border: 'none',
        minHeight: '100px',
        backgroundColor: 'white',
        display: 'block'
      }}
      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      title="Email Content"
    />
  );
};

function ViewEmail() {
  const { id } = useParams<{ id: string }>();
  const [email, setEmail] = useState<Email | null>(null);
  const [processedThreadMessages, setProcessedThreadMessages] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingThread, setProcessingThread] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [downloadingAttachment, setDownloadingAttachment] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);
  const [isApplyingLabel, setIsApplyingLabel] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<{
    attachment: NonNullable<Email['attachments']>[0];
    emailId: string;
  } | null>(null);
  const [isDraft, setIsDraft] = useState(false);
  const navigate = useNavigate();
  const { currentProfile } = useProfile();
  const { user } = useAuth();
  const { labels } = useLabel();
  const location = useLocation();

  // Debug logging for states
  useEffect(() => {
    console.log('🔍 ViewEmail state:', {
      loading,
      processingThread,
      emailExists: !!email,
      processedMessagesCount: processedThreadMessages.length,
      processingProgress
    });
  }, [loading, processingThread, email, processedThreadMessages.length, processingProgress]);

  // Debug logging for profile
  useEffect(() => {
    console.log('Current profile in ViewEmail:', currentProfile);
  }, [currentProfile]);

  // Optimized email fetching (no fallback - optimized only)
  const fetchEmailOptimized = async (emailId: string): Promise<Email | undefined> => {
    console.log(`🔍 fetchEmailOptimized called for email ID: ${emailId}`);
    
    try {
      // Check if optimized service is available
      const isOptimizedAvailable = await optimizedEmailService.isAvailable();
      
      if (!isOptimizedAvailable) {
        throw new Error('Optimized service is not available');
      }

      console.log('🚀 Using optimized server-side email fetching');
      
      // Try to fetch as a thread first, then as single message
      try {
        const threadEmails = await optimizedEmailService.fetchEmailThread(emailId);
        if (threadEmails.length > 0) {
          console.log(`✅ Successfully fetched ${threadEmails.length} emails via optimized service`);
          return threadEmails[0]; // Return the main email
        }
      } catch (threadError) {
        console.log('Thread fetch failed, trying single message:', threadError);
        const singleEmail = await optimizedEmailService.fetchSingleEmail(emailId);
        console.log(`✅ Successfully fetched single email via optimized service`);
        return singleEmail;
      }
    } catch (error) {
      console.error('❌ Optimized fetch failed:', error);
      throw error; // Don't fall back, let the caller handle the error
    }
  };

  // Optimized thread fetching (no fallback - optimized only)
  const fetchThreadEmailsOptimized = async (threadId: string) => {
    try {
      const isOptimizedAvailable = await optimizedEmailService.isAvailable();
      
      if (!isOptimizedAvailable) {
        throw new Error('Optimized service is not available');
      }

      console.log('🚀 Using optimized server-side thread fetching');
      const threadEmails = await optimizedEmailService.fetchEmailThread(threadId);
      
      // Sort by date (newest first) to match existing behavior
      const sortedEmails = threadEmails.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      console.log(`✅ Server-side processing completed: ${sortedEmails.length} emails`);
      setProcessedThreadMessages(sortedEmails);
      
      // Auto-expand the first (newest/top) message
      if (sortedEmails.length > 0) {
        setExpandedMessages(new Set([sortedEmails[0].id]));
      }
      
      return;
    } catch (error) {
      console.error('❌ Optimized thread fetch failed:', error);
      throw error; // Don't fall back, let the caller handle the error
    }
  };

  // Check if this is a draft from location state
  useEffect(() => {
    if (location.state && (location.state as any).isDraft) {
      setIsDraft(true);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchEmail = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let fetchedEmail: Email | undefined;
        
        // Check if we're looking at a specific message ID or a thread ID
        if (id) {
          // Use optimized fetching with fallback
          fetchedEmail = await fetchEmailOptimized(id);
        }
        
        if (fetchedEmail) {
          setEmail(fetchedEmail);
          setLoading(false); // Set loading to false after email is fetched
          
          // If this email has a threadId and there are multiple emails in the thread, fetch them
          if (fetchedEmail.threadId) {
            await fetchThreadEmailsOptimized(fetchedEmail.threadId);
          } else {
            // Single email, process it immediately using traditional method
            await processMessages([fetchedEmail]);
          }
        } else {
          setError('Email not found');
          console.error('Email not found with ID:', id);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching email:', error);
        setError('Failed to load email');
        setLoading(false);
      }
    };

    fetchEmail();
  }, [id, navigate]);

  // Effect to handle thread refresh when returning from compose after sending a reply
  useEffect(() => {
    const state = location.state as { refresh?: boolean };
    if (state?.refresh && email?.threadId) {
      console.log('🔄 Refreshing thread after reply...');
      // Clear the location state to prevent infinite refresh
      window.history.replaceState({}, '', window.location.pathname);
      // Refetch the thread emails using optimized method
      fetchThreadEmailsOptimized(email.threadId);
    }
  }, [location.state, email?.threadId]);

  // Function to process messages with progress tracking
  const processMessages = async (emails: Email[]) => {
    if (emails.length === 0) return;
    
    console.log(`🔄 Starting to process ${emails.length} emails`);
    setProcessingThread(true);
    setProcessingProgress({ current: 0, total: emails.length });
    
    try {
      // Add minimum delay to ensure loading state is visible
      // Longer delay for larger threads
      const minDelayTime = emails.length > 10 ? 1000 : 500;
      console.log(`⏱️ Setting minimum delay of ${minDelayTime}ms`);
      const minDelay = new Promise(resolve => setTimeout(resolve, minDelayTime));
      
      const processed = await processThreadMessages(emails, (current, total) => {
        console.log(`📊 Progress: ${current}/${total}`);
        setProcessingProgress({ current, total });
      });
      
      // Wait for minimum delay to complete
      console.log(`⏳ Waiting for minimum delay to complete`);
      await minDelay;
      
      console.log(`✅ Setting processed messages: ${processed.length} items`);
      setProcessedThreadMessages(processed);
      
      // Auto-expand the first (newest/top) message after processing
      if (processed.length > 0) {
        console.log(`🔍 Auto-expanding first message: ${processed[0].id}`);
        setExpandedMessages(new Set([processed[0].id]));
      }
    } catch (error) {
      console.error('Error processing thread messages:', error);
    } finally {
      console.log(`🏁 Processing complete, setting processingThread to false`);
      setProcessingThread(false);
    }
  };

  // Get all messages in the thread including the current email, sorted chronologically
  const allThreadMessages = processedThreadMessages;

  // Debug logging for thread messages
  useEffect(() => {
    if (allThreadMessages.length > 0) {
      console.log('Thread messages debug:', allThreadMessages.map(msg => ({
        id: msg.id,
        from: msg.from,
        to: msg.to,
        subject: msg.subject
      })));
    }
  }, [allThreadMessages]);

  // Function to toggle message expansion
  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // Function to handle applying a label
  const handleAssignLabel = async (labelId: string) => {
    if (!email) return;
    
    try {
      setIsApplyingLabel(labelId);
      await applyLabelsToEmail(email.id, [labelId]);
      
      // Close the dropdown and show a confirmation message
      setLabelDropdownOpen(false);
      alert('Label applied successfully');
    } catch (error) {
      console.error('Error applying label:', error);
      alert('Failed to apply label. Please try again.');
    } finally {
      setIsApplyingLabel(null);
    }
  };

  // Function to filter out irrelevant attachments (logos, social icons, inline images)
  const isRelevantAttachment = (attachment: NonNullable<Email['attachments']>[0]) => {
    const name = attachment.name.toLowerCase();
    const mimeType = attachment.mimeType.toLowerCase();
    
    // Filter out common logo and social media icon patterns
    const irrelevantPatterns = [
      'logo', 'icon', 'facebook', 'twitter', 'instagram', 'linkedin', 
      'youtube', 'social', 'footer', 'header', 'signature', 'spacer',
      'pixel', 'tracking', 'beacon', 'transparent', 'blank'
    ];
    
    // Filter out very small images (likely logos or spacers)
    const isVerySmallImage = mimeType.startsWith('image/') && attachment.size < 5000; // Less than 5KB
    
    // Filter out common irrelevant file extensions
    const irrelevantExtensions = ['.gif', '.png', '.jpg', '.jpeg', '.svg'];
    const hasIrrelevantExtension = irrelevantExtensions.some(ext => 
      name.endsWith(ext) && attachment.size < 10000 // Small images with these extensions
    );
    
    // Check if name contains irrelevant patterns
    const hasIrrelevantPattern = irrelevantPatterns.some(pattern => name.includes(pattern));
    
    // Filter out attachments that are likely inline/embedded content
    const isLikelyInlineContent = (
      isVerySmallImage || 
      hasIrrelevantPattern || 
      (hasIrrelevantExtension && attachment.size < 10000) ||
      name.startsWith('image') ||
      name.includes('cid:') ||
      name.match(/^[a-f0-9-]{20,}$/) // Random hash-like names
    );
    
    // Only show attachments that are likely actual files the user attached
    return !isLikelyInlineContent && attachment.size > 1000; // At least 1KB
  };

  // Utility function to filter duplicate attachments and remove irrelevant ones
  const getUniqueAttachments = (emails: Email[]) => {
    const allAttachments = emails.flatMap(email => 
      email.attachments?.map(att => ({ 
        ...att, 
        emailFrom: email.from.name, 
        emailDate: email.date,
        emailId: email.id
      })) || []
    );
    
    // Filter out irrelevant attachments first
    const relevantAttachments = allAttachments.filter(isRelevantAttachment);
    
    // Filter duplicates based on name and size (common for logos/signatures)
    const uniqueAttachments = relevantAttachments.filter((attachment, index, arr) => {
      return index === arr.findIndex(a => 
        a.name === attachment.name && 
        a.size === attachment.size &&
        a.mimeType === attachment.mimeType
      );
    });
    
    return uniqueAttachments;
  };

  // Function to handle replying to a specific message
  const handleReplyToMessage = (threadMessage: Email) => {
    // Create a reply subject with "Re: " prefix if it doesn't already have it
    const subject = threadMessage.subject.startsWith('Re: ') ? threadMessage.subject : `Re: ${threadMessage.subject}`;
    
    // Format the original email for the reply
    const formattedDate = format(parseISO(threadMessage.date), 'PPpp');
    const quotedBody = `
<br><br>
<div style="padding-left: 1em; margin-left: 1em; border-left: 2px solid #ccc;">
  <p>On ${formattedDate}, ${threadMessage.from.name} <${threadMessage.from.email}> wrote:</p>
  ${threadMessage.body}
</div>
`;
    
    // Navigate to compose with prefilled data including threadId
    navigate('/compose', { 
      state: { 
        to: threadMessage.from.email,
        subject: subject,
        replyToId: threadMessage.id,
        threadId: threadMessage.threadId, // Pass the threadId for thread display
        originalBody: quotedBody
      } 
    });
  };

  // Function to handle replying to all recipients of a specific message
  const handleReplyAllToMessage = (threadMessage: Email) => {
    // Create a reply subject with "Re: " prefix if it doesn't already have it
    const subject = threadMessage.subject.startsWith('Re: ') ? threadMessage.subject : `Re: ${threadMessage.subject}`;
    
    // Format the original email for the reply
    const formattedDate = format(parseISO(threadMessage.date), 'PPpp');
    const quotedBody = `
<br><br>
<div style="padding-left: 1em; margin-left: 1em; border-left: 2px solid #ccc;">
  <p>On ${formattedDate}, ${threadMessage.from.name} <${threadMessage.from.email}> wrote:</p>
  ${threadMessage.body}
</div>
`;
    
    // Collect all original recipients except the current user
    const originalTo = threadMessage.to?.map(recipient => recipient.email) || [];
    const allRecipients = [threadMessage.from.email, ...originalTo].filter(email => 
      email !== 'me@example.com' && email !== 'david.v@dnddesigncenter.com'
    );
    
    // Use the first recipient as "To" and the rest as CC (plus our hardcoded CC)
    const toRecipient = allRecipients[0] || threadMessage.from.email;
    const ccRecipients = allRecipients.slice(1);
    
    // Navigate to compose with prefilled data including CC recipients
    navigate('/compose', { 
      state: { 
        to: toRecipient,
        cc: ccRecipients.join(','), // Pass CC recipients as comma-separated string
        subject: subject,
        replyToId: threadMessage.id,
        threadId: threadMessage.threadId,
        originalBody: quotedBody
      } 
    });
  };

  // Function to handle forwarding a specific message
  const handleForwardMessage = (threadMessage: Email) => {
    // Create a forward subject with "Fwd: " prefix
    const subject = threadMessage.subject.startsWith('Fwd: ') ? threadMessage.subject : `Fwd: ${threadMessage.subject}`;
    
    // Format the original email for forwarding
    const formattedDate = format(parseISO(threadMessage.date), 'PPpp');
    const forwardedBody = `
<br><br>
---------- Forwarded message ---------<br>
From: ${threadMessage.from.name} <${threadMessage.from.email}><br>
Date: ${formattedDate}<br>
Subject: ${threadMessage.subject}<br>
To: ${threadMessage.to?.map(t => `${t.name} <${t.email}>`).join(', ') || 'Undisclosed recipients'}<br>
<br>
${threadMessage.body}
`;
    
    // Navigate to compose with prefilled data for forwarding
    navigate('/compose', { 
      state: { 
        subject: subject,
        originalBody: forwardedBody,
        attachments: threadMessage.attachments // Include attachments when forwarding
      } 
    });
  };

  const handleReply = () => {
    if (!email) return;
    
    // Create a reply subject with "Re: " prefix if it doesn't already have it
    const subject = email.subject.startsWith('Re: ') ? email.subject : `Re: ${email.subject}`;
    
    // Format the original email for the reply
    const formattedDate = format(parseISO(email.date), 'PPpp');
    const quotedBody = `
<br><br>
<div style="padding-left: 1em; margin-left: 1em; border-left: 2px solid #ccc;">
  <p>On ${formattedDate}, ${email.from.name} <${email.from.email}> wrote:</p>
  ${email.body}
</div>
`;
    
    // Navigate to compose with prefilled data including threadId
    navigate('/compose', { 
      state: { 
        to: email.from.email,
        subject: subject,
        replyToId: email.id,
        threadId: email.threadId, // Pass the threadId for thread display
        originalBody: quotedBody
      } 
    });
  };

  const handleDownloadAttachment = async (attachment: NonNullable<Email['attachments']>[0], emailId?: string) => {
    try {
      console.log('🔍 Download attempt - Full attachment object:', attachment);
      
      if (!attachment.attachmentId) {
        console.error('❌ No attachment ID available. Attachment:', attachment);
        alert(`No attachment ID available for download. This attachment might not be downloadable: ${attachment.name}`);
        return;
      }
      
      // Debug: Check user email
      console.log('🔍 Download attempt - User email:', user?.email);
      
      setDownloadingAttachment(attachment.name);
      
      // Use the provided emailId (for thread emails) or fall back to the main email ID
      const messageId = emailId || email?.id;
      if (!messageId) {
        console.error('No message ID available for download');
        throw new Error('No message ID available for download');
      }
      
      if (!user?.email) {
        console.error('No user email available for download');
        throw new Error('User email is required for attachment download');
      }
      
      console.log('🔍 Calling getAttachmentDownloadUrl with:', {
        userEmail: user.email,
        messageId,
        attachmentId: attachment.attachmentId,
        filename: attachment.name,
        mimeType: attachment.mimeType
      });
      
      // Get the download URL for the attachment
      const downloadUrl = await getAttachmentDownloadUrl(
        user.email, // Pass the user email
        messageId, // Use the correct message ID
        attachment.attachmentId,
        attachment.name,
        attachment.mimeType
      );
      
      console.log('✅ Download URL obtained:', downloadUrl);
      
      // Create a link element and trigger the download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = attachment.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('❌ Error downloading attachment:', error);
      alert(`Failed to download attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDownloadingAttachment(null);
    }
  };

  const handleDelete = async () => {
    if (!email || !email.id) return;
    
    const deleteMessage = isDraft 
      ? 'Are you sure you want to delete this draft?' 
      : 'Are you sure you want to delete this email? It will be moved to the trash.';
    
    if (!confirm(deleteMessage)) {
      return;
    }
    
    try {
      setDeleting(true);
      
      if (isDraft) {
        await deleteDraft(email.id);
        // Navigate back to drafts after successful deletion
        navigate('/drafts');
      } else {
        await markEmailAsTrash(email.id);
        // Navigate back to inbox after successful deletion
        navigate('/inbox');
      }
    } catch (error) {
      console.error('Error deleting email:', error);
      alert(`Failed to delete ${isDraft ? 'draft' : 'email'}. Please try again.`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{error || 'Email not found'}</p>
        <button 
          onClick={() => navigate('/inbox')}
          className="mt-4 btn btn-secondary"
        >
          Back to Inbox
        </button>
      </div>
    );
  }

  // Show processing state if we're still processing thread messages OR if we have no processed messages yet
  if (processingThread || (email && allThreadMessages.length === 0)) {
    return (
      <div className="slide-in max-w-3xl mx-auto px-2" style={{ isolation: 'isolate', contain: 'layout style' }}>
        <div className="flex items-center mb-2">
          <button 
            onClick={() => navigate('/inbox')}
            className="mr-1.5 p-1 rounded-full hover:bg-gray-200"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-gray-800">{email.subject}</h1>
            <p className="text-xs text-gray-600">
              {processingThread ? 'Processing conversation...' : 'Loading conversation...'}
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {processingThread ? 'Processing Email Thread' : 'Loading Email Thread'}
            </h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              {processingThread 
                ? 'Cleaning quoted content and organizing messages for better readability...'
                : 'Fetching thread messages...'
              }
            </p>
            {processingThread && (
              <div className="w-full max-w-xs">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{processingProgress.current} / {processingProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ 
                      width: processingProgress.total > 0 
                        ? `${(processingProgress.current / processingProgress.total) * 100}%` 
                        : '0%' 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  This may take a few moments for large conversations
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="slide-in h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => navigate('/inbox')}
            className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 truncate mb-1">{email.subject}</h1>
            <p className="text-sm text-gray-600">{allThreadMessages.length} message{allThreadMessages.length !== 1 ? 's' : ''} in conversation</p>
          </div>
        
        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <button 
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={handleReply}
            title="Reply"
          >
            <Reply size={16} />
          </button>
          
          {/* Label Dropdown */}
          <div className="relative">
            <button 
              className="p-2 rounded-lg hover:bg-gray-100 flex items-center transition-colors"
              title="Add Label"
              onClick={() => setLabelDropdownOpen(!labelDropdownOpen)}
            >
              <Tag size={16} className="mr-1" />
              <ChevronDown size={12} />
            </button>
            
            {labelDropdownOpen && (
              <div className="absolute z-10 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 border border-gray-200 right-0 max-h-60 overflow-y-auto">
                {labels.length > 0 ? (
                  labels.map(label => (
                    <button
                      key={label.id}
                      className="flex items-center w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => handleAssignLabel(label.id)}
                      disabled={isApplyingLabel === label.id}
                    >
                      <div 
                        className="w-3 h-3 rounded-full mr-3 flex-shrink-0 bg-blue-500"
                      ></div>
                      <span className="truncate">
                        {isApplyingLabel === label.id ? 'Applying...' : label.name}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">No labels found</div>
                )}
              </div>
            )}
          </div>
          
          {currentProfile?.name === 'David' && (
            <button 
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={handleDelete}
              title={isDraft ? "Delete draft" : "Delete"}
              disabled={deleting}
            >
              {deleting ? <span className="animate-spin">🗑️</span> : <Trash size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Thread Messages */}
      <div className="space-y-6">
        {allThreadMessages.map((threadMessage, index) => {
          const previewText = extractPreviewText(threadMessage.body, 120);
          const isLastMessage = index === allThreadMessages.length - 1;
          const isExpanded = expandedMessages.has(threadMessage.id);
          
          console.log(`Message ${index + 1} preview:`, previewText); // Debug log
          
          return (
            <div 
              key={threadMessage.id} 
              className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
                isLastMessage ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-200'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Avatar/Bubble */}
                  <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${getSenderColor(threadMessage.from.email)} flex items-center justify-center text-white text-base font-semibold shadow-sm flex-shrink-0`}>
                    {getProfileInitial(threadMessage.from.name, threadMessage.from.email)}
                  </div>
                  
                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header with sender and date */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <span className="text-base font-semibold text-gray-900 truncate">
                          {threadMessage.from.name || threadMessage.from.email}
                        </span>
                        <span className="text-sm text-gray-500 truncate">
                          &lt;{threadMessage.from.email}&gt;
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 flex-shrink-0 ml-2" title={format(parseISO(threadMessage.date), 'PPpp')}>
                        {formatDistanceToNow(parseISO(threadMessage.date), { addSuffix: true })}
                      </span>
                    </div>
                    
                    {/* Message Preview or Full Content */}
                    <div className="cursor-pointer" onClick={() => toggleMessageExpansion(threadMessage.id)}>
                      {isExpanded ? (
                        <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 overflow-hidden">
                          <div className="prose prose-sm max-w-none overflow-hidden">
                            <div className="email-content-container max-w-full overflow-hidden">
                              <IframeEmailRenderer 
                                html={threadMessage.body} 
                                attachments={threadMessage.attachments}
                                className="w-full max-w-full overflow-hidden rounded-lg"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-base text-gray-700 leading-relaxed mb-3 hover:text-gray-900 transition-colors">
                          <div className="line-clamp-3 break-words">
                            {previewText}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Toggle Button and Action Buttons */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <button 
                        onClick={() => toggleMessageExpansion(threadMessage.id)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </button>
                      
                      {/* Message Action Buttons */}
                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReplyToMessage(threadMessage);
                          }}
                          className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Reply to this message"
                        >
                          <Reply size={14} className="mr-1.5" />
                          Reply
                        </button>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReplyAllToMessage(threadMessage);
                          }}
                          className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Reply to all recipients"
                        >
                          <Users size={14} className="mr-1.5" />
                          Reply All
                        </button>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleForwardMessage(threadMessage);
                          }}
                          className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Forward this message"
                        >
                          <Forward size={14} className="mr-1.5" />
                          Forward
                        </button>
                      </div>
                    </div>
                    
                    {/* Attachment indicator */}
                    {threadMessage.attachments && threadMessage.attachments.filter(isRelevantAttachment).length > 0 && (
                      <div className="flex items-center text-xs text-blue-600 mt-2">
                        <Paperclip size={12} className="mr-1" />
                        {threadMessage.attachments.filter(isRelevantAttachment).length} attachment{threadMessage.attachments.filter(isRelevantAttachment).length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* All Files in Conversation */}
      {(() => {
        const uniqueAttachments = getUniqueAttachments(allThreadMessages);
        return uniqueAttachments.length > 0 ? (
          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
            <h4 className="text-base font-semibold text-blue-900 mb-4 flex items-center">
              <Paperclip size={16} className="mr-2" />
              All Files in Conversation ({uniqueAttachments.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {uniqueAttachments.map((attachment, index) => (
                <div key={index} className="bg-white border border-blue-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                  <div className="flex justify-center mb-3">
                    <FileThumbnail
                      attachment={attachment}
                      emailId={attachment.emailId}
                      userEmail={user?.email || ''}
                      size="small"
                      showPreviewButton={true}
                      onPreviewClick={() => setPreviewFile({ attachment, emailId: attachment.emailId })}
                    />
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate mb-1" title={attachment.name}>
                    {attachment.name}
                  </p>
                  <p className="text-xs text-gray-500 mb-1">{(attachment.size / 1000).toFixed(0)} KB</p>
                  <p className="text-xs text-blue-600 truncate mb-3" title={`From: ${attachment.emailFrom}`}>
                    From: {attachment.emailFrom}
                  </p>
                  <div className="flex flex-col space-y-2">
                    <button 
                      onClick={() => setPreviewFile({ attachment, emailId: attachment.emailId })}
                      className="w-full px-3 py-1.5 text-xs bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      title="Preview file"
                    >
                      Preview
                    </button>
                    <button 
                      onClick={() => handleDownloadAttachment(attachment, attachment.emailId)}
                      className="w-full px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      disabled={downloadingAttachment === attachment.name}
                    >
                      {downloadingAttachment === attachment.name ? 'Downloading...' : 'Download'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          attachment={previewFile.attachment}
          emailId={previewFile.emailId}
          userEmail={user?.email || ''}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={() => {
            if (previewFile) {
              handleDownloadAttachment(previewFile.attachment, previewFile.emailId);
            }
          }}
        />
      )}
      </div>
    </div>
  );
}

export default ViewEmail;