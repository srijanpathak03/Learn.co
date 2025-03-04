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
import pricing from "../pages/pricing";
import Pricing from "../pages/pricing";

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
    element: <Login />
  },
  {
    path: "register",
    element: <Register />
  },
  {
    path: "",
    element: <Forum />
  },
  {
    path: "pricing",
    element: <Pricing/>
  },
  {
    path: "community/:id",
    element: <ProtectedRoute><CommunityAbout /></ProtectedRoute>
  },
  {
    path: "community/:id/feed",
    element: <ProtectedRoute><CommunityFeed /></ProtectedRoute>
  },
  {
    path: "community/:id/topic/:topicId",
    element: <ProtectedRoute><PostDetail /></ProtectedRoute>
  },
  {
    path: "create-community",
    element: <ProtectedRoute><CreateCommunity /></ProtectedRoute>
  }
];

export default routes;