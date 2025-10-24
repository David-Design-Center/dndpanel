import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useInboxLayout } from '../../contexts/InboxLayoutContext';
import EmbeddedViewEmail from '../email/EmbeddedViewEmail';
import FoldersColumn from '../email labels/FoldersColumn';
import { Email } from '../../types';

interface AnimatedThreeColumnLayoutProps {
  children: React.ReactNode;
  onEmailUpdate?: (email: Email) => void;
  onEmailDelete?: (emailId: string) => void;
}

function AnimatedThreeColumnLayout({ children, onEmailUpdate, onEmailDelete }: AnimatedThreeColumnLayoutProps) {
  const panelGroupRef = useRef<any>(null);
  const { id: emailId } = useParams<{ id: string }>();
  const { 
    selectedEmailId, 
    selectEmail, 
    clearSelection,
    isFoldersCollapsed,
    toggleFolders,
    getOptimalLayout,
    expandAllPanels
  } = useInboxLayout();

  // Derive email panel state from selectedEmailId
  const isEmailPanelOpen = !!selectedEmailId;

  // Handle URL parameter changes
  useEffect(() => {
    if (emailId) {
      selectEmail(emailId);
    } else {
      clearSelection();
    }
  }, [emailId, selectEmail, clearSelection]);

  // Simple responsive behavior - only auto-collapse folders on mobile
  useEffect(() => {
    const handleResize = () => {
      // Temporarily disabled to debug remount issue
      // if (window.innerWidth < 768) {
      //   autoCollapseForMobile();
      // }
    };

    // Initial check - disabled
    // handleResize();
    
    // Listen for resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Removed autoCollapseForMobile dependency

  // Add keyboard shortcuts for power users
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + 1: Toggle folders
      if ((event.metaKey || event.ctrlKey) && event.key === '1') {
        event.preventDefault();
        toggleFolders();
      }
      // Cmd/Ctrl + 0: Expand all panels
      if ((event.metaKey || event.ctrlKey) && event.key === '0') {
        event.preventDefault();
        expandAllPanels();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFolders, expandAllPanels]);

  // Update panel layout when folders state changes
    // Update layout when folder collapse state or email panel state changes
  useEffect(() => {
    if (panelGroupRef.current) {
      // Use different delays based on whether we're opening or closing email panel
      const delay = isEmailPanelOpen ? 50 : 150; // Longer delay when closing to allow DOM cleanup
      
      const timer = setTimeout(() => {
        const { folders, emailList, content } = getOptimalLayout();
        // Always include 3 panels with fixed percentages - email panel space always reserved
        const layout = [folders, emailList, content];
        
        console.log('Updating universal layout:', layout, 'folders collapsed:', isFoldersCollapsed, 'email panel open:', isEmailPanelOpen);
        
        // Force panel resize with layout update - multiple attempts for reliability
        try {
          // We always expect 3 panels now
          const currentPanels = panelGroupRef.current.getLayout();
          const expectedPanelCount = 3;
          
          console.log('Panel count check - Expected:', expectedPanelCount, 'Current DOM panels:', currentPanels.length);
          
          if (currentPanels.length === expectedPanelCount) {
            // First immediate update
            panelGroupRef.current.setLayout(layout);
            
            // Follow-up updates to ensure resize takes effect
            setTimeout(() => {
              if (panelGroupRef.current) {
                panelGroupRef.current.setLayout(layout);
              }
            }, 100);
            
            setTimeout(() => {
              if (panelGroupRef.current) {
                panelGroupRef.current.setLayout(layout);
              }
            }, 200);
          } else {
            console.warn('Panel count mismatch. Expected:', expectedPanelCount, 'Actual:', currentPanels.length, 'Retrying in 100ms...');
            // Retry after a longer delay if panel count doesn't match
            setTimeout(() => {
              if (panelGroupRef.current) {
                const retryPanels = panelGroupRef.current.getLayout();
                if (retryPanels.length === expectedPanelCount) {
                  panelGroupRef.current.setLayout(layout);
                }
              }
            }, 100);
          }
        } catch (error) {
          console.warn('Layout update failed:', error);
        }
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [isFoldersCollapsed, isEmailPanelOpen, getOptimalLayout]);

  // Get optimal layout sizes - UNIVERSAL VIEWPORT-BASED
  const optimalLayout = getOptimalLayout();
  const { folders: foldersSize, emailList: emailListSize, content: emailViewSize } = optimalLayout;

  const handlePanelResize = () => {
    // The layout is now coordinated through the InboxLayoutContext
    // Individual panel sizes are managed automatically based on collapse states
  };

  return (
    <div className="h-full bg-background text-foreground flex flex-col overflow-hidden max-w-full">
      {/* Main Content - Full Height Layout */}
      <div className="flex-1 overflow-hidden max-w-full h-full">
        <motion.div 
          className="h-full w-full"
          layout
        >
        <ResizablePanelGroup 
          direction="horizontal" 
          className="flex h-full w-full panel-group overflow-hidden max-w-full box-border"
          onLayout={handlePanelResize}
        >
          {/* Folders Column - Universal 15% width */}
          <ResizablePanel
            defaultSize={foldersSize}
            minSize={isFoldersCollapsed ? 4 : 10}
            maxSize={30}
            collapsible={true}
            collapsedSize={4}
            className={isFoldersCollapsed ? 'folders-collapsed' : ''}
          >
            <motion.div
              className="h-full relative"
              initial={false}
              animate={{
                opacity: isFoldersCollapsed ? 0.7 : 1,
                scale: isFoldersCollapsed ? 0.98 : 1
              }}
              transition={{
                duration: 0.3,
                ease: "easeInOut"
              }}
              layout
            >
              {isFoldersCollapsed ? (
                <div 
                  className="h-full w-full bg-gray-50 border-r border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-center relative"
                  onClick={toggleFolders}
                  title="Click to expand folders"
                >
                  <div className="flex items-center justify-center h-full">
                    <span 
                      className="text-gray-600 text-sm font-semibold tracking-wider select-none"
                      style={{ 
                        writingMode: 'vertical-rl', 
                        textOrientation: 'upright',
                        letterSpacing: '0.2em'
                      }}
                    >
                      FOLDERS
                    </span>
                  </div>
                  {/* Hover indicator */}
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-500 opacity-0 hover:opacity-100 transition-opacity rounded-l-sm"></div>
                </div>
              ) : (
                <FoldersColumn 
                      isExpanded={!isFoldersCollapsed}
                      onToggle={toggleFolders} onCompose={function (): void {
                        throw new Error('Function not implemented.');
                      } }                />
              )}
            </motion.div>
          </ResizablePanel>

          {/* Always show handle for folders column */}
          <ResizableHandle withHandle />

          {/* Email List Column - Adjustable around 28% width */}
          <ResizablePanel
            defaultSize={emailListSize}
            minSize={20}  // Allow down to 20%
            maxSize={40}  // Allow up to 40% 
            className="max-w-full overflow-hidden"
          >
            <motion.div
              className="h-full bg-background border-r border-border max-w-full overflow-hidden"
              layout
              transition={{
                layout: { duration: 0.3, ease: "easeInOut" }
              }}
              animate={{
                marginLeft: isFoldersCollapsed ? '0' : 'auto'
              }}
            >
              <div className="h-full flex flex-col">
                {/* Email List Content */}
                <div className="flex-1 overflow-hidden">
                  <motion.div
                    className="h-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {children}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </ResizablePanel>

          {/* Email View Panel - Adjustable around 52% width */}
          <ResizableHandle withHandle />
          <ResizablePanel 
            defaultSize={emailViewSize}
            minSize={30}  // Allow down to 30%
            maxSize={70}  // Allow up to 70%
          >
            <motion.div
              className="h-full bg-background overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: isEmailPanelOpen ? 1 : 0.3 }}
              transition={{ duration: 0.3 }}
            >
              {isEmailPanelOpen && selectedEmailId ? (
                <div className="w-full h-full email-view-isolation max-w-full overflow-hidden">
                  <EmbeddedViewEmail 
                    emailId={selectedEmailId} 
                    onEmailUpdate={onEmailUpdate}
                    onEmailDelete={onEmailDelete}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50 text-gray-400">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📧</div>
                    <p className="text-lg">Select an email to view</p>
                  </div>
                </div>
              )}
            </motion.div>
          </ResizablePanel>
        </ResizablePanelGroup>
        </motion.div>
      </div>
    </div>
  );
}

export default AnimatedThreeColumnLayout;
