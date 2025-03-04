import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { serverbaseURL } from "../constant/index";
// import { AuthContext} from '../provider/AuthProvider';

const CreateCommunity = () => {
  const navigate = useNavigate();
  const user = { displayName: "Test User", photoURL: "https://ui-avatars.com/api/?name=Test+User&background=random" };
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    price: {
      type: 'Free',
      amount: 0
    },
    image: null,
    rules: ['Be respectful', 'No spam', 'Stay on topic']
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, image: null });
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check subscription status first
      const subscriptionCheck = await axios.get(
        `${serverbaseURL}api/user-subscription/${user.uid}`
      );

      if (subscriptionCheck.data.subscriptionStatus !== 'active') {
        alert('You need an active subscription to create communities. Redirecting to pricing...');
        navigate('/pricing');
        return;
      }

      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'price') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else if (key === 'rules') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });

      const response = await axios.post(`${serverbaseURL}create-community`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        navigate(`/community/${response.data.communityId}`);
      }
    } catch (error) {
      console.error('Error creating community:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 mb-6 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
          <span>Back</span>
        </button>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Your Community</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Community Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Community Image
              </label>
              <div className="relative">
                {imagePreview ? (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:bg-gray-100"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-center items-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 transition-colors duration-200">
                    <label className="flex flex-col items-center cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="mt-2 text-sm text-gray-500">Upload community image</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Community Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Community Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter community name"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Describe your community"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="general">General</option>
                <option value="technology">Technology</option>
                <option value="business">Business</option>
                <option value="education">Education</option>
                <option value="lifestyle">Lifestyle</option>
                <option value="health">Health</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Pricing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Type
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={formData.price.type === 'Free'}
                    onChange={() => setFormData({
                      ...formData,
                      price: { type: 'Free', amount: 0 }
                    })}
                    className="form-radio text-purple-600"
                  />
                  <span className="ml-2">Free</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={formData.price.type === 'Paid'}
                    onChange={() => setFormData({
                      ...formData,
                      price: { type: 'Paid', amount: formData.price.amount || 0 }
                    })}
                    className="form-radio text-purple-600"
                  />
                  <span className="ml-2">Paid</span>
                </label>
              </div>
              {formData.price.type === 'Paid' && (
                <div className="mt-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price.amount}
                    onChange={(e) => setFormData({
                      ...formData,
                      price: { ...formData.price, amount: parseFloat(e.target.value) }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter price per month"
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transition duration-200 ${loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                {loading ? 'Creating Community...' : 'Create Community'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCommunity; 