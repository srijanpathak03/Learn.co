const API_KEY = import.meta.env.VITE_DISCOURSE_API_KEY;
const API_USERNAME = import.meta.env.VITE_DISCOURSE_USERNAME;

const headers = {
  'Api-Key': API_KEY,
  'Api-Username': API_USERNAME,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Simple rate limiter
const queue = [];
let processing = false;

const processQueue = async () => {
  if (processing || queue.length === 0) return;
  processing = true;
  
  while (queue.length > 0) {
    const { fn, resolve, reject } = queue.shift();
    try {
      const result = await fn();
      resolve(result);
      // Wait 100ms between requests
      await new Promise(r => setTimeout(r, 100));
    } catch (error) {
      reject(error);
    }
  }
  
  processing = false;
};

const enqueueRequest = (fn) => {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    processQueue();
  });
};

// Add a simple cache system
const cache = {
  topics: new Map(),
  categories: null,
  posts: new Map(),
  categoryTopics: new Map(),
  expiryTime: 5 * 60 * 1000, // 5 minutes cache expiry
  users: new Map(),
  members: new Map(),
  leaderboard: new Map(),
  badges: new Map(),
  
  get(type, key) {
    if (type === 'categories' && this.categories) {
      if (Date.now() - this.categories.timestamp < this.expiryTime) {
        return this.categories.data;
      }
    } else if (key) {
      const cached = this[type].get(key);
      if (cached && (Date.now() - cached.timestamp < this.expiryTime)) {
        return cached.data;
      }
    }
    return null;
  },
  
  set(type, data, key) {
    const cacheItem = { data, timestamp: Date.now() };
    if (type === 'categories') {
      this.categories = cacheItem;
    } else if (key) {
      this[type].set(key, cacheItem);
    }
    return data;
  }
};

export const discourseService = {
  // Get all categories and latest topics
  getLatestTopics: async () => {
    // Check cache first
    const cachedData = cache.get('topics', 'latest');
    if (cachedData) return cachedData;
    
    return enqueueRequest(async () => {
      const [categoriesResponse, latestResponse] = await Promise.all([
        fetch('/api/categories.json', { headers }),
        fetch('/api/latest.json', { headers })
      ]);

      if (!categoriesResponse.ok || !latestResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const [categories, latest] = await Promise.all([
        categoriesResponse.json(),
        latestResponse.json()
      ]);

      // Map topics with their categories
      const topicsWithDetails = latest.topic_list.topics.map(topic => ({
        ...topic,
        category: categories.category_list.categories.find(c => c.id === topic.category_id)
      }));

      // Cache the result before returning
      return cache.set('topics', {
        categories: categories.category_list.categories,
        topics: topicsWithDetails
      }, 'latest');
    });
  },

  // Get single topic with details - optimized to include posts
  getTopic: async (topicId) => {
    // Check cache first
    const cachedTopic = cache.get('topics', topicId);
    if (cachedTopic) return cachedTopic;
    
    return enqueueRequest(async () => {
      // Use the include_raw=true parameter to get post content
      // and include_suggested=true to get suggested topics in one request
      const response = await fetch(`/api/t/${topicId}.json?include_raw=true&include_suggested=true`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache individual posts from the topic to avoid fetching them separately
      if (data.post_stream && data.post_stream.posts) {
        data.post_stream.posts.forEach(post => {
          cache.set('posts', post, post.id);
        });
      }
      
      // Cache the topic data
      return cache.set('topics', data, topicId);
    });
  },

  // Get all categories
  getCategories: async () => {
    // Check cache first
    const cachedCategories = cache.get('categories');
    if (cachedCategories) return cachedCategories;
    
    return enqueueRequest(async () => {
      const response = await fetch('/api/categories.json', {
        method: "GET",
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return cache.set('categories', data);
    });
  },

  // Get topics for a specific category
  getCategoryTopics: async (categoryId) => {
    // Check cache first
    const cachedCategoryTopics = cache.get('categoryTopics', categoryId);
    if (cachedCategoryTopics) return cachedCategoryTopics;
    
    return enqueueRequest(async () => {
      // First get the category details to get the slug
      const categoryResponse = await fetch(`/api/c/${categoryId}/show.json`, {
        method: 'GET',
        headers,
      });

      if (!categoryResponse.ok) {
        throw new Error(`HTTP error! status: ${categoryResponse.status}`);
      }

      const categoryData = await categoryResponse.json();
      const slug = categoryData.category.slug;

      // Now fetch the topics using both slug and id
      const response = await fetch(
        `/api/c/${slug}/${categoryId}.json`,
        { 
          method: 'GET',
          headers 
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return cache.set('categoryTopics', data, categoryId);
    });
  },

  // Create a new topic (post)
  createTopic: async ({ title, raw, category, image, username }) => {
    return enqueueRequest(async () => {
      let imageUrl = '';
      
      // If there's an image, upload it first
      if (image) {
        const formData = new FormData();
        formData.append('type', 'composer');
        formData.append('files[]', image);
        console.log("Username is ", username);
        const uploadResponse = await fetch('/api/uploads.json', {
          method: 'POST',
          headers: {
            'Api-Key': API_KEY,
            'Api-Username': username,
          },
          body: formData
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;

        raw = `${raw}\n\n<div class="uploaded-image">${imageUrl}</div>\n\n![${image.name}](${imageUrl})`;
      }

      const response = await fetch('/api/posts.json', {
        method: 'POST',
        headers: {
          ...headers,
          'Api-Username': username,
        },
        body: JSON.stringify({
          title,
          raw,
          category: parseInt(category),
          archetype: 'regular',
          created_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0] || `HTTP error! status: ${response.status}`);
      }

      // After successful creation, invalidate relevant caches
      cache.set('topics', null, 'latest');
      cache.set('categoryTopics', null, category);

      return response.json();
    });
  },

  // Create a reply to a topic
  createReply: async ({ topic_id, raw, username }) => {
    return enqueueRequest(async () => {
      try {
        const response = await fetch(`/api/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': API_KEY,
            'Api-Username': username
          },
          body: JSON.stringify({
            topic_id,
            raw,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.errors?.[0] || `HTTP error! status: ${response.status}`);
        }

        // Invalidate topic cache after successful reply
        cache.set('topics', null, topic_id);
        
        return response.json();
      } catch (error) {
        console.error('Error creating reply:', error);
        throw error;
      }
    });
  },

  // Like/Unlike a post
  performPostAction: async ({ id, actionType, username }) => {
    return enqueueRequest(async () => {
      if (actionType === 'like') {
        try {
          const response = await fetch('/api/post_actions.json', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Api-Username': username
            },
            body: JSON.stringify({
              id: parseInt(id),
              post_action_type_id: 2,
              flag_topic: false
            })
          });

          const data = await response.json();
          
          if (!response.ok) {
            if (response.status === 403) {
              if (data.errors?.[0]?.includes('already performed this action')) {
                throw new Error('You have already liked this post');
              } else if (data.errors?.[0]?.includes('own post')) {
                throw new Error('You cannot like your own post');
              }
            }
            throw new Error(data.errors?.[0] || `HTTP error! status: ${response.status}`);
          }

          // After successful action, invalidate post cache
          cache.set('posts', null, id);

          return data;
        } catch (error) {
          throw error;
        }
      }
    });
  },

  // Get post details including likes
  getPost: async (postId) => {
    // Check cache first
    const cachedPost = cache.get('posts', postId);
    if (cachedPost) return cachedPost;
    
    return enqueueRequest(async () => {
      const response = await fetch(`/api/posts/${postId}.json`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0] || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const likeAction = data.actions_summary?.find(action => action.id === 2);
      const postWithLikes = {
        ...data,
        like_count: likeAction?.count || 0,
        user_liked: likeAction?.acted || false
      };
      
      return cache.set('posts', postWithLikes, postId);
    });
  },

  // Get post actions (likes, etc.)
  getPostActions: async (postId) => {
    try {
      const response = await fetch(`/api/post_action_users.json`, {
        method: 'GET',
        headers,
        body: JSON.stringify({
          post_id: postId,
          post_action_type_id: 2 // 2 is for like action
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        liked: data.post_action_users?.some(user => 
          user.username === API_USERNAME
        ) || false,
        like_count: data.post_action_users?.length || 0
      };
    } catch (error) {
      console.error('Error getting post actions:', error);
      return { liked: false, like_count: 0 };
    }
  },

  // Get current user
  getCurrentUser: () => {
    return {
      username: API_USERNAME
    };
  },

  // Search topics and posts
  search: async (term) => {
    return enqueueRequest(async () => {
      try {
        const response = await fetch(`/api/search.json?q=${encodeURIComponent(term)}`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.errors?.[0] || `HTTP error! status: ${response.status}`);
        }

        return response.json();
      } catch (error) {
        console.error('Error searching:', error);
        throw error;
      }
    });
  },
  
  // Get user profile
  getUserProfile: async (username) => {
    // Check cache first
    const cachedUser = cache.get('users', username);
    if (cachedUser) return cachedUser;
    
    return enqueueRequest(async () => {
      try {
        const response = await fetch(`/api/users/${username}.json`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.errors?.[0] || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return cache.set('users', data, username);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }
    });
  },

  // Get user activity (posts, topics, likes)
  getUserActivity: async (username) => {
    return enqueueRequest(async () => {
      try {
        const response = await fetch(`/api/user_actions.json?username=${username}`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.errors?.[0] || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching user activity:', error);
        throw error;
      }
    });
  },

  // Get all members of the community
  getMembers: async (page = 0) => {
    // Check cache first
    const cachedMembers = cache.get('members', `page_${page}`);
    if (cachedMembers) return cachedMembers;
    
    return enqueueRequest(async () => {
      try {
        // Using the directory endpoint to get users sorted by various criteria
        const response = await fetch(`/api/directory_items.json?period=all&page=${page}`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.errors?.[0] || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return cache.set('members', data, `page_${page}`);
      } catch (error) {
        console.error('Error fetching members:', error);
        throw error;
      }
    });
  },

  // Get leaderboard data (users sorted by various metrics)
  getLeaderboard: async (period = 'monthly', order = 'likes_received') => {
    // Valid periods: daily, weekly, monthly, quarterly, yearly, all
    // Valid orders: likes_received, likes_given, topic_count, post_count, topics_entered, posts_read, days_visited
    
    // Check cache first
    const cacheKey = `${period}_${order}`;
    const cachedLeaderboard = cache.get('leaderboard', cacheKey);
    if (cachedLeaderboard) return cachedLeaderboard;
    
    return enqueueRequest(async () => {
      try {
        const response = await fetch(`/api/directory_items.json?period=${period}&order=${order}`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.errors?.[0] || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return cache.set('leaderboard', data, cacheKey);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
      }
    });
  },

  // Get user badges
  getUserBadges: async (username) => {
    return enqueueRequest(async () => {
      try {
        const response = await fetch(`/api/user-badges/${username}.json`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.errors?.[0] || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching user badges:', error);
        throw error;
      }
    });
  },

  // Get all available badges
  getAllBadges: async () => {
    // Check cache first
    const cachedBadges = cache.get('badges', 'all');
    if (cachedBadges) return cachedBadges;
    
    return enqueueRequest(async () => {
      try {
        const response = await fetch(`/api/badges.json`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.errors?.[0] || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return cache.set('badges', data, 'all');
      } catch (error) {
        console.error('Error fetching badges:', error);
        throw error;
      }
    });
  },

  // Get user summary (includes various stats)
  getUserSummary: async (username) => {
    return enqueueRequest(async () => {
      try {
        const response = await fetch(`/api/users/${username}/summary.json`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.errors?.[0] || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching user summary:', error);
        throw error;
      }
    });
  },

  // Clear cache method for manual cache invalidation
  clearCache: (type, key) => {
    if (type === 'all') {
      cache.topics.clear();
      cache.posts.clear();
      cache.categoryTopics.clear();
      cache.categories = null;
      cache.users = new Map();
      cache.members = new Map();
      cache.leaderboard = new Map();
      cache.badges = new Map();
    } else if (type && key) {
      cache[type].delete(key);
    } else if (type === 'categories') {
      cache.categories = null;
    } else if (type) {
      cache[type].clear();
    }
  }
}; 