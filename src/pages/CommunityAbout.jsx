import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, Tag, Lock } from 'lucide-react';
import axios from 'axios';
import { serverbaseURL } from "../constant/index";
import { motion } from 'framer-motion';

const defaultImage = 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png';

const CommunityAbout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommunity = async () => {
      try {
        const response = await axios.get(`${serverbaseURL}community/${id}`);
        setCommunity(response.data);
      } catch (error) {
        console.error('Error fetching community:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunity();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!community) {
    return <div>Community not found</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-50"
    >
      {/* Hero Section with Cover Image */}
      <div className="relative h-[300px] bg-gradient-to-r from-purple-600 to-blue-500">
        <div className="absolute inset-0">
          <img
            src={community.image_url || defaultImage}
            alt={community.name}
            className="w-full h-full object-cover opacity-40"
            onError={(e) => {
              e.target.src = defaultImage;
            }}
          />
          <div className="absolute inset-0 bg-black opacity-50"></div>
        </div>

        {/* Back Button */}
        <div className="absolute top-6 left-6">
          <button
            onClick={() => navigate('/forum')}
            className="flex items-center space-x-2 text-white bg-black/30 px-4 py-2 rounded-lg hover:bg-black/40 transition duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-xl overflow-hidden"
        >
          {/* Community Header */}
          <div className="p-6 sm:p-8 border-b">
            <div className="flex items-center space-x-4">
              <img
                src={community.image_url || defaultImage}
                alt={community.name}
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
                onError={(e) => {
                  e.target.src = defaultImage;
                }}
              />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{community.name}</h1>
                <div className="flex items-center space-x-2 mt-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">{community.members_count.toLocaleString()} Members</span>
                </div>
              </div>
            </div>
          </div>

          {/* Community Details */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Description */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">About</h2>
              <p className="text-gray-700 leading-relaxed">{community.description}</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Tag className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium text-gray-900">{community.category}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Access</p>
                  <p className="font-medium text-gray-900">
                    {community.price?.type === 'Free' 
                      ? 'Free Access' 
                      : `$${community.price?.amount}/month`}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium text-gray-900">
                    {new Date(community.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created by</p>
                  <p className="font-medium text-gray-900">{community.creator.email}</p>
                </div>
              </div>
            </div>

            {/* Join Button */}
            <div className="mt-8">
              <button
                onClick={() => navigate(`/community/${id}/feed`)}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-4 rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200"
              >
                Join Community
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CommunityAbout; 