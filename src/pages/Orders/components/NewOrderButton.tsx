import { PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function NewOrderButton() {
  const navigate = useNavigate();

  const handleCreateOrder = () => {
    navigate('/invoice-generator');
  };

  return (
    <button
      onClick={handleCreateOrder}
      className="btn btn-primary flex items-center justify-center space-x-1 py-1 px-2 text-xs"
    >
      <PlusCircle size={34} />
      <span>Create Order</span>
    </button>
  );
}

export default NewOrderButton;