import React from 'react';
import { BarChart2, TrendingUp, Users, Building2, Package, AlertCircle, Clipboard, CheckCircle2, Clock3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import Layout from '../../components/common/Layout';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { Link } from 'react-router-dom';

// Mock data
const maintenanceData = [
  { month: 'Jan', scheduled: 45, emergency: 12 },
  { month: 'Feb', scheduled: 52, emergency: 8 },
  { month: 'Mar', scheduled: 49, emergency: 15 },
  { month: 'Apr', scheduled: 55, emergency: 10 },
  { month: 'May', scheduled: 48, emergency: 7 },
  { month: 'Jun', scheduled: 50, emergency: 9 },
];

const revenueData = [
  { month: 'Jan', value: 35000, trend: 32000 },
  { month: 'Feb', value: 38000, trend: 35000 },
  { month: 'Mar', value: 42000, trend: 39000 },
  { month: 'Apr', value: 40000, trend: 41000 },
  { month: 'May', value: 45000, trend: 43000 },
  { month: 'Jun', value: 48000, trend: 46000 },
];

const statusData = [
  { name: 'Operational', value: 42, color: '#9333EA' },
  { name: 'Under Maintenance', value: 8, color: '#A855F7' },
  { name: 'Needs Repair', value: 3, color: '#C084FC' }
];

const technicians = [
  { id: 1, name: 'Ahmad Ali', today: 3, completed: 2, image: null },
  { id: 2, name: 'Sara Khan', today: 4, completed: 4, image: null },
  { id: 3, name: 'Mohammed Hassan', today: 5, completed: 3, image: null },
  { id: 4, name: 'Fatima Ibrahim', today: 2, completed: 0, image: null },
];

const expiringContracts = [
  { id: 'CTR-2025-012', customer: 'Green Tower Co.', expiry: '2025-04-15', daysLeft: 14 },
  { id: 'CTR-2025-015', customer: 'Blue Ocean Hotels', expiry: '2025-04-22', daysLeft: 21 },
  { id: 'CTR-2025-018', customer: 'Sunshine Apartments', expiry: '2025-05-01', daysLeft: 30 },
];

const lowStockItems = [
  { id: 1, name: 'Door Sensors', stock: 5, minimum: 10 },
  { id: 2, name: 'Motor Belts', stock: 3, minimum: 8 },
  { id: 3, name: 'Control Panels', stock: 4, minimum: 6 },
];

const AdminDashboard: React.FC = () => {
  return (
    <Layout role="admin" title="Admin Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="bg-gradient-to-br from-purple-50 to-white border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Elevators</p>
              <p className="mt-1 text-2xl font-semibold text-purple-700">53</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-full shadow-lg">
              <Building2 className="text-white" size={24} />
            </div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-white border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Contracts</p>
              <p className="mt-1 text-2xl font-semibold text-purple-700">28</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-full shadow-lg">
              <Clipboard className="text-white" size={24} />
            </div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-white border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Maintenance Today</p>
              <p className="mt-1 text-2xl font-semibold text-purple-700">14</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-full shadow-lg">
              <CheckCircle2 className="text-white" size={24} />
            </div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-white border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Requests</p>
              <p className="mt-1 text-2xl font-semibold text-purple-700">7</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-full shadow-lg">
              <Clock3 className="text-white" size={24} />
            </div>
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Revenue Trend (Last 6 Months)" className="lg:col-span-2 bg-gradient-to-br from-purple-50 to-white">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9333EA" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#9333EA" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C084FC" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#C084FC" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9D5FF" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip 
                  formatter={(value) => [`$${value}`, 'Revenue']}
                  contentStyle={{ 
                    backgroundColor: 'white',
                    borderRadius: '0.375rem',
                    border: '1px solid #E9D5FF',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#9333EA" 
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="trend" 
                  stroke="#C084FC" 
                  fill="url(#trendGradient)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        <Card title="Elevator Status" className="bg-gradient-to-br from-purple-50 to-white">
          <div className="h-72 flex flex-col justify-between">
            <div className="flex-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [value, name]}
                    contentStyle={{ 
                      backgroundColor: 'white',
                      borderRadius: '0.375rem',
                      border: '1px solid #E9D5FF',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex justify-center mt-2 space-x-4">
              {statusData.map((entry) => (
                <div key={entry.name} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-1"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-xs text-purple-700">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card title="Maintenance Types (Last 6 Months)" className="lg:col-span-2 bg-gradient-to-br from-purple-50 to-white">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maintenanceData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="scheduledGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9333EA" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#9333EA" stopOpacity={0.3}/>
                  </linearGradient>
                  <linearGradient id="emergencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C084FC" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#C084FC" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9D5FF" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white',
                    borderRadius: '0.375rem',
                    border: '1px solid #E9D5FF',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="scheduled" name="Scheduled" fill="url(#scheduledGradient)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="emergency" name="Emergency" fill="url(#emergencyGradient)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        <div className="space-y-6">
          <Card title="Technician Status" className="bg-gradient-to-br from-purple-50 to-white">
            <div className="space-y-4">
              {technicians.map(tech => (
                <div key={tech.id} className="flex items-center justify-between p-3 rounded-lg border border-purple-200 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center">
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-8 h-8 rounded-full flex items-center justify-center text-white font-medium shadow-lg">
                      {tech.name.charAt(0)}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-900">{tech.name}</p>
                      <p className="text-xs text-purple-600">{tech.completed}/{tech.today} tasks</p>
                    </div>
                  </div>
                  <div className="w-16 bg-purple-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        tech.completed === tech.today 
                          ? 'bg-gradient-to-r from-green-500 to-green-600' 
                          : tech.completed > 0 
                            ? 'bg-gradient-to-r from-purple-500 to-purple-600' 
                            : 'bg-gray-300'
                      }`}
                      style={{ width: `${(tech.completed / tech.today) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          
          <Card title="Expiring Contracts" className="bg-gradient-to-br from-purple-50 to-white">
            <div className="space-y-3">
              {expiringContracts.map(contract => (
                <div key={contract.id} className="p-3 border border-purple-200 rounded-lg hover:shadow-md transition-shadow duration-200">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-purple-900">{contract.customer}</p>
                    <Badge 
                      variant={
                        contract.daysLeft <= 14 
                          ? 'danger' 
                          : contract.daysLeft <= 30 
                            ? 'warning' 
                            : 'info'
                      }
                    >
                      {contract.daysLeft} days
                    </Badge>
                  </div>
                  <p className="text-xs text-purple-600 mt-1">Expires: {contract.expiry}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-4">
              <Link to="/admin/contracts">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  View All Contracts
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card title="Inventory Alerts" className="bg-gradient-to-br from-purple-50 to-white">
          <div className="space-y-3">
            {lowStockItems.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 border border-purple-200 rounded-lg hover:shadow-md transition-shadow duration-200">
                <div>
                  <p className="font-medium text-sm text-purple-900">{item.name}</p>
                  <div className="flex items-center mt-1">
                    <AlertCircle size={14} className="text-amber-500 mr-1" />
                    <p className="text-xs text-purple-600">
                      Low stock: {item.stock} / {item.minimum}
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  Order
                </Button>
              </div>
            ))}
          </div>
          
          <div className="mt-4">
            <Link to="/admin/inventory">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                Manage Inventory
              </Button>
            </Link>
          </div>
        </Card>
        
        <Card title="Recent Activities" className="lg:col-span-2 bg-gradient-to-br from-purple-50 to-white">
          <div className="space-y-4">
            <div className="relative pl-6">
              <div className="absolute left-0 top-2 w-3 h-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full shadow-lg"></div>
              <p className="text-sm font-medium text-purple-900">New contract signed with Horizon Towers</p>
              <p className="text-xs text-purple-600">Today, 10:35 AM</p>
            </div>
            
            <div className="relative pl-6">
              <div className="absolute left-0 top-2 w-3 h-3 bg-gradient-to-br from-green-500 to-green-600 rounded-full shadow-lg"></div>
              <p className="text-sm font-medium text-purple-900">Emergency repair completed at Medical Center</p>
              <p className="text-xs text-purple-600">Today, 09:12 AM</p>
            </div>
            
            <div className="relative pl-6">
              <div className="absolute left-0 top-2 w-3 h-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full shadow-lg"></div>
              <p className="text-sm font-medium text-purple-900">Inventory updated: 10 new control panels added</p>
              <p className="text-xs text-purple-600">Yesterday, 04:30 PM</p>
            </div>
            
            <div className="relative pl-6">
              <div className="absolute left-0 top-2 w-3 h-3 bg-gradient-to-br from-red-500 to-red-600 rounded-full shadow-lg"></div>
              <p className="text-sm font-medium text-purple-900">Contract with City Plaza expired</p>
              <p className="text-xs text-purple-600">Yesterday, 01:15 PM</p>
            </div>
            
            <div className="relative pl-6">
              <div className="absolute left-0 top-2 w-3 h-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full shadow-lg"></div>
              <p className="text-sm font-medium text-purple-900">New maintenance technician hired: Youssef Omar</p>
              <p className="text-xs text-purple-600">Apr 2, 2025, 11:30 AM</p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminDashboard;