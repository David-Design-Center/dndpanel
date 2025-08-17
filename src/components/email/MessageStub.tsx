import React from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getProfileInitial } from '@/lib/utils';
import { Email } from '@/types';
import { cleanEmailAddress } from '@/utils/emailFormatting';

interface MessageStubProps {
  message: Email;
  onClick: () => void;
  isLatest?: boolean;
  getSenderColor: (email: string) => string;
}

export const MessageStub: React.FC<MessageStubProps> = ({ 
  message, 
  onClick, 
  isLatest = false, 
  getSenderColor 
}) => {
  const fromData = message.from || { email: 'unknown@example.com', name: 'Unknown Sender' };
  const senderEmail = cleanEmailAddress(fromData.email || 'unknown@example.com');
  const senderName = fromData.name || fromData.email || 'Unknown Sender';

  let displayDate = 'Unknown date';
  if (message.date) {
    try {
      const parsedDate = parseISO(message.date);
      displayDate = formatDistanceToNow(parsedDate, { addSuffix: true });
    } catch {
      displayDate = message.date;
    }
  }

  // Create a clean preview without HTML tags
  const preview = message.preview || 
    (message.body ? message.body.replace(/<[^>]*>/g, '').substring(0, 80) + '...' : 'No preview available');

  return (
    <div 
      className={`px-3 py-2 cursor-pointer hover:bg-gray-50 border-l-2 transition-all ${
        isLatest ? 'border-l-blue-500 bg-blue-50/30' : 'border-l-transparent'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-2">
        {/* Avatar */}
        <div className={`w-6 h-6 bg-gradient-to-br ${getSenderColor(senderEmail)} text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0`}>
          {getProfileInitial(senderName, senderEmail)}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-900 truncate">
              {senderName}
            </span>
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
              {displayDate}
            </span>
          </div>
          <p className="text-xs text-gray-600 truncate mt-0.5">
            {preview}
          </p>
        </div>
      </div>
    </div>
  );
};
