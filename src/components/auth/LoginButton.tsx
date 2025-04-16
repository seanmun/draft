import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export default function LoginButton() {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error during Google sign in:', error);
    }
  };

  return (
    <button 
      onClick={handleLogin}
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
  );
}