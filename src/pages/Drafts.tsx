import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Settings } from 'lucide-react';
import EmailListItem from '../components/EmailListItem';
import { Email } from '../types';
import { getDraftEmails } from '../services/emailService';
import { useAuth } from '../contexts/AuthContext';

function Drafts() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { isGmailSignedIn } = useAuth();

  const fetchEmails = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await getDraftEmails(forceRefresh);
      setEmails(data);
    } catch (error) {
      console.error('Error fetching draft emails:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isGmailSignedIn) {
      fetchEmails();
    } else {
      setLoading(false);
    }
  }, [isGmailSignedIn]);

  const handleRefresh = () => {
    if (!isGmailSignedIn) return;
    
    setRefreshing(true);
    fetchEmails(true);
  };

  const handleEmailClick = (id: string) => {
    navigate(`/email/${id}`);
  };

  const handleEmailUpdate = (updatedEmail: Email) => {
    setEmails(prevEmails => 
      prevEmails.map(email => 
        email.id === updatedEmail.id ? updatedEmail : email
      )
    );
  };

  // If Gmail is not signed in, show connection prompt
  if (!isGmailSignedIn) {
    return (
      <div className="fade-in">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">Drafts</h1>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-4">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Gmail Not Connected</h3>
              <p className="text-gray-600 mb-6">
                To view and manage your emails, please connect your Gmail account in the settings.
              </p>
              <button
                onClick={() => navigate('/settings')}
                className="btn btn-primary flex items-center mx-auto"
              >
                <Settings size={18} className="mr-2" />
                Go to Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !refreshing) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">Drafts</h1>
        <button 
          onClick={handleRefresh}
          className="btn btn-secondary flex items-center"
          disabled={refreshing}
        >
          <RefreshCw size={18} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {emails.length > 0 ? (
          emails.map((email) => (
            <EmailListItem 
              key={email.id} 
              email={email} 
              onClick={handleEmailClick}
              onEmailUpdate={handleEmailUpdate}
            />
          ))
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500">No draft emails</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Drafts;