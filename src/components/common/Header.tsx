import React from 'react';
import { Bell, Search, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const { user } = useAuth();
  
  const getHeaderColors = () => {
    switch(user?.role) {
      case 'employee':
        return {
          searchBorder: 'focus:border-emerald-500 focus:ring-emerald-500',
          iconHover: 'hover:text-emerald-600',
          notificationBg: 'bg-emerald-500',
          avatarBg: 'bg-emerald-600'
        };
      case 'admin':
        return {
          searchBorder: 'focus:border-purple-500 focus:ring-purple-500',
          iconHover: 'hover:text-purple-600',
          notificationBg: 'bg-purple-500',
          avatarBg: 'bg-purple-600'
        };
      default:
        return {
          searchBorder: 'focus:border-blue-500 focus:ring-blue-500',
          iconHover: 'hover:text-blue-600',
          notificationBg: 'bg-blue-500',
          avatarBg: 'bg-blue-500'
        };
    }
  };

  const colors = getHeaderColors();
  
  return (
    <header className={`bg-white shadow-sm h-16 flex items-center justify-between px-6 ${
      user?.role === 'admin' ? 'border-b border-purple-100' : 'border-b border-emerald-100'
    }`}>
      <h1 className={`text-2xl font-semibold ${
        user?.role === 'admin' ? 'text-purple-900' : 'text-emerald-900'
      }`}>
        {title}
      </h1>
      
      <div className="flex items-center space-x-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className={`w-64 pl-10 pr-4 py-2 rounded-md border ${
              colors.searchBorder
            } focus:outline-none`}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
        
        <div className="relative">
          <Bell className={`text-gray-600 ${colors.iconHover} cursor-pointer transition-colors duration-150`} size={20} />
          <span className={`absolute -top-1 -right-1 ${colors.notificationBg} text-white text-xs rounded-full h-4 w-4 flex items-center justify-center`}>
            3
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <Settings className={`text-gray-600 ${colors.iconHover} cursor-pointer transition-colors duration-150`} size={20} />
          
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full ${colors.avatarBg} flex items-center justify-center text-white font-medium shadow-lg`}>
              {user?.name.charAt(0)}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-700">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.position}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;