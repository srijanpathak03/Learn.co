import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { serverbaseURL } from "../constant/index";
import { AuthContext } from '../provider/AuthProvider';

const CommunityAboutPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('about');
  const [communityData, setCommunityData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommunityData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${serverbaseURL}community/${id}`);
        setCommunityData(response.data);
      } catch (error) {
        console.error('Error fetching community data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Secondary Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => navigate(`/community/${id}`)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'community'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Community
            </button>
            <button
              onClick={() => navigate(`/community/${id}/courses`)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'courses'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Courses
            </button>
            <button
              onClick={() => navigate(`/community/${id}/calendar`)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'calendar'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => navigate(`/community/${id}/members`)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Members
            </button>
            <button
              onClick={() => navigate(`/community/${id}/leaderboards`)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'leaderboards'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Leaderboards
            </button>
            <button
              onClick={() => navigate(`/community/${id}/about`)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'about'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              About
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Community Header */}
          <div className="flex items-center space-x-4 mb-8">
            {communityData?.image_url && (
              <img
                src={communityData.image_url}
                alt={communityData.name}
                className="w-24 h-24 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold">{communityData?.name}</h1>
              <p className="text-gray-600">Created {new Date(communityData?.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Community Stats */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-purple-50 rounded-lg p-6">
              <div className="text-3xl font-bold text-purple-600">{communityData?.member_count || 0}</div>
              <div className="text-gray-600">Members</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="text-3xl font-bold text-blue-600">{communityData?.post_count || 0}</div>
              <div className="text-gray-600">Posts</div>
            </div>
            <div className="bg-green-50 rounded-lg p-6">
              <div className="text-3xl font-bold text-green-600">{communityData?.course_count || 0}</div>
              <div className="text-gray-600">Courses</div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">About This Community</h2>
            <p className="text-gray-600 whitespace-pre-wrap">{communityData?.description}</p>
          </div>

          {/* Rules */}
          {communityData?.rules && communityData.rules.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Community Rules</h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <ol className="list-decimal list-inside space-y-3">
                  {communityData.rules.map((rule, index) => (
                    <li key={index} className="text-gray-700">{rule}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* Moderators */}
          {communityData?.moderators && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Moderators</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {communityData.moderators.map((mod) => (
                  <div key={mod.id} className="flex items-center space-x-3 bg-gray-50 rounded-lg p-4">
                    <img
                      src={mod.photoURL || `https://ui-avatars.com/api/?name=${mod.name}&background=random`}
                      alt={mod.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <div className="font-medium">{mod.name}</div>
                      <div className="text-sm text-gray-500">Moderator</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityAboutPage;