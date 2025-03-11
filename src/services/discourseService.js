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

export const discourseService = {
  // Get all categories and latest topics
  getLatestTopics: async () => {
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

      return {
        categories: categories.category_list.categories,
        topics: topicsWithDetails
      };
    });
  },

  // Get single topic with details
  getTopic: async (topicId) => {
    return enqueueRequest(async () => {
      const response = await fetch(`/api/t/${topicId}.json`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    });
  },

  // Get all categories
  getCategories: async () => {
    try {
      const response = await fetch('/api/categories.json', {
        method: "GET",
        headers,
      });
      console.log("Categories Response:", response);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Get topics for a specific category
  getCategoryTopics: async (categoryId) => {
    try {
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
      console.log('Category topics response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching category topics:', error);
      throw error;
    }
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

      return response.json();
    });
  },

  // Create a reply to a topic
  createReply: async ({ topic_id, raw, username }) => {
    try {
      const response = await fetch(`/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

      return response.json();
    } catch (error) {
      console.error('Error creating reply:', error);
      throw error;
    }
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

          return data;
        } catch (error) {
          throw error;
        }
      }
    });
  },

  // Get post details including likes
  getPost: async (postId) => {
    try {
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
      return {
        ...data,
        like_count: likeAction?.count || 0,
        user_liked: likeAction?.acted || false
      };
    } catch (error) {
      console.error('Error getting post:', error);
      throw error;
    }
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
  },
}; 