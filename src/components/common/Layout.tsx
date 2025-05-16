import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { UserRole } from '../../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, role, title }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar role={role} />
      <div className="flex-1 ml-64">
        <Header title={title} />
        <main className="p-6 overflow-y-auto" style={{ height: 'calc(100vh - 64px)' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;