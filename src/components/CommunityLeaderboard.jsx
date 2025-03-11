import React, { useState, useEffect } from 'react';
import { discourseService } from '../services/discourseService';
import { Trophy, ThumbsUp, MessageCircle, Eye, Calendar, Clock } from 'lucide-react';

const CommunityLeaderboard = ({ communityData, getAvatarUrl }) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('monthly');
  const [sortBy, setSortBy] = useState('likes_received');
  const [badges, setBadges] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
    fetchBadges();
  }, [period, sortBy]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await discourseService.getLeaderboard(period, sortBy);
      
      if (data.directory_items) {
        setLeaderboardData(data.directory_items);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBadges = async () => {
    try {
      setLoadingBadges(true);
      const data = await discourseService.getAllBadges();
      
      if (data.badges) {
        setBadges(data.badges);
      }
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoadingBadges(false);
    }
  };

  const getAvatarUrlFallback = (avatarTemplate) => {
    if (!avatarTemplate) return `https://ui-avatars.com/api/?name=User&background=random`;
    
    if (avatarTemplate.startsWith('http')) {
      return avatarTemplate.replace('{size}', '90');
    } else {
      return `${communityData?.discourse_url}${avatarTemplate.replace('{size}', '90')}`;
    }
  };

  const getAvatarUrlSafe = getAvatarUrl || getAvatarUrlFallback;

  const getBadgeIconUrl = (badgeIconUrl) => {
    if (!badgeIconUrl) return null;
    
    if (badgeIconUrl.startsWith('http')) {
      return badgeIconUrl;
    } else {
      return `${communityData?.discourse_url}${badgeIconUrl}`;
    }
  };

  const renderMetricValue = (item) => {
    switch (sortBy) {
      case 'likes_received':
        return item.likes_received || 0;
      case 'likes_given':
        return item.likes_given || 0;
      case 'topic_count':
        return item.topic_count || 0;
      case 'post_count':
        return item.post_count || 0;
      case 'topics_entered':
        return item.topics_entered || 0;
      case 'posts_read':
        return item.posts_read || 0;
      case 'days_visited':
        return item.days_visited || 0;
      default:
        return 0;
    }
  };

  const renderMetricIcon = () => {
    switch (sortBy) {
      case 'likes_received':
      case 'likes_given':
        return <ThumbsUp className="w-5 h-5" />;
      case 'topic_count':
      case 'post_count':
        return <MessageCircle className="w-5 h-5" />;
      case 'topics_entered':
      case 'posts_read':
        return <Eye className="w-5 h-5" />;
      case 'days_visited':
        return <Calendar className="w-5 h-5" />;
      default:
        return <Trophy className="w-5 h-5" />;
    }
  };

  const getMetricLabel = () => {
    switch (sortBy) {
      case 'likes_received': return 'Likes Received';
      case 'likes_given': return 'Likes Given';
      case 'topic_count': return 'Topics Created';
      case 'post_count': return 'Posts Written';
      case 'topics_entered': return 'Topics Viewed';
      case 'posts_read': return 'Posts Read';
      case 'days_visited': return 'Days Active';
      default: return 'Score';
    }
  };

  if (loading && leaderboardData.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error && leaderboardData.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">Error: {error}</div>
        <button 
          onClick={fetchLeaderboard}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-2xl font-semibold mb-4 md:mb-0">Community Leaderboard</h2>
        
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="period" className="text-sm font-medium text-gray-700">Period:</label>
            <select
              id="period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="daily">Today</option>
              <option value="weekly">This Week</option>
              <option value="monthly">This Month</option>
              <option value="quarterly">This Quarter</option>
              <option value="yearly">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label htmlFor="sortBy" className="text-sm font-medium text-gray-700">Sort By:</label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="likes_received">Likes Received</option>
              <option value="likes_given">Likes Given</option>
              <option value="topic_count">Topics Created</option>
              <option value="post_count">Posts Written</option>
              <option value="topics_entered">Topics Viewed</option>
              <option value="posts_read">Posts Read</option>
              <option value="days_visited">Days Active</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Top 3 Users with Badges */}
      {leaderboardData.length > 0 && (
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-center items-end space-y-6 md:space-y-0 md:space-x-8">
            {/* Second Place */}
            {leaderboardData.length > 1 && (
              <div className="flex flex-col items-center">
                <div className="relative">
                  <img 
                    src={getAvatarUrlSafe(leaderboardData[1].user.avatar_template)} 
                    alt={leaderboardData[1].user.username}
                    className="w-20 h-20 rounded-full border-2 border-gray-300"
                  />
                  <div className="absolute -bottom-3 -right-3 bg-gray-300 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                </div>
                <h3 className="mt-4 font-medium">{leaderboardData[1].user.username}</h3>
                <div className="flex items-center mt-1 text-gray-600">
                  {renderMetricIcon()}
                  <span className="ml-1 font-semibold">{renderMetricValue(leaderboardData[1])}</span>
                </div>
              </div>
            )}
            
            {/* First Place */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                  <Trophy className="w-8 h-8 text-yellow-500" />
                </div>
                <img 
                  src={getAvatarUrlSafe(leaderboardData[0].user.avatar_template)} 
                  alt={leaderboardData[0].user.username}
                  className="w-24 h-24 rounded-full border-4 border-yellow-400"
                />
                <div className="absolute -bottom-3 -right-3 bg-yellow-400 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">
                  1
                </div>
              </div>
              <h3 className="mt-4 font-medium text-lg">{leaderboardData[0].user.username}</h3>
              <div className="flex items-center mt-1 text-gray-700">
                {renderMetricIcon()}
                <span className="ml-1 font-bold text-lg">{renderMetricValue(leaderboardData[0])}</span>
              </div>
            </div>
            
            {/* Third Place */}
            {leaderboardData.length > 2 && (
              <div className="flex flex-col items-center">
                <div className="relative">
                  <img 
                    src={getAvatarUrlSafe(leaderboardData[2].user.avatar_template)} 
                    alt={leaderboardData[2].user.username}
                    className="w-20 h-20 rounded-full border-2 border-amber-700"
                  />
                  <div className="absolute -bottom-3 -right-3 bg-amber-700 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                </div>
                <h3 className="mt-4 font-medium">{leaderboardData[2].user.username}</h3>
                <div className="flex items-center mt-1 text-gray-600">
                  {renderMetricIcon()}
                  <span className="ml-1 font-semibold">{renderMetricValue(leaderboardData[2])}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Full Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {getMetricLabel()}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Posts
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Topics
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Days Active
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leaderboardData.map((item, index) => (
              <tr key={item.user.id} className={index < 3 ? 'bg-gray-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {index === 0 && <Trophy className="w-5 h-5 text-yellow-500 mr-1" />}
                    <span className={`
                      ${index === 0 ? 'text-yellow-500 font-bold' : ''}
                      ${index === 1 ? 'text-gray-500 font-semibold' : ''}
                      ${index === 2 ? 'text-amber-700 font-semibold' : ''}
                    `}>
                      {index + 1}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <img 
                        className="h-10 w-10 rounded-full" 
                        src={getAvatarUrlSafe(item.user.avatar_template)} 
                        alt={item.user.username} 
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {item.user.name || item.user.username}
                      </div>
                      <div className="text-sm text-gray-500">
                        @{item.user.username}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {renderMetricIcon()}
                    <span className="ml-2 text-sm text-gray-900 font-medium">
                      {renderMetricValue(item)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.post_count || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.topic_count || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.days_visited || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Badges Section */}
      {badges.length > 0 && (
        <div className="mt-12">
          <h3 className="text-xl font-semibold mb-4">Community Badges</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {badges.slice(0, 8).map(badge => (
              <div key={badge.id} className="border rounded-lg p-3 flex items-center space-x-3">
                {badge.icon_url ? (
                  <img 
                    src={getBadgeIconUrl(badge.icon_url)} 
                    alt={badge.name}
                    className="w-10 h-10"
                  />
                ) : (
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-purple-600" />
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-sm">{badge.name}</h4>
                  <p className="text-xs text-gray-500">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          {badges.length > 8 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => window.open(`${communityData.discourse_url}/badges`, '_blank')}
                className="text-purple-600 hover:text-purple-800 text-sm font-medium"
              >
                View All Badges
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommunityLeaderboard; 