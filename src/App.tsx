import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DatabaseProvider } from './context/DatabaseContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CustomerDashboard from './pages/customer/Dashboard';
import CustomerMaintenanceHistory from './pages/customer/MaintenanceHistory';
import CustomerContracts from './pages/customer/Contracts';
import CustomerMaintenanceRequest from './pages/customer/MaintenanceRequest';
import EmployeeDashboard from './pages/employee/Dashboard';
import EmployeeSchedule from './pages/employee/Schedule';
import EmployeeMaintenanceForm from './pages/employee/MaintenanceForm';
import EmployeeInventory from './pages/employee/Inventory';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminContracts from './pages/admin/Contracts';
import AdminInventory from './pages/admin/Inventory';
import AdminReports from './pages/admin/Reports';
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <DatabaseProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Landing page redirects to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Customer Routes */}
            <Route 
              path="/customer" 
              element={
                <ProtectedRoute role="customer">
                  <CustomerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/customer/maintenance-history" 
              element={
                <ProtectedRoute role="customer">
                  <CustomerMaintenanceHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/customer/contracts" 
              element={
                <ProtectedRoute role="customer">
                  <CustomerContracts />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/customer/request-maintenance" 
              element={
                <ProtectedRoute role="customer">
                  <CustomerMaintenanceRequest />
                </ProtectedRoute>
              } 
            />
            
            {/* Employee Routes */}
            <Route 
              path="/employee" 
              element={
                <ProtectedRoute role="employee">
                  <EmployeeDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/employee/schedule" 
              element={
                <ProtectedRoute role="employee">
                  <EmployeeSchedule />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/employee/maintenance/:id" 
              element={
                <ProtectedRoute role="employee">
                  <EmployeeMaintenanceForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/employee/inventory" 
              element={
                <ProtectedRoute role="employee">
                  <EmployeeInventory />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <ProtectedRoute role="admin">
                  <AdminUsers />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/contracts" 
              element={
                <ProtectedRoute role="admin">
                  <AdminContracts />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/inventory" 
              element={
                <ProtectedRoute role="admin">
                  <AdminInventory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/reports" 
              element={
                <ProtectedRoute role="admin">
                  <AdminReports />
                </ProtectedRoute>
              } 
            />
            
            {/* 404 Page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </DatabaseProvider>
    </AuthProvider>
  );
}

export default App;