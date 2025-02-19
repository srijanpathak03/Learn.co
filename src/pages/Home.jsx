"use client"

import { Search } from "lucide-react"
import { useState } from "react"

export default function Home({ onCommunitySelect }) {
  const [selectedCategory, setSelectedCategory] = useState("All")

  const categories = [
    { name: "All", icon: "" },
    { name: "Hobbies", icon: "🎨" },
    { name: "Music", icon: "🎵" },
    { name: "Money", icon: "💰" },
    { name: "Spirituality", icon: "🙏" },
    { name: "Tech", icon: "💻" },
    { name: "Health", icon: "🌟" },
    { name: "Sports", icon: "⚽" },
    { name: "Self-improvement", icon: "📚" },
  ]

  const communities = [
    {
      id: 1,
      name: "Brotherhood Of Scent",
      image: "https://picsum.photos/seed/bos/800/400",
      icon: "https://picsum.photos/seed/bos-icon/80/80",
      description:
        "#1 Fragrance Community 🏆 Our mission is to help YOU leverage the power of scent to become the man you know yourself to be",
      members: "5.2k",
      pricing: "Free",
    },
    {
      id: 2,
      name: "The Lady Change",
      image: "https://picsum.photos/seed/tlc/800/400",
      icon: "https://picsum.photos/seed/tlc-icon/80/80",
      description:
        "THE #1 community for menopausal (peri & post) women to come together, lose weight, get healthier and regain their confidence",
      members: "1.3k",
      pricing: "$49/month",
    },
    {
      id: 3,
      name: "Calligraphy Skool",
      image: "https://picsum.photos/seed/calli/800/400",
      icon: "https://picsum.photos/seed/calli-icon/80/80",
      description: "The #1 Community for Modern Calligraphy ✍️ It's fun, easy, relaxing, and rewarding 🎨",
      members: "1.1k",
      pricing: "$9/month",
    },
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
          {/* Hero Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Discover communities</h1>
            <p className="text-gray-600">
              or{" "}
              <a href="#" className="text-blue-500 hover:underline">
                create your own
              </a>
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto mb-8">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for anything"
              className="w-full h-12 pl-12 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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

          {/* Communities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communities.map((community) => (
              <div
                key={community.id}
                onClick={() => onCommunitySelect(community)}
                className="bg-white rounded-lg overflow-hidden border hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={community.image || "/placeholder.svg"}
                    alt={community.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-sm">
                    #{community.id}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={community.icon || "/placeholder.svg"}
                      alt={`${community.name} icon`}
                      className="w-10 h-10 rounded-lg"
                    />
                    <h3 className="font-semibold">{community.name}</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{community.description}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{community.members} Members</span>
                    <span>{community.pricing}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

