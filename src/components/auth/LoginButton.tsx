import { useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  sendSignInLinkToEmail
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '../../lib/firebase';

export default function LoginButton() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      await signInWithPopup(auth, provider);
    } catch (error: unknown) {
      console.error('Error during Google sign in:', error);
      if (error instanceof FirebaseError) {
        setError(`Error signing in with Google: ${error.code}`);
      } else {
        setError('Error signing in with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

// Inside the handlePasswordlessEmailLogin function in LoginButton.js
const handlePasswordlessEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  try {
    setLoading(true);
    
    // Updated actionCodeSettings according to the documentation
    const actionCodeSettings = {
      // URL you want to redirect back to after sign-in
      url: window.location.origin + '/login/email-handler',
      // This must be true for email link sign-in
      handleCodeInApp: true
    };
    
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    
    // Save the email locally to complete sign-in on the same device
    window.localStorage.setItem('emailForSignIn', email);
    
    setEmailSent(true);
    setError('');
  } catch (error: unknown) {
    console.error('Error during passwordless email auth:', error);
    if (error instanceof FirebaseError) {
      setError(`Error sending login email: ${error.message}`);
    } else {
      setError('Error sending login email. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};

  if (showEmailForm) {
    return (
      <div className="w-full max-w-md">
        {emailSent ? (
          <div className="bg-white p-6 rounded-md shadow-md text-center">
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <h2 className="text-xl font-bold mb-2">Check your email</h2>
            <p className="mb-4">
              We&apos;ve sent a sign-in link to <strong>{email}</strong>. 
              Click the link in your email to sign in.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              If you don&apos;t see the email, check your spam folder.
            </p>
            <button
              type="button"
              onClick={() => {
                setEmailSent(false);
                setShowEmailForm(false);
              }}
              className="text-blue-600 text-sm hover:underline"
            >
              Back to sign in options
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordlessEmailLogin} className="bg-white p-6 rounded-md shadow-md">
            <h2 className="text-xl font-bold mb-4">Sign in with Email</h2>
            <p className="text-gray-600 text-sm mb-4">
              We&apos;ll send you a sign-in link to your email. No password needed.
            </p>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                Email
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="email"
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            
            <div className="flex flex-col space-y-3">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send sign-in link'}
              </button>
              
              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="text-gray-600 text-sm hover:underline"
              >
                Back to all sign in options
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3">
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
      >
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12.545,12.151L12.545,12.151c0,1.054,0.855,1.909,1.909,1.909h3.536c-0.229,1.307-0.889,2.492-1.871,3.374 c-0.997,0.997-2.343,1.55-3.755,1.55c-2.914,0-5.281-2.367-5.281-5.281c0-2.914,2.367-5.281,5.281-5.281 c1.144,0,2.242,0.364,3.155,1.052l2.395-2.395C16.505,5.594,14.396,4.819,12.182,4.819c-4.791,0-8.682,3.891-8.682,8.682 c0,4.791,3.891,8.682,8.682,8.682c2.33,0,4.525-0.908,6.175-2.558c1.649-1.649,2.558-3.844,2.558-6.175 c0-0.468-0.037-0.937-0.107-1.395h-8.264V12.151z"
          />
        </svg>
        Sign in with Google
      </button>
      
      <button
        onClick={() => setShowEmailForm(true)}
        disabled={loading}
        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded flex items-center"
      >
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Sign in with Email (No password)
      </button>
      
      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
    </div>
  );
}