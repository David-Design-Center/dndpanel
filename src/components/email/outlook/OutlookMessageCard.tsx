import React, { useState } from 'react';
import { Reply, ReplyAll, Forward, Paperclip, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { Email } from '../../../types';
import { getProfileInitial } from '../../../lib/utils';
import { cleanEmailAddress } from '../../../utils/emailFormatting';
import EmailIframe from './EmailIframe';
import { processEmailContent, makeRowSnippet } from '../../../utils/emailContentProcessing';

interface MessageCardProps {
  message: Email;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  getSenderColor: (email: string) => string;
  loading?: boolean;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

// 3-dot dropdown menu component for signature and quoted text
function DropdownMenu({ 
  hasSignature, 
  hasQuoted, 
  showSignature, 
  showQuoted, 
  setShowSignature, 
  setShowQuoted,
  originalSignatures,
  originalQuotedContent
}: { 
  hasSignature: boolean;
  hasQuoted: boolean;
  showSignature: boolean;
  showQuoted: boolean;
  setShowSignature: (show: boolean) => void;
  setShowQuoted: (show: boolean) => void;
  originalSignatures: string[];
  originalQuotedContent: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!hasSignature && !hasQuoted) return null;

  return (
    <div className="relative">
      <IconButton 
        onClick={() => setIsOpen(!isOpen)} 
        title="Show more content"
      >
        <div className="flex space-x-0.5">
          <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
          <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
          <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
        </div>
      </IconButton>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 min-w-40">
          {hasSignature && (
            <button
              onClick={() => {
                setShowSignature(!showSignature);
                setIsOpen(false);
              }}
              className="w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded"
            >
              {showSignature ? 'Hide' : 'Show'} signature
            </button>
          )}
          {hasQuoted && (
            <button
              onClick={() => {
                setShowQuoted(!showQuoted);
                setIsOpen(false);
              }}
              className="w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded"
            >
              {showQuoted ? 'Hide' : 'Show'} quoted text
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export const OutlookMessageCard: React.FC<MessageCardProps> = ({
  message,
  onReply,
  onReplyAll,
  onForward,
  getSenderColor,
  loading = false,
  isExpanded = true,
  onToggleExpanded
}) => {
  const [showQuoted, setShowQuoted] = useState(false);
  const [showSignature, setShowSignature] = useState(false);

  const fromData = message.from || { email: 'unknown@example.com', name: 'Unknown Sender' };
  const senderEmail = cleanEmailAddress(fromData.email || 'unknown@example.com');
  // Clean sender name by removing angle brackets and extra formatting
  const rawSenderName = fromData.name || senderEmail;
  const senderName = rawSenderName.replace(/[<>]/g, '').trim();

  // Process email content properly
  const processedContent = processEmailContent(message.body || '');
  const hasQuoted = !!processedContent.quotedContent;
  const hasSignature = processedContent.signatures.length > 0;

  // Format date
  const messageDate = new Date(message.date);
  const formattedDate = format(messageDate, 'MMM d, h:mm a');

  // Get clean snippet for collapsed state
  const cleanSnippet = makeRowSnippet(message.body || message.preview || '') || 'No preview available';

  // Get sender initial - ensure we always have something
  const senderInitial = (senderName || senderEmail)[0]?.toUpperCase() || 'U';

  // Debug log
  console.log('Rendering message card:', message.id, 'isExpanded:', isExpanded, 'snippet:', cleanSnippet.substring(0, 50));

  // Filter attachments (exclude inline/signature images)
  const realAttachments = message.attachments?.filter(att => 
    !att.name?.match(/^(image|logo|sig)\d*\.(png|jpg|gif)$/i) &&
    !att.name?.includes('image001')
  ) || [];

  // If collapsed, show improved compact view
  if (!isExpanded) {
    return (
      <button
        onClick={onToggleExpanded}
        className={[
          "w-full text-left rounded-2xl border bg-white",
          "p-3 md:p-4 hover:bg-gray-50 transition-colors",
          "grid grid-cols-[40px,1fr,auto] items-start gap-3",
          "min-h-[64px] md:min-h-[68px] max-w-full overflow-hidden", // Added max-w-full and overflow-hidden
          !message.isRead ? "bg-blue-50 ring-1 ring-blue-200" : "",
        ].join(" ")}
      >
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full bg-gray-200 grid place-items-center text-sm font-semibold flex-shrink-0">
          {senderInitial}
        </div>

        {/* Title + snippet - with better overflow handling */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className={`text-sm leading-none truncate ${!message.isRead ? "font-semibold" : "font-medium"}`}>
            {senderName === senderEmail.split('@')[0] ? 'You' : senderName}
          </div>
          <div className="mt-1 text-xs text-gray-500 truncate whitespace-nowrap overflow-hidden">{cleanSnippet}</div>
        </div>

        {/* Date + caret */}
        <div className="flex items-start gap-2 text-xs text-gray-500 flex-shrink-0">
          <span className="whitespace-nowrap">{formattedDate}</span>
          <ChevronDown className="h-4 w-4 opacity-70 flex-shrink-0" />
        </div>
      </button>
    );
  }

  return (
    <div className="border-b border-gray-200 bg-white p-3">
      {/* Top row: sender + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={`h-8 w-8 bg-gradient-to-br ${getSenderColor(senderEmail)} text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0`}>
            {getProfileInitial(senderName, senderEmail)}
          </div>
          
          <div className="leading-tight min-w-0 flex-1">
            <div className="font-medium text-gray-900 text-sm truncate">
              {senderName}
            </div>
            <div className="text-xs text-gray-600 truncate">
              From: {senderEmail}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-0.5">
            <IconButton onClick={onReply} title="Reply">
              <Reply className="h-3.5 w-3.5 text-blue-600" />
            </IconButton>
            <IconButton onClick={onReplyAll} title="Reply All">
              <ReplyAll className="h-3.5 w-3.5 text-blue-600" />
            </IconButton>
            <IconButton onClick={onForward} title="Forward">
              <Forward className="h-3.5 w-3.5 text-blue-600" />
            </IconButton>
            <div className="mx-0.5 h-4 w-px bg-gray-200" />
            
            {/* 3-dot menu for signature and quoted text */}
            <DropdownMenu 
              hasSignature={hasSignature} 
              hasQuoted={hasQuoted} 
              showSignature={showSignature} 
              showQuoted={showQuoted} 
              setShowSignature={setShowSignature} 
              setShowQuoted={setShowQuoted}
              originalSignatures={processedContent.signatures}
              originalQuotedContent={processedContent.quotedContent || ''}
            />
            
            <div className="mx-0.5 h-4 w-px bg-gray-200" />
            <IconButton onClick={onToggleExpanded} title="Collapse">
              <ChevronDown className="h-3.5 w-3.5 text-gray-500 rotate-180" />
            </IconButton>
          </div>
          <div className="text-xs text-gray-500">
            {formattedDate}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-2 max-w-2xl text-sm leading-relaxed">
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-3 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-20 bg-gray-100 rounded" />
          </div>
        ) : processedContent.cleanBody ? (
          <EmailIframe html={processedContent.cleanBody} />
        ) : (
          <div className="text-gray-500 italic text-sm">No content available</div>
        )}

        {/* Attachments */}
        {realAttachments.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-700 mb-1">
              {realAttachments.length} attachment{realAttachments.length > 1 ? 's' : ''}
            </div>
            <div className="flex flex-wrap gap-1">
              {realAttachments.map((attachment, index) => (
                <button
                  key={index}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                  onClick={() => {
                    if (attachment.url) {
                      window.open(attachment.url, '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="truncate max-w-[150px]">
                    {attachment.name || 'Attachment'}
                  </span>
                  {attachment.size && (
                    <span className="text-gray-500">
                      ({Math.round(attachment.size / 1024)}KB)
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Show signature when toggled */}
        {showSignature && processedContent.signatures.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-600">
              {processedContent.signatures.map((signature, index) => (
                <div key={index} dangerouslySetInnerHTML={{ __html: signature }} />
              ))}
            </div>
          </div>
        )}

        {/* Show quoted text when toggled */}
        {showQuoted && processedContent.quotedContent && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-600 pl-2 border-l-2 border-gray-300">
              <EmailIframe html={processedContent.quotedContent} className="opacity-75" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function IconButton({ 
  children, 
  title, 
  onClick 
}: { 
  children: React.ReactNode; 
  title: string; 
  onClick?: () => void; 
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-1 rounded hover:bg-gray-100 transition-colors"
    >
      {children}
    </button>
  );
}
