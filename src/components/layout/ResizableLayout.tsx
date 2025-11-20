import { ReactNode } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

interface ResizableLayoutProps {
  /**
   * Content for the left panel (e.g., email list, order list)
   */
  leftPanel: ReactNode;
  
  /**
   * Content for the right panel (e.g., email viewer, order detail)
   */
  rightPanel: ReactNode;
  
  /**
   * Whether to show the right panel
   */
  showRightPanel: boolean;
  
  /**
   * Default size percentage for left panel (0-100)
   * @default 50
   */
  leftPanelDefaultSize?: number;
  
  /**
   * Minimum size percentage for left panel (0-100)
   * @default 40
   */
  leftPanelMinSize?: number;
  
  /**
   * Maximum size percentage for left panel (0-100)
   * @default 75
   */
  leftPanelMaxSize?: number;
  
  /**
   * Minimum width for left panel in pixels
   * @default 480
   */
  leftPanelMinWidth?: number;
  
  /**
   * Callback when panels are resized
   */
  onResize?: (sizes: number[]) => void;
  
  /**
   * Additional className for the container
   */
  className?: string;
}

/**
 * Generic Resizable Layout Component
 * 
 * A reusable two-panel layout with resizable panels using react-resizable-panels.
 * Can be used for any list + detail view pattern (emails, orders, invoices, etc.).
 * 
 * Features:
 * - Resizable panels with configurable constraints
 * - Optional right panel (hidden when not needed)
 * - Minimum width constraints for proper UX
 * - Resize callbacks for state persistence
 * 
 * Usage:
 * ```tsx
 * <ResizableLayout
 *   leftPanel={<EmailList />}
 *   rightPanel={<EmailViewer />}
 *   showRightPanel={!!selectedEmailId}
 *   onResize={(sizes) => savePanelSizes(sizes)}
 * />
 * ```
 */
export function ResizableLayout({
  leftPanel,
  rightPanel,
  showRightPanel,
  leftPanelDefaultSize = 50,
  leftPanelMinSize = 40,
  leftPanelMaxSize = 75,
  leftPanelMinWidth = 480,
  onResize,
  className = '',
}: ResizableLayoutProps) {
  const handlePanelResize = (sizes: number[]) => {
    if (onResize && sizes.length >= 2) {
      onResize(sizes);
    }
  };

  return (
    <div className={`flex h-full ${className}`}>
      <PanelGroup
        direction="horizontal"
        className="flex h-full panel-group"
        onLayout={handlePanelResize}
      >
        {/* Left Panel */}
        <Panel
          id="left-panel"
          defaultSize={leftPanelDefaultSize}
          minSize={leftPanelMinSize}
          maxSize={leftPanelMaxSize}
          className="flex relative border-r-2 border-gray-200"
          style={{ minWidth: `${leftPanelMinWidth}px` }}
        >
          <div className="w-full flex flex-col" style={{ minWidth: `${leftPanelMinWidth}px` }}>
            {leftPanel}
          </div>
        </Panel>

        {/* Right Panel (conditional) */}
        {showRightPanel && (
          <>
            <PanelResizeHandle className="resize-handle cursor-col-resize" />
            <Panel
              id="right-panel"
              defaultSize={100 - leftPanelDefaultSize}
              minSize={100 - leftPanelMaxSize}
              maxSize={100 - leftPanelMinSize}
            >
              <div className="w-full bg-white mr-4">
                {rightPanel}
              </div>
            </Panel>
          </>
        )}

        {/* Empty placeholder when right panel is hidden */}
        {!showRightPanel && (
          <Panel
            id="empty-panel"
            defaultSize={100 - leftPanelDefaultSize}
          >
            <div className="flex items-center justify-center h-full text-gray-500 bg-white mr-4">
              {/* Intentionally empty - could add a "Select an item" message */}
            </div>
          </Panel>
        )}
      </PanelGroup>
    </div>
  );
}
