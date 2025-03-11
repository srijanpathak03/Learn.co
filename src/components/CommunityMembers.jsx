import React, { useState, useEffect } from 'react';
import { discourseService } from '../services/discourseService';
import { User, Mail, Calendar, MessageCircle, ThumbsUp } from 'lucide-react';

const CommunityMembers = ({ communityData, discourseMapping, getAvatarUrl }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberProfile, setMemberProfile] = useState(null);
  const [memberSummary, setMemberSummary] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [currentPage]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await discourseService.getMembers(currentPage);
      
      if (data.directory_items && data.directory_items.length > 0) {
        setMembers(prevMembers => 
          currentPage === 0 
            ? data.directory_items 
            : [...prevMembers, ...data.directory_items]
        );
        setHasMorePages(data.directory_items.length === 50); // Assuming 50 is the page size
      } else {
        setHasMorePages(false);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      setError('Failed to load community members');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMembers = () => {
    if (!loading && hasMorePages) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  };

  const viewMemberProfile = async (username) => {
    if (selectedMember === username && memberProfile) {
      // Toggle off if already selected
      setSelectedMember(null);
      setMemberProfile(null);
      setMemberSummary(null);
      return;
    }

    try {
      setLoadingProfile(true);
      setSelectedMember(username);
      
      // Fetch user profile and summary in parallel
      const [profile, summary] = await Promise.all([
        discourseService.getUserProfile(username),
        discourseService.getUserSummary(username)
      ]);
      
      setMemberProfile(profile);
      setMemberSummary(summary);
    } catch (error) {
      console.error('Error fetching member profile:', error);
      setError('Failed to load member profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Use a fallback function if getAvatarUrl is not provided as a prop
  const getAvatarUrlFallback = (avatarTemplate) => {
    if (!avatarTemplate) return `https://ui-avatars.com/api/?name=User&background=random`;
    
    if (avatarTemplate.startsWith('http')) {
      return avatarTemplate.replace('{size}', '90');
    } else {
      return `${communityData?.discourse_url}${avatarTemplate.replace('{size}', '90')}`;
    }
  };

  // Use the prop if available, otherwise use the fallback
  const getAvatarUrlSafe = getAvatarUrl || getAvatarUrlFallback;

  if (loading && members.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error && members.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">Error: {error}</div>
        <button 
          onClick={fetchMembers}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-semibold mb-6">Community Members</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map(item => {
          const user = item.user;
          const isSelected = selectedMember === user.username;
          
          return (
            <div 
              key={user.id}
              className={`border rounded-lg overflow-hidden transition-all duration-200 ${
                isSelected ? 'ring-2 ring-purple-500' : 'hover:shadow-md'
              }`}
            >
              <div 
                className="p-4 cursor-pointer"
                onClick={() => viewMemberProfile(user.username)}
              >
                <div className="flex items-center space-x-3">
                  <img 
                    src={getAvatarUrlSafe(user.avatar_template)} 
                    alt={user.username}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <h3 className="font-medium">{user.name || user.username}</h3>
                    <p className="text-sm text-gray-500">@{user.username}</p>
                  </div>
                </div>
                
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center space-x-1 text-gray-600">
                    <MessageCircle className="w-4 h-4" />
                    <span>{item.post_count || 0} posts</span>
                  </div>
                  <div className="flex items-center space-x-1 text-gray-600">
                    <ThumbsUp className="w-4 h-4" />
                    <span>{item.likes_received || 0} likes</span>
                  </div>
                </div>
              </div>
              
              {isSelected && (
                <div className="border-t p-4 bg-gray-50">
                  {loadingProfile ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                  ) : memberProfile ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Joined {new Date(memberProfile.user.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      {memberProfile.user.bio_excerpt && (
                        <p className="text-sm text-gray-700">{memberProfile.user.bio_excerpt}</p>
                      )}
                      
                      {memberSummary && (
                        <div className="pt-2 border-t">
                          <h4 className="font-medium text-sm mb-2">Activity Summary</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Topics:</span>
                              <span className="font-medium">{memberSummary.user_summary.topic_count}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Posts:</span>
                              <span className="font-medium">{memberSummary.user_summary.post_count}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Likes Given:</span>
                              <span className="font-medium">{memberSummary.user_summary.likes_given}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Likes Received:</span>
                              <span className="font-medium">{memberSummary.user_summary.likes_received}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <button
                        onClick={() => window.open(`${communityData.discourse_url}/u/${user.username}`, '_blank')}
                        className="w-full mt-2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                      >
                        View Full Profile
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-gray-500">
                      Failed to load profile
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {hasMorePages && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMoreMembers}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More Members'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CommunityMembers; 