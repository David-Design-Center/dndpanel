import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useInboxLayout } from '../../contexts/InboxLayoutContext';
import { useFoldersColumn } from '../../contexts/FoldersColumnContext';
import { usePanelSizes } from '../../contexts/PanelSizesContext';
import EmbeddedViewEmail from '@/components/email/EmbeddedViewEmail';
import FoldersColumn from '../email labels/FoldersColumn';
import { Email } from '../../types';

interface ThreeColumnLayoutProps {
  children: React.ReactNode;
  onEmailUpdate?: (email: Email) => void;
}

function ThreeColumnLayout({ children, onEmailUpdate }: ThreeColumnLayoutProps) {
  const { id: emailId } = useParams<{ id: string }>();
  const { selectedEmailId, selectEmail, clearSelection } = useInboxLayout();
  const { isFoldersColumnExpanded, toggleFoldersColumn } = useFoldersColumn();
  const { panelSizes, updatePanelSizes } = usePanelSizes();

  // Handle URL parameter changes
  useEffect(() => {
    if (emailId) {
      selectEmail(emailId);
    } else {
      clearSelection();
    }
  }, [emailId, selectEmail, clearSelection]);

  // Only update panel sizes when folders column state changes, NOT when email selection changes
  useEffect(() => {
    // Only recalculate when folders column expands/collapses
    const newSizes = {
      folders: getFoldersPanelSize(),
      emailList: getEmailListPanelSize(),
      emailView: getEmailViewPanelSize()
    };
    
    updatePanelSizes(newSizes);
  }, [isFoldersColumnExpanded]); // Removed isEmailPanelOpen and selectedEmailId dependencies

  const handlePanelResize = (sizes: number[]) => {
    // Update panel sizes based on current layout
    if (sizes.length >= 2) {
      const [foldersSize, emailListSize, emailViewSize] = sizes;
      
      updatePanelSizes({
        folders: foldersSize || panelSizes.folders,
        emailList: emailListSize || panelSizes.emailList,
        emailView: emailViewSize || panelSizes.emailView
      });
    }
  };

  // Calculate proper sizes based on folders column state
  const getFoldersPanelSize = () => {
    return isFoldersColumnExpanded ? Math.max(panelSizes.folders, 20) : 3;
  };

  const getEmailListPanelSize = () => {
    if (isFoldersColumnExpanded) {
      // When folders are expanded: folders (20%) + inbox (35%) + email (45%)
      return 35;
    } else {
      // When folders are collapsed: folders (3%) + inbox (45%) + email (52%)
      return 45;
    }
  };

  const getEmailViewPanelSize = () => {
    if (isFoldersColumnExpanded) {
      // When folders are expanded: folders (20%) + inbox (35%) + email (45%)
      return 45;
    } else {
      // When folders are collapsed: folders (3%) + inbox (45%) + email (52%)
      return 52;
    }
  };

  return (
    <div className="flex h-full">
      <PanelGroup 
        direction="horizontal" 
        className="flex h-full panel-group"
        onLayout={handlePanelResize}
        key={`layout-${isFoldersColumnExpanded}`}
      >
        {/* Folders Column - Always present, with smooth expand/collapse */}
        <Panel 
          id="folders"
          defaultSize={getFoldersPanelSize()}
          minSize={3} 
          maxSize={isFoldersColumnExpanded ? 35 : 3}
          className="flex"
        >
          <FoldersColumn 
            isExpanded={isFoldersColumnExpanded} 
            onToggle={toggleFoldersColumn}
          />
        </Panel>
        <PanelResizeHandle className="resize-handle cursor-col-resize" />
        
        {/* Email List Column - Resizes based on folders state */}
        <Panel 
          id="emailList"
          defaultSize={getEmailListPanelSize()} 
          minSize={25} 
          maxSize={75}
          className="flex relative border-r-2 border-l-2 border-gray-300"
        >
          <div className="w-full flex flex-col">
            {children}
          </div>
        </Panel>
        
        {/* Email View Column - Always present, shows empty state when no email selected */}
        <PanelResizeHandle className="resize-handle cursor-col-resize" />
        <Panel 
          id="emailView"
          defaultSize={getEmailViewPanelSize()} 
          minSize={25} 
          maxSize={70}
        >
          <div className="w-full bg-white mr-4">
            {selectedEmailId ? (
              <EmbeddedViewEmail 
                emailId={selectedEmailId} 
                onEmailUpdate={onEmailUpdate}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">No email selected</p>
                  <p className="text-sm">Choose an email from the list to view it here</p>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

export default ThreeColumnLayout;
