/**
 * PDF Thumbnail Service
 * Uses pdfjs-dist to generate thumbnails from PDF files
 * 
 * Features:
 * - Renders first page of PDF to canvas
 * - Converts to JPEG at 80% quality
 * - Max dimensions: 200x280 (Gmail-like aspect ratio)
 * - Caches results to avoid regeneration
 */

import * as pdfjsLib from 'pdfjs-dist';

// Use unpkg CDN for the PDF.js worker (mirrors npm directly)
// Must match the installed pdfjs-dist version (5.4.394)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.394/build/pdf.worker.min.mjs';

// Thumbnail dimensions (Gmail-like)
const MAX_THUMBNAIL_WIDTH = 200;
const MAX_THUMBNAIL_HEIGHT = 280;
const JPEG_QUALITY = 0.8;

// In-memory cache for PDF thumbnails
const thumbnailCache = new Map<string, string>();

/**
 * Generate a thumbnail from PDF data
 * @param pdfData - ArrayBuffer or Uint8Array of PDF content
 * @param cacheKey - Optional key for caching (e.g., attachmentId)
 * @returns Data URL of thumbnail image (JPEG)
 */
export async function generatePdfThumbnail(
  pdfData: ArrayBuffer | Uint8Array,
  cacheKey?: string
): Promise<string> {
  // Check cache first
  if (cacheKey && thumbnailCache.has(cacheKey)) {
    console.log('📄 PDF thumbnail cache hit:', cacheKey);
    return thumbnailCache.get(cacheKey)!;
  }

  console.log('📄 Generating PDF thumbnail...');
  const startTime = performance.now();

  try {
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;

    // Get first page
    const page = await pdf.getPage(1);

    // Calculate scale to fit within max dimensions while maintaining aspect ratio
    const viewport = page.getViewport({ scale: 1 });
    const scaleX = MAX_THUMBNAIL_WIDTH / viewport.width;
    const scaleY = MAX_THUMBNAIL_HEIGHT / viewport.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't upscale small PDFs

    const scaledViewport = page.getViewport({ scale });

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    const context = canvas.getContext('2d')!;

    // Fill with white background (PDFs may have transparent areas)
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Render page to canvas
    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
      canvas,
    }).promise;

    // Convert to JPEG data URL
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

    // Cache the result
    if (cacheKey) {
      thumbnailCache.set(cacheKey, dataUrl);
    }

    const elapsed = Math.round(performance.now() - startTime);
    console.log(`📄 PDF thumbnail generated in ${elapsed}ms (${canvas.width}x${canvas.height})`);

    // Cleanup
    pdf.destroy();

    return dataUrl;
  } catch (error) {
    console.error('📄 Failed to generate PDF thumbnail:', error);
    throw error;
  }
}

/**
 * Generate thumbnail from a base64-encoded PDF
 * @param base64Data - Base64 string of PDF (without data URL prefix)
 * @param cacheKey - Optional cache key
 */
export async function generatePdfThumbnailFromBase64(
  base64Data: string,
  cacheKey?: string
): Promise<string> {
  // Convert base64 to ArrayBuffer
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return generatePdfThumbnail(bytes.buffer, cacheKey);
}

/**
 * Generate thumbnail from a data URL
 * @param dataUrl - Full data URL (data:application/pdf;base64,...)
 * @param cacheKey - Optional cache key
 */
export async function generatePdfThumbnailFromDataUrl(
  dataUrl: string,
  cacheKey?: string
): Promise<string> {
  const base64 = dataUrl.split(',')[1];
  return generatePdfThumbnailFromBase64(base64, cacheKey);
}

/**
 * Check if a thumbnail is cached
 */
export function hasCachedThumbnail(cacheKey: string): boolean {
  return thumbnailCache.has(cacheKey);
}

/**
 * Get cached thumbnail if available
 */
export function getCachedThumbnail(cacheKey: string): string | undefined {
  return thumbnailCache.get(cacheKey);
}

/**
 * Clear thumbnail cache
 */
export function clearThumbnailCache(): void {
  thumbnailCache.clear();
}

/**
 * Get cache size for debugging
 */
export function getThumbnailCacheSize(): number {
  return thumbnailCache.size;
}
