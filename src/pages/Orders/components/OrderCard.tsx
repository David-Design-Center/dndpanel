import { ChevronDown, ChevronRight, Clipboard, CheckCircle } from 'lucide-react';
import { PriceRequest } from '../../../types';
import { format, parseISO, isValid } from 'date-fns';
import PartnerRequestRow from './PartnerRequestRow';

interface OrderCardProps {
  request: PriceRequest;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onComplete?: (id: string) => void;
}

function OrderCard({ request, isExpanded, onToggleExpand, onComplete }: OrderCardProps) {
  const completedTeams = request.teams.filter(team => team.submitted);
  const progressText = `${completedTeams.length} / ${request.teams.length} partners replied`;
  
  const getStatusBadgeClass = () => {
    if (request.status === 'Completed') return 'bg-green-100 text-green-800';
    if (request.status === 'Sent') return 'bg-blue-100 text-blue-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const parsedDate = parseISO(dateString);
    return isValid(parsedDate) ? format(parsedDate, 'MMM d, yyyy') : 'Invalid date';
  };

  const handleComplete = () => {
    if (onComplete && request.status !== 'Completed') {
      if (confirm(`Mark "${request.projectName}" as completed?`)) {
        onComplete(request.id);
      }
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200">
      {/* Card Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => onToggleExpand(request.id)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            {isExpanded ? 
              <ChevronDown className="text-gray-400" size={20} /> : 
              <ChevronRight className="text-gray-400" size={20} />
            }
            <Clipboard className="text-blue-500" size={20} />
            <h3 className="font-medium text-xs text-gray-900 truncate">{request.projectName}</h3>
          </div>
          
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass()}`}>
            {request.status}
          </span>
        </div>
        
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">{progressText}</p>
            <span className="text-xs text-gray-500">
              {formatDate(request.date)}
            </span>
          </div>
          
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${(completedTeams.length / request.teams.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-sm text-gray-700">Partner Requests</h4>
              <div className="flex items-center space-x-2">
                <p className="text-xs text-gray-500">
                  {request.dueDate ? (
                    <>Due by {formatDate(request.dueDate)}</>
                  ) : 'No due date set'}
                </p>
                {/* Complete Button */}
                {onComplete && request.type === 'Price Request' && request.status !== 'Completed' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleComplete();
                    }}
                    className="flex items-center px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    title="Mark as Complete"
                  >
                    <CheckCircle size={12} className="mr-1" />
                    Complete
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {request.teams.map(team => (
              <PartnerRequestRow 
                key={team.id} 
                team={team} 
                projectName={request.projectName}
              />
            ))}
          </div>
          
          {request.description && (
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Project Description:</h4>
              <p className="text-sm text-gray-600">{request.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default OrderCard;