'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, X } from 'lucide-react'

interface ThumbnailButtonProps {
  videoUrl?: string
  youtubeId?: string
  thumbnailUrl?: string
  title?: string
  className?: string
  cloudinaryId?: string
}

const DEFAULT_VIDEO_FALLBACK_URL = 'https://me7aitdbxq.ufs.sh/f/2wsMIGDMQRdYqvMy4kaWD2STgaJv9iAfGNzF5E06KYRULuoj'

const DEFAULT_VIDEO_THUMBNAIL = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop'

const getYouTubeThumbnail = (id: string) => `https://img.youtube.com/vi/${id}/maxresdefault.jpg`

const getYouTubeEmbedUrl = (id: string) => `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`

const getCloudinaryEmbedUrl = (cloudName: string, publicId: string) => 
  `https://player.cloudinary.com/embed/?cloud_name=${cloudName}&public_id=${publicId}&profile=cld-default`

const ThumbnailButton: React.FC<ThumbnailButtonProps> = ({
  videoUrl,
  youtubeId,
  thumbnailUrl,
  title = 'Play Video',
  className = '',
  cloudinaryId
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const buttonRef = useRef<HTMLButtonElement>(null)

  const isYouTube = !!youtubeId
  const isCloudinary = !!cloudinaryId

  const finalThumbnail = thumbnailUrl || 
    (isYouTube ? getYouTubeThumbnail(youtubeId!) : DEFAULT_VIDEO_THUMBNAIL)

  const finalVideoUrl = isCloudinary && cloudinaryId 
    ? getCloudinaryEmbedUrl('designcenter', cloudinaryId)
    : isYouTube && youtubeId 
    ? getYouTubeEmbedUrl(youtubeId) 
    : videoUrl || DEFAULT_VIDEO_FALLBACK_URL

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => setIsModalOpen(false)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseModal()
    }
    if (isModalOpen) {
      document.addEventListener('keydown', handleEsc)
    }
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isModalOpen])

  return (
    <>
      <motion.button
        ref={buttonRef}
        initial={{ scale: 1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleOpenModal}
        className={`
          relative overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-800 
          shadow-sm hover:shadow-md transition-all duration-200
          group focus:outline-none focus:ring-2 focus:ring-blue-500/50
          p-2 w-full border border-gray-200 dark:border-gray-700 hover:cursor-pointer
          ${className}
        `}
        aria-label={title}>
        <div className="flex items-center">
          {/* Thumbnail Image */}
          <div className="relative w-[70px] h-[42px] rounded-lg overflow-hidden flex-shrink-0">
            <img 
              src={finalThumbnail} 
              alt="Video thumbnail" 
              className="w-full h-full object-cover"
            />

            {/* Play Icon Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-1 rounded-full bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700">
                <Play size={10} className="fill-gray-900 dark:fill-gray-100 text-gray-900 dark:text-gray-100 ml-0.5" />
              </div>
            </div>

            {/* YouTube Badge */}
            {isYouTube && (
              <div className="absolute bottom-1 right-1 bg-red-600 text-white text-[8px] font-bold px-1 py-0.5 rounded">
                YT
              </div>
            )}

            {/* Cloudinary Badge */}
            {isCloudinary && (
              <div className="absolute bottom-1 right-1 bg-blue-600 text-white text-[8px] font-bold px-1 py-0.5 rounded">
                CL
              </div>
            )}
          </div>

          {/* Button Text */}
          <p className="pl-3 pr-2 text-gray-900 dark:text-gray-100 font-medium text-sm">{title}</p>
        </div>
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/90"
            onClick={handleCloseModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Video Modal"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="relative bg-black rounded-lg overflow-hidden shadow-2xl max-w-5xl w-full"
            >
              {/* Close Button */}
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/70 hover:bg-black/90 text-white transition-all"
                aria-label="Close video"
              >
                <X size={20} />
              </button>

              {/* Video Player */}
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={finalVideoUrl}
                  className="absolute top-0 left-0 w-full h-full"
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title={title}
                  frameBorder="0"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default ThumbnailButton
