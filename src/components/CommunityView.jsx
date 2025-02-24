import { useState, useEffect } from 'react'
import { discourseService } from '../services/discourseService'
import PostCard from './PostCard'
import PostModal from './PostModal'

// Default image URL - you can replace this with your preferred default image
const DEFAULT_IMAGE = 'https://placehold.co/600x400/25AAE2/FFFFFF?text=Community'

export default function CommunityView({ community, onBack }) {
  const [activeTab, setActiveTab] = useState("Community")
  const [topicData, setTopicData] = useState(null)
  const [loadingTopic, setLoadingTopic] = useState(true)
  const [newPost, setNewPost] = useState("")
  const [replyingTo, setReplyingTo] = useState(null)
  const [selectedPost, setSelectedPost] = useState(null)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)

  useEffect(() => {
    loadTopicDetails()
  }, [community.id])

  const loadTopicDetails = async () => {
    setLoadingTopic(true)
    try {
      const data = await discourseService.getTopic(community.id)
      setTopicData(data)
    } catch (error) {
      console.error('Error loading topic details:', error)
    } finally {
      setLoadingTopic(false)
    }
  }

  const handleCreatePost = async (e) => {
    e.preventDefault()
    if (!newPost.trim()) return

    try {
      await discourseService.createReply({
        topic_id: community.id,
        raw: newPost
      })
      setNewPost('')
      await loadTopicDetails()
    } catch (error) {
      console.error('Error creating post:', error)
    }
  }

  const handleReplyClick = (post) => {
    setReplyingTo(post)
    setNewPost(`@${post.username} `)
    // Scroll the textarea into view
    document.querySelector('textarea').scrollIntoView({ behavior: 'smooth' })
  }

  // Helper function to get image URL
  const getCommunityImage = (category) => {
    // Try to get the uploaded background or logo
    return category.uploaded_background 
      || category.uploaded_logo 
      || category.uploaded_logo_dark 
      || category.uploaded_background_dark 
      || DEFAULT_IMAGE
  }

  if (loadingTopic) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="text-center py-12">Loading topic details...</div>
      </div>
    )
  }

  if (!topicData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="text-center py-12">Error loading topic details</div>
      </div>
    )
  }

  const posts = topicData.post_stream?.posts || []
  
  const stats = {
    Posts: posts.length,
    Views: topicData.views || 0,
    Replies: topicData.reply_count || 0
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="text-blue-600 hover:underline flex items-center gap-2"
          >
            ← Back to Communities
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border">
            {/* Community Header */}
            <div className="relative h-48 md:h-64 w-full overflow-hidden">
              <img
                src={getCommunityImage(community)}
                alt={community.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null; // Prevent infinite loop
                  e.target.src = DEFAULT_IMAGE;
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-40"></div>
              <div className="absolute bottom-0 left-0 p-6 text-white">
                <h1 className="text-3xl font-bold">{community.name}</h1>
                <p className="mt-2">{community.description_text}</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b">
              <div className="flex gap-6 px-6">
                {["Community", "Classroom", "Calendar", "Members", "Leaderboards", "About"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-2 font-medium relative ${
                      activeTab === tab
                        ? "text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6">
              <div className="grid grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="col-span-2">
                  {activeTab === "Community" && (
                    <>
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          {replyingTo && (
                            <>
                              <span className="text-sm text-gray-600">
                                Replying to @{replyingTo.username}
                              </span>
                              <button
                                onClick={() => {
                                  setReplyingTo(null)
                                  setNewPost('')
                                }}
                                className="text-sm text-gray-500 hover:text-gray-700"
                              >
                                × Cancel
                              </button>
                            </>
                          )}
                        </div>
                        <textarea
                          value={newPost}
                          onChange={(e) => setNewPost(e.target.value)}
                          placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : "Start a discussion..."}
                          className="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows="3"
                        />
                        <button
                          onClick={handleCreatePost}
                          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          {replyingTo ? 'Reply' : 'Post'}
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {topicData?.post_stream?.posts?.map((post, index) => (
                            <div
                              key={post.id}
                              onClick={() => {
                                setSelectedPost({
                                  ...post,
                                  topic_id: topicData.id,
                                  title: topicData.title
                                })
                                setIsPostModalOpen(true)
                              }}
                              className="bg-white rounded-lg overflow-hidden border hover:shadow-lg transition-shadow cursor-pointer"
                            >
                              <PostCard
                                post={post}
                                index={index}
                                onReplyClick={handleReplyClick}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Stats */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      {Object.entries(stats).map(([label, value]) => (
                        <div key={label}>
                          <div className="font-bold text-xl">{value}</div>
                          <div className="text-sm text-gray-600">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add PostModal at the end of the component */}
      <PostModal
        post={selectedPost}
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
      />
    </div>
  )
} 