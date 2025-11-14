import React from 'react';
import { PlayCircle } from 'lucide-react';
import ThumbnailButton from "@/components/ui/thumbnail-button-video-player";

const Tutorials: React.FC = () => {
  const tutorials = [
    {
      id: 1,
      type: 'cloudinary',
      cloudinaryId: 'GMT20250902-082920_Clip_Order_Dashboard_Tutorial__Creating_Orders_and_Invoices',
      title: 'Creating Orders and Invoices',
      description: 'Learn how to create customer orders and generate invoices',
      thumbnailUrl: 'https://res.cloudinary.com/designcenter/video/upload/so_0/GMT20250902-082920_Clip_Order_Dashboard_Tutorial__Creating_Orders_and_Invoices.jpg',
    }
  ];

  return (
    <div className="fade-in pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Tutorials</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Tutorial Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutorials.map((tutorial) => (
              <div
                key={tutorial.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Video Thumbnail - covers top portion */}
                <div className="relative aspect-video w-full overflow-hidden">
                  {tutorial.type === 'cloudinary' && (
                    <div className="relative w-full h-full group">
                      <img 
                        src={tutorial.thumbnailUrl} 
                        alt={tutorial.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Transparent overlay with play button */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ThumbnailButton
                          cloudinaryId={tutorial.cloudinaryId}
                          title={tutorial.title}
                          thumbnailUrl={tutorial.thumbnailUrl}
                          className="w-full h-full !p-0 !rounded-none !border-0 !shadow-none bg-transparent hover:bg-black/10 transition-colors"
                        />
                        {/* Custom play button overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="p-4 rounded-full bg-white/90 group-hover:bg-white group-hover:scale-110 transition-all shadow-lg">
                            <PlayCircle className="w-12 h-12 text-primary fill-primary/10" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tutorial Info */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {tutorial.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {tutorial.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State for when more tutorials will be added */}
          {tutorials.length === 0 && (
            <div className="text-center py-12">
              <PlayCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tutorials available</h3>
              <p className="text-gray-600">Check back later for video tutorials</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tutorials;
