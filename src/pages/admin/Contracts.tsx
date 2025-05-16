import React from 'react';
import { Building2, FileText, Calendar, AlertCircle, Plus, Search, Filter } from 'lucide-react';
import Layout from '../../components/common/Layout';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { mockData } from '../../mockData/systemData';

const AdminContracts: React.FC = () => {
  return (
    <Layout role="admin" title="Contract Management">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Contracts</p>
              <p className="mt-1 text-2xl font-semibold text-purple-700">28</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <FileText className="text-purple-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Value</p>
              <p className="mt-1 text-2xl font-semibold text-purple-700">$1.2M</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Building2 className="text-purple-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Expiring Soon</p>
              <p className="mt-1 text-2xl font-semibold text-purple-700">5</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Calendar className="text-purple-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Renewal</p>
              <p className="mt-1 text-2xl font-semibold text-purple-700">3</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <AlertCircle className="text-purple-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search contracts..."
                className="w-full pl-10 pr-4 py-2 border border-purple-200 rounded-lg focus:ring-purple-500 focus:border-purple-500"
              />
              <Search className="absolute left-3 top-2.5 text-purple-500" size={18} />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative items-center">
              <select className="appearance-none pl-10 pr-8 py-2 border border-purple-200 rounded-lg bg-white focus:ring-purple-500 focus:border-purple-500">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
              </select>
              <Filter className="absolute left-3 top-2.5 text-purple-500" size={16} />
            </div>

            <Button className="flex items-center bg-purple-600 hover:bg-purple-700">
              <Plus size={20} className="mr-2" />
              New Contract
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-purple-200">
            <thead className="bg-purple-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Contract ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Building</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Start Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">End Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-purple-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-purple-100">
              {mockData.contracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-purple-50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-900">{contract.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-700">
                    {mockData.buildings.find(b => b.id === contract.buildingId)?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-700">{contract.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-700">${contract.value.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-700">{contract.startDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-700">{contract.endDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="success" className="capitalize">{contract.status}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button variant="outline" size="sm" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-purple-100 pt-4">
          <div className="text-sm text-purple-700">
            Showing <span className="font-medium">{mockData.contracts.length}</span> contracts
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-purple-200 text-purple-700 hover:bg-purple-50" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" className="border-purple-200 text-purple-700 hover:bg-purple-50" disabled>
              Next
            </Button>
          </div>
        </div>
      </Card>
    </Layout>
  );
};

export default AdminContracts;