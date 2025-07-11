import { PriceRequest } from '../../../types';
import { addDays, subDays, format } from 'date-fns';

// Generate today and some previous/future dates for mock data
const today = new Date();
const formatDate = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm:ss");

export const mockPriceRequests: PriceRequest[] = [
  {
    id: '8',
    projectName: 'Employee Break Room',
    type: 'Price Request',
    status: 'Sent',
    date: formatDate(subDays(today, 7)),
    createdBy: 'user456',
    teams: [
      { 
        id: 't22', 
        name: 'Interior Design Team', 
        submitted: false,
        requestedOn: formatDate(subDays(today, 10)),
        email: 'interiordesign@example.com',
        threadId: 'mock_thread_123456' // Add thread ID
      },
      { 
        id: 't23', 
        name: 'Furniture Team', 
        submitted: false,
        requestedOn: formatDate(subDays(today, 10)),
        email: 'furniture@example.com',
        threadId: 'mock_thread_234567' // Add thread ID
      },
      { 
        id: 't24', 
        name: 'Entertainment Team', 
        submitted: false,
        requestedOn: formatDate(subDays(today, 10)),
        email: 'entertainment@example.com',
        threadId: 'mock_thread_345678' // Add thread ID
      }
    ],
    description: 'Creation of a new employee break room with comfortable seating and entertainment options.',
    dueDate: formatDate(addDays(today, 2)),
    threadId: 'mock_thread_main_12345' // Add main thread ID
  }
];