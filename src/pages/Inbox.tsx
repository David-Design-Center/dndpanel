import { Outlet } from 'react-router-dom';
import EmailPageLayout from '../components/email/EmailPageLayout';

function Inbox() {
  return (
    <>
      <EmailPageLayout pageType="inbox" title="Inbox" />
      <Outlet />
    </>
  );
}

export default Inbox;
