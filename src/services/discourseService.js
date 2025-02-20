const API_KEY = import.meta.env.VITE_DISCOURSE_API_KEY;
const API_USERNAME = import.meta.env.VITE_DISCOURSE_USERNAME;

const headers = {
  'Api-Key': API_KEY,
  'Api-Username': API_USERNAME,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

export const discourseService = {
  // Get all categories (communities)
  getCategories: async () => {
    try {
        const response = await fetch('/api/categories.json', {
            method: "GET",
            headers,
        });  
        console.log("Data: ", response)  
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
      const response = await fetch(
        `/api/c/${categoryId}.json`,
        { headers }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching category topics:', error);
      throw error;
    }
  },

  // Create a new topic in a category
  createTopic: async ({ title, raw, category_id }) => {
    try {
      const response = await fetch('/api/posts.json', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, raw, category_id }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error creating topic:', error);
      throw error;
    }
  },

  // Get a single topic with all posts
  getTopic: async (topicId) => {
    try {
      const response = await fetch(`/api/t/${topicId}.json`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching topic:', error);
      throw error;
    }
  },

  // Create a reply to a topic
  createReply: async ({ topic_id, raw }) => {
    try {
      const response = await fetch('/api/posts.json', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic_id,
          raw,
          archetype: 'regular',
          nested_post: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error creating reply:', error);
      throw error;
    }
  },

  // Create a new community (topic)
  createCommunity: async ({ title, raw, category_id, image }) => {
    try {
      // First create the topic
      const response = await fetch('/api/posts.json', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          raw,
          category: category_id,
          embed_url: image // This will embed the image in the post if provided
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error creating community:', error);
      throw error;
    }
  },

  performPostAction: async ({ id, actionType }) => {
    try {
      if (actionType === 'like' || actionType === 'unlike') {
        const response = await fetch(`/api/post_actions.json`, {
          method: 'POST',
          headers: {
            ...headers,
            'Api-Key': API_KEY,
            'Api-Username': API_USERNAME,
          },
          body: JSON.stringify({
            id: parseInt(id),
            post_action_type_id: 2,
            flag_topic: false
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.errors?.[0] || `HTTP error! status: ${response.status}`);
        }

        return response.json();
      }
    } catch (error) {
      console.error('Error performing post action:', error);
      throw error;
    }
  },

  // Get post details including likes
  getPost: async (postId) => {
    try {
      const response = await fetch(`/api/posts/${postId}.json`, {
        method: 'GET',
        headers: {
          ...headers,
          'Api-Key': API_KEY,
          'Api-Username': API_USERNAME,
        },
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
      // According to docs, we need to use /post_action_users
      const response = await fetch(`/api/post_action_users.json`, {
        method: 'GET',
        headers,
        body: JSON.stringify({
          post_id: postId,
          post_action_type_id: 2 // 2 is the ID for like action
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        liked: data.post_action_users?.some(user => 
          user.username === API_USERNAME // Use the API username since we're authenticated with it
        ) || false,
        like_count: data.post_action_users?.length || 0
      };
    } catch (error) {
      console.error('Error getting post actions:', error);
      // Return default values if there's an error
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
        headers: {
          ...headers,
          'Api-Key': API_KEY,
          'Api-Username': API_USERNAME,
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0] || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching:', error);
      throw error;
    }
  },
}; 