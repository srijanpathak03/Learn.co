import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThumbsUp, MessageCircle, MoreHorizontal, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { serverbaseURL } from "../constant/index";
// import { AuthContext } from '../provider/AuthProvider';

const PostDetail = () => {
  const { id, topicId } = useParams();
  const navigate = useNavigate();
  const user = { displayName: "Test User", photoURL: "https://ui-avatars.com/api/?name=Test+User&background=random" };
  const [topic, setTopic] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [communityData, setCommunityData] = useState(null);

  useEffect(() => {
    const fetchTopicDetails = async () => {
      try {
        const communityResponse = await axios.get(`${serverbaseURL}community/${id}`);
        const discourseUrl = communityResponse.data.discourse_url;
        setCommunityData(communityResponse.data);
        
        const [topicResponse, repliesResponse] = await Promise.all([
          axios.get(`${discourseUrl}/t/${topicId}.json`),
          axios.get(`${discourseUrl}/t/${topicId}/posts.json`)
        ]);

        setTopic(topicResponse.data);
        setReplies(repliesResponse.data.post_stream.posts.slice(1)); // Exclude first post (original post)
      } catch (error) {
        console.error('Error fetching topic details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopicDetails();
  }, [id, topicId]);

  const handleReply = async () => {
    // Implement reply functionality
  };

  const getAvatarUrl = (avatarTemplate) => {
    if (!avatarTemplate) return `https://ui-avatars.com/api/?name=User&background=random`;
    
    if (avatarTemplate.startsWith('http')) {
      return avatarTemplate.replace('{size}', '90');
    } else {
      return `${communityData?.discourse_url}${avatarTemplate.replace('{size}', '90')}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(`/community/${id}/feed`)}
          className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 mb-6 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
          <span>Back to Community</span>
        </button>

        {/* Original Post */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="flex items-start space-x-3">
            <img
              src={getAvatarUrl(topic?.post_stream?.posts[0]?.avatar_template)}
              alt=""
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{topic?.post_stream?.posts[0]?.username}</span>
                  <span className="text-gray-500 text-sm">
                    {new Date(topic?.post_stream?.posts[0]?.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <h1 className="text-xl font-semibold mt-2">{topic?.title}</h1>
              <div className="mt-3 prose prose-sm max-w-none"
                   dangerouslySetInnerHTML={{ __html: topic?.post_stream?.posts[0]?.cooked }}
              />
              <div className="flex items-center space-x-4 mt-4 pt-4 border-t">
                <button className="flex items-center space-x-1 text-gray-500 hover:text-purple-600">
                  <ThumbsUp className="w-5 h-5" />
                  <span>{topic?.like_count || 0}</span>
                </button>
                <button className="flex items-center space-x-1 text-gray-500 hover:text-purple-600">
                  <MessageCircle className="w-5 h-5" />
                  <span>{topic?.posts_count - 1 || 0} replies</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reply Input */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-start space-x-3">
            <img
              src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=random`}
              alt=""
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1">
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
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4">
          {replies.map((reply) => (
            <div key={reply.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start space-x-3">
                <img
                  src={getAvatarUrl(reply.avatar_template)}
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
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="mt-2 prose prose-sm max-w-none"
                       dangerouslySetInnerHTML={{ __html: reply.cooked }}
                  />
                  <div className="flex items-center space-x-4 mt-4">
                    <button className="flex items-center space-x-1 text-gray-500 hover:text-purple-600">
                      <ThumbsUp className="w-5 h-5" />
                      <span>{reply.like_count || 0}</span>
                    </button>
                    <button className="text-gray-500 hover:text-purple-600">
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PostDetail; 