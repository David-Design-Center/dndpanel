import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLayoutState } from '../../contexts/LayoutStateContext';
import { ResizableLayout } from './ResizableLayout';
import EmbeddedViewEmail from '@/components/email/EmbeddedViewEmailClean';
import { Email } from '../../types';

interface ThreeColumnLayoutProps {
  children: React.ReactNode;
  onEmailUpdate?: (email: Email) => void;
  onEmailDelete?: (emailId: string) => void;
}

function ThreeColumnLayout({ children, onEmailUpdate, onEmailDelete }: ThreeColumnLayoutProps) {
  const { id: emailId } = useParams<{ id: string }>();
  const { selectedEmailId, selectEmail, clearSelection, panelSizes, updatePanelSizes } = useLayoutState();

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
    <ResizableLayout
      leftPanel={children}
      rightPanel={
        selectedEmailId ? (
          <EmbeddedViewEmail 
            emailId={selectedEmailId} 
            onEmailUpdate={onEmailUpdate}
            onEmailDelete={onEmailDelete}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            {/* Empty state */}
          </div>
        )
      }
      showRightPanel={true}
      leftPanelDefaultSize={50}
      leftPanelMinSize={40}
      leftPanelMaxSize={75}
      leftPanelMinWidth={480}
      onResize={handlePanelResize}
    />
  );
}

export default ThreeColumnLayout;
