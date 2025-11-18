import { Outlet } from 'react-router-dom';
import EmailPageLayout from '../components/email/EmailPageLayout';

function Unread() {
  return (
    <>
      <EmailPageLayout pageType="unread" title="Unread" />
      <Outlet />
    </>
  );
}

export default Unread;
