import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { serverbaseURL } from "../constant/index";
import { MessageCircle, Users, Award, Settings, ThumbsUp } from 'lucide-react';
// import { AuthContext } from '../provider/AuthProvider'; // Import your auth context

const CommunityFeed = () => {
  const { id } = useParams();
  const user = { displayName: "Test User", photoURL: "https://ui-avatars.com/api/?name=Test+User&background=random" };

  const [topics, setTopics] = useState([]);
  const [filteredTopics, setFilteredTopics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [newPost, setNewPost] = useState('');
  const navigate = useNavigate();
  const [communityData, setCommunityData] = useState(null);

  useEffect(() => {
    const fetchDiscourseData = async () => {
      try {
        // Fetch community details to get Discourse URL
        const communityResponse = await axios.get(`${serverbaseURL}community/${id}`);
        const discourseUrl = communityResponse.data.discourse_url;
        setCommunityData(communityResponse.data);

        // Fetch topics with details and categories from Discourse
        const [topicsResponse, categoriesResponse] = await Promise.all([
          axios.get(`${discourseUrl}/latest.json?include_user_details=true`), // Added user details parameter
          axios.get(`${discourseUrl}/categories.json`)
        ]);

        const fetchedTopics = topicsResponse.data.topic_list.topics;
        const users = topicsResponse.data.users || []; // Get users array from response

        // Enhance topics with user details
        const enhancedTopics = fetchedTopics.map(topic => {
          const posterDetails = users.find(u => u.id === topic.posters?.[0]?.user_id);
          return {
            ...topic,
            poster: posterDetails || null
          };
        });

        setTopics(enhancedTopics);
        setFilteredTopics(enhancedTopics);
        setCategories(categoriesResponse.data.category_list.categories);
      } catch (error) {
        console.error('Error fetching Discourse data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDiscourseData();
  }, [id]);

  const getAvatarUrl = (avatarTemplate) => {
    if (!avatarTemplate) return `https://ui-avatars.com/api/?name=User&background=random`;
    
    if (avatarTemplate.startsWith('http')) {
      return avatarTemplate.replace('{size}', '90');
    } else {
      return `${communityData?.discourse_url}${avatarTemplate.replace('{size}', '90')}`;
    }
  };

  // Filter topics when category changes
  useEffect(() => {
    if (activeCategory === 'all') {
      setFilteredTopics(topics);
    } else {
      const filtered = topics.filter(topic => topic.category_id === activeCategory);
      setFilteredTopics(filtered);
    }
  }, [activeCategory, topics]);

  const handleCategoryChange = (categoryId) => {
    setActiveCategory(categoryId);
  };

  const handleTopicClick = (topicId) => {
    navigate(`/community/${id}/topic/${topicId}`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-20">
              <div className="space-y-2">
                <button
                  onClick={() => handleCategoryChange('all')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeCategory === 'all' 
                      ? 'bg-purple-50 text-purple-600' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  All Posts
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-2 ${
                      activeCategory === category.id 
                        ? 'bg-purple-50 text-purple-600' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {category.color && (
                      <span 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: `#${category.color}` }}
                      />
                    )}
                    <span>{category.name}</span>
                    <span className="text-sm text-gray-500 ml-auto">
                      {category.topic_count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Create Post */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <img
                  src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=random`}
                  alt=""
                  className="w-10 h-10 rounded-full"
                />
                <input
                  type="text"
                  placeholder="Write something..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  {/* Add post type buttons here */}
                </div>
                <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                  Post
                </button>
              </div>
            </div>

            {/* Topics List */}
            <div className="space-y-4">
              {filteredTopics.map(topic => {
                const category = categories.find(c => c.id === topic.category_id);
                const replyCount = (topic.posts_count || 1) - 1; // Subtract 1 to exclude the original post

                return (
                  <div 
                    key={topic.id} 
                    className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow duration-200"
                    onClick={() => navigate(`/community/${id}/topic/${topic.id}`)}
                  >
                    <div className="flex items-start space-x-3">
                      <img
                        src={getAvatarUrl(topic.poster?.avatar_template)}
                        alt=""
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{topic.poster?.username || topic.last_poster_username || 'Unknown User'}</span>
                            <span className="text-gray-500 text-sm">
                              {new Date(topic.created_at).toLocaleDateString()}
                            </span>
                            {/* Category Tag with proper color */}
                            {category && (
                              <span 
                                className="text-xs px-2 py-1 rounded-full"
                                style={{
                                  backgroundColor: category.color ? `#${category.color}15` : '#e5e7eb1a',
                                  color: category.color ? `#${category.color}` : '#6b7280',
                                  border: category.color ? `1px solid #${category.color}30` : '1px solid #e5e7eb'
                                }}
                              >
                                {category.name || 'General'}
                              </span>
                            )}
                          </div>
                        </div>
                        <h3 className="font-medium mt-2">{topic.title}</h3>
                        <div className="flex items-center space-x-4 mt-3">
                          {/* Likes */}
                          <div className="flex items-center space-x-1 text-gray-500">
                            <ThumbsUp className="w-4 h-4" />
                            <span>{topic.like_count || 0} likes</span>
                          </div>
                          {/* Replies */}
                          <div className="flex items-center space-x-1 text-gray-500">
                            <MessageCircle className="w-4 h-4" />
                            <span>{replyCount} replies</span>
                          </div>
                          {/* Participants */}
                          <div className="flex items-center space-x-1 text-gray-500">
                            <Users className="w-4 h-4" />
                            <span>{topic.participant_count} participants</span>
                          </div>
                          {/* Views */}
                          <div className="flex items-center space-x-1 text-gray-500">
                            <svg 
                              className="w-4 h-4" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                              />
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
                              />
                            </svg>
                            <span>{topic.views} views</span>
                          </div>
                          {/* Last Activity */}
                          <div className="flex items-center space-x-1 text-gray-500">
                            <svg 
                              className="w-4 h-4" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                              />
                            </svg>
                            <span>
                              {new Date(topic.last_posted_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-20">
              <h3 className="font-medium mb-4">Leaderboard</h3>
              {/* Add leaderboard content */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityFeed; 