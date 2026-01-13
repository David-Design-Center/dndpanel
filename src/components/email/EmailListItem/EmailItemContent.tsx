import { Email } from '@/types';
import { Paperclip } from 'lucide-react';
import { cleanEmailSubject, cleanEncodingIssues } from '@/utils/textEncoding';
import { cleanEmailAddress } from '@/utils/emailFormatting';

interface EmailItemContentProps {
  email: Email;
  isSentFolder: boolean;
  hasDraftInThread?: boolean;
}

export function EmailItemContent({ email, isSentFolder, hasDraftInThread }: EmailItemContentProps) {
  // Check if this is a draft email
  const isDraft = email.labelIds?.includes('DRAFT');
  
  // Debug: Check if hasDraftInThread is being passed correctly
  if ((email as any).hasDraftInThread) {
    console.log(`📧 Email ${email.id} has hasDraftInThread:`, (email as any).hasDraftInThread, 'prop:', hasDraftInThread);
  }
  
  // Get current user's email to detect if message is from me
  const currentUserEmail = (
    (window as any)._currentProfileEmail || 
    localStorage.getItem('currentProfileUserEmail') || 
    ''
  ).toLowerCase().trim();
  
  // Check if the email's From is the current user (meaning I sent/replied last)
  const fromEmail = (email.from?.email || '').toLowerCase().trim();
  const isFromMe = currentUserEmail && fromEmail === currentUserEmail;
  
  // Determine sender/recipient text
  const senderText = (() => {
    // For drafts or when viewing Sent folder, show TO (recipient)
    if (isDraft || isSentFolder) {
      const firstRecipient = email.to?.[0];
      if (firstRecipient?.name) {
        return cleanEncodingIssues(firstRecipient.name);
      }
      if (firstRecipient?.email) {
        return cleanEmailAddress(firstRecipient.email);
      }
      return 'Unknown Recipient';
    }
    
    // If FROM is me (I replied last), show TO (the counterparty) instead
    if (isFromMe) {
      const firstRecipient = email.to?.[0];
      if (firstRecipient?.name) {
        return cleanEncodingIssues(firstRecipient.name);
      }
      if (firstRecipient?.email) {
        return cleanEmailAddress(firstRecipient.email);
      }
      // Fallback to FROM if no TO available
    }
    
    // For regular emails, show FROM (sender)
    if (email.from?.name) {
      return cleanEncodingIssues(email.from.name);
    }
    if (email.from?.email) {
      return cleanEmailAddress(email.from.email);
    }
    return 'Unknown Sender';
  })();

  return (
    <div className="email-row grid grid-cols-[auto_minmax(0,1fr)] min-w-0 flex-1 items-center gap-2 text-sm">
      {/* Sender */}
      <span
        className={`sender block w-44 shrink-0 truncate whitespace-nowrap leading-5 ${
          !email.isRead ? 'font-medium text-gray-900' : 'text-gray-700'
        }`}
        title={senderText}
      >
        {senderText}
      </span>

      {/* Subject + Snippet row */}
      <div className="min-w-0 flex items-center gap-2">
        <span
          className={`subject block ${
            !email.isRead ? 'text-gray-900' : 'text-gray-700'
          } shrink-0 max-w-[100%] truncate whitespace-nowrap leading-5`}
          title={email.subject || 'No Subject'}
        >
          {cleanEmailSubject(email.subject || 'No Subject')}
        </span>
        {hasDraftInThread && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-700 rounded shrink-0">
            Draft
          </span>
        )}
        <span
          className="snippet block min-w-0 flex-1 truncate whitespace-nowrap text-gray-500 leading-5"
          title={email.body}
        >
          {email.body}
        </span>
        {(email.attachments?.length ?? 0) > 0 && (
          <Paperclip size={14} className="text-gray-400 shrink-0" />
        )}
      </div>
    </div>
  );
}
