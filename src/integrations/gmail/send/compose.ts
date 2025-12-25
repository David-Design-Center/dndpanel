/**
 * Gmail send and compose operations
 * Handles: sending emails, saving drafts, message composition
 */

/**
 * Check if Gmail is signed in
 */
const isGmailSignedIn = (): boolean => {
  try {
    return window.gapi?.client?.gmail !== undefined;
  } catch {
    return false;
  }
};

/**
 * Extract inline images from HTML and convert data: URLs to CID references
 */
const extractInlineImages = (html: string): { 
  html: string, 
  inlineImages: Array<{ name: string; mimeType: string; data: string; cid: string }> 
} => {
  const inlineImages: Array<{ name: string; mimeType: string; data: string; cid: string }> = [];
  
  // Find all img tags with data: URLs
  const imgRegex = /<img[^>]*src="data:([^;]+);base64,([^"]+)"[^>]*>/gi;
  let match;
  let imageCounter = 1;
  let processedHtml = html;
  
  while ((match = imgRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const mimeType = match[1];
    const base64Data = match[2];
    
    // Generate unique CID
    const cid = `inline-image-${imageCounter}-${Date.now()}@gmail.com`;
    
    // Extract other attributes from the img tag
    const altMatch = fullMatch.match(/alt="([^"]*)"/i);
    const alt = altMatch ? altMatch[1] : '';
    const filename = alt || `inline-image-${imageCounter}`;
    
    // Determine file extension from MIME type
    const extension = mimeType.split('/')[1] || 'png';
    const name = `${filename}.${extension}`;
    
    // Replace data URL with CID reference
    const cidImg = fullMatch.replace(/src="data:[^"]+"/i, `src="cid:${cid}"`);
    processedHtml = processedHtml.replace(fullMatch, cidImg);
    
    // Add to inline images array
    inlineImages.push({
      name,
      mimeType,
      data: base64Data,
      cid
    });
    
    imageCounter++;
  }
  
  console.log(`🖼️ extractInlineImages: Found ${inlineImages.length} inline images`);
  inlineImages.forEach((img, index) => {
    console.log(`🖼️ Image ${index + 1}: ${img.name} (${img.mimeType}) -> CID: ${img.cid}`);
  });
  
  return { html: processedHtml, inlineImages };
};

/**
 * Send email via Gmail
 */
export const sendGmailMessage = async (
  to: string,
  cc: string,
  subject: string,
  body: string,
  attachments?: Array<{ name: string; mimeType: string; data: string; cid?: string }>,
  conversationThreadId?: string,
  bcc?: string
): Promise<{ success: boolean; threadId?: string }> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`📧 sendGmailMessage: Sending email to ${to}`);
    console.log(`📧 Subject: ${subject}`);
    console.log(`📧 Body length: ${body.length}`);
    console.log(`📧 Attachments: ${attachments?.length || 0}`);
    console.log(`📧 Thread ID: ${conversationThreadId || 'none'}`);

    // Extract inline images from HTML
    const { html: processedHtml, inlineImages: extractedImages } = extractInlineImages(body);
    console.log(`📧 Processed HTML length: ${processedHtml.length}`);
    console.log(`📧 Inline images found: ${extractedImages.length}`);

    // Separate inline and regular attachments
    const inlineAttachments: Array<{ name: string; mimeType: string; data: string; cid: string }> = [];
    const regularAttachments: Array<{ name: string; mimeType: string; data: string }> = [];
    
    if (attachments) {
      for (const attachment of attachments) {
        if (attachment.cid) {
          inlineAttachments.push({
            name: attachment.name,
            mimeType: attachment.mimeType,
            data: attachment.data,
            cid: attachment.cid
          });
        } else {
          regularAttachments.push({
            name: attachment.name,
            mimeType: attachment.mimeType,
            data: attachment.data
          });
        }
      }
    }

    // Combine extracted inline images with passed inline attachments
    const allInlineImages = [...extractedImages, ...inlineAttachments];
    console.log(`📧 Total inline images: ${allInlineImages.length} (${extractedImages.length} extracted + ${inlineAttachments.length} passed)`);
    console.log(`📧 Regular attachments: ${regularAttachments.length}`);

    // Generate boundaries
    const mainBoundary = `000000000000${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const relatedBoundary = `000000000000${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const alternativeBoundary = `000000000000${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    
    let emailContent: string[];
    
    const hasRegularAttachments = regularAttachments && regularAttachments.length > 0;
    const hasInlineImages = allInlineImages.length > 0;
    
    if (hasInlineImages && hasRegularAttachments) {
      // Complex: multipart/mixed > multipart/related > multipart/alternative > text/html + inline images
      emailContent = [
        'MIME-Version: 1.0',
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        bcc ? `Bcc: ${bcc}` : '',
        `Subject: ${subject}`,
        `Content-Type: multipart/mixed; boundary="${mainBoundary}"`
      ].filter(Boolean);
      
      emailContent.push('');
      emailContent.push(`--${mainBoundary}`);
      emailContent.push(`Content-Type: multipart/related; boundary="${relatedBoundary}"`);
      
      emailContent.push('');
      emailContent.push(`--${relatedBoundary}`);
      emailContent.push(`Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`);
      
      // Plain text version
      const plainText = processedHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/plain; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(plainText);
      
      // HTML content
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/html; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(processedHtml);
      
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}--`);
      
      // Add inline images
      for (const image of allInlineImages) {
        emailContent.push('');
        emailContent.push(`--${relatedBoundary}`);
        emailContent.push(`Content-Type: ${image.mimeType}; name="${image.name}"`);
        emailContent.push(`Content-Disposition: inline; filename="${image.name}"`);
        emailContent.push(`Content-ID: <${image.cid}>`);
        emailContent.push('Content-Transfer-Encoding: base64');
        emailContent.push(`X-Attachment-Id: ${image.cid}`);
        emailContent.push('');
        
        const base64Lines = image.data.match(/.{1,76}/g) || [];
        emailContent.push(base64Lines.join('\r\n'));
      }
      
      emailContent.push('');
      emailContent.push(`--${relatedBoundary}--`);
      
      // Add regular attachments
      for (const attachment of regularAttachments) {
        emailContent.push('');
        emailContent.push(`--${mainBoundary}`);
        emailContent.push(`Content-Type: ${attachment.mimeType}; name="${attachment.name}"`);
        emailContent.push(`Content-Disposition: attachment; filename="${attachment.name}"`);
        emailContent.push('Content-Transfer-Encoding: base64');
        emailContent.push('');
        
        const base64Lines = attachment.data.match(/.{1,76}/g) || [];
        emailContent.push(base64Lines.join('\r\n'));
      }
      
      emailContent.push('');
      emailContent.push(`--${mainBoundary}--`);
      
    } else if (hasInlineImages) {
      // Inline images only: multipart/related > multipart/alternative > text/html + inline images
      emailContent = [
        'MIME-Version: 1.0',
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        bcc ? `Bcc: ${bcc}` : '',
        `Subject: ${subject}`,
        `Content-Type: multipart/related; boundary="${relatedBoundary}"`
      ].filter(Boolean);
      
      emailContent.push('');
      emailContent.push(`--${relatedBoundary}`);
      emailContent.push(`Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`);
      
      const plainText = processedHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/plain; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(plainText);
      
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/html; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(processedHtml);
      
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}--`);
      
      // Add inline images
      for (const image of allInlineImages) {
        emailContent.push('');
        emailContent.push(`--${relatedBoundary}`);
        emailContent.push(`Content-Type: ${image.mimeType}; name="${image.name}"`);
        emailContent.push(`Content-Disposition: inline; filename="${image.name}"`);
        emailContent.push(`Content-ID: <${image.cid}>`);
        emailContent.push('Content-Transfer-Encoding: base64');
        emailContent.push(`X-Attachment-Id: ${image.cid}`);
        emailContent.push('');
        
        const base64Lines = image.data.match(/.{1,76}/g) || [];
        emailContent.push(base64Lines.join('\r\n'));
      }
      
      emailContent.push('');
      emailContent.push(`--${relatedBoundary}--`);
      
    } else if (hasRegularAttachments) {
      // Regular attachments only
      emailContent = [
        'MIME-Version: 1.0',
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        bcc ? `Bcc: ${bcc}` : '',
        `Subject: ${subject}`,
        `Content-Type: multipart/mixed; boundary="${mainBoundary}"`
      ].filter(Boolean);
      
      emailContent.push('');
      emailContent.push(`--${mainBoundary}`);
      emailContent.push(`Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`);
      
      const plainText = processedHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/plain; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(plainText);
      
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/html; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(processedHtml);
      
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}--`);
      
      // Add attachments
      for (const attachment of regularAttachments) {
        emailContent.push('');
        emailContent.push(`--${mainBoundary}`);
        emailContent.push(`Content-Type: ${attachment.mimeType}; name="${attachment.name}"`);
        emailContent.push(`Content-Disposition: attachment; filename="${attachment.name}"`);
        emailContent.push('Content-Transfer-Encoding: base64');
        emailContent.push('');
        
        const base64Lines = attachment.data.match(/.{1,76}/g) || [];
        emailContent.push(base64Lines.join('\r\n'));
      }
      
      emailContent.push('');
      emailContent.push(`--${mainBoundary}--`);
      
    } else {
      // Simple HTML message
      emailContent = [
        'MIME-Version: 1.0',
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        bcc ? `Bcc: ${bcc}` : '',
        `Subject: ${subject}`,
        `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`
      ].filter(Boolean);
      
      const plainText = processedHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/plain; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(plainText);
      
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/html; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(processedHtml);
      
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}--`);
    }

    const rawEmail = emailContent.join('\r\n');
    console.log(`📧 Raw email length: ${rawEmail.length}`);

    // Encode to base64url
    const emailBytes = new TextEncoder().encode(rawEmail);
    let binaryString = '';
    for (let i = 0; i < emailBytes.length; i++) {
      binaryString += String.fromCharCode(emailBytes[i]);
    }
    
    const encodedEmail = btoa(binaryString)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const requestBody: any = {
      raw: encodedEmail
    };

    if (conversationThreadId) {
      requestBody.threadId = conversationThreadId;
    }

    console.log(`📧 Sending email via Gmail API...`);

    const response = await window.gapi.client.gmail.users.messages.send({
      userId: 'me',
      resource: requestBody
    });

    console.log(`✅ Email sent successfully:`, response);

    return { 
      success: true, 
      threadId: response.result.threadId 
    };

  } catch (error) {
    console.error(`❌ Error sending email via Gmail:`, error);
    throw error;
  }
};

/**
 * Save email as draft in Gmail
 */
export const saveGmailDraft = async (
  to: string,
  cc: string,
  subject: string,
  body: string,
  attachments?: Array<{ name: string; mimeType: string; data: string; cid?: string }>,
  draftId?: string,
  bcc?: string
): Promise<{ success: boolean; draftId?: string }> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`📧 saveGmailDraft: Saving draft to ${to}`);
    console.log(`📧 Subject: ${subject}`);
    console.log(`📧 Body length: ${body.length}`);
    console.log(`📧 Attachments: ${attachments?.length || 0}`);
    console.log(`📧 Existing Draft ID: ${draftId || 'none'}`);

    // Extract inline images from HTML
    const { html: processedHtml, inlineImages: extractedImages } = extractInlineImages(body);
    
    // Categorize attachments
    const inlineAttachments = attachments?.filter(att => att.cid) || [];
    const regularAttachments = attachments?.filter(att => !att.cid) || [];
    
    const allInlineImages = [...extractedImages, ...inlineAttachments];
    console.log(`📧 Total inline images: ${allInlineImages.length} (${extractedImages.length} extracted + ${inlineAttachments.length} passed)`);
    console.log(`📧 Regular attachments: ${regularAttachments.length}`);

    // Generate boundaries
    const mainBoundary = `000000000000${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const relatedBoundary = `000000000000${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const alternativeBoundary = `000000000000${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    
    let emailContent: string[];
    
    const hasRegularAttachments = regularAttachments && regularAttachments.length > 0;
    const hasInlineImages = allInlineImages.length > 0;
    
    // Use same message structure as sendGmailMessage for consistency
    if (hasInlineImages && hasRegularAttachments) {
      emailContent = [
        'MIME-Version: 1.0',
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        bcc ? `Bcc: ${bcc}` : '',
        `Subject: ${subject}`,
        `Content-Type: multipart/mixed; boundary="${mainBoundary}"`
      ].filter(Boolean);
      
      emailContent.push('');
      emailContent.push(`--${mainBoundary}`);
      emailContent.push(`Content-Type: multipart/related; boundary="${relatedBoundary}"`);
      
      emailContent.push('');
      emailContent.push(`--${relatedBoundary}`);
      emailContent.push(`Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`);
      
      const plainText = processedHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/plain; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(plainText);
      
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/html; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(processedHtml);
      
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}--`);
      
      for (const image of allInlineImages) {
        emailContent.push('');
        emailContent.push(`--${relatedBoundary}`);
        emailContent.push(`Content-Type: ${image.mimeType}; name="${image.name}"`);
        emailContent.push(`Content-Disposition: inline; filename="${image.name}"`);
        emailContent.push(`Content-ID: <${image.cid}>`);
        emailContent.push('Content-Transfer-Encoding: base64');
        emailContent.push(`X-Attachment-Id: ${image.cid}`);
        emailContent.push('');
        
        const base64Lines = image.data.match(/.{1,76}/g) || [];
        emailContent.push(base64Lines.join('\r\n'));
      }
      
      emailContent.push('');
      emailContent.push(`--${relatedBoundary}--`);
      
      for (const attachment of regularAttachments) {
        emailContent.push('');
        emailContent.push(`--${mainBoundary}`);
        emailContent.push(`Content-Type: ${attachment.mimeType}; name="${attachment.name}"`);
        emailContent.push(`Content-Disposition: attachment; filename="${attachment.name}"`);
        emailContent.push('Content-Transfer-Encoding: base64');
        emailContent.push('');
        
        const base64Lines = attachment.data.match(/.{1,76}/g) || [];
        emailContent.push(base64Lines.join('\r\n'));
      }
      
      emailContent.push('');
      emailContent.push(`--${mainBoundary}--`);
      
    } else if (hasInlineImages) {
      emailContent = [
        'MIME-Version: 1.0',
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        bcc ? `Bcc: ${bcc}` : '',
        `Subject: ${subject}`,
        `Content-Type: multipart/related; boundary="${relatedBoundary}"`
      ].filter(Boolean);
      
      emailContent.push('');
      emailContent.push(`--${relatedBoundary}`);
      emailContent.push(`Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`);
      
      const plainText = processedHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/plain; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(plainText);
      
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/html; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(processedHtml);
      
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}--`);
      
      for (const image of allInlineImages) {
        emailContent.push('');
        emailContent.push(`--${relatedBoundary}`);
        emailContent.push(`Content-Type: ${image.mimeType}; name="${image.name}"`);
        emailContent.push(`Content-Disposition: inline; filename="${image.name}"`);
        emailContent.push(`Content-ID: <${image.cid}>`);
        emailContent.push('Content-Transfer-Encoding: base64');
        emailContent.push(`X-Attachment-Id: ${image.cid}`);
        emailContent.push('');
        
        const base64Lines = image.data.match(/.{1,76}/g) || [];
        emailContent.push(base64Lines.join('\r\n'));
      }
      
      emailContent.push('');
      emailContent.push(`--${relatedBoundary}--`);
      
    } else if (hasRegularAttachments) {
      emailContent = [
        'MIME-Version: 1.0',
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        bcc ? `Bcc: ${bcc}` : '',
        `Subject: ${subject}`,
        `Content-Type: multipart/mixed; boundary="${mainBoundary}"`
      ].filter(Boolean);
      
      emailContent.push('');
      emailContent.push(`--${mainBoundary}`);
      emailContent.push(`Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`);
      
      const plainText = processedHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/plain; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(plainText);
      
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/html; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(processedHtml);
      
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}--`);
      
      for (const attachment of regularAttachments) {
        emailContent.push('');
        emailContent.push(`--${mainBoundary}`);
        emailContent.push(`Content-Type: ${attachment.mimeType}; name="${attachment.name}"`);
        emailContent.push(`Content-Disposition: attachment; filename="${attachment.name}"`);
        emailContent.push('Content-Transfer-Encoding: base64');
        emailContent.push('');
        
        const base64Lines = attachment.data.match(/.{1,76}/g) || [];
        emailContent.push(base64Lines.join('\r\n'));
      }
      
      emailContent.push('');
      emailContent.push(`--${mainBoundary}--`);
      
    } else {
      emailContent = [
        'MIME-Version: 1.0',
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        bcc ? `Bcc: ${bcc}` : '',
        `Subject: ${subject}`,
        `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`
      ].filter(Boolean);
      
      const plainText = processedHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/plain; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(plainText);
      
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}`);
      emailContent.push('Content-Type: text/html; charset=UTF-8');
      emailContent.push('Content-Transfer-Encoding: 7bit');
      emailContent.push('');
      emailContent.push(processedHtml);
      
      emailContent.push('');
      emailContent.push(`--${alternativeBoundary}--`);
    }

    const rawEmail = emailContent.join('\r\n');
    console.log(`📧 Raw email length: ${rawEmail.length}`);

    // Encode to base64url
    const emailBytes = new TextEncoder().encode(rawEmail);
    let binaryString = '';
    for (let i = 0; i < emailBytes.length; i++) {
      binaryString += String.fromCharCode(emailBytes[i]);
    }
    
    const encodedEmail = btoa(binaryString)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log(`📧 Saving draft via Gmail API...`);

    let response;
    if (draftId) {
      // Update existing draft
      response = await window.gapi.client.gmail.users.drafts.update({
        userId: 'me',
        id: draftId,
        resource: {
          message: {
            raw: encodedEmail
          }
        }
      });
      console.log(`✅ Draft updated successfully:`, response);
    } else {
      // Create new draft
      response = await window.gapi.client.gmail.users.drafts.create({
        userId: 'me',
        resource: {
          message: {
            raw: encodedEmail
          }
        }
      });
      console.log(`✅ Draft created successfully:`, response);
    }

    return { 
      success: true, 
      draftId: response.result.id 
    };

  } catch (error) {
    console.error(`❌ Error saving draft:`, error);
    throw error;
  }
};
