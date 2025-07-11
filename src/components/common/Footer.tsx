import { Link } from 'react-router-dom';

interface FooterProps {
  className?: string;
}

export default function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`text-center py-6 ${className}`}>
      <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
        <Link 
          to="/privacy-policy" 
          className="hover:text-foreground transition-colors"
        >
          Privacy Policy
        </Link>
        <span>•</span>
        <Link 
          to="/terms-of-service" 
          className="hover:text-foreground transition-colors"
        >
          Terms of Service
        </Link>
        <span>•</span>
        <span>© 2025 DnD Panel</span>
      </div>
    </footer>
  );
}
