import { Navigate } from "react-router-dom";
import CommunityAbout from '../pages/CommunityAbout';
import CommunityFeed from '../pages/CommunityFeed';
import PostDetail from '../pages/PostDetail';
import CreateCommunity from '../pages/CreateCommunity';
import Forum from "../pages/Forum";
import Login from '../pages/Login';
import Register from '../pages/Register';
import { useContext } from 'react';
import { AuthContext } from '../provider/AuthProvider';
import Pricing from "../pages/pricing";
import CommunityAboutPage from '../pages/CommunityAboutPage';
import CommunityCourses from '../pages/CommunityCourses';
import ErrorPage from '../pages/ErrorPage';

// Temporary mock user data to replace AuthContext
const mockUser = {
  displayName: "Test User",
  photoURL: "https://ui-avatars.com/api/?name=Test+User&background=random",
  email: "test@example.com"
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

const routes = [
  {
    path: "login",
    element: <Login />,
    errorElement: <ErrorPage />
  },
  {
    path: "register",
    element: <Register />,
    errorElement: <ErrorPage />
  },
  {
    path: "",
    element: <Forum />,
    errorElement: <ErrorPage />
  },
  {
    path: "pricing",
    element: <Pricing />,
    errorElement: <ErrorPage />
  },
  {
    path: "community/:id",
    element: <ProtectedRoute><CommunityAbout /></ProtectedRoute>,
    errorElement: <ErrorPage />
  },
  {
    path: "community/:id/feed",
    element: <ProtectedRoute><CommunityFeed /></ProtectedRoute>,
    errorElement: <ErrorPage />
  },
  {
    path: "community/:id/topic/:topicId",
    element: <ProtectedRoute><PostDetail /></ProtectedRoute>,
    errorElement: <ErrorPage />
  },
  {
    path: "community/:id/about",
    element: <ProtectedRoute><CommunityAboutPage /></ProtectedRoute>,
    errorElement: <ErrorPage />
  },
  {
    path: "community/:id/courses",
    element: <ProtectedRoute><CommunityCourses /></ProtectedRoute>,
    errorElement: <ErrorPage />
  },
  {
    path: "create-community",
    element: <ProtectedRoute><CreateCommunity /></ProtectedRoute>,
    errorElement: <ErrorPage />
  },
  {
    // Catch all route for 404s
    path: "*",
    element: <ErrorPage />,
    errorElement: <ErrorPage />
  }
];

export default routes;