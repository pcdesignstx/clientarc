import { Link, Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useState, useRef, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function Layout() {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/flows', label: 'Content Flows', icon: '🔄' },
    { path: '/admin/clients', label: 'Clients', icon: '👥' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      const isDropdownClick = dropdownRef.current?.contains(event.target);
      const isDropdownMenuClick = event.target.closest('.dropdown-menu');
      
      if (!isDropdownClick && !isDropdownMenuClick) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex md:flex-col w-56 bg-white dark:bg-gray-800 shadow-md">
          {/* Logo section */}
          <div className="flex items-center h-16 px-6 border-b border-gray-200 dark:border-gray-700">
            <Link to="/admin/dashboard" className="flex items-center">
              <span className="text-xl font-bold text-gray-900 dark:text-white">ClientArc</span>
            </Link>
          </div>

          {/* User info with dropdown */}
          <div className="relative px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div 
              ref={dropdownRef}
              className="flex items-center space-x-3 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(!isDropdownOpen);
              }}
            >
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {currentUser?.displayName || currentUser?.email || 'Account'}
                </p>
              </div>
              <svg 
                className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div 
                className="absolute left-0 right-0 mt-2 mx-4 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 dropdown-menu"
                onClick={(e) => e.stopPropagation()}
              >
                <Link
                  to="/admin/settings"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDropdownOpen(false);
                  }}
                >
                  Settings
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 overflow-y-auto">
            <div className="space-y-1">
              {navLinks.map(({ path, label, icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 ${
                      isActive
                        ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`
                  }
                >
                  <span className="mr-3 text-lg">{icon}</span>
                  {label}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Theme Toggle */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-150"
            >
              <span className="mr-2">{theme === 'light' ? '🌙' : '🌞'}</span>
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 shadow-md z-10">
          <div className="flex items-center justify-between h-full px-4">
            <Link to="/admin/dashboard" className="flex items-center">
              <span className="text-xl font-bold text-gray-900 dark:text-white">ClientArc</span>
            </Link>
            <button
              type="button"
              className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open menu</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
} 