import React, { useState } from 'react';
import { Play, X, ChevronDown, ChevronUp, Clock, BookOpen } from 'lucide-react';

const CourseViewer = ({ course, onClose }) => {
  const [activeSection, setActiveSection] = useState(0);
  const [activeVideo, setActiveVideo] = useState(null);
  const [expandedSections, setExpandedSections] = useState({0: true});

  const toggleSection = (index) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const playVideo = (sectionIndex, videoIndex) => {
    setActiveSection(sectionIndex);
    setActiveVideo(videoIndex);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">{course.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* Video Player */}
          <div className="w-full md:w-2/3 bg-black">
            {activeVideo !== null && course.sections[activeSection]?.videos[activeVideo] ? (
              <div className="h-full flex flex-col">
                <video 
                  src={course.sections[activeSection].videos[activeVideo].url}
                  controls
                  autoPlay
                  className="w-full h-auto max-h-[70vh]"
                />
                <div className="p-4 bg-white">
                  <h3 className="text-lg font-medium text-gray-900">
                    {course.sections[activeSection].videos[activeVideo].title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {course.sections[activeSection].title}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-white">
                <div className="text-center p-8">
                  <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select a video to start learning</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Choose from the course content on the right
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Course Content */}
          <div className="w-full md:w-1/3 overflow-y-auto border-l">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Course Content</h3>
                <div className="flex items-center text-sm text-gray-500">
                  <BookOpen className="w-4 h-4 mr-1" />
                  <span>{course.sections.length} sections</span>
                </div>
              </div>
              
              {course.sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="mb-4 border rounded-lg overflow-hidden">
                  <button
                    className={`w-full p-3 flex justify-between items-center ${
                      activeSection === sectionIndex 
                        ? 'bg-purple-50 text-purple-700' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => toggleSection(sectionIndex)}
                  >
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs mr-2">
                        {sectionIndex + 1}
                      </div>
                      <span className="font-medium">{section.title}</span>
                    </div>
                    {expandedSections[sectionIndex] ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                  
                  {expandedSections[sectionIndex] && (
                    <div className="p-2 bg-white">
                      {section.description && (
                        <p className="text-sm text-gray-600 p-2 mb-2">{section.description}</p>
                      )}
                      
                      {section.videos.map((video, videoIndex) => (
                        <button
                          key={videoIndex}
                          className={`w-full text-left p-2 rounded-lg flex items-center ${
                            activeSection === sectionIndex && activeVideo === videoIndex
                              ? 'bg-purple-100 text-purple-700'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => playVideo(sectionIndex, videoIndex)}
                        >
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3">
                            <Play className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{video.title}</div>
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                              <Clock className="w-3 h-3 mr-1" />
                              {video.duration}
                            </div>
                          </div>
                          {activeSection === sectionIndex && activeVideo === videoIndex && (
                            <div className="w-2 h-2 bg-purple-600 rounded-full mr-2"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseViewer; 