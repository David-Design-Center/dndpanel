import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useInboxLayout } from '../../contexts/InboxLayoutContext';
import { usePanelSizes } from '../../contexts/PanelSizesContext';
import EmbeddedViewEmail from '@/components/email/EmbeddedViewEmailClean';
import { Email } from '../../types';

interface ThreeColumnLayoutProps {
  children: React.ReactNode;
  onEmailUpdate?: (email: Email) => void;
  onEmailDelete?: (emailId: string) => void;
}

function ThreeColumnLayout({ children, onEmailUpdate, onEmailDelete }: ThreeColumnLayoutProps) {
  const { id: emailId } = useParams<{ id: string }>();
  const { selectedEmailId, selectEmail, clearSelection } = useInboxLayout();
  const { panelSizes, updatePanelSizes } = usePanelSizes();

  // Handle URL parameter changes
  useEffect(() => {
    if (emailId) {
      selectEmail(emailId);
    } else {
      clearSelection();
    }
  }, [emailId, selectEmail, clearSelection]);

  const handlePanelResize = (sizes: number[]) => {
    // Update panel sizes for the two-column layout (email list + email view)
    if (sizes.length >= 2) {
      const [emailListSize, emailViewSize] = sizes;
      
      updatePanelSizes({
        folders: panelSizes.folders, // Keep existing folders size
        emailList: emailListSize || panelSizes.emailList,
        emailView: emailViewSize || panelSizes.emailView
      });
    }
  };

  return (
    <div className="flex h-full">
      <PanelGroup 
        direction="horizontal" 
        className="flex h-full panel-group"
        onLayout={handlePanelResize}
      >
        {/* Email List Column */}
        <Panel 
          id="emailList"
          defaultSize={50} 
          minSize={40} 
          maxSize={75}
          className="flex relative border-r-2 border-gray-200 min-w-[480px]"
        >
          <div className="w-full flex flex-col min-w-[480px]">
            {children}
          </div>
        </Panel>
        
        {/* Email View Column */}
        <PanelResizeHandle className="resize-handle cursor-col-resize" />
        <Panel 
          id="emailView"
          defaultSize={50} 
          minSize={25} 
          maxSize={70}
        >
          <div className="w-full bg-white mr-4">
            {selectedEmailId ? (
              <EmbeddedViewEmail 
                emailId={selectedEmailId} 
                onEmailUpdate={onEmailUpdate}
                onEmailDelete={onEmailDelete}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

export default ThreeColumnLayout;
