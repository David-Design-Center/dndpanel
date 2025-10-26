/**
 * Gmail-specific types for email parsing and handling
 */

export interface EmailPart {
  partId?: string;
  mimeType: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: {
    attachmentId?: string;
    size?: number;
    data?: string;
  };
  parts?: EmailPart[];
}

export interface GmailMessage {
  id: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  payload?: EmailPart;
  internalDate?: string;
  historyId?: string;
  sizeEstimate?: number;
}

export interface ParsedEmail {
  id: string;
  threadId?: string;
  subject: string;
  from: { name: string; email: string };
  to: Array<{ name: string; email: string }>;
  cc?: Array<{ name: string; email: string }>;
  date: string;
  body: string;
  preview: string;
  isRead: boolean;
  isImportant?: boolean;
  isStarred?: boolean;
  labelIds?: string[];
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
    mimeType: string;
    attachmentId?: string;
  }>;
}

export interface CharsetDetectionResult {
  text: string;
  confidence: number;
  charset: string;
}
