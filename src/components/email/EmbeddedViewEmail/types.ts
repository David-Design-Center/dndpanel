import { Email } from '../../../types';

// Component props
export interface EmbeddedViewEmailProps {
  emailId: string;
  onEmailUpdate?: (email: Email) => void;
  onEmailDelete?: (emailId: string) => void;
}

// Draft state for reply/forward composer
export interface DraftState {
  status: 'idle' | 'loading' | 'ready' | 'saving' | 'sending' | 'error';
  showComposer: boolean;
  mode: ReplyMode;
  content: string;
  forwardTo: string;
  draftId: string | null;
  messageId: string | null;
  version: number;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  lastHash: string;
  error: string | null;
}

// Reply mode types
export type ReplyMode = 'reply' | 'replyAll' | 'forward';

// Forward type (single message or entire thread)
export type ForwardType = 'single' | 'all';

// Attachment preview modal state
export interface AttachmentPreview {
  url: string;
  name: string;
  type: string;
}

// Formatted email time result
export interface FormattedEmailTime {
  time: string;
  relative: string;
  fullDate: string;
}

// Reply recipients result
export interface ReplyRecipients {
  to: string;
  cc: string;
}
