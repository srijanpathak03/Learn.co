import { useState, useEffect } from "react"
import { discourseService } from "../services/discourseService"

export default function CommunityDetails({ community }) {
  const [activeTab, setActiveTab] = useState("Community")
  const [topics, setTopics] = useState([])
  const [newPost, setNewPost] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeTab === "Community") {
      loadTopics()
    }
  }, [activeTab])

  const loadTopics = async () => {
    setLoading(true)
    try {
      const data = await discourseService.getLatestTopics()
      setTopics(data.topic_list.topics)
    } catch (error) {
      console.error("Error loading topics:", error)
    }
    setLoading(false)
  }

  const handleCreatePost = async () => {
    if (!newPost.trim()) return

    try {
      await discourseService.createTopic(
        `New post in ${community.name}`,
        newPost,
        community.category_id
      )
      setNewPost("")
      loadTopics()
    } catch (error) {
      console.error("Error creating post:", error)
    }
  }

  const stats = {
    Members: "5.2k",
    Online: "29",
    Admins: "8"
  }

  const links = [
    "Watch Lover Community",
    "RealMenRealStyle Community",
    "Mission Fragrances"
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <span className="text-2xl font-bold">
              Auto<span className="text-blue-500">Movie</span><span className="text-orange-500">Creator</span>
            </span>
          </a>
          {/* <button className="px-6 py-2 border rounded-lg hover:bg-gray-50">LOG IN</button> */}
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border">
            {/* Community Header */}
            <div className="relative">
              <img
                src={community?.image || "/placeholder.svg"}
                alt="Community cover"
                className="w-full h-64 object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                <div className="flex items-center gap-4">
                  <img
                    src={community?.icon || "/placeholder.svg"}
                    alt="Community icon"
                    className="w-16 h-16 rounded-lg border-2 border-white"
                  />
                  <div className="text-white">
                    <h1 className="text-2xl font-bold">{community?.name}</h1>
                    <p className="text-sm opacity-90">{community?.description}</p>
                  </div>
                </div>
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
                        <textarea
                          value={newPost}
                          onChange={(e) => setNewPost(e.target.value)}
                          placeholder="Start a discussion..."
                          className="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows="3"
                        />
                        <button
                          onClick={handleCreatePost}
                          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Post
                        </button>
                      </div>

                      {loading ? (
                        <div className="text-center py-4">Loading...</div>
                      ) : (
                        <div className="space-y-4">
                          {topics.map((topic) => (
                            <div key={topic.id} className="bg-white p-4 rounded-lg border">
                              <h3 className="font-semibold mb-2">{topic.title}</h3>
                              <div className="flex justify-between text-sm text-gray-500">
                                <span>{topic.reply_count} replies</span>
                                <span>{new Date(topic.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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

                  {/* Related Links */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Related Links</h3>
                    <ul className="space-y-2">
                      {links.map((link) => (
                        <li key={link}>
                          <a href="#" className="text-blue-600 hover:underline text-sm">
                            {link}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                    JOIN GROUP
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 