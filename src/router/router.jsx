import { createBrowserRouter } from "react-router-dom";
import CommunityAbout from '../pages/CommunityAbout';
import CommunityFeed from '../pages/CommunityFeed';
import PostDetail from '../pages/PostDetail';
import CreateCommunity from '../pages/CreateCommunity';
import Forum from "../pages/Forum";

// Temporary mock user data to replace AuthContext
const mockUser = {
  displayName: "Test User",
  photoURL: "https://ui-avatars.com/api/?name=Test+User&background=random",
  email: "test@example.com"
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Forum />
  },
  {
    path: "/community/:id",
    element: <CommunityAbout />
  },
  {
    path: "/community/:id/feed",
    element: <CommunityFeed />
  },
  {
    path: "/community/:id/topic/:topicId",
    element: <PostDetail />
  },
  {
    path: "/create-community",
    element: <CreateCommunity />
  }
]);

export default router;