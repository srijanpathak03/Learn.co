import { useState, useEffect } from 'react'
import { MessageSquare, ThumbsUp, Share2, MoreHorizontal } from 'lucide-react'
import { discourseService } from '../services/discourseService'

export default function PostCard({ post, index, onReplyClick }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadPostDetails = async () => {
      try {
        const postData = await discourseService.getPost(post.id)
        // Find the like action in actions_summary
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
    <div className="bg-white p-4 rounded-lg border">
      <div className="flex items-start gap-4">
        <img
          src={post.avatar_template?.replace("{size}", "40") || 
               `https://picsum.photos/seed/${post.id}-user/40/40`}
          alt={post.username}
          className="w-10 h-10 rounded-full"
        />
        <div className="flex-grow">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold">{post.username}</h3>
              <span className="text-sm text-gray-500">
                {new Date(post.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">#{index + 1}</span>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>
          
          <div 
            className={`prose max-w-none ${!isExpanded && 'line-clamp-3'}`}
            dangerouslySetInnerHTML={{ __html: post.cooked }}
          />
          
          {!isExpanded && post.cooked.length > 200 && (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-blue-600 text-sm hover:underline mt-2"
            >
              Read more
            </button>
          )}

          <div className="flex items-center gap-6 mt-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-sm ${
                isLiked ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ThumbsUp size={18} />
              <span>{likeCount}</span>
            </button>
            
            <button
              onClick={() => onReplyClick(post)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <MessageSquare size={18} />
              <span>Reply</span>
            </button>

            <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <Share2 size={18} />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 