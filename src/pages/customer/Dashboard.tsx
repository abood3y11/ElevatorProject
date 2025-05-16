import React, { useState } from 'react';
import { Calendar, Clock, ClipboardCheck, AlertTriangle, ExternalLink, Building2 } from 'lucide-react';
import Layout from '../../components/common/Layout';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { Link } from 'react-router-dom';

// Mock data
const elevators = [
  { 
    id: 1, 
    building: 'Main Office Tower', 
    model: 'TechLift 3000', 
    lastMaintenance: '2025-02-15', 
    nextMaintenance: '2025-05-15',
    status: 'operational' 
  },
  { 
    id: 2, 
    building: 'East Wing Building', 
    model: 'SpeedVator X2', 
    lastMaintenance: '2025-03-10', 
    nextMaintenance: '2025-06-10',
    status: 'operational' 
  },
  { 
    id: 3, 
    building: 'West Residential Block', 
    model: 'EcoLift 2500', 
    lastMaintenance: '2025-01-05', 
    nextMaintenance: '2025-04-05',
    status: 'pending_maintenance' 
  }
];

const maintenanceRequests = [
  { 
    id: 1, 
    elevatorId: 3, 
    building: 'West Residential Block',
    requestDate: '2025-03-28', 
    scheduledDate: '2025-04-02',
    status: 'scheduled',
    description: 'Strange noise when arriving at the 5th floor' 
  }
];

const contractDetails = {
  id: 'CT-2025-0342',
  type: 'Premium Maintenance',
  startDate: '2025-01-01',
  endDate: '2026-01-01',
  remainingDays: 276,
  status: 'active'
};

const CustomerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  
  const filteredElevators = activeTab === 'all' 
    ? elevators 
    : elevators.filter(elevator => elevator.status === activeTab);
  
  return (
    <Layout role="customer" title="Customer Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="border-l-4 border-blue-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Elevators</p>
              <p className="mt-1 text-2xl font-semibold">{elevators.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Building2 className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>
        
        <Card className="border-l-4 border-green-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Operational</p>
              <p className="mt-1 text-2xl font-semibold">
                {elevators.filter(e => e.status === 'operational').length}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <ClipboardCheck className="text-green-600" size={24} />
            </div>
          </div>
        </Card>
        
        <Card className="border-l-4 border-amber-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Maintenance</p>
              <p className="mt-1 text-2xl font-semibold">
                {elevators.filter(e => e.status === 'pending_maintenance').length}
              </p>
            </div>
            <div className="bg-amber-100 p-3 rounded-full">
              <Clock className="text-amber-600" size={24} />
            </div>
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Your Elevators">
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-md text-sm ${
                  activeTab === 'all' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('operational')}
                className={`px-3 py-1 rounded-md text-sm ${
                  activeTab === 'operational' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Operational
              </button>
              <button
                onClick={() => setActiveTab('pending_maintenance')}
                className={`px-3 py-1 rounded-md text-sm ${
                  activeTab === 'pending_maintenance' 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending Maintenance
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Building</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Maintenance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Maintenance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredElevators.map(elevator => (
                    <tr key={elevator.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{elevator.building}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{elevator.model}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{elevator.lastMaintenance}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{elevator.nextMaintenance}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {elevator.status === 'operational' ? (
                          <Badge variant="success">Operational</Badge>
                        ) : (
                          <Badge variant="warning">Pending Maintenance</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Link to="/customer/maintenance-history">
                <Button variant="outline" size="sm">
                  View All History
                  <ExternalLink className="ml-1" size={14} />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card title="Contract Status">
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Contract ID:</span>
                <span className="font-medium">{contractDetails.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">{contractDetails.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <Badge variant="success" className="capitalize">
                  {contractDetails.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valid Until:</span>
                <span className="font-medium">{contractDetails.endDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Days Remaining:</span>
                <span className="font-semibold text-blue-600">{contractDetails.remainingDays} days</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div 
                  className={`h-2.5 rounded-full ${
                    contractDetails.remainingDays > 180 
                      ? 'bg-green-600' 
                      : contractDetails.remainingDays > 60 
                        ? 'bg-amber-500' 
                        : 'bg-red-600'
                  }`}
                  style={{ width: `${(contractDetails.remainingDays / 365) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="mt-6">
              <Link to="/customer/contracts">
                <Button variant="outline" size="sm" className="w-full">
                  Manage Contract
                </Button>
              </Link>
            </div>
          </Card>
          
          <Card title="Maintenance Requests">
            {maintenanceRequests.length > 0 ? (
              <div className="space-y-4">
                {maintenanceRequests.map(request => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{request.building}</h4>
                        <p className="text-sm text-gray-500 mt-1">{request.description}</p>
                      </div>
                      <Badge 
                        variant={request.status === 'scheduled' ? 'info' : 'warning'}
                        className="capitalize"
                      >
                        {request.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center mt-3 text-sm text-gray-500">
                      <Calendar size={16} className="mr-1" />
                      <span>Scheduled: {request.scheduledDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6">
                <AlertTriangle className="text-gray-400 mb-2" size={32} />
                <p className="text-gray-500 mb-4">No pending maintenance requests</p>
                <Link to="/customer/request-maintenance">
                  <Button size="sm">Request Maintenance</Button>
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default CustomerDashboard;