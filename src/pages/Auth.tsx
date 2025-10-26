import { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/common/Footer';
import { 
  Ripple, 
  AuthTabs, 
  TechOrbitDisplay,
  businessIconsArray 
} from '../components/ui/modern-animated-sign-in';

type FormData = {
  username: string;
  password: string;
};

function Auth() {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement>,
    name: keyof FormData
  ) => {
    const value = event.target.value;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // The signIn function now expects a username and will look up the email
      const authResult = await signIn(formData.username, formData.password);
      
      if (!authResult.error) {
        // Small delay to ensure auth state has propagated
        setTimeout(() => {
          navigate('/');
        }, 100);
      } else {
        setError(authResult.error.message || 'Authentication failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Unexpected error during authentication:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formFields = {
    header: 'Welcome to D&D Panel',
    subHeader: 'Sign in to your business dashboard',
    fields: [
      {
        label: 'Username',
        required: true,
        type: 'text' as const,
        placeholder: 'Enter your username',
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
          handleInputChange(event, 'username'),
        value: formData.username,
      },
      {
        label: 'Password',
        required: true,
        type: 'password' as const,
        placeholder: 'Enter your password',
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
          handleInputChange(event, 'password'),
        value: formData.password,
      },
    ],
    submitButton: 'Sign in',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <section className='flex max-lg:justify-center h-screen'>
        {/* Left Side - Animated Background */}
        <span className='flex flex-col justify-center w-1/2 max-lg:hidden relative overflow-hidden'>
          <TechOrbitDisplay 
            iconsArray={businessIconsArray} 
            logoUrl="https://res.cloudinary.com/designcenter/image/upload/DnD_Logo_Transparent.svg"
          />
        </span>

        {/* Right Side - Login Form */}
        <span className='w-1/2 h-full flex flex-col justify-center items-center max-lg:w-full max-lg:px-[10%]'>
          <AuthTabs
            formFields={formFields}
            handleSubmit={handleSubmit}
            errorField={error || undefined}
            isLoading={isLoading}
          />
        </span>
      </section>
      
      <Footer className="mt-auto" />
    </div>
  );
}

export default Auth;