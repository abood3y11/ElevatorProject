import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Building2, Calendar, ClipboardList, Home, BarChart3, Users, Package, LogOut } from 'lucide-react';
import { useAuth, UserRole } from '../../context/AuthContext';

interface SidebarProps {
  role: UserRole;
}

interface NavItem {
  title: string;
  path: string;
  icon: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // In Sidebar.tsx, update the handleLogout function
const handleLogout = async () => {
  try {
    // First navigate away to prevent protected route issues
    navigate('/login', { replace: true });
    
    // Then logout
    setTimeout(async () => {
      await logout();
      console.log('Logout complete');
    }, 100);
  } catch (error) {
    console.error('Error during logout:', error);
  }
};
  
  const getNavItems = (): NavItem[] => {
    switch(role) {
      case 'customer':
        return [
          { title: 'Dashboard', path: '/customer', icon: <Home size={20} /> },
          { title: 'Maintenance History', path: '/customer/maintenance-history', icon: <ClipboardList size={20} /> },
          { title: 'Contracts', path: '/customer/contracts', icon: <Building2 size={20} /> },
          { title: 'Request Maintenance', path: '/customer/request-maintenance', icon: <Calendar size={20} /> },
        ];
      case 'employee':
        return [
          { title: 'Dashboard', path: '/employee', icon: <Home size={20} /> },
          { title: 'Daily Schedule', path: '/employee/schedule', icon: <Calendar size={20} /> },
          { title: 'Parts Inventory', path: '/employee/inventory', icon: <Package size={20} /> },
        ];
      case 'admin':
        return [
          { title: 'Dashboard', path: '/admin', icon: <Home size={20} /> },
          { title: 'Users', path: '/admin/users', icon: <Users size={20} /> },
          { title: 'Contracts', path: '/admin/contracts', icon: <Building2 size={20} /> },
          { title: 'Inventory', path: '/admin/inventory', icon: <Package size={20} /> },
          { title: 'Reports', path: '/admin/reports', icon: <BarChart3 size={20} /> },
        ];
      default:
        return [];
    }
  };
  
  const navItems = getNavItems();

  const getSidebarColors = () => {
    switch(role) {
      case 'employee':
        return {
          hover: 'hover:bg-emerald-800/50',
          active: 'bg-emerald-600',
          text: 'text-emerald-900',
          textHover: 'hover:text-white',
          border: 'border-emerald-700/50',
          icon: 'bg-emerald-600',
          iconText: 'text-white'
        };
      case 'admin':
        return {
          hover: 'hover:bg-purple-800/50',
          active: 'bg-purple-600',
          text: 'text-purple-900',
          textHover: 'hover:text-white',
          border: 'border-purple-700/50',
          icon: 'bg-purple-600',
          iconText: 'text-white'
        };
      default:
        return {
          hover: 'hover:bg-blue-800/50',
          active: 'bg-blue-600',
          text: 'text-blue-200',
          textHover: 'hover:text-white',
          border: 'border-blue-700/50',
          icon: 'bg-blue-600',
          iconText: 'text-white'
        };
    }
  };

  const colors = getSidebarColors();
  
  return (
    <div className="bg-white h-screen w-64 fixed left-0 top-0 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <div className={`${colors.icon} rounded-md p-2`}>
            <Building2 size={24} className={colors.iconText} />
          </div>
          <h1 className="text-xl font-bold">Elevator MS</h1>
        </div>
        
        <div className="mb-8">
          <p className={`${colors.text} text-sm mb-1`}>Logged in as</p>
          <p className="font-medium">{user?.name}</p>
          <p className={colors.text}>{user?.email}</p>
          <p className={`text-xs text-white mt-1 ${colors.icon} rounded-full px-2 py-0.5 inline-block capitalize`}>
            {role}
          </p>
        </div>
        
        <nav>
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink 
                  to={item.path}
                  className={({ isActive }) => 
                    `flex items-center space-x-3 p-3 rounded-lg transition duration-150 ${
                      isActive 
                        ? `${colors.active} text-white` 
                        : `${colors.text} ${colors.hover} ${colors.textHover}`
                    }`
                  }
                >
                  {item.icon}
                  <span>{item.title}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      
      <div className={`absolute bottom-0 w-full p-4 border-t ${colors.border}`}>
        <button 
          onClick={handleLogout}
          className={`flex items-center space-x-3 ${colors.text} ${colors.textHover} w-full p-3 rounded-lg ${colors.hover} transition duration-150`}
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;