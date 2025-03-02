import React, { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../provider/AuthProvider';
import axios from 'axios';
import { serverbaseURL } from '../constant/index';

const Register = () => {
  const navigate = useNavigate();
  const { googleSignIn } = useContext(AuthContext);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await googleSignIn();
      if (result.success) {
        // Save user info to community database
        await axios.post(`${serverbaseURL}user`, {
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName,
          photoURL: result.user.photoURL,
          username: result.user.email.split('@')[0],
          createdAt: new Date(),
          communities: [],
          createdCommunities: []
        });
        
        navigate('/');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/login" className="font-medium text-purple-600 hover:text-purple-500">
              sign in to your account
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          {loading ? 'Creating account...' : 'Sign up with Google'}
        </button>
      </div>
    </div>
  );
};

export default Register; 