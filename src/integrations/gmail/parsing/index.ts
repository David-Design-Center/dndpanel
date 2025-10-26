/**
 * MIME multipart email handling
 */

import type { EmailPart } from '../types';

/**
 * Extract all attachments from email parts
 */
export function extractAttachments(
  payload: EmailPart
): Array<{
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
  partId?: string;
}> {
  const attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
    partId?: string;
  }> = [];

  function traverse(part: EmailPart) {
    // Check if this is an attachment
    if (
      part.filename &&
      part.body?.attachmentId &&
      !part.mimeType?.startsWith('text/')
    ) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId,
        partId: part.partId,
      });
    }

    // Recurse into nested parts
    if (part.parts) {
      part.parts.forEach(traverse);
    }
  }

  traverse(payload);
  return attachments;
}

/**
 * Extract inline images from email parts (for processing)
 */
export function extractInlineImages(payload: EmailPart): Array<{
  contentId: string;
  attachmentId: string;
  mimeType: string;
  filename: string;
}> {
  const inlineImages: Array<{
    contentId: string;
    attachmentId: string;
    mimeType: string;
    filename: string;
  }> = [];

  function traverse(part: EmailPart) {
    if (part.mimeType?.startsWith('image/') && part.body?.attachmentId) {
      const contentIdHeader = part.headers?.find(
        h => h.name.toLowerCase() === 'content-id'
      );

      if (contentIdHeader) {
        const contentId = contentIdHeader.value.replace(/[<>]/g, '');
        inlineImages.push({
          contentId,
          attachmentId: part.body.attachmentId,
          mimeType: part.mimeType,
          filename: part.filename || 'image',
        });
      }
    }

    if (part.parts) {
      part.parts.forEach(traverse);
    }
  }

  traverse(payload);
  return inlineImages;
}

/**
 * Get MIME type structure info
 */
export function getMimeStructure(payload: EmailPart): {
  hasHtml: boolean;
  hasPlainText: boolean;
  hasAttachments: boolean;
  attachmentCount: number;
  textParts: EmailPart[];
} {
  const textParts: EmailPart[] = [];
  let hasHtml = false;
  let hasPlainText = false;
  let attachmentCount = 0;

  function traverse(part: EmailPart) {
    if (part.mimeType === 'text/html') {
      hasHtml = true;
      if (part.body?.data) {
        textParts.push(part);
      }
    } else if (part.mimeType === 'text/plain') {
      hasPlainText = true;
      if (part.body?.data) {
        textParts.push(part);
      }
    } else if (
      part.filename &&
      part.body?.attachmentId &&
      !part.mimeType?.startsWith('text/')
    ) {
      attachmentCount++;
    }

    if (part.parts) {
      part.parts.forEach(traverse);
    }
  }

  traverse(payload);

  return {
    hasHtml,
    hasPlainText,
    hasAttachments: attachmentCount > 0,
    attachmentCount,
    textParts,
  };
}
