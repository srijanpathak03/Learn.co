import React from 'react';
import { useNavigate, useRouteError } from 'react-router-dom';

const ErrorPage = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-purple-600 mb-4">
            {error?.status || '404'}
          </h1>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {error?.statusText || 'Page Not Found'}
          </h2>
          <p className="text-gray-600">
            {error?.message || "Oops! The page you're looking for doesn't exist."}
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 mx-2"
          >
            Go Back
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 mx-2"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage; 