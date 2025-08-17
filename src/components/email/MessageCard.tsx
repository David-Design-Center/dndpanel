import React from 'react';
import { format, parseISO } from 'date-fns';
import { getProfileInitial } from '../../lib/utils';
import { Email } from '../../types';
import { formatRecipientsForHeaders, cleanEmailAddress } from '../../utils/emailFormatting';
import { processEmailContent } from '../../utils/emailContentProcessing';
import { SecurityNote } from './SecurityNote';
import { QuotedContent } from './QuotedContent';
import { SignatureBlock } from './SignatureBlock';
import EmailViewer from '../common/EmailViewer';

interface MessageCardProps {
  message: Email;
  previousMessage?: Email;
  isLatest?: boolean;
  getSenderColor: (email: string) => string;
  onToggleExpansion: () => void;
}

export const MessageCard: React.FC<MessageCardProps> = ({ 
  message, 
  previousMessage,
  isLatest = false, 
  getSenderColor,
  onToggleExpansion
}) => {
  const fromData = message.from || { email: 'unknown@example.com', name: 'Unknown Sender' };
  const senderEmail = cleanEmailAddress(fromData.email || 'unknown@example.com');
  const senderName = fromData.name || fromData.email || 'Unknown Sender';
  const toData = message.to || [];

  // Process email content to extract clean body, quoted content, signatures, etc.
  const processedContent = processEmailContent(
    message.body || '', 
    previousMessage?.body
  );

  // Format date in readable format
  let displayDate = 'Unknown date';
  let formattedDate = 'Unknown date';
  if (message.date) {
    try {
      const parsedDate = parseISO(message.date);
      const now = new Date();
      const dayOfWeek = format(parsedDate, 'EEE');
      const monthDay = format(parsedDate, 'MMM d');
      const time = format(parsedDate, 'h:mm a');
      
      // Check if it's today
      if (format(parsedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
        displayDate = `Today • ${time}`;
      } else {
        displayDate = `${dayOfWeek}, ${monthDay} • ${time}`;
      }
      
      formattedDate = format(parsedDate, 'EEE, MMM d, yyyy • h:mm a');
    } catch {
      displayDate = message.date;
      formattedDate = message.date;
    }
  }

  // Check if this is mostly duplicate content
  if (processedContent.isDuplicateContent) {
    return (
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/30">
        <div className="flex items-center space-x-2">
          <div className={`w-6 h-6 bg-gradient-to-br ${getSenderColor(senderEmail)} text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0`}>
            {getProfileInitial(senderName, senderEmail)}
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-600">
              <span className="font-medium">{senderName}</span> • {displayDate}
            </p>
            <button
              onClick={onToggleExpansion}
              className="text-xs text-gray-500 hover:text-gray-700 mt-1"
            >
              Looks like only quoted content • Show anyway
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-b-2 border-gray-200 ${isLatest ? 'bg-blue-50/20' : 'bg-white'}`}>
      {/* Message Header */}
      <div className="px-4 py-3">
        <div className="flex items-start space-x-3">
          {/* Avatar */}
          <div className={`w-7 h-7 bg-gradient-to-br ${getSenderColor(senderEmail)} text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0`}>
            {getProfileInitial(senderName, senderEmail)}
          </div>
          
          {/* Header Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="font-medium text-gray-900 truncate text-sm">
                  {senderName}
                </span>
                <span className="text-xs text-gray-500">
                  {senderEmail}
                </span>
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0" title={formattedDate}>
                {displayDate}
              </span>
            </div>
            
            {/* Recipients */}
            <div className="text-xs text-gray-500">
              <span>To: </span>
              <span>{formatRecipientsForHeaders(toData, 60)}</span>
              
              {/* CC Recipients */}
              {message.cc && message.cc.length > 0 && (
                <>
                  <br />
                  <span>CC: </span>
                  <span>{formatRecipientsForHeaders(message.cc, 60)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Message Content */}
      <div className="px-4 pb-3">
        {/* Security Banners */}
        <SecurityNote banners={processedContent.securityBanners} />
        
        {/* Main Email Body */}
        {processedContent.cleanBody && (
          <div className="max-w-full overflow-hidden" style={{ maxWidth: '680px' }}>
            <div className="text-sm leading-relaxed text-gray-800">
              <EmailViewer 
                htmlContent={processedContent.cleanBody}
                className="email-body-content-small"
              />
            </div>
          </div>
        )}
        
        {/* Signature Block */}
        <SignatureBlock signatures={processedContent.signatures} />
        
        {/* Quoted Content */}
        <QuotedContent quotedContent={processedContent.quotedContent || ''} />
        
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-700 mb-2">
              {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
            </p>
            <div className="space-y-1">
              {message.attachments.map((attachment, index) => (
                <div key={index} className="flex items-center space-x-2 text-xs text-gray-600">
                  <span>📎</span>
                  <span>{attachment.name || `Attachment ${index + 1}`}</span>
                  {attachment.size && (
                    <span className="text-xs text-gray-500">
                      ({Math.round(attachment.size / 1024)}KB)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
