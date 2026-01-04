import React from 'react';
import { RefreshCw, X, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';

interface SelectAllBannerProps {
  /** Number of currently selected emails */
  selectedCount: number;
  /** Number of visible emails on current page */
  visibleCount: number;
  /** Total emails in the current folder (from label.messagesTotal) */
  totalInFolder: number;
  /** Current folder name for display */
  folderName: string;
  /** Whether we're currently loading more thread IDs */
  isLoadingMore: boolean;
  /** Whether there are more threads available to load */
  hasMoreToLoad: boolean;
  /** Handler to load more thread IDs for selection */
  onLoadMore: () => void;
  /** Handler to clear selection */
  onClearSelection: () => void;
}

/**
 * Banner that appears when user selects all visible emails
 * Allows user to extend selection to more emails in the folder (in chunks of 200)
 * 
 * ⚠️ NOTE: Limited to 250 emails at a time to avoid server overload
 */
const SelectAllBanner: React.FC<SelectAllBannerProps> = ({
  selectedCount,
  visibleCount,
  totalInFolder,
  folderName,
  isLoadingMore,
  hasMoreToLoad,
  onLoadMore,
  onClearSelection,
}) => {
  // Only show banner when all visible emails are selected
  const allVisibleSelected = selectedCount >= visibleCount && visibleCount > 0;
  
  if (!allVisibleSelected) {
    return null;
  }

  // Calculate how many more can be loaded (cap at 200 per load)
  const remainingInFolder = totalInFolder - selectedCount;
  const canLoadMore = hasMoreToLoad && remainingInFolder > 0;
  const nextBatchSize = Math.min(200, remainingInFolder);

  // Check if we've selected all in folder
  const allInFolderSelected = selectedCount >= totalInFolder || !canLoadMore;

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {allInFolderSelected ? (
            <>
              <span className="text-blue-800">
                ✓ All <strong>{selectedCount.toLocaleString()}</strong> conversations in{' '}
                <strong>{folderName}</strong> are selected.
              </span>
            </>
          ) : (
            <>
              <span className="text-blue-800">
                <strong>{selectedCount.toLocaleString()}</strong> selected
              </span>
              
              {canLoadMore && (
                <>
                  <span className="text-blue-600">•</span>
                  {isLoadingMore ? (
                    <span className="inline-flex items-center gap-1.5 text-blue-600">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Loading more...
                    </span>
                  ) : (
                    <button
                      onClick={onLoadMore}
                      className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                    >
                      Select {nextBatchSize.toLocaleString()} more
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Info tooltip about 250 limit */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-600">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Max 250 at a time</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 h-7 px-2"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SelectAllBanner;
