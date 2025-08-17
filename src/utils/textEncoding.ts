/**
 * Text encoding utilities for fixing common character encoding issues
 * Especially useful for Estonian and other Nordic/Baltic characters
 */

/**
 * Clean encoding issues, especially for Estonian characters and double-encoded UTF-8
 * @param text - The text to clean
 * @returns Cleaned text with proper character encoding
 */
export function cleanEncodingIssues(text: string): string {
  if (!text) return '';
  
  return text
    // Fix Estonian characters (double-encoded UTF-8)
    .replace(/Ã„/g, 'Ä') // Capital A with diaeresis
    .replace(/Ã¤/g, 'ä') // Small a with diaeresis
    .replace(/Ã–/g, 'Ö') // Capital O with diaeresis
    .replace(/Ã¶/g, 'ö') // Small o with diaeresis
    .replace(/Ãœ/g, 'Ü') // Capital U with diaeresis
    .replace(/Ã¼/g, 'ü') // Small u with diaeresis
    .replace(/Å /g, 'Š') // Capital S with caron
    .replace(/Å¡/g, 'š') // Small s with caron
    .replace(/Å½/g, 'Ž') // Capital Z with caron
    .replace(/Å¾/g, 'ž') // Small z with caron
    // Fix problematic Estonian character combinations
    .replace(/Ðµ/g, 'õ') // Fix specific Estonian õ encoding issue
    .replace(/ÐÐµ/g, 'Õ') // Fix capital Estonian Õ encoding issue
    .replace(/Ð¸/g, 'ä') // Fix another Estonian ä variant
    .replace(/Ð°/g, 'a') // Fix specific a encoding
    .replace(/ð/g, '😊') // Fix emoji encoding (common smiley)
    // Fix other Nordic/Baltic characters
    .replace(/Ã…/g, 'Å') // Capital A with ring above
    .replace(/Ã¥/g, 'å') // Small a with ring above
    .replace(/Ã†/g, 'Æ') // Capital AE
    .replace(/Ã¦/g, 'æ') // Small ae
    .replace(/Ã˜/g, 'Ø') // Capital O with stroke
    .replace(/Ã¸/g, 'ø') // Small o with stroke
    .replace(/Ã°/g, 'ð') // Small eth
    .replace(/Ã/g, 'Ð') // Capital eth
    .replace(/Ãž/g, 'Þ') // Capital thorn
    .replace(/Ã¾/g, 'þ') // Small thorn
    // Fix common French/Spanish characters
    .replace(/Ãª/g, 'ê') // Small e with circumflex
    .replace(/Ã©/g, 'é') // Small e with acute
    .replace(/Ã¨/g, 'è') // Small e with grave
    .replace(/Ã /g, 'à') // Small a with grave
    .replace(/Ã¡/g, 'á') // Small a with acute
    .replace(/Ã§/g, 'ç') // Small c with cedilla
    .replace(/Ã±/g, 'ñ') // Small n with tilde
    .replace(/Ã­/g, 'í') // Small i with acute
    .replace(/Ã³/g, 'ó') // Small o with acute
    .replace(/Ãº/g, 'ú') // Small u with acute
    // Fix German characters
    .replace(/Ã\u009F/g, 'ß') // German eszett
    // Fix common UTF-8 issues
    .replace(/Â/g, '') // Remove unnecessary Â characters
    .replace(/â€™/g, "'") // Right single quotation mark
    .replace(/â€œ/g, '"') // Left double quotation mark
    .replace(/â€/g, '"') // Right double quotation mark
    .replace(/â€¦/g, '...') // Horizontal ellipsis
    .replace(/â€"/g, '–') // En dash
    .replace(/â€"/g, '—') // Em dash
    // Remove multiple consecutive spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Alternative encoding cleaner for cases where the above doesn't work
 * This handles some edge cases with different encoding patterns
 */
export function cleanEncodingIssuesAlternative(text: string): string {
  if (!text) return '';

  try {
    // Try to decode if it looks like it might be URL-encoded
    if (text.includes('%')) {
      try {
        text = decodeURIComponent(text);
      } catch {
        // If decoding fails, continue with original text
      }
    }

    // Fix some common double-encoding patterns
    text = text
      .replace(/=C3=A4/gi, 'ä')  // ä in quoted-printable
      .replace(/=C3=B6/gi, 'ö')  // ö in quoted-printable
      .replace(/=C3=BC/gi, 'ü')  // ü in quoted-printable
      .replace(/=C3=84/gi, 'Ä')  // Ä in quoted-printable
      .replace(/=C3=96/gi, 'Ö')  // Ö in quoted-printable
      .replace(/=C3=9C/gi, 'Ü')  // Ü in quoted-printable
      .replace(/=C3=B5/gi, 'õ')  // õ in quoted-printable
      .replace(/=C3=95/gi, 'Õ')  // Õ in quoted-printable
      // Handle Cyrillic-like encoding issues for Estonian
      .replace(/Ðµ/g, 'õ')        // Fix specific Estonian õ encoding issue
      .replace(/ÐÐµ/g, 'Õ')       // Fix capital Estonian Õ encoding issue
      .replace(/Ð¸/g, 'ä')        // Fix another Estonian ä variant
      .replace(/Ð°/g, 'a')        // Fix specific a encoding
      .replace(/ð/g, '😊');       // Fix emoji encoding (common smiley)

    return cleanEncodingIssues(text);
  } catch (error) {
    console.warn('Error in alternative encoding cleanup:', error);
    return cleanEncodingIssues(text);
  }
}

/**
 * Clean encoding issues specifically for email subjects
 * This combines multiple approaches for comprehensive cleaning
 */
export function cleanEmailSubject(subject: string): string {
  if (!subject) return '';
  
  // First try the standard cleaning
  let cleaned = cleanEncodingIssues(subject);
  
  // If it still looks problematic, try the alternative approach
  if (cleaned.includes('Ã') || cleaned.includes('â€')) {
    cleaned = cleanEncodingIssuesAlternative(cleaned);
  }
  
  return cleaned;
}
