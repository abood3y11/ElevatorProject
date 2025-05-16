import React, { useState } from 'react';
import { Package, Search, Filter, AlertTriangle, Plus, ArrowUpDown } from 'lucide-react';
import Layout from '../../components/common/Layout';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

// Mock data
const inventoryItems = [
  {
    id: 1,
    name: 'Door Sensors',
    category: 'Electronics',
    stock: 15,
    minStock: 10,
    location: 'Warehouse A',
    lastUpdated: '2025-03-25'
  },
  {
    id: 2,
    name: 'Motor Belts',
    category: 'Mechanical',
    stock: 8,
    minStock: 12,
    location: 'Warehouse B',
    lastUpdated: '2025-03-24'
  },
  {
    id: 3,
    name: 'Control Panels',
    category: 'Electronics',
    stock: 5,
    minStock: 8,
    location: 'Warehouse A',
    lastUpdated: '2025-03-23'
  },
  {
    id: 4,
    name: 'Safety Brakes',
    category: 'Mechanical',
    stock: 20,
    minStock: 15,
    location: 'Warehouse C',
    lastUpdated: '2025-03-22'
  }
];

const EmployeeInventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const lowStockItems = inventoryItems.filter(item => item.stock < item.minStock);

  return (
    <Layout role="employee" title="Parts Inventory">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="border-l-4 border-emerald-500 hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Items</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">{inventoryItems.length}</p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-full">
              <Package className="text-emerald-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-amber-500 hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
              <p className="mt-1 text-2xl font-semibold text-amber-700">{lowStockItems.length}</p>
            </div>
            <div className="bg-amber-100 p-3 rounded-full">
              <AlertTriangle className="text-amber-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-emerald-500 hover:shadow-lg transition-shadow duration-200">
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center">
            <Plus size={20} className="mr-2" />
            Request Parts
          </Button>
        </Card>
      </div>

      <Card>
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search inventory..."
                className="w-full pl-10 pr-4 py-2 border border-emerald-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-emerald-500" size={18} />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <select
                className="appearance-none pl-10 pr-8 py-2 border border-emerald-200 rounded-lg bg-white focus:ring-emerald-500 focus:border-emerald-500"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="electronics">Electronics</option>
                <option value="mechanical">Mechanical</option>
              </select>
              <Filter className="absolute left-3 top-2.5 text-emerald-500" size={16} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-emerald-200">
            <thead className="bg-emerald-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">
                  <div className="flex items-center cursor-pointer hover:text-emerald-900">
                    Item Name
                    <ArrowUpDown size={14} className="ml-1" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">
                  Stock Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-emerald-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-emerald-100">
              {inventoryItems.map((item) => (
                <tr key={item.id} className="hover:bg-emerald-50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-900">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-700">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-700">
                    <div className="flex items-center">
                      <span className="mr-2">{item.stock}</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            item.stock < item.minStock
                              ? 'bg-red-500'
                              : item.stock < item.minStock * 1.5
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${(item.stock / (item.minStock * 2)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-700">
                    {item.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-700">
                    {item.lastUpdated}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      variant={item.stock < item.minStock ? 'danger' : 'success'}
                      className="capitalize"
                    >
                      {item.stock < item.minStock ? 'Low Stock' : 'In Stock'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      Request
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-emerald-100 pt-4">
          <div className="text-sm text-emerald-700">
            Showing <span className="font-medium">{inventoryItems.length}</span> items
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              disabled
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              disabled
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </Layout>
  );
};

export default EmployeeInventory;