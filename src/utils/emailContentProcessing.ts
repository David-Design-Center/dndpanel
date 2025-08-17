// Email content processing utilities for cleaner email display

export interface ProcessedEmailContent {
  cleanBody: string;
  quotedContent?: string;
  signatures: string[];
  securityBanners: string[];
  isDuplicateContent?: boolean;
}

/**
 * Strip common quoted text patterns and separators
 */
export const stripQuotedText = (htmlContent: string): { cleanBody: string; quotedContent?: string } => {
  if (!htmlContent) return { cleanBody: '' };

  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  // Remove common quoted text elements
  const quotedSelectors = [
    '.gmail_quote',
    'blockquote[type="cite"]',
    '.gmail_extra',
    '.yahoo_quoted',
    '.moz-cite-prefix',
    '.OutlookMessageHeader'
  ];

  let quotedContent = '';
  quotedSelectors.forEach(selector => {
    const elements = tempDiv.querySelectorAll(selector);
    elements.forEach(el => {
      quotedContent += el.outerHTML + '\n';
      el.remove();
    });
  });

  // Remove text-based quoted content patterns
  let cleanText = tempDiv.innerHTML;
  
  // Common reply separators
  const replyPatterns = [
    /On .+? wrote:/gim,
    /From:.+?Sent:.+?To:.+?Subject:/gims,
    /-----Original Message-----.*$/gims,
    /________________________________.*$/gims,
    /\n>.*$/gim, // Lines starting with >
    /^\s*>.*$/gim // Lines starting with > (with whitespace)
  ];

  replyPatterns.forEach(pattern => {
    const matches = cleanText.match(pattern);
    if (matches) {
      quotedContent += matches.join('\n') + '\n';
      cleanText = cleanText.replace(pattern, '');
    }
  });

  return {
    cleanBody: cleanText.trim(),
    quotedContent: quotedContent.trim() || undefined
  };
};

/**
 * Detect and extract security banners and caution messages
 */
export const extractSecurityBanners = (htmlContent: string): { cleanBody: string; securityBanners: string[] } => {
  if (!htmlContent) return { cleanBody: '', securityBanners: [] };

  const securityBanners: string[] = [];
  let cleanContent = htmlContent;

  // Common security banner patterns
  const securityPatterns = [
    /\[CAUTION:.*?\]/gi,
    /You don't often get email from.*?/gi,
    /\[EXTERNAL.*?\]/gi,
    /This message was sent from outside.*?/gi,
    /WARNING:.*?external.*?/gi
  ];

  securityPatterns.forEach(pattern => {
    const matches = cleanContent.match(pattern);
    if (matches) {
      securityBanners.push(...matches);
      cleanContent = cleanContent.replace(pattern, '');
    }
  });

  // Remove security banner divs/containers
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = cleanContent;
  
  const bannerSelectors = [
    '[style*="background-color: #ffeb3b"]', // Yellow warning backgrounds
    '[style*="background-color: #fff3cd"]', // Bootstrap warning
    '.security-banner',
    '.caution-banner'
  ];

  bannerSelectors.forEach(selector => {
    const elements = tempDiv.querySelectorAll(selector);
    elements.forEach(el => {
      securityBanners.push(el.textContent?.trim() || '');
      el.remove();
    });
  });

  return {
    cleanBody: tempDiv.innerHTML.trim(),
    securityBanners: securityBanners.filter(banner => banner.length > 0)
  };
};

/**
 * Detect and group signature images (cid: references, small images, logo patterns)
 */
export const extractSignatures = (htmlContent: string): { cleanBody: string; signatures: string[] } => {
  if (!htmlContent) return { cleanBody: '', signatures: [] };

  const signatures: string[] = [];
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  // Find signature-like images
  const images = tempDiv.querySelectorAll('img');
  const signatureImages: HTMLImageElement[] = [];

  images.forEach(img => {
    const src = img.src || '';
    const alt = img.alt || '';
    const width = parseInt(img.getAttribute('width') || '0') || img.width || 0;
    const height = parseInt(img.getAttribute('height') || '0') || img.height || 0;
    
    // Signature image patterns
    const isSignatureImage = (
      src.includes('cid:') ||
      /image\d+/i.test(src) ||
      /logo|signature|sig/i.test(src) ||
      /logo|signature|sig/i.test(alt) ||
      (width > 0 && height > 0 && width * height < 10000) // Small images
    );

    if (isSignatureImage) {
      signatureImages.push(img);
    }
  });

  // Group consecutive signature images
  if (signatureImages.length > 0) {
    signatures.push(`<div class="signature-images">${signatureImages.map(img => img.outerHTML).join('')}</div>`);
    signatureImages.forEach(img => img.remove());
  }

  return {
    cleanBody: tempDiv.innerHTML.trim(),
    signatures
  };
};

/**
 * Check if message content is mostly duplicate/quoted content
 */
export const isDuplicateContent = (currentBody: string, previousBody: string): boolean => {
  if (!currentBody || !previousBody) return false;

  // Strip HTML and normalize whitespace
  const normalize = (text: string) => {
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };

  const current = normalize(currentBody);
  const previous = normalize(previousBody);

  if (current.length < 50) return false; // Too short to compare meaningfully

  // Check similarity using simple string comparison
  const similarity = current.length > 0 ? 
    (current.length - levenshteinDistance(current, previous)) / current.length : 0;

  return similarity > 0.9; // 90% similar
};

/**
 * Simple Levenshtein distance calculation
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Process email content with all cleaning features
 */
export const processEmailContent = (htmlContent: string, previousContent?: string): ProcessedEmailContent => {
  if (!htmlContent) {
    return {
      cleanBody: '',
      signatures: [],
      securityBanners: []
    };
  }

  // Step 1: Extract security banners
  const { cleanBody: afterBanners, securityBanners } = extractSecurityBanners(htmlContent);

  // Step 2: Strip quoted content
  const { cleanBody: afterQuotes, quotedContent } = stripQuotedText(afterBanners);

  // Step 3: Extract signatures
  const { cleanBody: finalBody, signatures } = extractSignatures(afterQuotes);

  // Step 4: Check for duplicate content
  const isDuplicate = previousContent ? isDuplicateContent(finalBody, previousContent) : false;

  return {
    cleanBody: finalBody,
    quotedContent,
    signatures,
    securityBanners,
    isDuplicateContent: isDuplicate
  };
};

/**
 * Clean and decode snippet text for thread rows
 * Removes HTML entities, header noise, and extracts first sentence
 * Uses aggressive encoding cleanup to ensure only clean text is shown
 */
export const makeRowSnippet = (content: string): string => {
  if (!content) return 'No preview available';
  
  try {
    // First, decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = content;
    let decoded = textarea.value;
    
    // Apply super aggressive text encoding cleanup - only keep clean readable text
    decoded = decoded
      // Remove standalone â characters and common encoding artifacts
      .replace(/â(?![€™œ""¦""])/g, '')
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"')
      .replace(/â€¦/g, '...')
      .replace(/â€"/g, '–')
      .replace(/â€"/g, '—')
      .replace(/Â/g, '')
      .replace(/â€¢/g, '•')
      .replace(/â€ /g, '– ')
      .replace(/â/g, '')
      // Remove all kinds of brackets and email formatting
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/\[[^\]]*\]/g, '') // Remove square brackets
      .replace(/\{[^}]*\}/g, '') // Remove curly brackets  
      .replace(/\([^)]*\)/g, '') // Remove parentheses
      // Aggressively remove CSS, VML, and technical content
      .replace(/v\\?\:.*?\{.*?behavior.*?\}/gi, '')
      .replace(/o\\?\:.*?\{.*?\}/gi, '')
      .replace(/\{.*?behavior.*?\}/gi, '')
      .replace(/style\s*=\s*["'][^"']*["']/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<\/?[vo]:[^>]*>/gi, '')
      .replace(/mso-[^;]*;?/gi, '') // Remove Microsoft Office styles
      .replace(/font-family:[^;]*;?/gi, '') // Remove font declarations
      .replace(/font-size:[^;]*;?/gi, '') // Remove font size declarations
      .replace(/color:[^;]*;?/gi, '') // Remove color declarations
      .replace(/margin:[^;]*;?/gi, '') // Remove margin declarations
      .replace(/padding:[^;]*;?/gi, '') // Remove padding declarations
      // Remove email headers and technical patterns
      .replace(/^From:.*$/gmi, '')
      .replace(/^Sent:.*$/gmi, '')
      .replace(/^To:.*$/gmi, '')
      .replace(/^Subject:.*$/gmi, '')
      .replace(/^Cc:.*$/gmi, '')
      .replace(/^Date:.*$/gmi, '')
      .replace(/-----Original Message-----.*$/gims, '')
      .replace(/________________________________.*$/gims, '')
      // Remove any remaining non-printable or technical characters
      .replace(/&nbsp;/g, ' ')
      .replace(/\u00A0/g, ' ')
      .replace(/[\r\n\t]/g, ' ') // Convert line breaks to spaces
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      // Remove any characters that aren't standard text, punctuation, or common symbols
      .replace(/[^\w\s.,!?;:()\-"']/g, '')
      .trim();
    
    // Extract only the first meaningful sentence or fragment (max 60 chars for strict one line)
    const firstSentence = decoded.split(/[.!?]\s/)[0];
    const result = (firstSentence.length > 60 ? firstSentence.substring(0, 57) + '...' : firstSentence).trim();
    
    return result || 'No preview available';
  } catch (error) {
    console.error('Error processing snippet:', error);
    return 'No preview available';
  }
};
