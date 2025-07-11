import { PriceRequest } from '../../../types';
import KanbanColumn from './KanbanColumn';
import OrderCard from './OrderCard';

interface KanbanBoardProps {
  orders: PriceRequest[];
  expandedOrderId: string | null;
  onToggleExpand: (id: string) => void;
  onCompletePriceRequest: (id: string) => void;
}

function KanbanBoard({ orders, expandedOrderId, onToggleExpand, onCompletePriceRequest }: KanbanBoardProps) {
  // Filter only Price Request orders for the Kanban board
  const priceRequestOrders = orders.filter(order => order.type === 'Price Request');
  
  // Waiting for Reply: Orders that have been sent but no team has replied yet
  const waitingForReply = priceRequestOrders.filter(order => {
    return order.status === 'Sent' && 
           order.teams.every(team => !team.submitted);
  });
  
  // Reply Received: Orders where at least one team has submitted a reply (status is "Reply Received")
  const replyReceived = priceRequestOrders.filter(order => {
    return order.status === 'Reply Received' || 
           order.teams.some(team => team.submitted);
  });
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-280px)]">
      <KanbanColumn title="Wait for Reply" count={waitingForReply.length} className="bg-black/50 p-1 rounded-xl">
        {waitingForReply.map(order => (
          <OrderCard
            key={order.id}
            request={order}
            isExpanded={expandedOrderId === order.id}
            onToggleExpand={onToggleExpand}
            onComplete={onCompletePriceRequest}
          />
        ))}
        {waitingForReply.length === 0 && (
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center text-gray-500 text-sm">
            No orders waiting for reply
          </div>
        )}
      </KanbanColumn>
      
      <KanbanColumn title="Write an Answer" count={replyReceived.length} className="bg-black/50 p-1 rounded-xl">
        {replyReceived.map(order => (
          <OrderCard
            key={order.id}
            request={order}
            isExpanded={expandedOrderId === order.id}
            onToggleExpand={onToggleExpand}
            onComplete={onCompletePriceRequest}
          />
        ))}
        {replyReceived.length === 0 && (
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center text-gray-500 text-sm">
            No orders with replies
          </div>
        )}
      </KanbanColumn>
    </div>
  );
}

export default KanbanBoard;