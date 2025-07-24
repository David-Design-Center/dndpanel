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
  email: string;
  password: string;
};

function Auth() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
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

    console.log('Attempting to sign in with:', formData.email);

    try {
      const { error: authError } = await signIn(formData.email, formData.password);
      
      if (!authError) {
        console.log('Authentication successful, navigating to dashboard');
        // Small delay to ensure auth state has propagated
        setTimeout(() => {
          navigate('/');
        }, 100);
      } else {
        console.error('Authentication error:', authError);
        setError(authError.message || 'Authentication failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Unexpected error during authentication:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formFields = {
    header: 'Welcome to DND Panel',
    subHeader: 'Sign in to your business dashboard',
    fields: [
      {
        label: 'Email',
        required: true,
        type: 'email' as const,
        placeholder: 'Enter your email address',
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
          handleInputChange(event, 'email'),
        value: formData.email,
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
          <Ripple mainCircleSize={100} />
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