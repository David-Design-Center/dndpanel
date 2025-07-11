import { useNavigate } from 'react-router-dom';
import { Eye, Mail } from 'lucide-react';
import { PriceRequestTeam } from '../../../types';
import { format, parseISO } from 'date-fns';

interface PartnerRequestRowProps {
  team: PriceRequestTeam;
  projectName: string;
}

function PartnerRequestRow({ team, projectName }: PartnerRequestRowProps) {
  const navigate = useNavigate();
  
  const handleViewRequest = () => {
    // If we have a thread ID, navigate to the email view
    if (team.threadId) {
      navigate(`/email/${team.threadId}`);
    } else {
      console.log(`No thread ID available for team ${team.id} (${team.name})`);
    }
  };
  
  const handleOpenInbox = () => {
    // Navigate to inbox with a filter for this team's email address
    navigate(`/inbox?from=${encodeURIComponent(team.email)}`);
  };
  
  return (
    <div className="py-3 px-4 border-b border-gray-200 flex items-center text-sm">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{team.name}</p>
      </div>
      
      <div className="px-3 min-w-[100px]">
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          team.submitted 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {team.submitted ? 'Responded' : 'Pending'}
        </span>
      </div>
      
      <div className="px-3 text-gray-500 min-w-[120px]">
        {format(parseISO(team.requestedOn), 'MMM d, yyyy')}
      </div>
      
      <div className="flex space-x-2">
        <button 
          onClick={handleViewRequest}
          className="p-2 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 flex items-center"
          title={`View request details for ${team.name}`}
        >
          <Eye size={16} className="mr-1" />
          <span>View Request</span>
        </button>
        
        <button 
          onClick={handleOpenInbox}
          className="p-2 text-sm text-green-600 bg-green-50 rounded-md hover:bg-green-100 flex items-center"
          title={`View email correspondence with ${team.name}`}
        >
          <Mail size={16} className="mr-1" />
          <span>Inbox</span>
        </button>
      </div>
    </div>
  );
}

export default PartnerRequestRow;