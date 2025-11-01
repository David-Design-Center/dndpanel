/**
 * Character set detection and decoding
 * FIXED: Properly handles UTF-8 emails without creating mojibake
 */

import type { EmailPart, CharsetDetectionResult } from '../types';

/**
 * Charset mapping for common aliases
 */
const CHARSET_MAP: Record<string, string> = {
  'iso-8859-1': 'iso-8859-1',
  'latin1': 'iso-8859-1',
  'cp1252': 'windows-1252',
  'windows-1252': 'windows-1252',
  'iso-8859-15': 'windows-1252',
  'iso-8859-2': 'iso-8859-2',
  'latin2': 'iso-8859-2',
  'windows-1250': 'windows-1250',
  'windows-1251': 'windows-1251',
  'koi8-r': 'koi8-r',
  'koi8-u': 'koi8-u',
  'utf8': 'utf-8',
  'utf-8': 'utf-8',
};

/**
 * Extract charset from Content-Type header
 */
export function extractCharsetFromPart(part: EmailPart): string {
  // Check the Content-Type header for charset
  const contentType = part.headers?.find(
    h => h.name.toLowerCase() === 'content-type'
  )?.value;

  if (contentType) {
    const charsetMatch = contentType.match(/charset=["']?([^"';\s]+)/i);
    if (charsetMatch?.[1]) {
      const detectedCharset = charsetMatch[1].trim().toLowerCase();
      const mappedCharset = CHARSET_MAP[detectedCharset] || detectedCharset;

      // Validate charset is supported
      try {
        new TextDecoder(mappedCharset);
        return mappedCharset;
      } catch {
        console.warn(`Unsupported charset "${mappedCharset}", falling back to utf-8`);
      }
    }
  }

  // Default to UTF-8
  return 'utf-8';
}

/**
 * Score decoded text quality for charset detection fallback
 */
function scoreDecodedTextQuality(text: string): number {
  let score = 0;

  // Check for valid characters
  const validCharsRatio = (text.match(/[\x20-\x7E\u0400-\u04FF\u00A0-\u00FF]/g) || []).length / text.length;
  score += validCharsRatio * 100;

  // Penalize replacement characters
  const replacementChars = (text.match(/�/g) || []).length;
  score -= replacementChars * 20;

  // Penalize mojibake markers
  const mojibakeMarkers = (text.match(/[ÃÂÐÑ]/g) || []).length;
  score -= mojibakeMarkers * 10;

  // Bonus for proper Unicode
  const cyrillicChars = (text.match(/[\u0400-\u04FF]/g) || []).length;
  score += cyrillicChars * 2;

  return score;
}

/**
 * Decode bytes with fallback charset detection
 * Only used when charset detection fails
 */
export function decodeWithFallbacks(
  bytes: Uint8Array,
  preferredCharset: string
): CharsetDetectionResult {
  const tried = new Set<string>();
  
  const charsetCandidates = [
    preferredCharset,
    'utf-8',
    'windows-1251', // Russian/Cyrillic
    'windows-1252', // Western European
    'iso-8859-1',   // Latin-1
    'koi8-r',       // Old Russian
  ].filter((cs): cs is string => Boolean(cs && !tried.has(cs) && (tried.add(cs), true)));

  let bestText = '';
  let bestScore = -Infinity;
  let bestCharset = 'utf-8';

  for (const charset of charsetCandidates) {
    try {
      const text = new TextDecoder(charset).decode(bytes);
      const score = scoreDecodedTextQuality(text);

      if (score > bestScore) {
        bestScore = score;
        bestText = text;
        bestCharset = charset;
      }
    } catch {
      // Charset not supported, continue
    }
  }

  // Fallback if all else fails
  if (!bestText) {
    bestText = new TextDecoder('utf-8').decode(bytes);
    bestScore = -50;
    bestCharset = 'utf-8';
  }

  const confidence = Math.max(0, Math.min(1, (bestScore + 100) / 200));

  return {
    text: bestText,
    confidence,
    charset: bestCharset,
  };
}

/**
 * Decode HTML entities in text
 */
export function decodeHtmlEntities(text: string): string {
  // Handle numeric entities (decimal and hex)
  text = text.replace(/&#(\d+);/g, (_, dec) => {
    try {
      return String.fromCodePoint(parseInt(dec, 10));
    } catch {
      return `&#${dec};`;
    }
  });

  text = text.replace(/&#x([A-Fa-f0-9]+);/g, (_, hex) => {
    try {
      return String.fromCodePoint(parseInt(hex, 16));
    } catch {
      return `&#x${hex};`;
    }
  });

  // Common named entities
  const entities: Record<string, string> = {
    '&nbsp;': '\u00A0',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&amp;': '&',
    '&euro;': '€',
    '&pound;': '£',
    '&yen;': '¥',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
  };

  for (const [entity, char] of Object.entries(entities)) {
    text = text.replace(new RegExp(entity, 'g'), char);
  }

  return text;
}
