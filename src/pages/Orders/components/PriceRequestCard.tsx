import { Eye } from 'lucide-react';
import { PriceRequest } from '../../../types';
import { format, parseISO } from 'date-fns';

interface PriceRequestCardProps {
  request: PriceRequest;
}

function PriceRequestCard({ request }: PriceRequestCardProps) {
  const completedTeams = request.teams.filter(team => team.submitted);
  const pendingTeams = request.teams.filter(team => !team.submitted);

  const handleViewRequest = () => {
    // Would navigate to detailed view in real implementation
    console.log(`Viewing request: ${request.id}`);
  };

  const handleViewTeamRequest = (teamId: string) => {
    // Would navigate to team-specific view in real implementation
    console.log(`Viewing team ${teamId} for request: ${request.id}`);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{request.projectName}</h3>
          <p className="text-sm text-gray-500">
            Created {format(parseISO(request.date), 'MMM d, yyyy')}
          </p>
        </div>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full 
          ${request.status === 'Completed' ? 'bg-green-100 text-green-800' : 
            request.status === 'Sent' ? 'bg-blue-100 text-blue-800' : 
            'bg-yellow-100 text-yellow-800'}`}>
          {request.status}
        </span>
      </div>

      {/* Team submissions */}
      <div className="mb-3">
        {completedTeams.length > 0 && (
          <div className="mb-2">
            <p className="text-xs text-gray-500 mb-1">Completed submissions:</p>
            <div className="flex flex-wrap gap-2">
              {completedTeams.map(team => (
                <button
                  key={team.id}
                  onClick={() => handleViewTeamRequest(team.id)}
                  className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100 flex items-center space-x-1"
                >
                  <span>{team.name}</span>
                  <Eye size={12} />
                </button>
              ))}
            </div>
          </div>
        )}

        {pendingTeams.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Awaiting submissions:</p>
            <div className="flex flex-wrap gap-2">
              {pendingTeams.map(team => (
                <span
                  key={team.id}
                  className="px-2 py-1 text-xs bg-gray-50 text-gray-500 rounded border border-gray-200"
                >
                  {team.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleViewRequest}
        className="w-full py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center justify-center space-x-1"
      >
        <Eye size={16} />
        <span>View Request</span>
      </button>
    </div>
  );
}

export default PriceRequestCard;