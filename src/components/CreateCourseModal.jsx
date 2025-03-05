import React, { useState } from 'react';
import { X, Plus, Upload, Trash, Image } from 'lucide-react';
import { serverbaseURL } from '../constant/index';

const CreateCourseModal = ({ communityId, onClose, onCourseCreated, editCourse = null }) => {
  const [courseData, setCourseData] = useState(editCourse || {
    title: '',
    description: '',
    price: 0,
    thumbnail: '',
    thumbnailPreview: '',
    sections: [{ title: '', description: '', videos: [] }]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState({});
  const [thumbnailFile, setThumbnailFile] = useState(null);

  const handleVideoUpload = async (sectionIndex, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Track upload progress
      setUploadProgress(prev => ({
        ...prev,
        [`section${sectionIndex}`]: 0
      }));

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${serverbaseURL}api/upload-video`);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(prev => ({
            ...prev,
            [`section${sectionIndex}`]: progress
          }));
        }
      };
      
      xhr.onload = async function() {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          
          // Update section videos
          const newSections = [...courseData.sections];
          newSections[sectionIndex].videos.push({
            title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
            url: data.url,
            duration: data.duration ? formatDuration(data.duration) : await getVideoDuration(file)
          });
          
          setCourseData({ ...courseData, sections: newSections });
        } else {
          throw new Error('Upload failed');
        }
      };
      
      xhr.onerror = function() {
        throw new Error('Network error during upload');
      };
      
      xhr.send(formData);
    } catch (error) {
      setError('Failed to upload video: ' + error.message);
    }
  };

  const handleThumbnailUpload = async (file) => {
    try {
      setThumbnailFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCourseData({
          ...courseData,
          thumbnailPreview: reader.result
        });
      };
      reader.readAsDataURL(file);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${serverbaseURL}api/upload-image`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Thumbnail upload failed');
      const data = await response.json();
      
      setCourseData({
        ...courseData,
        thumbnail: data.url
      });
    } catch (error) {
      setError('Failed to upload thumbnail: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!courseData.title.trim()) {
        throw new Error('Course title is required');
      }

      if (courseData.sections.some(section => !section.title.trim())) {
        throw new Error('All sections must have a title');
      }

      const url = editCourse 
        ? `${serverbaseURL}api/communities/${communityId}/courses/${editCourse._id}`
        : `${serverbaseURL}api/communities/${communityId}/courses`;

      const method = editCourse ? 'PUT' : 'POST';
      
      // Remove thumbnailPreview from data sent to server
      const { thumbnailPreview, ...dataToSend } = courseData;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      if (!response.ok) throw new Error('Failed to save course');
      
      onCourseCreated();
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getVideoDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = Math.round(video.duration);
        resolve(formatDuration(duration));
      };
      video.src = URL.createObjectURL(file);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {editCourse ? 'Edit Course' : 'Create New Course'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
            <p className="font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Thumbnail Upload */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3">
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                  {courseData.thumbnailPreview || courseData.thumbnail ? (
                    <img 
                      src={courseData.thumbnailPreview || courseData.thumbnail} 
                      alt="Course thumbnail" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <Image className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No thumbnail</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="w-full md:w-2/3">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Course Thumbnail</h3>
                <p className="text-gray-600 mb-4">
                  Upload an eye-catching image that represents your course content.
                  A good thumbnail can significantly increase enrollment rates.
                </p>
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleThumbnailUpload(e.target.files[0])}
                  className="hidden"
                  id="thumbnail-upload"
                />
                <label
                  htmlFor="thumbnail-upload"
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg cursor-pointer hover:bg-purple-700"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Thumbnail
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Recommended size: 1280x720px (16:9 ratio)
                </p>
              </div>
            </div>
          </div>

          {/* Basic Course Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Title
              </label>
              <input
                type="text"
                placeholder="e.g., Complete Video Editing Masterclass"
                value={courseData.title}
                onChange={(e) => setCourseData({ ...courseData, title: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (USD)
              </label>
              <input
                type="number"
                placeholder="0 for free courses"
                value={courseData.price}
                onChange={(e) => setCourseData({ ...courseData, price: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course Description
            </label>
            <textarea
              placeholder="Describe what students will learn in this course..."
              value={courseData.description}
              onChange={(e) => setCourseData({ ...courseData, description: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg h-32 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          {/* Sections */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Course Content</h3>
              <button
                type="button"
                onClick={() => setCourseData({
                  ...courseData,
                  sections: [...courseData.sections, { title: '', description: '', videos: [] }]
                })}
                className="inline-flex items-center px-3 py-1.5 text-sm bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Section
              </button>
            </div>

            {courseData.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">Section {sectionIndex + 1}</h4>
                  {courseData.sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newSections = courseData.sections.filter((_, i) => i !== sectionIndex);
                        setCourseData({ ...courseData, sections: newSections });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Section Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Introduction to Video Editing"
                      value={section.title}
                      onChange={(e) => {
                        const newSections = [...courseData.sections];
                        newSections[sectionIndex].title = e.target.value;
                        setCourseData({ ...courseData, sections: newSections });
                      }}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Section Description
                    </label>
                    <textarea
                      placeholder="What will students learn in this section?"
                      value={section.description}
                      onChange={(e) => {
                        const newSections = [...courseData.sections];
                        newSections[sectionIndex].description = e.target.value;
                        setCourseData({ ...courseData, sections: newSections });
                      }}
                      className="w-full p-2.5 border border-gray-300 rounded-lg h-20 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Video Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Videos
                    </label>
                    
                    <div className="flex items-center space-x-4 mb-4">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleVideoUpload(sectionIndex, e.target.files[0])}
                        className="hidden"
                        id={`video-upload-${sectionIndex}`}
                      />
                      <label
                        htmlFor={`video-upload-${sectionIndex}`}
                        className="flex items-center px-4 py-2 bg-purple-50 text-purple-600 rounded-lg cursor-pointer hover:bg-purple-100"
                      >
                        <Upload className="w-5 h-5 mr-2" />
                        Upload Video
                      </label>
                      {uploadProgress[`section${sectionIndex}`] > 0 && (
                        <div className="flex-1">
                          <div className="h-2 bg-purple-100 rounded-full">
                            <div
                              className="h-2 bg-purple-600 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress[`section${sectionIndex}`]}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Videos List */}
                    <div className="space-y-2">
                      {section.videos.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No videos added yet</p>
                      ) : (
                        section.videos.map((video, videoIndex) => (
                          <div key={videoIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                                {videoIndex + 1}
                              </div>
                              <div>
                                <div className="font-medium">{video.title}</div>
                                <div className="text-xs text-gray-500">{video.duration}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newSections = [...courseData.sections];
                                newSections[sectionIndex].videos = section.videos.filter(
                                  (_, i) => i !== videoIndex
                                );
                                setCourseData({ ...courseData, sections: newSections });
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Section Button */}
          <button
            type="button"
            onClick={() => setCourseData({
              ...courseData,
              sections: [...courseData.sections, { title: '', description: '', videos: [] }]
            })}
            className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-purple-500 hover:text-purple-500"
          >
            <Plus className="w-5 h-5 mx-auto" />
            Add Section
          </button>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2 bg-purple-600 text-white rounded-lg ${
                loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'
              }`}
            >
              {loading ? 'Saving...' : editCourse ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCourseModal; 