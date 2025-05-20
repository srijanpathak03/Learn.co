import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { serverbaseURL } from "../constant/index";
import { MessageCircle, Users, Award, Settings, ThumbsUp, Eye, Plus, Edit, Trash, BookOpen, Play, Calendar, Video, Clock, X } from 'lucide-react';
import { AuthContext } from '../provider/AuthProvider';
import { discourseService } from '../services/discourseService';
import CommunityMembers from '../components/CommunityMembers';
import CommunityLeaderboard from '../components/CommunityLeaderboard';
import CreateCourseModal from '../components/CreateCourseModal';
import CourseViewer from '../components/CourseViewer';

const CommunityFeed = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const location = useLocation();
  
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
  const [discourseMapping, setDiscourseMapping] = useState(null);
  const [activeTab, setActiveTab] = useState('community');
  const [courses, setCourses] = useState([]);
  const [isCreator, setIsCreator] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [viewingCourse, setViewingCourse] = useState(null);
  const [livestreams, setLivestreams] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newLivestream, setNewLivestream] = useState({
    title: '',
    description: '',
    scheduledFor: '',
    channelName: ''
  });
  const [activeLivestream, setActiveLivestream] = useState(null);

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
        
        // Check if user is creator
        setIsCreator(communityResponse.data.creator.uid === user.uid);
        
        // Get user's Discourse mapping
        const mappingResponse = await axios.get(`${serverbaseURL}discourse/user/${id}`, {
          params: { userId: user.uid }
        });
        console.log('Mapping Response:', mappingResponse.data);

        if (mappingResponse.data.success) {
          const discourseUser = mappingResponse.data.discourseUser;
          setDiscourseUser(discourseUser);
          // Store the username in the mapping state
          setDiscourseMapping({
            discourseUsername: discourseUser.username,
            discourseUserId: discourseUser.id
          });
          
          console.log('Set discourse mapping:', {
            discourseUsername: discourseUser.username,
            discourseUserId: discourseUser.id
          });

          await fetchDiscourseData(
            communityResponse.data.discourse_url, 
            discourseUser.username
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

    console.log('Current discourse mapping:', discourseMapping);
    
    if (!discourseMapping?.discourseUsername) {
      console.error('Missing discourse username:', discourseMapping);
      setError('User not properly mapped to Discourse');
      return;
    }

    try {
      setIsCreatingPost(true);
      setError(null);

      console.log('Attempting to create post with username:', discourseMapping.discourseUsername);

      const newTopic = await discourseService.createTopic({
        title: newPostTitle,
        raw: newPostContent,
        category: activeCategory === 'all' ? categories[0]?.id : activeCategory,
        image: selectedImage,
        username: discourseMapping.discourseUsername
      });

      console.log('Post created successfully:', newTopic);

      // Clear form
      setNewPostTitle('');
      setNewPostContent('');
      setSelectedImage(null);
      setImagePreview(null);
      
      // Instead of refetching everything, add the new topic to the state
      if (newTopic && newTopic.id) {
        // Fetch just this new topic's details
        const topicDetails = await discourseService.getTopic(newTopic.id);
        const firstPost = topicDetails.post_stream?.posts?.[0];
        
        if (firstPost) {
          const postDetails = await discourseService.getPost(firstPost.id);
          
          const newTopicWithDetails = {
            ...newTopic,
            firstPost: postDetails,
            post_id: firstPost.id,
            like_count: 0,
            user_liked: false,
            category: categories.find(c => c.id === (activeCategory === 'all' ? categories[0]?.id : activeCategory))
          };
          
          // Add to beginning of topics list
          const updatedTopics = [newTopicWithDetails, ...topics];
          setTopics(updatedTopics);
          
          // Update filtered topics if needed
          if (activeCategory === 'all' || activeCategory === newTopicWithDetails.category_id) {
            setFilteredTopics([newTopicWithDetails, ...filteredTopics]);
          }
        }
      }
      
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

    console.log('Current discourse mapping for like:', discourseMapping);

    if (!discourseMapping?.discourseUsername) {
      console.error('Missing discourse username for like action:', discourseMapping);
      setError('User not properly mapped to Discourse');
      return;
    }

    try {
      console.log('Attempting to like post:', {
        postId,
        username: discourseMapping.discourseUsername
      });

      // Find the topic that contains this post
      const topicIndex = topics.findIndex(topic => topic.firstPost?.id === postId);
      
      if (topicIndex === -1) {
        console.error('Could not find topic with post ID:', postId);
        return;
      }
      
      const topic = topics[topicIndex];
      const isCurrentlyLiked = topic.user_liked;
      
      // Optimistically update UI
      const updatedTopics = [...topics];
      updatedTopics[topicIndex] = {
        ...topic,
        like_count: isCurrentlyLiked ? topic.like_count - 1 : topic.like_count + 1,
        user_liked: !isCurrentlyLiked
      };
      
      setTopics(updatedTopics);
      
      // Also update filtered topics if this topic is in the current view
      const filteredIndex = filteredTopics.findIndex(topic => topic.firstPost?.id === postId);
      if (filteredIndex !== -1) {
        const updatedFiltered = [...filteredTopics];
        updatedFiltered[filteredIndex] = updatedTopics[topicIndex];
        setFilteredTopics(updatedFiltered);
      }

      // Make the actual API call
      await discourseService.performPostAction({
        id: postId,
        actionType: 'like',
        username: discourseMapping.discourseUsername
      });

      console.log('Like action successful');
      
      // No need to refetch all data - we've already updated the UI
      
    } catch (error) {
      const errorMessage = error.message || 'Error liking post. Please try again.';
      console.error('Like action failed:', error);
      setError(errorMessage);
      
      // Revert the optimistic update if the API call failed
      const topicIndex = topics.findIndex(topic => topic.firstPost?.id === postId);
      if (topicIndex !== -1) {
        // Fetch just this post's updated details
        const postDetails = await discourseService.getPost(postId);
        
        const updatedTopics = [...topics];
        updatedTopics[topicIndex] = {
          ...topics[topicIndex],
          like_count: postDetails.like_count || 0,
          user_liked: postDetails.user_liked || false
        };
        
        setTopics(updatedTopics);
        
        // Also update filtered topics if needed
        const filteredIndex = filteredTopics.findIndex(topic => topic.firstPost?.id === postId);
        if (filteredIndex !== -1) {
          const updatedFiltered = [...filteredTopics];
          updatedFiltered[filteredIndex] = updatedTopics[topicIndex];
          setFilteredTopics(updatedFiltered);
        }
      }
      
      setTimeout(() => setError(null), 3000);
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

  // Set the active tab based on the URL path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/feed')) {
      setActiveTab('community');
    } else if (path.includes('/courses')) {
      setActiveTab('courses');
    } else if (path.includes('/calendar')) {
      setActiveTab('calendar');
    } else if (path.includes('/members')) {
      setActiveTab('members');
    } else if (path.includes('/leaderboards')) {
      setActiveTab('leaderboards');
    } else if (path.includes('/about')) {
      setActiveTab('about');
    } else {
      // Default to community tab if no specific path is matched
      setActiveTab('community');
    }
  }, [location.pathname]);

  // Update the tab navigation to use setActiveTab instead of navigate
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    // Update the URL without full page reload
    let path = `/community/${id}`;
    switch (tab) {
      case 'community':
        path += '/feed';
        break;
      case 'courses':
      case 'calendar':
      case 'members':
      case 'leaderboards':
      case 'about':
        path += `/${tab}`;
        break;
      default:
        path += '/feed';
    }
    
    navigate(path, { replace: true });
  };

  // Add function to fetch courses
  const fetchCourses = async () => {
    if (activeTab !== 'courses') return;
    
    try {
      setLoading(true);
      const coursesRes = await fetch(
        `${serverbaseURL}api/communities/${id}/courses`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );
      if (!coursesRes.ok) throw new Error('Failed to fetch courses');
      const coursesData = await coursesRes.json();
      setCourses(coursesData);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch courses when tab changes to courses
  useEffect(() => {
    if (activeTab === 'courses') {
      fetchCourses();
    }
  }, [activeTab]);

  // Add course management functions
  const handleEditCourse = (course) => {
    setSelectedCourse(course);
    setShowCreateModal(true);
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;

    try {
      const response = await fetch(
        `${serverbaseURL}api/communities/${id}/courses/${courseId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete course');
      
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      setError('Failed to delete course');
    }
  };

  const handleViewCourse = (course) => {
    setViewingCourse(course);
  };

  // Fetch livestreams when tab changes to calendar
  useEffect(() => {
    if (activeTab === 'calendar') {
      fetchLivestreams();
    }
  }, [activeTab]);
  
  const fetchLivestreams = async () => {
    try {
      setLoading(true);
      // Try to fetch livestreams, but handle 404 gracefully
      try {
        const response = await axios.get(`${serverbaseURL}api/communities/${id}/livestreams`);
        setLivestreams(response.data || []);
      } catch (error) {
        // If API endpoint doesn't exist yet, just set empty array
        console.log('Livestream API not available yet:', error);
        setLivestreams([]);
      }
    } catch (error) {
      console.error('Error fetching livestreams:', error);
      // Don't show error to user
    } finally {
      setLoading(false);
    }
  };
  
  const handleScheduleLivestream = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Generate a unique channel name if not provided
      const channelName = newLivestream.channelName || 
        `${communityData.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
      
      try {
        // Try to create a livestream
        const response = await axios.post(`${serverbaseURL}api/communities/${id}/livestreams`, {
          ...newLivestream,
          channelName,
          creatorId: user.uid,
          creatorName: user.displayName,
          creatorPhoto: user.photoURL
        });
        
        // If successful, add to list
        setLivestreams([...livestreams, response.data]);
      } catch (error) {
        console.log('Livestream API not available yet:', error);
        
        // Since API isn't available, create a mock livestream object
        const mockStream = {
          _id: Date.now().toString(),
          ...newLivestream,
          channelName,
          creatorId: user.uid,
          creatorName: user.displayName,
          creatorPhoto: user.photoURL,
          createdAt: new Date().toISOString()
        };
        
        // Add to local state
        setLivestreams([...livestreams, mockStream]);
        
        // Show a message to the user
        setError("Livestream scheduled locally. Backend API not available yet.");
        setTimeout(() => setError(null), 5000);
      }
      
      // Close modal and reset form regardless
      setShowScheduleModal(false);
      setNewLivestream({
        title: '',
        description: '',
        scheduledFor: '',
        channelName: ''
      });
    } catch (error) {
      console.error('Error scheduling livestream:', error);
      setError('Failed to schedule livestream. Please try again later.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteLivestream = async (livestreamId) => {
    if (!window.confirm('Are you sure you want to delete this livestream?')) return;
    
    try {
      try {
        // Try to delete from API
        await axios.delete(`${serverbaseURL}api/communities/${id}/livestreams/${livestreamId}`);
      } catch (error) {
        console.log('Livestream API not available yet:', error);
        // Show a message to the user
        setError("Livestream deleted locally. Backend API not available yet.");
        setTimeout(() => setError(null), 5000);
      }
      
      // Remove from local state regardless
      setLivestreams(livestreams.filter(stream => stream._id !== livestreamId));
    } catch (error) {
      console.error('Error deleting livestream:', error);
      setError('Failed to delete livestream');
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const startLivestream = (stream) => {
    setActiveLivestream(stream);
    navigate(`/community/${id}/livestream/${stream._id}`);
  };
  
  const joinLivestream = (stream) => {
    setActiveLivestream(stream);
    navigate(`/community/${id}/livestream/${stream._id}`);
  };

  // Render the appropriate content based on the active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'members':
        return (
          <CommunityMembers 
            communityData={communityData} 
            discourseMapping={discourseMapping}
            getAvatarUrl={getAvatarUrl}
          />
        );
      case 'leaderboards':
        return (
          <CommunityLeaderboard 
            communityData={communityData}
            getAvatarUrl={getAvatarUrl}
          />
        );
      case 'community':
        // This is the default feed content
        return (
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
                <div className="flex items-start space-x-3">
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
                            
                            {topic.image_url && (
                              <div className="flex-shrink-0">
                                <img
                                  src={topic.image_url}
                                  alt=""
                                  className="w-32 h-32 object-cover rounded-lg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(topic.image_url, '_blank');
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
                              <span>{topic.like_count || 0} Likes</span>
                            </button>
                            <div className="flex items-center space-x-1 text-gray-500">
                              <MessageCircle className="w-4 h-4" />
                              <span>{topic.posts_count - 1} Comments</span>
                            </div>
                            <div className="flex items-center space-x-1 text-gray-500">
                              <Eye className="w-4 h-4" />
                              <span>{topic.views} Views</span>
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
              <div className="bg-white rounded-lg shadow-sm p-4 sticky top-20 space-y-4">
                <h3 className="font-medium text-lg mb-2">About Community</h3>
                
                {/* Community Image */}
                {communityData?.image_url && (
                  <img 
                    src={communityData.image_url} 
                    alt={communityData?.name}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                )}
                
                {/* Community Name */}
                <h4 className="font-medium text-xl">{communityData?.name}</h4>
                
                {/* Community Description */}
                <p className="text-gray-600 text-sm">
                  {communityData?.description}
                </p>
                
                {/* Community Stats */}
                <div className="border-t pt-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-semibold">
                        {communityData?.member_count || 0}
                      </div>
                      <div className="text-sm text-gray-500">Members</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold">
                        {topics.length || 0}
                      </div>
                      <div className="text-sm text-gray-500">Posts</div>
                    </div>
                  </div>
                </div>
                
                {/* Community Creation Date */}
                <div className="text-sm text-gray-500 pt-4 border-t">
                  Created {new Date(communityData?.created_at).toLocaleDateString()}
                </div>
                
                {/* Community Rules or Additional Info */}
                {communityData?.rules && (
                  <div className="pt-4 border-t">
                    <h5 className="font-medium mb-2">Community Rules</h5>
                    <ul className="text-sm text-gray-600 space-y-2">
                      {communityData.rules.map((rule, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'courses':
        return (
          <div>
            {/* Community Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {communityData?.name} Courses
              </h1>
              <p className="text-gray-600">
                Expand your knowledge with our curated learning paths
              </p>
            </div>

            {/* Creator Actions */}
            {isCreator && (
              <div className="mb-8">
                <button
                  onClick={() => {
                    setSelectedCourse(null);
                    setShowCreateModal(true);
                  }}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg flex items-center hover:bg-purple-700 transition shadow-sm"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Course
                </button>
              </div>
            )}

            {/* Courses Grid */}
            {courses.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <BookOpen className="w-16 h-16 text-purple-200 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No courses available yet</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {isCreator 
                    ? "Start creating educational content for your community members by adding your first course."
                    : "Check back later for new learning opportunities from this community."}
                </p>
                {isCreator && (
                  <button
                    onClick={() => {
                      setSelectedCourse(null);
                      setShowCreateModal(true);
                    }}
                    className="mt-6 bg-purple-600 text-white px-6 py-2 rounded-lg inline-flex items-center hover:bg-purple-700 transition"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Course
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div key={course._id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition">
                    {/* Course Thumbnail */}
                    <div className="h-48 bg-purple-100 flex items-center justify-center">
                      {course.thumbnail ? (
                        <img 
                          src={course.thumbnail} 
                          alt={course.title} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookOpen className="w-16 h-16 text-purple-300" />
                      )}
                    </div>
                    
                    <div className="p-6">
                      {/* Course Header */}
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">{course.title}</h3>
                        
                        {/* Creator Actions */}
                        {isCreator && (
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCourse(course);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Edit Course"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCourse(course._id);
                              }}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Delete Course"
                            >
                              <Trash className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Course Description */}
                      <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                      
                      {/* Course Stats */}
                      <div className="flex items-center text-sm text-gray-500 mb-6 space-x-4">
                        <div className="flex items-center">
                          <BookOpen className="w-4 h-4 mr-1" />
                          <span>{course.sections?.length || 0} sections</span>
                        </div>
                        <div className="flex items-center">
                          <Play className="w-4 h-4 mr-1" />
                          <span>
                            {course.sections?.reduce((total, section) => total + (section.videos?.length || 0), 0) || 0} videos
                          </span>
                        </div>
                        {course.price > 0 ? (
                          <div className="ml-auto font-medium text-purple-600">${course.price}</div>
                        ) : (
                          <div className="ml-auto font-medium text-green-600">Free</div>
                        )}
                      </div>
                      
                      {/* Action Button */}
                      <button
                        onClick={() => handleViewCourse(course)}
                        className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center justify-center"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Learning
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'calendar':
        return (
          <div>
            {/* Calendar Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {communityData?.name} Livestreams
              </h1>
              <p className="text-gray-600">
                Join live sessions or watch recordings from the community
              </p>
            </div>

            {/* Creator Actions */}
            {isCreator && (
              <div className="mb-8">
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg flex items-center hover:bg-purple-700 transition shadow-sm"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Schedule New Livestream
                </button>
              </div>
            )}

            {/* Livestreams List */}
            {livestreams.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Calendar className="w-16 h-16 text-purple-200 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No livestreams scheduled</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {isCreator 
                    ? "Schedule your first livestream to engage with your community in real-time."
                    : "Check back later for upcoming livestreams from this community."}
                </p>
                {isCreator && (
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="mt-6 bg-purple-600 text-white px-6 py-2 rounded-lg inline-flex items-center hover:bg-purple-700 transition"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule First Livestream
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {livestreams.map((stream) => {
                  const isLive = new Date(stream.scheduledFor) <= new Date() && 
                                 new Date(stream.scheduledFor).getTime() + 3600000 > new Date().getTime();
                  const isPast = new Date(stream.scheduledFor).getTime() + 3600000 < new Date().getTime();
                  const isFuture = new Date(stream.scheduledFor) > new Date();
                  
                  return (
                    <div key={stream._id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition">
                      {/* Livestream Status Banner */}
                      {isLive && (
                        <div className="bg-red-600 text-white px-4 py-1 flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="h-2 w-2 bg-white rounded-full mr-2 animate-pulse"></span>
                            <span>LIVE NOW</span>
                          </div>
                          <span>{stream.viewerCount || 0} watching</span>
                        </div>
                      )}
                      {isPast && !stream.recording && (
                        <div className="bg-gray-600 text-white px-4 py-1">
                          <span>ENDED</span>
                        </div>
                      )}
                      {isPast && stream.recording && (
                        <div className="bg-blue-600 text-white px-4 py-1">
                          <span>RECORDING AVAILABLE</span>
                        </div>
                      )}
                      {isFuture && (
                        <div className="bg-green-600 text-white px-4 py-1">
                          <span>UPCOMING</span>
                        </div>
                      )}
                      
                      {/* Livestream Thumbnail */}
                      <div className="h-48 bg-purple-100 flex items-center justify-center relative">
                        <Video className="w-16 h-16 text-purple-300" />
                        {isLive && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                            <button 
                              onClick={() => joinLivestream(stream)}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-red-700"
                            >
                              <Eye className="w-5 h-5 mr-2" />
                              Join Stream
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-6">
                        {/* Livestream Header */}
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-xl font-semibold text-gray-900">{stream.title}</h3>
                          
                          {/* Creator Actions */}
                          {isCreator && (
                            <div className="flex space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteLivestream(stream._id);
                                }}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Delete Livestream"
                              >
                                <Trash className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Livestream Description */}
                        <p className="text-gray-600 mb-4 line-clamp-2">{stream.description}</p>
                        
                        {/* Livestream Details */}
                        <div className="flex items-center text-sm text-gray-500 mb-6">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>
                            {new Date(stream.scheduledFor).toLocaleString()}
                          </span>
                        </div>
                        
                        {/* Action Button */}
                        {isCreator && isLive && (
                          <button
                            onClick={() => startLivestream(stream)}
                            className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center"
                          >
                            <Video className="w-4 h-4 mr-2" />
                            Start Streaming
                          </button>
                        )}
                        {isCreator && isFuture && (
                          <button
                            disabled
                            className="w-full py-3 bg-gray-300 text-gray-700 rounded-lg flex items-center justify-center cursor-not-allowed"
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Scheduled
                          </button>
                        )}
                        {!isCreator && isLive && (
                          <button
                            onClick={() => joinLivestream(stream)}
                            className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Join Stream
                          </button>
                        )}
                        {!isCreator && isFuture && (
                          <button
                            disabled
                            className="w-full py-3 bg-gray-300 text-gray-700 rounded-lg flex items-center justify-center cursor-not-allowed"
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Upcoming
                          </button>
                        )}
                        {isPast && stream.recording && (
                          <button
                            onClick={() => navigate(`/community/${id}/recordings/${stream._id}`)}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Watch Recording
                          </button>
                        )}
                        {isPast && !stream.recording && (
                          <button
                            disabled
                            className="w-full py-3 bg-gray-300 text-gray-700 rounded-lg flex items-center justify-center cursor-not-allowed"
                          >
                            <Video className="w-4 h-4 mr-2" />
                            No Recording Available
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      case 'about':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-semibold mb-6">About This Community</h2>
            {communityData ? (
              <div className="space-y-6">
                {communityData.image_url && (
                  <img 
                    src={communityData.image_url} 
                    alt={communityData.name}
                    className="w-full max-h-64 object-cover rounded-lg"
                  />
                )}
                <h3 className="text-xl font-medium">{communityData.name}</h3>
                <p className="text-gray-700">{communityData.description}</p>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Community Details</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li><span className="font-medium">Created:</span> {new Date(communityData.created_at).toLocaleDateString()}</li>
                    <li><span className="font-medium">Members:</span> {communityData.member_count || 0}</li>
                    <li><span className="font-medium">Topics:</span> {topics.length || 0}</li>
                  </ul>
                </div>
                
                {communityData.rules && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Community Rules</h4>
                    <ul className="space-y-2 text-gray-600">
                      {communityData.rules.map((rule, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-600">Loading community information...</p>
            )}
          </div>
        );
      default:
        return null;
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
      {/* Secondary navigation - always visible */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            <button
              onClick={() => handleTabChange('community')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'community'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Community
            </button>
            <button
              onClick={() => handleTabChange('courses')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'courses'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Courses
            </button>
            <button
              onClick={() => handleTabChange('calendar')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'calendar'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => handleTabChange('members')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'members'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Members
            </button>
            <button
              onClick={() => handleTabChange('leaderboards')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'leaderboards'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Leaderboards
            </button>
            <button
              onClick={() => handleTabChange('about')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'about'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              About
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Toast */}
        {error && (
          <div className="fixed top-20 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-md z-50">
            {error}
          </div>
        )}
        
        {/* Render the appropriate tab content */}
        {renderTabContent()}
      </div>

      {/* Add modals for course functionality */}
      {showCreateModal && (
        <CreateCourseModal
          communityId={id}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedCourse(null);
          }}
          onCourseCreated={fetchCourses}
          editCourse={selectedCourse}
        />
      )}

      {viewingCourse && (
        <CourseViewer
          course={viewingCourse}
          onClose={() => setViewingCourse(null)}
        />
      )}

      {/* Add Schedule Livestream Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Schedule Livestream</h2>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleScheduleLivestream} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Livestream Title
                </label>
                <input
                  type="text"
                  value={newLivestream.title}
                  onChange={(e) => setNewLivestream({...newLivestream, title: e.target.value})}
                  placeholder="Enter a title for your livestream"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newLivestream.description}
                  onChange={(e) => setNewLivestream({...newLivestream, description: e.target.value})}
                  placeholder="What will you cover in this livestream?"
                  className="w-full p-2 border border-gray-300 rounded-lg h-24"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={newLivestream.scheduledFor}
                  onChange={(e) => setNewLivestream({...newLivestream, scheduledFor: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel Name (Optional)
                </label>
                <input
                  type="text"
                  value={newLivestream.channelName}
                  onChange={(e) => setNewLivestream({...newLivestream, channelName: e.target.value})}
                  placeholder="Leave blank to auto-generate"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  A unique identifier for your stream. If left blank, one will be generated for you.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  disabled={loading}
                >
                  {loading ? 'Scheduling...' : 'Schedule Livestream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityFeed; 