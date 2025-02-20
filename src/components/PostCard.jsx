import { useState, useEffect } from 'react'
import { MessageSquare, ThumbsUp, Share2, MoreHorizontal } from 'lucide-react'
import { discourseService } from '../services/discourseService'

export default function PostCard({ post, index, onReplyClick }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Helper function to construct avatar URL
  const getAvatarUrl = (avatarTemplate) => {
    if (!avatarTemplate) return "https://picsum.photos/seed/discourse-icon/80/80";
    if (avatarTemplate.startsWith('http')) return avatarTemplate;
    return `/api${avatarTemplate.replace("{size}", "80")}`;
  };

  useEffect(() => {
    const loadPostDetails = async () => {
      try {
        const postData = await discourseService.getPost(post.id)
        const likeAction = postData.actions_summary?.find(action => action.id === 2)
        setLikeCount(likeAction?.count || 0)
        setIsLiked(likeAction?.acted || false)
      } catch (error) {
        console.error('Error loading post details:', error)
      }
    }
    loadPostDetails()
  }, [post.id])

  const handleLike = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      // Optimistically update UI
      const newIsLiked = !isLiked
      setIsLiked(newIsLiked)
      setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1)

      await discourseService.performPostAction({
        id: post.id,
        actionType: newIsLiked ? 'like' : 'unlike'
      })

      // Refresh post details to get accurate counts
      const postData = await discourseService.getPost(post.id)
      const likeAction = postData.actions_summary?.find(action => action.id === 2)
      setLikeCount(likeAction?.count || 0)
      setIsLiked(likeAction?.acted || false)
    } catch (error) {
      // Revert changes if the action fails
      console.error('Error performing post action:', error)
      setIsLiked(!isLiked)
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      {/* User info and avatar */}
      <div className="flex items-center gap-3 mb-4">
        <img
          src={getAvatarUrl(post.avatar_template)}
          alt={`${post.username}'s avatar`}
          className="w-10 h-10 rounded-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://picsum.photos/seed/discourse-icon/80/80";
          }}
        />
        <div>
          <h3 className="font-medium">{post.username}</h3>
          <span className="text-sm text-gray-500">
            {new Date(post.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Post content */}
      <div 
        className={`prose max-w-none ${!isExpanded ? 'line-clamp-3' : ''}`}
        dangerouslySetInnerHTML={{ __html: post.cooked }}
      />
      
      {/* Show more/less button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-blue-500 text-sm mt-2"
      >
        {isExpanded ? 'Show less' : 'Show more'}
      </button>

      {/* Action buttons */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t">
        <button
          onClick={handleLike}
          disabled={isLoading}
          className={`flex items-center gap-2 ${isLiked ? 'text-blue-500' : 'text-gray-500'}`}
        >
          <ThumbsUp size={18} />
          <span>{likeCount}</span>
        </button>
        <button
          onClick={() => onReplyClick(post)}
          className="flex items-center gap-2 text-gray-500"
        >
          <MessageSquare size={18} />
          <span>Reply</span>
        </button>
        <button className="flex items-center gap-2 text-gray-500">
          <Share2 size={18} />
          <span>Share</span>
        </button>
      </div>
    </div>
  )
} 