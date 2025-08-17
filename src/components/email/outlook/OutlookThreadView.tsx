import React, { useState } from 'react';
import { Email } from '../../../types';
import { OutlookMessageCard } from './OutlookMessageCard';

interface OutlookThreadViewProps {
  messages: Email[];
  getSenderColor: (email: string) => string;
  onReply?: (messageId: string) => void;
  onReplyAll?: (messageId: string) => void;
  onForward?: (messageId: string) => void;
}

export const OutlookThreadView: React.FC<OutlookThreadViewProps> = ({ 
  messages, 
  getSenderColor,
  onReply,
  onReplyAll,
  onForward
}) => {
  // Track expanded state for each message (most recent message expanded by default)
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(() => {
    const initialSet = new Set<string>();
    if (messages.length > 0) {
      // Expand the most recent message by default
      initialSet.add(messages[messages.length - 1].id);
    }
    return initialSet;
  });

  const toggleMessageExpanded = (messageId: string) => {
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

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 bg-gray-50/30 rounded-2xl">
        <div className="text-center">
          <p className="text-lg mb-2">No messages found</p>
          <p className="text-sm">This thread appears to be empty</p>
        </div>
      </div>
    );
  }

  // Get the subject from the latest message
  const threadSubject = messages[0]?.subject || 'Thread';

  console.log('Thread messages:', messages.length, 'Expanded messages:', expandedMessages.size);

  return (
    <div className="h-full">
      {/* Subject header - compact with better truncation */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-2">
        <div className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
          {threadSubject}
        </div>
        <div className="text-xs text-gray-600">
          {messages.length} message{messages.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Message list - cleaner spacing, no additional container */}
      <div className="px-4 py-2 space-y-2">
        {messages.map((message, index) => {
          console.log(`Rendering message ${index}:`, message.id, 'expanded:', expandedMessages.has(message.id));
          return (
            <OutlookMessageCard
              key={message.id}
              message={message}
              onReply={() => onReply?.(message.id)}
              onReplyAll={() => onReplyAll?.(message.id)}
              onForward={() => onForward?.(message.id)}
              getSenderColor={getSenderColor}
              isExpanded={expandedMessages.has(message.id)}
              onToggleExpanded={() => toggleMessageExpanded(message.id)}
            />
          );
        })}
      </div>
    </div>
  );
};
