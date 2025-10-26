/**
 * Gmail attachment operations
 * Handles: downloads, processing, etc.
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
 * Get attachment download URL
 */
export const getAttachmentDownloadUrl = async (
  messageId: string,
  attachmentId: string,
  _filename: string,
  mimeType: string
): Promise<string> => {
  try {
    if (!isGmailSignedIn()) {
      throw new Error('Not signed in to Gmail');
    }

    const response = await window.gapi.client.gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId,
      id: attachmentId
    });

    if (!response.result || !response.result.data) {
      throw new Error('No attachment data returned from API');
    }

    // Convert the base64url data to a Blob
    let base64Data = response.result.data.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (base64Data.length % 4 !== 0) {
      base64Data += '=';
    }

    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create a Blob from the binary data
    const blob = new Blob([bytes], { type: mimeType });
    
    // Create an object URL
    const url = URL.createObjectURL(blob);
    
    // Set up cleanup of the URL after it's used
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
    
    return url;
  } catch (error) {
    console.error('Error fetching attachment:', error);
    throw error;
  }
};
