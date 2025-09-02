import React from 'react';
import ThumbnailButton from "@/components/ui/thumbnail-button-video-player";

const TutorialsDemo: React.FC = () => {
  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 transition-colors duration-500">
      <div className="flex flex-col gap-6 p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-4">
          Tutorial Videos Demo
        </h1>
        
        <div className="flex flex-col gap-4 max-w-md">
          {/* Cloudinary Video */}
          <ThumbnailButton 
            cloudinaryId="GMT20250902-082920_Clip_Order_Dashboard_Tutorial__Creating_Orders_and_Invoices"
            title="Creating Orders and Invoices"
            thumbnailUrl="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop"
          />
          
          {/* YouTube Video */}
          <ThumbnailButton 
            youtubeId="dQw4w9WgXcQ"
            title="Email Management Tutorial"
          />
          
          {/* Regular Video File */}
          <ThumbnailButton
            videoUrl="https://me7aitdbxq.ufs.sh/f/2wsMIGDMQRdYyFbubgfAdJGgcHaXTtYDS9BWOoP8AKMkrxu6"
            thumbnailUrl="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop"
            title="Advanced Features Demo"
          />
        </div>
      </div>
    </div>
  );
};

export default TutorialsDemo;
