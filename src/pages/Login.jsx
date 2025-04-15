import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'react-hot-toast';
import { auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState({ type: '', message: '' });
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Logged in successfully');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to log in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResetStatus({ type: '', message: '' });

    if (!resetEmail) {
      setResetStatus({
        type: 'error',
        message: 'Please enter your email address'
      });
      setIsLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      
      setResetStatus({
        type: 'success',
        message: 'Password reset instructions have been sent to your email.'
      });
      
      toast.success('Password reset email sent!');
      
      // Close the modal after 3 seconds on success
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetEmail('');
        setResetStatus({ type: '', message: '' });
      }, 3000);
    } catch (error) {
      console.error('Password reset error:', error);
      let errorMessage = 'Failed to send reset instructions. Please try again.';
      
      // Handle specific Firebase errors
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      }
      
      setResetStatus({
        type: 'error',
        message: errorMessage
      });
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="mb-12">
        <h1 className={`text-5xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>ClientArc</h1>
        <p className={`text-center mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Your Client Management Platform</p>
      </div>

      {/* Login Card */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg w-full max-w-md p-8`}>
        <h2 className={`text-2xl font-semibold mb-6 text-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Welcome Back</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600' 
                    : 'bg-white text-gray-900 border-gray-200'
                }`}
                placeholder="name@company.com"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none pr-10 transition-all ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600' 
                    : 'bg-white text-gray-900 border-gray-200'
                }`}
                placeholder="************"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 bg-transparent ${
                  theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-all ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          {/* Forgot Password Link */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className={`text-sm font-medium transition-colors ${
                theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              Forgot your password?
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <Link
              to="/signup"
              className={`text-sm font-medium transition-colors ${
                theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              Don't have an account? Sign Up
            </Link>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg w-full max-w-md p-6 relative`}>
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setResetEmail('');
                setResetStatus({ type: '', message: '' });
              }}
              className={`absolute right-4 top-4 bg-transparent ${
                theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            <h2 className={`text-2xl font-semibold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Reset Password</h2>
            
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                    theme === 'dark' 
                      ? 'bg-gray-700 text-white border-gray-600' 
                      : 'bg-white text-gray-900 border-gray-200'
                  }`}
                  placeholder="Enter your email address"
                  required
                />
              </div>

              {resetStatus.message && (
                <div
                  className={`p-4 rounded-lg ${
                    resetStatus.type === 'success'
                      ? theme === 'dark' ? 'bg-green-900/50 text-green-300' : 'bg-green-50 text-green-800'
                      : theme === 'dark' ? 'bg-red-900/50 text-red-300' : 'bg-red-50 text-red-800'
                  }`}
                >
                  {resetStatus.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-all ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoading ? 'Sending...' : 'Send Reset Instructions'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login; 