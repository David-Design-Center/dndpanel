import { PriceRequest } from '../../../types';
import PriceRequestCard from './PriceRequestCard';

interface StatusBoardsProps {
  orders: PriceRequest[];
}

function StatusBoards({ orders }: StatusBoardsProps) {
  // Filter orders by status
  const completedRequests = orders.filter(
    order => order.type === 'Price Request' && order.status === 'Completed'
  ) as PriceRequest[];
  
  const pendingRequests = orders.filter(
    order => order.type === 'Price Request' && order.status !== 'Completed'
  ) as PriceRequest[];

  return (
    <div className="space-y-6 h-full overflow-y-auto pb-4">
      {/* Completed Requests Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Completed Requests ({completedRequests.length})
        </h2>
        <div className="space-y-3">
          {completedRequests.length > 0 ? (
            completedRequests.map(request => (
              <PriceRequestCard key={request.id} request={request} />
            ))
          ) : (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">
              No completed requests
            </div>
          )}
        </div>
      </div>

      {/* Pending Requests Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Pending Requests ({pendingRequests.length})
        </h2>
        <div className="space-y-3">
          {pendingRequests.length > 0 ? (
            pendingRequests.map(request => (
              <PriceRequestCard key={request.id} request={request} />
            ))
          ) : (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">
              No pending requests
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatusBoards;