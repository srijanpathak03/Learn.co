"use client"

import { Search } from "lucide-react"
import { useState, useEffect } from "react"
import { discourseService } from "../services/discourseService"
import CreateCommunityModal from '../components/CreateCommunityModal'

export default function Home({ onCommunitySelect }) {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [communities, setCommunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    loadCommunities()
  }, [])

  // Helper function to construct avatar URL
  const getAvatarUrl = (avatarTemplate) => {
    if (!avatarTemplate) return "https://picsum.photos/seed/discourse-icon/80/80";
    
    // If the avatar path starts with 'http', it's already a full URL
    if (avatarTemplate.startsWith('http')) return avatarTemplate;
    
    // Handle letter avatars and regular avatars
    // The avatarTemplate will be like "/letter_avatar_proxy/v4/letter/s/ea5d25/{size}.png"
    // or "/user_avatar/forum.local/username/{size}/ID.png"
    return `/api${avatarTemplate.replace("{size}", "80")}`;
  };

  const loadCommunities = async () => {
    try {
      const data = await discourseService.getCategories()
      const generalCategory = data.category_list.categories.find(
        category => category.name === "General"
      )

      if (generalCategory) {
        const formattedCommunities = generalCategory.topics.map(topic => ({
          id: topic.id,
          name: topic.title,
          image: topic.image_url || `https://placehold.co/600x400/${topic.color || '25AAE2'}/FFFFFF?text=${encodeURIComponent(topic.title)}`,
          // Use the helper function for avatar URL
          icon: getAvatarUrl(topic.posters?.[0]?.user?.avatar_template),
          description: topic.excerpt || "No description available",
          members: `${topic.posts_count} posts`,
          pricing: "Free",
          discourse_data: topic
        }))
        setCommunities(formattedCommunities)
      }
    } catch (error) {
      console.error("Error loading communities:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCommunity = async (formData) => {
    try {
      await discourseService.createCommunity(formData)
      // Reload communities after creating a new one
      loadCommunities()
    } catch (error) {
      console.error('Error creating community:', error)
      // You might want to add proper error handling/notification here
    }
  }

  const categories = [
    { name: "All", icon: "" },
    { name: "Latest", icon: "🕒" },
    { name: "Top", icon: "🏆" },
    { name: "Unread", icon: "📬" },
  ]

  const debounce = (func, wait) => {
    let timeout
    return (...args) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func.apply(this, args), wait)
    }
  }

  const handleSearch = async (query) => {
    if (!query.trim()) {
      loadCommunities()
      return
    }

    setIsSearching(true)
    try {
      const searchResults = await discourseService.search(query)
      
      const formattedResults = searchResults.topics.map(topic => ({
        id: topic.id,
        name: topic.title,
        image: topic.image_url || `https://placehold.co/600x400/${topic.color || '25AAE2'}/FFFFFF?text=${encodeURIComponent(topic.title)}`,
        // Use the helper function for avatar URL
        icon: getAvatarUrl(topic.posters?.[0]?.user?.avatar_template),
        description: topic.excerpt || "No description available",
        members: `${topic.posts_count} posts`,
        pricing: "Free",
        discourse_data: topic
      }))

      setCommunities(formattedResults)
    } catch (error) {
      console.error("Error searching communities:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const debouncedSearch = debounce(handleSearch, 300)

  const handleSearchInput = (e) => {
    const query = e.target.value
    setSearchQuery(query)
    debouncedSearch(query)
  }

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
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Community
            </button>
            <button className="px-6 py-2 border rounded-lg hover:bg-gray-50">
              LOG IN
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Auto Movie Creator Community</h1>
            <p className="text-gray-600">
              Join discussions and share your experience
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto mb-8">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchInput}
              placeholder="Search discussions"
              className="w-full h-12 pl-12 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {isSearching && (
              <div className="absolute right-4 top-3.5">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
                  ${
                    selectedCategory === category.name
                      ? "bg-gray-800 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100"
                  }`}
              >
                {category.icon} {category.name}
              </button>
            ))}
          </div>

          {/* Topics Grid */}
          {loading ? (
            <div className="text-center py-12">Loading discussions...</div>
          ) : communities.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? "No results found" : "No discussions available"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {communities.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => onCommunitySelect(topic)}
                  className="bg-white rounded-lg overflow-hidden border hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="aspect-video relative">
                    <img
                      src={topic.image_url || `https://placehold.co/600x400/${topic.discourse_data?.color || '25AAE2'}/FFFFFF?text=${encodeURIComponent(topic.name)}`}
                      alt={topic.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://placehold.co/600x400/${topic.discourse_data?.color || '25AAE2'}/FFFFFF?text=${encodeURIComponent(topic.name)}`;
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src={topic.icon}
                        alt={`${topic.name} avatar`}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://picsum.photos/seed/discourse-icon/80/80";
                        }}
                      />
                      <h3 className="font-semibold text-lg">{topic.name}</h3>
                    </div>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {topic.description}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{topic.members}</span>
                      <span>
                        {new Date(topic.discourse_data.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Community Modal */}
      <CreateCommunityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCommunity}
      />
    </div>
  )
}

