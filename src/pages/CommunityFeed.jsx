import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { serverbaseURL } from "../constant/index";
import { MessageCircle, Users, Award, Settings, ThumbsUp, Eye } from 'lucide-react';
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
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [error, setError] = useState(null);
  const [communityData, setCommunityData] = useState(null);
  const [discourseUser, setDiscourseUser] = useState(null);
  const [authenticatingWithDiscourse, setAuthenticatingWithDiscourse] = useState(false);
  const [discourseAuthError, setDiscourseAuthError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

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
      console.log('Fetching data with:', { discourseUrl, username });

      // Get categories and topics in one call
      const data = await discourseService.getLatestTopics();
      console.log('Raw data from API:', data);
      
      // Process topics to ensure we have post IDs
      const processedTopics = await Promise.all(data.topics.map(async (topic) => {
        try {
          // Fetch full topic details to get the first post
          const topicDetails = await discourseService.getTopic(topic.id);
          console.log(`Topic ${topic.id} details:`, topicDetails);
          
          const firstPost = topicDetails.post_stream?.posts?.[0];
          if (firstPost) {
            console.log(`First post for topic ${topic.id}:`, firstPost);
            // Get post details including likes
            const postDetails = await discourseService.getPost(firstPost.id);
            console.log(`Post details for ${firstPost.id}:`, postDetails);
            
            return {
              ...topic,
              firstPost: postDetails,
              post_id: firstPost.id, // Explicitly store post_id
              like_count: postDetails.like_count || 0,
              user_liked: postDetails.user_liked || false,
              category: data.categories.find(c => c.id === topic.category_id)
            };
          }
          return topic;
        } catch (error) {
          console.error(`Error processing topic ${topic.id}:`, error);
          return topic;
        }
      }));

      console.log('Processed topics:', processedTopics);
      
      setCategories(data.categories);
      setTopics(processedTopics);
      setFilteredTopics(processedTopics);

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

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim()) {
      setError('Please provide a title for your post');
      return;
    }

    try {
      setIsCreatingPost(true);
      setError(null);

      await discourseService.createTopic({
        title: newPostTitle,
        raw: newPostContent,
        category: activeCategory === 'all' ? categories[0]?.id : activeCategory,
        image: selectedImage
      });

      // Clear form
      setNewPostTitle('');
      setNewPostContent('');
      setSelectedImage(null);
      setImagePreview(null);
      
      // Refresh the feed
      await fetchDiscourseData(communityData.discourse_url, discourseUser.username);
      
    } catch (error) {
      console.error('Error creating post:', error);
      setError('Failed to create post. Please try again.');
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleLike = async (postId) => {
    if (!postId) {
      console.error('No post ID provided');
      return;
    }

    if (!discourseUser?.username) {
      console.error('No discourse username found');
      return;
    }

    try {
      await discourseService.performPostAction({
        id: postId,
        actionType: 'like',
        username: discourseUser.username
      });

      // Refresh the feed to update like counts
      await fetchDiscourseData(communityData.discourse_url, discourseUser.username);
    } catch (error) {
      // Show user-friendly error message
      const errorMessage = error.message || 'Error liking post. Please try again.';
      setError(errorMessage);
      
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
      
      console.error('Error liking post:', error);
    }
  };

  const extractImageFromContent = (cooked) => {
    if (!cooked) return null;
    
    // First try to find our uploaded image marker
    const div = document.createElement('div');
    div.innerHTML = cooked;
    const uploadedImage = div.querySelector('.uploaded-image');
    if (uploadedImage) {
      return uploadedImage.textContent;
    }
    
    // If no uploaded image found, return null
    return null;
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
        {/* Error Toast */}
        {error && (
          <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-md">
            {error}
          </div>
        )}
        
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
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    placeholder="Post title..."
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <textarea
                    placeholder="Write your post content..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px]"
                  />
                  
                  {/* Image upload section */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => document.getElementById('image-upload').click()}
                      className="flex items-center space-x-2 text-gray-600 hover:text-purple-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Add Image</span>
                    </button>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Image preview */}
                  {imagePreview && (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-40 rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {error && (
                <div className="text-red-500 text-sm mt-2">
                  {error}
                </div>
              )}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  Posting in: {activeCategory === 'all' 
                    ? categories[0]?.name 
                    : categories.find(c => c.id === activeCategory)?.name || 'General'
                  }
                </div>
                <button
                  onClick={handleCreatePost}
                  disabled={isCreatingPost}
                  className={`bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2`}
                >
                  {isCreatingPost ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                      <span>Posting...</span>
                    </>
                  ) : (
                    <span>Post</span>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredTopics.map(topic => {
                const firstPost = topic.firstPost || topic.posts?.[0];
                const imageUrl = extractImageFromContent(firstPost?.cooked);
                
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
                            {topic.category && (
                              <span 
                                className="text-xs px-2 py-1 rounded-full"
                                style={{
                                  backgroundColor: `#${topic.category.color}15`,
                                  color: `#${topic.category.color}`,
                                  border: `1px solid #${topic.category.color}30`
                                }}
                              >
                                {topic.category.name}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex mt-2 space-x-4">
                          <div className="flex-1">
                            <h3 className="font-medium">{topic.title}</h3>
                            {firstPost && (
                              <div 
                                className="mt-2 text-gray-600 text-sm line-clamp-2"
                                dangerouslySetInnerHTML={{ 
                                  __html: firstPost.cooked.replace(/<img[^>]*>/g, '') // Remove img tags from content
                                }}
                              />
                            )}
                          </div>
                          
                          {imageUrl && (
                            <div className="flex-shrink-0">
                              <img
                                src={imageUrl}
                                alt=""
                                className="w-32 h-32 object-cover rounded-lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(imageUrl, '_blank');
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-4 mt-3">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (firstPost?.id) {
                                handleLike(firstPost.id);
                              }
                            }}
                            className={`flex items-center space-x-1 ${
                              topic.user_liked ? 'text-purple-600' : 'text-gray-500'
                            } hover:text-purple-600 transition-colors duration-200`}
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span>{topic.like_count || 0}</span>
                          </button>
                          <div className="flex items-center space-x-1 text-gray-500">
                            <MessageCircle className="w-4 h-4" />
                            <span>{topic.posts_count - 1}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-gray-500">
                            <Eye className="w-4 h-4" />
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