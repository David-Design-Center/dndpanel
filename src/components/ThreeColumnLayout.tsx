import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useInboxLayout } from '../contexts/InboxLayoutContext';
import { useFoldersColumn } from '../contexts/FoldersColumnContext';
import { usePanelSizes } from '../contexts/PanelSizesContext';
import EmbeddedViewEmail from './EmbeddedViewEmail';
import FoldersColumn from './FoldersColumn';
import { Email } from '../types';

interface ThreeColumnLayoutProps {
  children: React.ReactNode;
  onEmailUpdate?: (email: Email) => void;
}

function ThreeColumnLayout({ children, onEmailUpdate }: ThreeColumnLayoutProps) {
  const { id: emailId } = useParams<{ id: string }>();
  const { selectedEmailId, isEmailPanelOpen, selectEmail, clearSelection } = useInboxLayout();
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

  // Force panel layout update when folders expand/collapse
  useEffect(() => {
    // Update panel sizes when folders column state changes
    const newSizes = {
      folders: getFoldersPanelSize(),
      emailList: getEmailListPanelSize(),
      emailView: getEmailViewPanelSize()
    };
    
    updatePanelSizes(newSizes);
  }, [isFoldersColumnExpanded, isEmailPanelOpen, selectedEmailId]);

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
      // When folders are expanded, reduce inbox size to make room
      const foldersSize = getFoldersPanelSize();
      const remainingSpace = 100 - foldersSize;
      
      if (isEmailPanelOpen && selectedEmailId) {
        // Three panels: folders expanded, inbox, email view
        return Math.max(remainingSpace * 0.6, 25); // Give 60% of remaining space to inbox
      } else {
        // Two panels: folders expanded, inbox
        return remainingSpace;
      }
    } else {
      // When folders are collapsed, inbox gets more space
      if (isEmailPanelOpen && selectedEmailId) {
        return Math.max(panelSizes.emailList, 40);
      } else {
        return 97; // Almost full width when folders collapsed
      }
    }
  };

  const getEmailViewPanelSize = () => {
    if (isEmailPanelOpen && selectedEmailId) {
      const foldersSize = getFoldersPanelSize();
      const emailListSize = getEmailListPanelSize();
      return Math.max(100 - foldersSize - emailListSize, 25);
    }
    return panelSizes.emailView;
  };

  return (
    <div className="flex h-full">
      <PanelGroup 
        direction="horizontal" 
        className="flex h-full panel-group"
        onLayout={handlePanelResize}
        key={`layout-${isFoldersColumnExpanded}-${isEmailPanelOpen ? 'email' : 'no-email'}`}
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
        <PanelResizeHandle className="w-1 resize-handle cursor-col-resize bg-gray-200 hover:bg-gray-300 transition-colors" />
        
        {/* Email List Column - Resizes based on folders state */}
        <Panel 
          id="emailList"
          defaultSize={getEmailListPanelSize()} 
          minSize={25} 
          maxSize={75}
          className="flex relative"
        >
          <div className="w-full flex flex-col">
            {children}
          </div>
        </Panel>
        
        {/* Email View Column - Resizable when open, adjusts for folders state */}
        {isEmailPanelOpen && selectedEmailId && (
          <>
            <PanelResizeHandle className="w-1 resize-handle cursor-col-resize bg-gray-200 hover:bg-gray-300 transition-colors" />
            <Panel 
              id="emailView"
              defaultSize={getEmailViewPanelSize()} 
              minSize={25} 
              maxSize={70}
              className="flex"
            >
              <div className="w-full bg-white mr-4">
                <EmbeddedViewEmail 
                  emailId={selectedEmailId} 
                  onEmailUpdate={onEmailUpdate}
                />
              </div>
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
}

export default ThreeColumnLayout;
