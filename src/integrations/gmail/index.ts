/**
 * Gmail API wrapper with refactored, sustainable modules
 */

// Types
export type { EmailPart, GmailMessage, ParsedEmail, CharsetDetectionResult } from './types';

// Base64 utilities
export { decodeBase64UrlToBytes, decodeQuotedPrintableToBytes, base64UrlDecode, base64UrlEncode } from './utils/base64';

// Charset detection
export {
  extractCharsetFromPart,
  decodeWithFallbacks,
  decodeHtmlEntities,
} from './parsing/charset';

// Body extraction
export { extractTextFromPart, findBodyPart } from './parsing/body';

// Headers parsing
export {
  parseHeaders,
  decodeRfc2047,
  parseEmailAddresses,
  getHeaderValue,
  getRecipients,
} from './parsing/headers';

// MIME utilities - re-export from parsing module
export {
  extractAttachments,
  extractInlineImages,
  getMimeStructure,
} from './parsing/index';

// Fetch operations
export {
  fetchGmailMessages,
  fetchGmailMessageById,
  fetchLatestMessageInThread,
  fetchThreadMessages,
  type PaginatedEmailResponse,
} from './fetch/messages';

// Attachment operations
export { getAttachmentDownloadUrl } from './operations/attachments';

// Label operations
export {
  fetchGmailLabels,
  fetchGmailMessagesByLabel,
  createGmailLabel,
  updateGmailLabel,
  deleteGmailLabel,
  applyGmailLabels,
  type LabelProgressCallback,
} from './operations/labels';

// Message mutations
export {
  markGmailMessageAsTrash,
  markGmailMessageAsRead,
  markGmailMessageAsUnread,
  markGmailMessageAsStarred,
  markGmailMessageAsUnstarred,
  markGmailMessageAsImportant,
  markGmailMessageAsUnimportant,
} from './operations/mutations';

// Filter operations
export {
  listGmailFilters,
  getGmailFilter,
  createGmailFilter,
  deleteGmailFilter,
} from './operations/filters';

// Contacts & Profile operations
export {
  getGmailUserProfile,
  testPeopleAPI,
  fetchPeopleConnections,
  fetchOtherContacts,
} from './contacts/profile';

// Trash operations
export {
  emptyGmailTrash,
} from './misc/trash';

// Send/Compose operations
export {
  sendGmailMessage,
  saveGmailDraft,
} from './send/compose';