import React, { useState, useEffect, useContext } from 'react';
import { Search, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { serverbaseURL } from "../constant/index";
import { AuthContext } from "../provider/AuthProvider";

const defaultImage = 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'; // Add a default image path

const Forum = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const response = await axios.get(`${serverbaseURL}get-communities`);
        setCommunities(response.data);
      } catch (error) {
        console.error('Error fetching communities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunities();
  }, []);

  const filteredCommunities = communities.filter(community =>
    community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    community.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCommunityClick = (communityId) => {
    if (!user) {
      // Store the intended destination
      localStorage.setItem('redirectAfterLogin', `/community/${communityId}`);
      navigate('/login');
      return;
    }
    
    navigate(`/community/${communityId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          Loading communities...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex flex-col items-center w-full">
            <h1 className="text-5xl font-bold text-[#805af5]">Discover communities</h1>
            <span className="text-lg text-gray-600">
              or <a href="/create-community" className="text-blue-500">create your own</a>
            </span>
          </div>
          <button 
            onClick={() => navigate('/create-community')} 
            className="flex items-center gap-2 bg-gradient-to-r from-[#805af5] to-[#cd99ff] text-white px-4 py-2 rounded-lg hover:shadow-lg transition duration-200 absolute right-4"
          >
            <Plus className="w-5 h-5" />
            <span>Host Community</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto mb-8">
          <input
            type="text"
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
        </div>

        {/* Communities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCommunities.map((community, index) => (
            <motion.div
              key={community._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              onClick={() => handleCommunityClick(community._id)}
              className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer"
            >
              {/* Community Image */}
              <div className="relative w-full h-48">
                <span className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  #{index + 1}
                </span>
                <img
                  src={community.image || defaultImage}
                  alt={community.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = defaultImage;
                  }}
                />
              </div>

              {/* Community Info */}
              <div className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={community.image || defaultImage}
                    alt=""
                    className="w-10 h-10 rounded-full"
                    onError={(e) => {
                      e.target.src = defaultImage;
                    }}
                  />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {community.name}
                  </h3>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {community.description}
                </p>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {community.members_count.toLocaleString()} Members
                  </div>
                  <div className="text-sm font-semibold">
                    {community.price?.type === 'Free' 
                      ? 'Free' 
                      : `$${community.price?.amount}/month`}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Forum;