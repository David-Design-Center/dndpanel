import React, { useState, useEffect, useRef } from 'react';
import { FileText, Image, Film, Music, Archive, File, Eye } from 'lucide-react';
import { getAttachmentDownloadUrl } from '../../services/emailService';
import { generatePdfThumbnailFromBase64, getCachedThumbnail, hasCachedThumbnail } from '../../services/pdfThumbnailService';

interface FileThumbnailProps {
  attachment: {
    name: string;
    mimeType: string;
    size: number;
    attachmentId?: string;
    partId?: string;
  };
  emailId: string;
  userEmail: string;
  size?: 'small' | 'medium' | 'large';
  showPreviewButton?: boolean;
  onPreviewClick?: () => void;
}

const FileThumbnail: React.FC<FileThumbnailProps> = ({
  attachment,
  emailId,
  userEmail,
  size = 'medium',
  showPreviewButton = false,
  onPreviewClick
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false); // Prevent duplicate loads

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
    large: 'w-24 h-24'
  };

  const iconSizes = {
    small: 16,
    medium: 20,
    large: 28
  };

  useEffect(() => {
    console.log('📎 FileThumbnail: useEffect triggered for:', attachment.name, 'mimeType:', attachment.mimeType, 'attachmentId:', attachment.attachmentId?.substring(0, 20));
    
    if (canShowThumbnail(attachment.mimeType) && attachment.attachmentId) {
      // Check for cached PDF thumbnail first
      if (attachment.mimeType === 'application/pdf') {
        const cacheKey = `pdf-thumb-${attachment.attachmentId}`;
        if (hasCachedThumbnail(cacheKey)) {
          console.log('📎 FileThumbnail: Using cached PDF thumbnail for:', attachment.name);
          setThumbnailUrl(getCachedThumbnail(cacheKey)!);
          return;
        }
      }
      loadThumbnail();
    } else {
      console.log('📎 FileThumbnail: Skipping thumbnail - canShow:', canShowThumbnail(attachment.mimeType), 'hasAttachmentId:', !!attachment.attachmentId);
    }
  }, [attachment.attachmentId, attachment.mimeType, emailId, userEmail]);

  const loadThumbnail = async () => {
    if (!attachment.attachmentId || loadingRef.current) {
      console.log('📎 FileThumbnail: No attachmentId or already loading:', attachment.name);
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    
    try {
      // Handle images
      if (attachment.mimeType.startsWith('image/')) {
        console.log('📎 FileThumbnail: Loading thumbnail for image:', attachment.name);
        const url = await getAttachmentDownloadUrl(
          userEmail,
          emailId,
          attachment.attachmentId,
          attachment.name,
          attachment.mimeType
        );
        console.log('📎 FileThumbnail: Got thumbnail URL:', url);
        setThumbnailUrl(url);
      }
      // Handle PDFs - generate thumbnail from first page
      else if (attachment.mimeType === 'application/pdf') {
        console.log('📎 FileThumbnail: Loading PDF thumbnail for:', attachment.name);
        
        // Fetch PDF data from Gmail API
        const response = await window.gapi.client.gmail.users.messages.attachments.get({
          userId: 'me',
          messageId: emailId,
          id: attachment.attachmentId
        });
        
        if (!response.result?.data) {
          throw new Error('No PDF data returned');
        }
        
        // Convert base64url to standard base64
        let base64Data = response.result.data.replace(/-/g, '+').replace(/_/g, '/');
        while (base64Data.length % 4 !== 0) {
          base64Data += '=';
        }
        
        // Generate thumbnail using PDF.js
        const cacheKey = `pdf-thumb-${attachment.attachmentId}`;
        const thumbnailDataUrl = await generatePdfThumbnailFromBase64(base64Data, cacheKey);
        setThumbnailUrl(thumbnailDataUrl);
        console.log('📎 FileThumbnail: PDF thumbnail generated for:', attachment.name);
      }
    } catch (err) {
      console.error('📎 FileThumbnail: Error loading thumbnail:', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const canShowThumbnail = (mimeType: string): boolean => {
    return mimeType.startsWith('image/') || mimeType === 'application/pdf';
  };

  const canPreview = (mimeType: string): boolean => {
    return (
      mimeType.startsWith('image/') ||
      mimeType === 'application/pdf' ||
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/xml' ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('document') ||
      mimeType.includes('presentation')
    );
  };

  const getFileIcon = (mimeType: string) => {
    const iconSize = iconSizes[size];
    
    if (mimeType.startsWith('image/')) return <Image size={iconSize} />;
    if (mimeType === 'application/pdf') return <FileText size={iconSize} />;
    if (mimeType.startsWith('video/')) return <Film size={iconSize} />;
    if (mimeType.startsWith('audio/')) return <Music size={iconSize} />;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return <Archive size={iconSize} />;
    return <File size={iconSize} />;
  };

  const getBackgroundColor = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'from-green-400 to-green-600';
    if (mimeType === 'application/pdf') return 'from-red-400 to-red-600';
    if (mimeType.startsWith('video/')) return 'from-purple-400 to-purple-600';
    if (mimeType.startsWith('audio/')) return 'from-yellow-400 to-yellow-600';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return 'from-gray-400 to-gray-600';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'from-blue-400 to-blue-600';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'from-emerald-400 to-emerald-600';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'from-orange-400 to-orange-600';
    return 'from-gray-400 to-gray-600';
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className={`${sizeClasses[size]} bg-gray-200 rounded-lg flex items-center justify-center animate-pulse`}>
          <div className="w-4 h-4 bg-gray-400 rounded"></div>
        </div>
      );
    }

    // Show thumbnail for both images and PDFs (PDF thumbnails are generated via PDF.js)
    if (thumbnailUrl && (attachment.mimeType.startsWith('image/') || attachment.mimeType === 'application/pdf')) {
      return (
        <div className={`${sizeClasses[size]} relative group cursor-pointer`} onClick={onPreviewClick}>
          <img
            src={thumbnailUrl}
            alt={attachment.name}
            className={`${sizeClasses[size]} object-cover rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200`}
            onError={() => setThumbnailUrl(null)}
          />
          {/* PDF indicator badge */}
          {attachment.mimeType === 'application/pdf' && (
            <div className="absolute bottom-1 right-1 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">
              PDF
            </div>
          )}
          {showPreviewButton && canPreview(attachment.mimeType) && (
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPreviewClick?.();
                }}
                className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-all duration-200"
                title="Preview file"
              >
                <Eye size={16} className="text-gray-700" />
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={`${sizeClasses[size]} relative group cursor-pointer`} onClick={onPreviewClick}>
        <div className={`${sizeClasses[size]} bg-gradient-to-br ${getBackgroundColor(attachment.mimeType)} rounded-lg flex items-center justify-center text-white shadow-sm hover:shadow-md transition-all duration-200`}>
          {getFileIcon(attachment.mimeType)}
        </div>
        {showPreviewButton && canPreview(attachment.mimeType) && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPreviewClick?.();
              }}
              className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-all duration-200"
              title="Preview file"
            >
              <Eye size={16} className="text-gray-700" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return renderContent();
};

export default FileThumbnail;
