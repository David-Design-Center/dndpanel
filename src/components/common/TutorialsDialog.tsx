import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { GraduationCap } from 'lucide-react'
import ThumbnailButton from '@/components/ui/thumbnail-button-video-player'

interface TutorialsDialogProps {
  variant?: 'sidebar' | 'button' | 'icon'
  size?: number
  className?: string
  children?: React.ReactNode
}

const TutorialsDialog: React.FC<TutorialsDialogProps> = ({ 
  variant = 'button', 
  size = 20,
  className = "",
  children
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const tutorials = [
    {
      id: 1,
      title: 'Creating Orders and Invoices',
      cloudinaryId: 'GMT20250902-082920_Clip_Order_Dashboard_Tutorial__Creating_Orders_and_Invoices',
      thumbnailUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop',
      description: 'Learn how to create and manage customer orders and generate invoices'
    }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {variant === 'icon' ? (
          children
        ) : variant === 'sidebar' ? (
          <div className="flex items-center w-full">
            <span className="mr-3 flex-shrink-0">
              <GraduationCap size={size} className="text-indigo-500" />
            </span>
            <span className="truncate">Tutorials</span>
          </div>
        ) : (
          <Button
            variant="ghost"
            className={`w-full justify-start text-left font-normal hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 h-auto ${className}`}
            onClick={() => setIsOpen(true)}
          >
            <GraduationCap className="mr-3 h-4 w-4" />
            Tutorials
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl w-[95vw] h-[90vh] max-h-[90vh] overflow-y-auto p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold flex items-center gap-3 mb-6">
            <GraduationCap className="h-6 w-6" />
            Video Tutorials
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-8 mt-6">
          {tutorials.map((tutorial) => (
            <div key={tutorial.id} className="w-full max-w-2xl space-y-4 text-center">
              <ThumbnailButton
                cloudinaryId={tutorial.cloudinaryId}
                thumbnailUrl={tutorial.thumbnailUrl}
                title={tutorial.title}
                className="w-full"
              />
              <p className="text-base text-gray-600 dark:text-gray-400 px-4">{tutorial.description}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TutorialsDialog
