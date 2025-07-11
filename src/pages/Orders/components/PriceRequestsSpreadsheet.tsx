import { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Eye, Mail } from 'lucide-react';
import { PriceRequest } from '../../../types';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

interface PriceRequestsSpreadsheetProps {
  priceRequests: PriceRequest[];
}

function PriceRequestsSpreadsheet({ priceRequests }: PriceRequestsSpreadsheetProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof PriceRequest>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 10;

  // Sort and paginate price requests
  const sortedRequests = [...priceRequests].sort((a, b) => {
    if (sortField === 'date') {
      const aDate = parseISO(a.date);
      const bDate = parseISO(b.date);
      return sortDirection === 'asc' 
        ? aDate.getTime() - bDate.getTime()
        : bDate.getTime() - aDate.getTime();
    }
    
    if (sortField === 'teams') {
      return sortDirection === 'asc' 
        ? (a.teams?.length || 0) - (b.teams?.length || 0)
        : (b.teams?.length || 0) - (a.teams?.length || 0);
    }
    
    const aValue = a[sortField] || '';
    const bValue = b[sortField] || '';
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return 0;
  });

  const totalPages = Math.ceil(sortedRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = sortedRequests.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: keyof PriceRequest) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getSortIcon = (field: keyof PriceRequest) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const handleViewRequest = (priceRequest: PriceRequest) => {
    if (priceRequest.threadId) {
      navigate(`/email/${priceRequest.threadId}`);
    }
  };

  // Format date to a more readable format
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  // Calculate progress percentage for each price request
  const calculateProgress = (priceRequest: PriceRequest) => {
    if (!priceRequest.teams || priceRequest.teams.length === 0) return 0;
    const submittedTeams = priceRequest.teams.filter(team => team.submitted).length;
    return Math.round((submittedTeams / priceRequest.teams.length) * 100);
  };

  return (
    <div className="flex flex-col bg-white rounded-lg shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('projectName')}
              >
                <div className="flex items-center space-x-1">
                  <span>Project Name</span>
                  {getSortIcon('projectName')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  {getSortIcon('status')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('createdBy')}
              >
                <div className="flex items-center space-x-1">
                  <span>Created By</span>
                  {getSortIcon('createdBy')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center space-x-1">
                  <span>Date</span>
                  {getSortIcon('date')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('teams')}
              >
                <div className="flex items-center space-x-1">
                  <span>Partners</span>
                  {getSortIcon('teams')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Progress
              </th>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedRequests.map((priceRequest) => (
              <tr 
                key={priceRequest.id} 
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {priceRequest.projectName}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${priceRequest.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                      priceRequest.status === 'Sent' ? 'bg-blue-100 text-blue-800' : 
                      priceRequest.status === 'Reply Received' ? 'bg-yellow-100 text-yellow-800' :
                      priceRequest.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                      'bg-purple-100 text-purple-800'}`}>
                    {priceRequest.status}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {priceRequest.createdBy}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(priceRequest.date)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {priceRequest.teams?.length || 0} partners
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${calculateProgress(priceRequest)}%` }}
                      ></div>
                    </div>
                    <span>{calculateProgress(priceRequest)}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {priceRequest.threadId && (
                      <button
                        onClick={() => handleViewRequest(priceRequest)}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Eye size={12} className="mr-1" />
                        View Thread
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            
            {paginatedRequests.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-sm text-gray-500">
                  No price requests found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {priceRequests.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between mt-auto bg-gray-50">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || totalPages === 0}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(startIndex + itemsPerPage, sortedRequests.length)}
                </span>{' '}
                of <span className="font-medium">{sortedRequests.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                
                {/* Page number display */}
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  {currentPage} / {totalPages || 1}
                </span>
                
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PriceRequestsSpreadsheet;