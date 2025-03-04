import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Clock, BookOpen } from 'lucide-react';

const CommunityCourses = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('courses');

  // Hardcoded courses data
  const courses = [
    {
      id: 1,
      title: "Introduction to AI Automation",
      description: "Learn the basics of AI automation and how to implement it in your workflow.",
      thumbnail: "https://placehold.co/600x400",
      duration: "2h 30m",
      lessons: 12,
      instructor: "John Doe",
      videos: [
        {
          id: 1,
          title: "Getting Started with AI Automation",
          duration: "15:00",
          url: "https://www.youtube.com/embed/dQw4w9WgXcQ"
        },
        {
          id: 2,
          title: "Understanding Basic Concepts",
          duration: "20:00",
          url: "https://www.youtube.com/embed/dQw4w9WgXcQ"
        }
      ]
    },
    {
      id: 2,
      title: "Advanced AI Techniques",
      description: "Deep dive into advanced AI automation techniques and best practices.",
      thumbnail: "https://placehold.co/600x400",
      duration: "3h 45m",
      lessons: 15,
      instructor: "Jane Smith",
      videos: [
        {
          id: 1,
          title: "Advanced AI Concepts",
          duration: "25:00",
          url: "https://www.youtube.com/embed/dQw4w9WgXcQ"
        },
        {
          id: 2,
          title: "Implementing Complex Automations",
          duration: "30:00",
          url: "https://www.youtube.com/embed/dQw4w9WgXcQ"
        }
      ]
    }
  ];

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
        <h1 className="text-3xl font-bold mb-8">Available Courses</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">{course.title}</h3>
                <p className="text-gray-600 mb-4">{course.description}</p>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {course.duration}
                  </div>
                  <div className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-1" />
                    {course.lessons} lessons
                  </div>
                </div>

                <div className="space-y-2">
                  {course.videos.map((video) => (
                    <div
                      key={video.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <Play className="w-4 h-4 text-purple-600" />
                        <span>{video.title}</span>
                      </div>
                      <span className="text-sm text-gray-500">{video.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommunityCourses; 