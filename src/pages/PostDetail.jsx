import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThumbsUp, MessageCircle, MoreHorizontal, ArrowLeft, Eye } from 'lucide-react';
import { discourseService } from '../services/discourseService';
import { AuthContext } from '../provider/AuthProvider';
import axios from 'axios';
import { serverbaseURL } from "../constant/index";

const PostDetail = () => {
  const { id, topicId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [topic, setTopic] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [communityData, setCommunityData] = useState(null);
  const [discourseMapping, setDiscourseMapping] = useState(null);
  const [error, setError] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('redirectAfterLogin', `/community/${id}/topic/${topicId}`);
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 1. Get community data
        const communityResponse = await axios.get(`${serverbaseURL}community/${id}`);
        setCommunityData(communityResponse.data);
        
        // 2. Get user's Discourse mapping
        const mappingResponse = await axios.get(`${serverbaseURL}discourse/user-mapping`, {
          params: { 
            userId: user.uid,
            communityId: id
          }
        });
        
        if (mappingResponse.data.success) {
          setDiscourseMapping(mappingResponse.data.mapping);
          
          // 3. Get topic details
          const topicData = await discourseService.getTopic(topicId);
          console.log('Topic data:', topicData);
          setTopic(topicData);
          
          // Set replies (excluding the first post)
          if (topicData.post_stream?.posts) {
            setReplies(topicData.post_stream.posts.slice(1));
          }
        } else {
          throw new Error('Failed to get Discourse user mapping');
        }
      } catch (error) {
        console.error('Error fetching topic details:', error);
        setError('Failed to load topic. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, topicId, user, navigate]);

  const handleReply = async () => {
    if (!newReply.trim() || !discourseMapping) return;

    try {
      let replyContent = newReply;
      
      // If replying to a specific post, format the reply with quote
      if (replyingTo) {
        const replyPost = [...replies, topic?.post_stream?.posts[0]].find(p => p.id === replyingTo.id);
        if (replyPost) {
          replyContent = `[quote="${replyingTo.username}, post:${replyingTo.id}, topic:${topicId}"]\n${replyingTo.excerpt || ''}\n[/quote]\n\n${newReply}`;
        }
      }
      
      await discourseService.createReply({
        topic_id: topicId,
        raw: replyContent,
        username: discourseMapping.discourseUsername // Use the mapped username
      });

      // Refresh the topic to show new reply
      const updatedTopic = await discourseService.getTopic(topicId);
      setTopic(updatedTopic);
      setReplies(updatedTopic.post_stream.posts.slice(1));
      setNewReply('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error creating reply:', error);
      setError('Failed to post reply. Please try again.');
    }
  };

  const handleLike = async (postId) => {
    if (!discourseMapping) return;

    try {
      await discourseService.performPostAction({
        id: postId,
        actionType: 'like',
        username: discourseMapping.discourseUsername // Use the mapped username
      });
      
      // Refresh the topic to update likes
      const updatedTopic = await discourseService.getTopic(topicId);
      setTopic(updatedTopic);
      setReplies(updatedTopic.post_stream.posts.slice(1));
    } catch (error) {
      console.error('Error liking post:', error);
      setError('Failed to like post. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate(`/community/${id}/feed`)}
            className="flex items-center space-x-2 text-gray-600 mb-6 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Feed</span>
          </button>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-red-500">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const firstPost = topic?.post_stream?.posts[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate(`/community/${id}/feed`)}
          className="flex items-center space-x-2 text-gray-600 mb-6 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Feed</span>
        </button>

        {/* Original Post */}
        {firstPost && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-start space-x-3">
              <img
                src={firstPost.avatar_template?.startsWith('http') 
                  ? firstPost.avatar_template 
                  : `https://ui-avatars.com/api/?name=${firstPost.username}&background=random`}
                alt=""
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{firstPost.username}</span>
                    <span className="text-gray-500 text-sm">
                      {new Date(firstPost.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <h1 className="text-xl font-semibold mt-2">{topic.title}</h1>
                <div 
                  className="mt-4 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: firstPost.cooked }}
                />
                <div className="flex items-center space-x-4 mt-4">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      handleLike(firstPost.id);
                    }}
                    className={`flex items-center space-x-1 ${
                      firstPost.user_liked ? 'text-purple-600' : 'text-gray-500'
                    }`}
                  >
                    <ThumbsUp className="w-5 h-5" />
                    <span>{firstPost.like_count || 0}</span>
                  </button>
                  <div className="flex items-center space-x-1 text-gray-500">
                    <MessageCircle className="w-5 h-5" />
                    <span>{topic.posts_count - 1}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-gray-500">
                    <Eye className="w-5 h-5" />
                    <span>{topic.views}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reply input */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <textarea
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            placeholder="Write a reply..."
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px]"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleReply}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Reply
            </button>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4">
          {replies.length > 0 ? (
            replies.map((reply) => (
              <div key={reply.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start space-x-3">
                  <img
                    src={reply.avatar_template?.startsWith('http') 
                      ? reply.avatar_template 
                      : `https://ui-avatars.com/api/?name=${reply.username}&background=random`}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{reply.username}</span>
                        <span className="text-gray-500 text-sm">
                          {new Date(reply.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div 
                      className="mt-2 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: reply.cooked }}
                    />
                    <div className="flex items-center space-x-4 mt-4">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          handleLike(reply.id);
                        }}
                        className={`flex items-center space-x-1 ${
                          reply.user_liked ? 'text-purple-600' : 'text-gray-500'
                        }`}
                      >
                        <ThumbsUp className="w-5 h-5" />
                        <span>{reply.like_count || 0}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
              No replies yet. Be the first to reply!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostDetail; 