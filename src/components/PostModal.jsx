import { useState, useEffect } from 'react'
import { X, ThumbsUp, MessageSquare, Share2 } from 'lucide-react'
import { discourseService } from '../services/discourseService'

export default function PostModal({ post, isOpen, onClose }) {
  const [postDetails, setPostDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newReply, setNewReply] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)

  useEffect(() => {
    if (isOpen && post?.topic_id) {
      loadPostDetails()
    }
  }, [isOpen, post])

  const loadPostDetails = async () => {
    try {
      const data = await discourseService.getTopic(post.topic_id)
      setPostDetails(data)
    } catch (error) {
      console.error('Error loading post details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async () => {
    if (!newReply.trim()) return

    try {
      await discourseService.createReply({
        topic_id: post.topic_id,
        raw: newReply,
      })
      setNewReply('')
      setReplyingTo(null)
      loadPostDetails()
    } catch (error) {
      console.error('Error creating reply:', error)
    }
  }

  if (!isOpen || !post) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img
              src={post.avatar_template?.replace("{size}", "80")}
              alt="Avatar"
              className="w-10 h-10 rounded-full"
              onError={(e) => {
                e.target.onerror = null
                e.target.src = "https://picsum.photos/seed/discourse-icon/80/80"
              }}
            />
            <div>
              <h3 className="font-medium">{post.username}</h3>
              <span className="text-sm text-gray-500">
                {new Date(post.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : postDetails ? (
          <div className="p-6">
            {/* Post Content */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">{postDetails.title || post.title}</h2>
              <div className="prose max-w-none mb-4" 
                dangerouslySetInnerHTML={{ __html: post.cooked }} 
              />
              <div className="flex items-center gap-6 text-gray-500 border-b pb-4">
                <button className="flex items-center gap-2">
                  <ThumbsUp size={18} />
                  <span>{post.like_count || 0}</span>
                </button>
                <button className="flex items-center gap-2">
                  <MessageSquare size={18} />
                  <span>{postDetails.posts_count - 1} replies</span>
                </button>
                <button className="flex items-center gap-2">
                  <Share2 size={18} />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Comments Section */}
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-700">Comments</h3>
              {postDetails.post_stream.posts
                .filter(reply => reply.id !== post.id)
                .map((reply) => (
                  <div key={reply.id} className="pl-4 border-l-2 border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src={reply.avatar_template?.replace("{size}", "80")}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = "https://picsum.photos/seed/discourse-icon/80/80"
                        }}
                      />
                      <div>
                        <h4 className="font-medium text-sm">{reply.username}</h4>
                        <span className="text-xs text-gray-500">
                          {new Date(reply.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-11">
                      <div className="prose prose-sm max-w-none mb-2" 
                        dangerouslySetInnerHTML={{ __html: reply.cooked }} 
                      />
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <button className="flex items-center gap-1">
                          <ThumbsUp size={14} />
                          <span>{reply.like_count || 0}</span>
                        </button>
                        <button 
                          onClick={() => {
                            setReplyingTo(reply)
                            setNewReply(`@${reply.username} `)
                          }}
                          className="flex items-center gap-1"
                        >
                          <MessageSquare size={14} />
                          <span>Reply</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Reply Input */}
            <div className="sticky bottom-0 bg-white border-t mt-8 pt-4">
              {replyingTo && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-600">
                    Replying to @{replyingTo.username}
                  </span>
                  <button
                    onClick={() => {
                      setReplyingTo(null)
                      setNewReply('')
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    × Cancel
                  </button>
                </div>
              )}
              <div className="flex gap-4">
                <textarea
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                />
                <button
                  onClick={handleReply}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 h-fit"
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">No data available</div>
        )}
      </div>
    </div>
  )
} 