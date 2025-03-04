import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../provider/AuthProvider';
import { LogOut, ChevronDown, Menu, X, User, Bell, BookOpen } from 'lucide-react';

const Navbar = () => {
  const { user, logOut } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setIsDropdownOpen(false);
    };

    if (isDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleLogout = (e) => {
    e.stopPropagation();
    logOut(navigate);
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav 
      className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white shadow-md' 
          : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo/Brand */}
          <div className="flex-shrink-0 flex items-center">
            <div 
              className="flex items-center space-x-2 cursor-pointer" 
              onClick={() => navigate('/')}
            >
              <BookOpen className="h-6 w-6 text-purple-600" />
              <h1 className="text-xl font-bold text-purple-600">
                Learn.co
              </h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <a 
              href="#" 
              className={`text-sm font-medium ${
                location.pathname === '/' 
                  ? 'text-purple-600' 
                  : 'text-gray-600 hover:text-purple-600'
              } transition-colors`}
              onClick={(e) => {
                e.preventDefault();
                navigate('/');
              }}
            >
              Home
            </a>
            <a 
              href="#" 
              className={`text-sm font-medium ${
                location.pathname === '/courses' 
                  ? 'text-purple-600' 
                  : 'text-gray-600 hover:text-purple-600'
              } transition-colors`}
              onClick={(e) => {
                e.preventDefault();
                navigate('/pricing');
              }}
            >
              Pricing
            </a>
            <a 
              href="#" 
              className={`text-sm font-medium ${
                location.pathname === '/communities' 
                  ? 'text-purple-600' 
                  : 'text-gray-600 hover:text-purple-600'
              } transition-colors`}
              onClick={(e) => {
                e.preventDefault();
                navigate('/');
              }}
            >
              Communities
            </a>
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Notification Icon */}
                <button className="hidden md:flex text-gray-600 hover:text-purple-600 relative p-1 rounded-full hover:bg-purple-50 transition-colors">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
                </button>
                
                {/* User Dropdown */}
                <div className="relative">
                  <button
                    className="flex items-center space-x-3 focus:outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(!isDropdownOpen);
                    }}
                  >
                    <div className="relative">
                      <img
                        src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
                        alt="Profile"
                        className="h-8 w-8 rounded-full object-cover border-2 border-purple-100"
                      />
                      <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border border-white"></div>
                    </div>
                    <span className="text-gray-700 font-medium text-sm hidden md:block">
                      {user.displayName?.split(' ')[0]}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-500 hidden md:block" />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 border border-gray-100 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-700">{user.displayName}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <a 
                        href="#"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate('/');
                          setIsDropdownOpen(false);
                        }}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Your Profile
                      </a>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium hidden md:block"
                >
                  Sign in
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm font-medium transition-colors"
                >
                  Sign up
                </button>
              </>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-purple-600 hover:bg-purple-50"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 py-2 px-4">
          <div className="space-y-1 pb-3 pt-2">
            <a
              href="#"
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-md"
              onClick={(e) => {
                e.preventDefault();
                navigate('/');
                setIsMobileMenuOpen(false);
              }}
            >
              Home
            </a>
            <a
              href="#"
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-md"
              onClick={(e) => {
                e.preventDefault();
                navigate('/pricing');
                setIsMobileMenuOpen(false);
              }}
            >
              Pricing
            </a>
            <a
              href="#"
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-md"
              onClick={(e) => {
                e.preventDefault();
                navigate('/');
                setIsMobileMenuOpen(false);
              }}
            >
              Communities
            </a>
            {!user && (
              <a
                href="#"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-md"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/login');
                  setIsMobileMenuOpen(false);
                }}
              >
                Sign in
              </a>
            )}
          </div>
          {user && (
            <div className="border-t border-gray-200 pt-4 pb-3">
              <div className="flex items-center px-3">
                <div className="flex-shrink-0">
                  <img
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
                    alt="Profile"
                    className="h-10 w-10 rounded-full"
                  />
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user.displayName}</div>
                  <div className="text-sm font-medium text-gray-500">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <a
                  href="#"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-md"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/');
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Your Profile
                </a>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-md"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;