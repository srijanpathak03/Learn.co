import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { serverbaseURL } from "../constant/index";
import { MessageCircle, Users, Award, Settings, ThumbsUp } from 'lucide-react';
import { AuthContext } from '../provider/AuthProvider';
import { discourseService } from '../services/discourseService';

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
    if (!user) {
      localStorage.setItem('redirectAfterLogin', `/community/${id}/feed`);
      navigate('/login');
      return;
    }

    const loadFeed = async () => {
      try {
        setLoading(true);
        
        // Check if user is a member of this community
        const membershipResponse = await axios.get(
          `${serverbaseURL}community/${id}/check-membership`, 
          { params: { userId: user.uid } }
        );
        console.log('Membership Response:', membershipResponse.data);
        
        if (!membershipResponse.data.isMember) {
          navigate(`/community/${id}`);
          return;
        }
        
        // Fetch community data
        const communityResponse = await axios.get(`${serverbaseURL}community/${id}`);
        console.log('Community Response:', communityResponse.data);
        setCommunityData(communityResponse.data);
        
        // Get user's Discourse mapping
        const mappingResponse = await axios.get(`${serverbaseURL}discourse/user/${id}`, {
          params: { userId: user.uid }
        });
        console.log('Mapping Response:', mappingResponse.data);

        if (mappingResponse.data.success) {
          setDiscourseUser(mappingResponse.data.discourseUser);
          await fetchDiscourseData(
            communityResponse.data.discourse_url, 
            mappingResponse.data.discourseUser.username
          );
        }
        
      } catch (error) {
        console.error('Error loading community feed:', error.response?.data || error);
      } finally {
        setLoading(false);
      }
    };

    loadFeed();
  }, [id, user, navigate]);

  const fetchDiscourseData = async (discourseUrl, username) => {
    if (!discourseUrl || !username) {
      console.log('Missing URL or username:', { discourseUrl, username });
      return;
    }
    
    try {
      setLoading(true);

      // Get categories
      const categoriesData = await discourseService.getCategories();
      console.log('Categories:', categoriesData);
      setCategories(categoriesData.category_list.categories);

      // Get all topics from each category
      const allTopics = [];
      for (const category of categoriesData.category_list.categories) {
        try {
          const categoryTopicsData = await discourseService.getCategoryTopics(category.id);
          console.log(`Topics for category ${category.id}:`, categoryTopicsData);
          
          if (categoryTopicsData.topic_list && categoryTopicsData.topic_list.topics) {
            // Get details for each topic
            const topicsWithDetails = await Promise.all(
              categoryTopicsData.topic_list.topics.map(async (topic) => {
                try {
                  const topicDetails = await discourseService.getTopic(topic.id);
                  
                  // Extract the first post from the topic details
                  const firstPost = topicDetails.post_stream?.posts[0];
                  if (firstPost) {
                    const postDetails = await discourseService.getPost(firstPost.id);
                    return {
                      ...topic,
                      category_id: category.id,
                      posts: topicDetails.post_stream.posts,
                      firstPost: postDetails,
                      like_count: postDetails.like_count || 0,
                      user_liked: postDetails.user_liked || false,
                      posts_count: topicDetails.posts_count || 1
                    };
                  }
                  return {
                    ...topic,
                    category_id: category.id
                  };
                } catch (error) {
                  console.error(`Error fetching topic ${topic.id}:`, error);
                  return {
                    ...topic,
                    category_id: category.id
                  };
                }
              })
            );
            
            allTopics.push(...topicsWithDetails);
          }
        } catch (error) {
          console.error(`Error fetching topics for category ${category.id}:`, error);
        }
      }

      console.log('All topics with details:', allTopics);
      setTopics(allTopics);
      setFilteredTopics(allTopics);
      
    } catch (error) {
      console.error('Error fetching Discourse data:', error);
    } finally {
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

  // Handle post creation
  const handleCreatePost = async () => {
    if (!newPost.trim()) return;

    try {
      const response = await discourseService.createTopic({
        title: 'New Post', // You might want to add a title input field
        raw: newPost,
        category_id: activeCategory === 'all' ? undefined : activeCategory
      });

      // Refresh the feed after posting
      if (response) {
        setNewPost('');
        fetchDiscourseData(communityData.discourse_url, discourseUser.username);
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  // Handle like action
  const handleLike = async (postId) => {
    try {
      await discourseService.performPostAction({
        id: postId,
        actionType: 'like'
      });
      // Refresh the post data
      fetchDiscourseData(communityData.discourse_url, discourseUser.username);
    } catch (error) {
      console.error('Error liking post:', error);
    }
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
                const firstPost = topic.firstPost || topic.posts?.[0];
                
                return (
                  <div 
                    key={topic.id} 
                    className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow duration-200"
                    onClick={() => navigate(`/community/${id}/topic/${topic.id}`)}
                  >
                    <div className="flex items-start space-x-3">
                      <img
                        src={getAvatarUrl(firstPost?.avatar_template)}
                        alt=""
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{firstPost?.username}</span>
                            <span className="text-gray-500 text-sm">
                              {new Date(topic.created_at).toLocaleDateString()}
                            </span>
                            {category && (
                              <span 
                                className="text-xs px-2 py-1 rounded-full"
                                style={{
                                  backgroundColor: `#${category.color}15`,
                                  color: `#${category.color}`,
                                  border: `1px solid #${category.color}30`
                                }}
                              >
                                {category.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <h3 className="font-medium mt-2">{topic.title}</h3>
                        {firstPost && (
                          <div 
                            className="mt-2 text-gray-600 text-sm line-clamp-2"
                            dangerouslySetInnerHTML={{ __html: firstPost.cooked }}
                          />
                        )}
                        <div className="flex items-center space-x-4 mt-3">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(firstPost?.id);
                            }}
                            className={`flex items-center space-x-1 ${
                              topic.user_liked ? 'text-purple-600' : 'text-gray-500'
                            }`}
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span>{topic.like_count || 0}</span>
                          </button>
                          <div className="flex items-center space-x-1 text-gray-500">
                            <MessageCircle className="w-4 h-4" />
                            <span>{topic.posts_count - 1}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>{topic.views}</span>
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