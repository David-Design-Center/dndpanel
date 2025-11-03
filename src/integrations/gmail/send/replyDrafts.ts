/**
 * Gmail reply draft operations
 * Handles: creating, updating, and deleting reply drafts
 */

interface ReplyDraftPayload {
  to?: string;
  body: string;
  mode: 'reply' | 'replyAll' | 'forward';
  threadId?: string;
  inReplyTo?: string;
}

interface DraftResponse {
  id: string;
  version: number;
  message?: {
    id: string;
    threadId: string;
  };
}

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
 * Create a new reply draft in Gmail
 */
export const createReplyDraft = async (
  payload: ReplyDraftPayload
): Promise<DraftResponse> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log('📝 Creating reply draft:', payload);

    // Build the email message
    const emailLines: string[] = [
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
    ];

    // Add To field for forward mode
    if (payload.mode === 'forward' && payload.to) {
      emailLines.push(`To: ${payload.to}`);
    }

    // Add References and In-Reply-To headers for threading
    if (payload.inReplyTo) {
      emailLines.push(`In-Reply-To: ${payload.inReplyTo}`);
      emailLines.push(`References: ${payload.inReplyTo}`);
    }

    // Add empty line before body
    emailLines.push('');
    emailLines.push(payload.body);

    const rawEmail = emailLines.join('\r\n');
    
    // Encode to base64url
    const encodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Prepare draft request body
    const draftBody: any = {
      message: {
        raw: encodedEmail,
      },
    };

    // Add threadId if this is a reply
    if (payload.threadId && payload.mode !== 'forward') {
      draftBody.message.threadId = payload.threadId;
    }

    console.log('📝 Draft body prepared, creating...');

    // Create the draft via Gmail API
    const response = await window.gapi.client.gmail.users.drafts.create({
      userId: 'me',
      resource: draftBody,
    });

    console.log('✅ Draft created:', response.result);

    return {
      id: response.result.id || '',
      version: 1, // First version
      message: response.result.message,
    };
  } catch (error: any) {
    console.error('❌ Failed to create reply draft:', error);
    throw error;
  }
};

/**
 * Update an existing reply draft in Gmail
 */
export const updateReplyDraft = async (
  draftId: string,
  payload: ReplyDraftPayload,
  version: number
): Promise<DraftResponse> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`📝 Updating reply draft ${draftId} (v${version}):`, payload);

    // Build the email message
    const emailLines: string[] = [
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
    ];

    // Add To field for forward mode
    if (payload.mode === 'forward' && payload.to) {
      emailLines.push(`To: ${payload.to}`);
    }

    // Add References and In-Reply-To headers for threading
    if (payload.inReplyTo) {
      emailLines.push(`In-Reply-To: ${payload.inReplyTo}`);
      emailLines.push(`References: ${payload.inReplyTo}`);
    }

    // Add empty line before body
    emailLines.push('');
    emailLines.push(payload.body);

    const rawEmail = emailLines.join('\r\n');
    
    // Encode to base64url
    const encodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Prepare draft request body
    const draftBody: any = {
      message: {
        raw: encodedEmail,
      },
    };

    // Add threadId if this is a reply
    if (payload.threadId && payload.mode !== 'forward') {
      draftBody.message.threadId = payload.threadId;
    }

    console.log('📝 Draft body prepared, updating...');

    // Update the draft via Gmail API
    const response = await window.gapi.client.gmail.users.drafts.update({
      userId: 'me',
      id: draftId,
      resource: draftBody,
    });

    console.log('✅ Draft updated:', response.result);

    return {
      id: response.result.id || draftId,
      version: version + 1, // Increment version
      message: response.result.message,
    };
  } catch (error: any) {
    console.error('❌ Failed to update reply draft:', error);
    
    // Check for specific error codes
    if (error.status === 404) {
      const notFoundError: any = new Error('Draft not found');
      notFoundError.status = 404;
      throw notFoundError;
    }
    
    // Version conflict (Gmail doesn't support If-Match, but we track it client-side)
    throw error;
  }
};

/**
 * Delete a reply draft from Gmail
 */
export const deleteReplyDraft = async (draftId: string): Promise<void> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`🗑️ Deleting reply draft: ${draftId}`);

    await window.gapi.client.gmail.users.drafts.delete({
      userId: 'me',
      id: draftId,
    });

    console.log('✅ Draft deleted');
  } catch (error: any) {
    console.error('❌ Failed to delete reply draft:', error);
    
    // Ignore 404 errors (draft already deleted)
    if (error.status === 404) {
      console.log('Draft already deleted or not found');
      return;
    }
    
    throw error;
  }
};

/**
 * Get a reply draft from Gmail
 */
export const getReplyDraft = async (draftId: string): Promise<DraftResponse> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`📖 Getting reply draft: ${draftId}`);

    const response = await window.gapi.client.gmail.users.drafts.get({
      userId: 'me',
      id: draftId,
      format: 'full',
    });

    console.log('✅ Draft retrieved:', response.result);

    return {
      id: response.result.id || draftId,
      version: 1, // Version tracking is client-side
      message: response.result.message,
    };
  } catch (error: any) {
    console.error('❌ Failed to get reply draft:', error);
    throw error;
  }
};

/**
 * Send a draft as a reply (converts draft to sent message)
 */
export const sendReplyDraft = async (draftId: string): Promise<{ success: boolean; messageId?: string }> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    console.log(`📤 Sending reply draft: ${draftId}`);

    const response = await window.gapi.client.gmail.users.drafts.send({
      userId: 'me',
      resource: {
        id: draftId,
      },
    });

    console.log('✅ Draft sent:', response.result);

    return {
      success: true,
      messageId: response.result.id,
    };
  } catch (error: any) {
    console.error('❌ Failed to send reply draft:', error);
    throw error;
  }
};
