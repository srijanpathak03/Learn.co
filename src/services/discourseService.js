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

  // Get a single topic with replies
  getTopic: async (topicId) => {
    try {
      const response = await fetch(
        `/api/t/${topicId}.json`,
        { headers }
      );
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
        body: JSON.stringify({ topic_id, raw }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error creating reply:', error);
      throw error;
    }
  }
}; 