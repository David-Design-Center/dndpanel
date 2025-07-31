import React, { useState, useEffect } from 'react';
import { FileText, Image, Film, Music, Archive, File, Eye } from 'lucide-react';
import { getAttachmentDownloadUrl } from '../../services/emailService';

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
    if (canShowThumbnail(attachment.mimeType) && attachment.attachmentId) {
      loadThumbnail();
    }
  }, [attachment.attachmentId, attachment.mimeType]);

  const loadThumbnail = async () => {
    if (!attachment.attachmentId) {
      console.log('📎 FileThumbnail: No attachmentId for:', attachment.name);
      return;
    }

    setLoading(true);
    try {
      // Only load thumbnails for images to avoid unnecessary downloads
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
    } catch (err) {
      console.error('📎 FileThumbnail: Error loading thumbnail:', err);
    } finally {
      setLoading(false);
    }
  };

  const canShowThumbnail = (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
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

    if (thumbnailUrl && attachment.mimeType.startsWith('image/')) {
      return (
        <div className={`${sizeClasses[size]} relative group`}>
          <img
            src={thumbnailUrl}
            alt={attachment.name}
            className={`${sizeClasses[size]} object-cover rounded-lg shadow-sm`}
            onError={() => setThumbnailUrl(null)}
          />
          {showPreviewButton && canPreview(attachment.mimeType) && (
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
              <button
                onClick={onPreviewClick}
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
      <div className={`${sizeClasses[size]} relative group`}>
        <div className={`${sizeClasses[size]} bg-gradient-to-br ${getBackgroundColor(attachment.mimeType)} rounded-lg flex items-center justify-center text-white shadow-sm`}>
          {getFileIcon(attachment.mimeType)}
        </div>
        {showPreviewButton && canPreview(attachment.mimeType) && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
            <button
              onClick={onPreviewClick}
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
