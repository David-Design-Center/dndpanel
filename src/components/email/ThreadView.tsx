import React, { useState } from 'react';
import { Email } from '@/types';
import { MessageStub } from './MessageStub';
import { MessageCard } from './MessageCard';

interface ThreadViewProps {
  messages: Email[];
  getSenderColor: (email: string) => string;
}

export const ThreadView: React.FC<ThreadViewProps> = ({ messages, getSenderColor }) => {
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(
    messages.length > 0 ? messages[0].id : null // Expand latest message by default
  );

  const handleMessageClick = (messageId: string) => {
    setExpandedMessageId(expandedMessageId === messageId ? null : messageId);
  };

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No messages found
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-0">
        {messages.map((message, index) => {
          const isExpanded = expandedMessageId === message.id;
          const isLatest = index === 0;
          const previousMessage = index > 0 ? messages[index - 1] : undefined;

          if (isExpanded) {
            return (
              <MessageCard
                key={message.id}
                message={message}
                previousMessage={previousMessage}
                isLatest={isLatest}
                getSenderColor={getSenderColor}
                onToggleExpansion={() => handleMessageClick(message.id)}
              />
            );
          } else {
            return (
              <MessageStub
                key={message.id}
                message={message}
                onClick={() => handleMessageClick(message.id)}
                isLatest={isLatest}
                getSenderColor={getSenderColor}
              />
            );
          }
        })}
      </div>
    </div>
  );
};
