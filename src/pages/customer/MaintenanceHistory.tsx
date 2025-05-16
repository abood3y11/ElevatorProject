import React, { useState } from 'react';
import { Calendar, Filter, Download, Search, ArrowUpDown } from 'lucide-react';
import Layout from '../../components/common/Layout';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

// Mock data
const maintenanceHistory = [
  {
    id: 1,
    elevatorId: 1,
    buildingName: 'Main Office Tower',
    date: '2025-03-15',
    type: 'Regular Maintenance',
    technician: 'Ahmad Ali',
    status: 'completed',
    notes: 'Replaced door sensors, lubricated guide rails, adjusted door timing.'
  },
  {
    id: 2,
    elevatorId: 1,
    buildingName: 'Main Office Tower',
    date: '2025-02-15',
    type: 'Regular Maintenance',
    technician: 'Sara Khan',
    status: 'completed',
    notes: 'General inspection, cleaned control panel, tested emergency systems.'
  },
  {
    id: 3,
    elevatorId: 2,
    buildingName: 'East Wing Building',
    date: '2025-03-10',
    type: 'Regular Maintenance',
    technician: 'Mohammed Hassan',
    status: 'completed',
    notes: 'Checked motor, replaced worn belts, lubricated moving parts.'
  },
  {
    id: 4,
    elevatorId: 3,
    buildingName: 'West Residential Block',
    date: '2025-03-02',
    type: 'Emergency Repair',
    technician: 'Ahmad Ali',
    status: 'completed',
    notes: 'Fixed door malfunction, replaced damaged wiring in control panel.'
  },
  {
    id: 5,
    elevatorId: 3,
    buildingName: 'West Residential Block',
    date: '2025-01-05',
    type: 'Regular Maintenance',
    technician: 'Fatima Ibrahim',
    status: 'completed',
    notes: 'Routine inspection, tested safety features, lubricated moving parts.'
  }
];

const CustomerMaintenanceHistory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  
  // Get unique buildings, types, and years for filters
  const buildings = Array.from(new Set(maintenanceHistory.map(item => item.buildingName)));
  const types = Array.from(new Set(maintenanceHistory.map(item => item.type)));
  const years = Array.from(new Set(maintenanceHistory.map(item => item.date.split('-')[0])));
  
  // Apply filters
  const filteredHistory = maintenanceHistory.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.buildingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.technician.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.notes.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesBuilding = selectedBuilding === null || item.buildingName === selectedBuilding;
    const matchesType = selectedType === null || item.type === selectedType;
    const matchesYear = selectedYear === null || item.date.startsWith(selectedYear);
    
    return matchesSearch && matchesBuilding && matchesType && matchesYear;
  });
  
  return (
    <Layout role="customer" title="Maintenance History">
      <Card>
        <div className="flex flex-col md:flex-row justify-between mb-6">
          <div className="flex-1 mb-4 md:mb-0 md:mr-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by building, type, technician..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <select 
                className="appearance-none pl-8 pr-8 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={selectedBuilding || ''}
                onChange={(e) => setSelectedBuilding(e.target.value || null)}
              >
                <option value="">All Buildings</option>
                {buildings.map(building => (
                  <option key={building} value={building}>{building}</option>
                ))}
              </select>
              <Filter className="absolute left-2 top-2.5 text-gray-400" size={16} />
            </div>
            
            <div className="relative">
              <select 
                className="appearance-none pl-8 pr-8 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={selectedType || ''}
                onChange={(e) => setSelectedType(e.target.value || null)}
              >
                <option value="">All Types</option>
                {types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <Filter className="absolute left-2 top-2.5 text-gray-400" size={16} />
            </div>
            
            <div className="relative">
              <select 
                className="appearance-none pl-8 pr-8 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={selectedYear || ''}
                onChange={(e) => setSelectedYear(e.target.value || null)}
              >
                <option value="">All Years</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <Calendar className="absolute left-2 top-2.5 text-gray-400" size={16} />
            </div>
            
            <Button variant="outline" size="sm" className="flex items-center">
              <Download size={16} className="mr-1" />
              Export
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    Date
                    <ArrowUpDown size={14} className="ml-1" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Building</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.date}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.buildingName}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.type}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.technician}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Badge variant="success" className="capitalize">{item.status}</Badge>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <Button variant="outline" size="sm">View Details</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredHistory.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No maintenance records found matching your filters.</p>
          </div>
        )}
        
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">{filteredHistory.length}</span> of{' '}
            <span className="font-medium">{maintenanceHistory.length}</span> records
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <span className="px-3 py-1 border border-gray-300 rounded-md bg-blue-50 text-blue-600 text-sm">1</span>
            <Button variant="outline" size="sm" disabled>Next</Button>
          </div>
        </div>
      </Card>
    </Layout>
  );
};

export default CustomerMaintenanceHistory;