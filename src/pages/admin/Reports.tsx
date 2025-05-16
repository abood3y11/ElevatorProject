import React, { useState } from 'react';
import { Download, Filter, Calendar, ArrowUpDown, BarChart2, PieChart as PieChartIcon, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import Layout from '../../components/common/Layout';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

// Mock data for charts
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

const customerSatisfactionData = [
  { name: 'Very Satisfied', value: 45, color: '#9333EA' },
  { name: 'Satisfied', value: 30, color: '#A855F7' },
  { name: 'Neutral', value: 15, color: '#C084FC' },
  { name: 'Dissatisfied', value: 10, color: '#E9D5FF' },
];

const AdminReports: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedMonth, setSelectedMonth] = useState('All');
  
  return (
    <Layout role="admin" title="Reports & Analytics">
      <div className="mb-6 flex justify-between items-center">
        <div className="flex space-x-4">
          <div className="relative">
            <select 
              className="appearance-none pl-8 pr-8 py-2 border border-purple-300 rounded-md bg-white focus:ring-purple-500 focus:border-purple-500"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
            <Calendar className="absolute left-2 top-2.5 text-purple-400" size={16} />
          </div>
          
          <div className="relative">
            <select 
              className="appearance-none pl-8 pr-8 py-2 border border-purple-300 rounded-md bg-white focus:ring-purple-500 focus:border-purple-500"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="All">All Months</option>
              <option value="Jan">January</option>
              <option value="Feb">February</option>
              <option value="Mar">March</option>
              <option value="Apr">April</option>
              <option value="May">May</option>
              <option value="Jun">June</option>
            </select>
            <Filter className="absolute left-2 top-2.5 text-purple-400" size={16} />
          </div>
        </div>
        
        <Button variant="outline" className="flex items-center border-purple-300 text-purple-700 hover:bg-purple-50">
          <Download size={16} className="mr-2" />
          Export Report
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-gradient-to-br from-purple-50 to-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-purple-900">Maintenance Overview</h3>
              <p className="text-sm text-purple-600">Scheduled vs Emergency Maintenance</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <BarChart2 size={16} className="mr-1" />
              Details
            </Button>
          </div>
          
          <div className="h-80">
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
        
        <Card className="bg-gradient-to-br from-purple-50 to-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-purple-900">Customer Satisfaction</h3>
              <p className="text-sm text-purple-600">Overall Rating Distribution</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <PieChartIcon size={16} className="mr-1" />
              Details
            </Button>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={customerSatisfactionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {customerSatisfactionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [`${value}%`, name]}
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
          
          <div className="mt-4">
            <div className="flex flex-wrap justify-center gap-4">
              {customerSatisfactionData.map((entry) => (
                <div key={entry.name} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-1"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-xs text-purple-700">{entry.name}: {entry.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="bg-gradient-to-br from-purple-50 to-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-purple-900">Revenue Trend</h3>
              <p className="text-sm text-purple-600">Monthly Revenue Analysis</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <TrendingUp size={16} className="mr-1" />
              Details
            </Button>
          </div>
          
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
        
        <Card className="bg-gradient-to-br from-purple-50 to-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-purple-900">Key Metrics</h3>
            <Button 
              variant="outline" 
              size="sm"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              View All
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-purple-700">Average Response Time</span>
                <Badge variant="success">Improved</Badge>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-2xl font-semibold text-purple-900">2.5 hours</span>
                <span className="text-sm text-green-600">↓ 15%</span>
              </div>
              <div className="w-full bg-purple-100 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-purple-700">First-Time Fix Rate</span>
                <Badge variant="success">On Target</Badge>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-2xl font-semibold text-purple-900">92%</span>
                <span className="text-sm text-green-600">↑ 3%</span>
              </div>
              <div className="w-full bg-purple-100 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-purple-700">Contract Renewal Rate</span>
                <Badge variant="warning">Needs Attention</Badge>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-2xl font-semibold text-purple-900">88%</span>
                <span className="text-sm text-amber-600">↓ 2%</span>
              </div>
              <div className="w-full bg-purple-100 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '88%' }}></div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-purple-700">Customer Retention</span>
                <Badge variant="success">Excellent</Badge>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-2xl font-semibold text-purple-900">95%</span>
                <span className="text-sm text-green-600">↑ 5%</span>
              </div>
              <div className="w-full bg-purple-100 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '95%' }}></div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminReports;