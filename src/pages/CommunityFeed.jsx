import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { serverbaseURL } from "../constant/index";
import { MessageCircle, Users, Award, Settings, ThumbsUp } from 'lucide-react';
import { AuthContext } from '../provider/AuthProvider';

const CommunityFeed = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [topics, setTopics] = useState([]);
  const [filteredTopics, setFilteredTopics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [newPost, setNewPost] = useState('');
  const [communityData, setCommunityData] = useState(null);
  const [discourseUser, setDiscourseUser] = useState(null);
  const [authenticatingWithDiscourse, setAuthenticatingWithDiscourse] = useState(false);
  const [discourseAuthError, setDiscourseAuthError] = useState(null);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      localStorage.setItem('redirectAfterLogin', `/community/${id}/feed`);
      navigate('/login');
      return;
    }

    const checkMembershipAndLoadFeed = async () => {
      try {
        setLoading(true);
        
        // Check if user is a member of this community
        const membershipResponse = await axios.get(
          `${serverbaseURL}community/${id}/check-membership`, 
          { params: { userId: user.uid } }
        );
        
        // If user is not a member, redirect to the about page
        if (!membershipResponse.data.isMember) {
          navigate(`/community/${id}`);
          return;
        }
        
        // Fetch community data
        const communityResponse = await axios.get(`${serverbaseURL}community/${id}`);
        setCommunityData(communityResponse.data);
        
        // Authenticate with Discourse
        await authenticateWithDiscourse();
        
      } catch (error) {
        console.error('Error loading community feed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkMembershipAndLoadFeed();
  }, [id, user, navigate]);

  const authenticateWithDiscourse = async () => {
    if (!user?.uid) return;
    
    try {
      setAuthenticatingWithDiscourse(true);
      setDiscourseAuthError(null);
      
      const mappingResponse = await axios.get(`${serverbaseURL}discourse/user/${id}`, {
        params: { userId: user.uid }
      });
      
      if (!mappingResponse.data.success) {
        navigate(`/community/${id}`);
        return;
      }
      
      setDiscourseUser(mappingResponse.data.discourseUser);
      
      const ssoResponse = await axios.get(`${serverbaseURL}discourse/initiate-sso/${id}`, {
        params: { userId: user.uid }
      });
      
      if (ssoResponse.data.success && ssoResponse.data.redirect_url) {
        const ssoWindow = window.open(ssoResponse.data.redirect_url, 'discourse_sso', 'width=600,height=700');
        
        if (!ssoWindow || ssoWindow.closed || typeof ssoWindow.closed === 'undefined') {
          throw new Error('Please allow popups for this site to login to the community');
        }
        
        const checkWindowClosed = setInterval(() => {
          if (ssoWindow.closed) {
            clearInterval(checkWindowClosed);
            setAuthenticatingWithDiscourse(false);
            
            fetchDiscourseData(communityData.discourse_url);
          }
        }, 500);
      } else {
        throw new Error('Failed to initiate SSO login');
      }
    } catch (error) {
      console.error('Error authenticating with Discourse:', error);
      setDiscourseAuthError(error.message || 'Authentication failed');
      setAuthenticatingWithDiscourse(false);
    }
  };

  const fetchDiscourseData = async (discourseUrl) => {
    if (!discourseUrl) return;
    
    try {
      const [topicsResponse, categoriesResponse] = await Promise.all([
        axios.get(`${discourseUrl}/latest.json?include_user_details=true`, {
          withCredentials: true
        }),
        axios.get(`${discourseUrl}/categories.json`, {
          withCredentials: true
        })
      ]);

      const fetchedTopics = topicsResponse.data.topic_list.topics;
      const users = topicsResponse.data.users || [];

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
      setLoading(false);
    } catch (error) {
      console.error('Error fetching Discourse data:', error);
      setLoading(false);
    }
  };

  const getAvatarUrl = (avatarTemplate) => {
    if (!avatarTemplate) return `https://ui-avatars.com/api/?name=User&background=random`;
    
    if (avatarTemplate.startsWith('http')) {
      return avatarTemplate.replace('{size}', '90');
    } else {
      return `${communityData?.discourse_url}${avatarTemplate.replace('{size}', '90')}`;
    }
  };

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

  if (loading || authenticatingWithDiscourse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {authenticatingWithDiscourse ? 'Authenticating with community...' : 'Loading community feed...'}
          </p>
        </div>
      </div>
    );
  }

  if (discourseAuthError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{discourseAuthError}</p>
          <button 
            onClick={() => navigate(`/community/${id}`)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Community
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
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

          <div className="flex-1">
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
                </div>
                <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                  Post
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredTopics.map(topic => {
                const category = categories.find(c => c.id === topic.category_id);
                const replyCount = (topic.posts_count || 1) - 1;

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
                          <div className="flex items-center space-x-1 text-gray-500">
                            <ThumbsUp className="w-4 h-4" />
                            <span>{topic.like_count || 0} likes</span>
                          </div>
                          <div className="flex items-center space-x-1 text-gray-500">
                            <MessageCircle className="w-4 h-4" />
                            <span>{replyCount} replies</span>
                          </div>
                          <div className="flex items-center space-x-1 text-gray-500">
                            <Users className="w-4 h-4" />
                            <span>{topic.participant_count} participants</span>
                          </div>
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

          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-20">
              <h3 className="font-medium mb-4">Leaderboard</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityFeed; 