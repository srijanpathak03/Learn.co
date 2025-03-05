import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Clock, BookOpen, Plus, Upload, Edit, Trash, Users, MessageCircle, Award, Calendar } from 'lucide-react';
import { AuthContext } from '../provider/AuthProvider';
import { serverbaseURL } from '../constant/index';
import CreateCourseModal from '../components/CreateCourseModal';
import CourseViewer from '../components/CourseViewer';

const CommunityCourses = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);
  const [isCreator, setIsCreator] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [viewingCourse, setViewingCourse] = useState(null);
  const [communityData, setCommunityData] = useState(null);
  const [activeTab, setActiveTab] = useState('courses');

  useEffect(() => {
    if (!user) {
      localStorage.setItem('redirectAfterLogin', `/community/${id}/courses`);
      navigate('/login');
      return;
    }
    
    fetchCommunityAndCourses();
  }, [id, user, navigate]);

  const fetchCommunityAndCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch community details
      const communityRes = await fetch(`${serverbaseURL}community/${id}`);
      if (!communityRes.ok) throw new Error('Failed to fetch community');
      const communityData = await communityRes.json();
      setCommunityData(communityData);
      
      setIsCreator(communityData.creator.uid === user?.uid);

      // Fetch courses
      const coursesRes = await fetch(`${serverbaseURL}api/communities/${id}/courses`);
      if (!coursesRes.ok) throw new Error('Failed to fetch courses');
      const coursesData = await coursesRes.json();
      
      setCourses(coursesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCourse = (course) => {
    setSelectedCourse(course);
    setShowCreateModal(true);
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;

    try {
      const response = await fetch(
        `${serverbaseURL}api/communities/${id}/courses/${courseId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete course');
      
      fetchCommunityAndCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      setError('Failed to delete course');
    }
  };

  const handleViewCourse = (course) => {
    setViewingCourse(course);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Navigation Bar */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              <button
                onClick={() => navigate(`/community/${id}`)}
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Community
              </button>
              <button
                onClick={() => navigate(`/community/${id}/courses`)}
                className="py-4 px-1 border-b-2 border-purple-500 text-purple-600 font-medium"
              >
                Courses
              </button>
              <button
                onClick={() => navigate(`/community/${id}/calendar`)}
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Calendar
              </button>
              <button
                onClick={() => navigate(`/community/${id}/members`)}
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Members
              </button>
              <button
                onClick={() => navigate(`/community/${id}/leaderboards`)}
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Leaderboards
              </button>
              <button
                onClick={() => navigate(`/community/${id}/about`)}
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                About
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Navigation Bar */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              <button
                onClick={() => navigate(`/community/${id}`)}
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Community
              </button>
              <button
                onClick={() => navigate(`/community/${id}/courses`)}
                className="py-4 px-1 border-b-2 border-purple-500 text-purple-600 font-medium"
              >
                Courses
              </button>
              <button
                onClick={() => navigate(`/community/${id}/calendar`)}
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Calendar
              </button>
              <button
                onClick={() => navigate(`/community/${id}/members`)}
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Members
              </button>
              <button
                onClick={() => navigate(`/community/${id}/leaderboards`)}
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Leaderboards
              </button>
              <button
                onClick={() => navigate(`/community/${id}/about`)}
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                About
              </button>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => navigate(`/community/${id}`)}
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Community
            </button>
            <button
              onClick={() => navigate(`/community/${id}/courses`)}
              className="py-4 px-1 border-b-2 border-purple-500 text-purple-600 font-medium"
            >
              Courses
            </button>
            <button
              onClick={() => navigate(`/community/${id}/calendar`)}
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Calendar
            </button>
            <button
              onClick={() => navigate(`/community/${id}/members`)}
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Members
            </button>
            <button
              onClick={() => navigate(`/community/${id}/leaderboards`)}
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Leaderboards
            </button>
            <button
              onClick={() => navigate(`/community/${id}/about`)}
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              About
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Community Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {communityData?.name} Courses
          </h1>
          <p className="text-gray-600">
            Expand your knowledge with our curated learning paths
          </p>
        </div>

        {/* Creator Actions */}
        {isCreator && (
          <div className="mb-8">
            <button
              onClick={() => {
                setSelectedCourse(null);
                setShowCreateModal(true);
              }}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg flex items-center hover:bg-purple-700 transition shadow-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Course
            </button>
          </div>
        )}

        {/* Courses Grid */}
        {courses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <BookOpen className="w-16 h-16 text-purple-200 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No courses available yet</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {isCreator 
                ? "Start creating educational content for your community members by adding your first course."
                : "Check back later for new learning opportunities from this community."}
            </p>
            {isCreator && (
              <button
                onClick={() => {
                  setSelectedCourse(null);
                  setShowCreateModal(true);
                }}
                className="mt-6 bg-purple-600 text-white px-6 py-2 rounded-lg inline-flex items-center hover:bg-purple-700 transition"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Course
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course._id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition">
                {/* Course Thumbnail */}
                <div className="h-48 bg-purple-100 flex items-center justify-center">
                  {course.thumbnail ? (
                    <img 
                      src={course.thumbnail} 
                      alt={course.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="w-16 h-16 text-purple-300" />
                  )}
                </div>
                
                <div className="p-6">
                  {/* Course Header */}
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">{course.title}</h3>
                    
                    {/* Creator Actions */}
                    {isCreator && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditCourse(course)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Edit Course"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course._id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete Course"
                        >
                          <Trash className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Course Description */}
                  <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                  
                  {/* Course Stats */}
                  <div className="flex items-center text-sm text-gray-500 mb-6 space-x-4">
                    <div className="flex items-center">
                      <BookOpen className="w-4 h-4 mr-1" />
                      <span>{course.sections?.length || 0} sections</span>
                    </div>
                    <div className="flex items-center">
                      <Play className="w-4 h-4 mr-1" />
                      <span>
                        {course.sections?.reduce((total, section) => total + (section.videos?.length || 0), 0) || 0} videos
                      </span>
                    </div>
                    {course.price > 0 ? (
                      <div className="ml-auto font-medium text-purple-600">${course.price}</div>
                    ) : (
                      <div className="ml-auto font-medium text-green-600">Free</div>
                    )}
                  </div>
                  
                  {/* Action Button */}
                  <button
                    onClick={() => handleViewCourse(course)}
                    className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center justify-center"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Learning
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateCourseModal
          communityId={id}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedCourse(null);
          }}
          onCourseCreated={fetchCommunityAndCourses}
          editCourse={selectedCourse}
        />
      )}

      {viewingCourse && (
        <CourseViewer
          course={viewingCourse}
          onClose={() => setViewingCourse(null)}
        />
      )}
    </div>
  );
};

export default CommunityCourses; 