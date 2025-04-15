import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }) {
  const { role, currentUser } = useAuth();
  const [theme, setTheme] = useState(() => {
    // Initialize theme from localStorage or system preference
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme;
      
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return systemPrefersDark ? 'dark' : 'light';
    }
    return 'light';
  });

  // Update theme class on document
  useEffect(() => {
    // Force light mode for clients and unauthenticated users
    if (role === 'client' || !currentUser) {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      localStorage.removeItem('theme');
      return;
    }

    // Apply theme class
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Save theme preference
    localStorage.setItem('theme', theme);
  }, [theme, role, currentUser]);

  // Listen for system theme changes
  useEffect(() => {
    if (role === 'client' || !currentUser) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [role, currentUser]);

  const toggleTheme = () => {
    // Prevent theme switching for clients and unauthenticated users
    if (role === 'client' || !currentUser) return;

    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeContext; 