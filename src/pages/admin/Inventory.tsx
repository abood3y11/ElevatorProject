import React, { useState } from 'react';
import { Package, Search, Filter, AlertTriangle, Plus, ArrowUpDown, RefreshCcw, Settings } from 'lucide-react';
import Layout from '../../components/common/Layout';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { mockData } from '../../mockData/systemData';

const AdminInventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  return (
    <Layout role="admin" title="Inventory Management">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="border-l-4 border-purple-500 bg-gradient-to-br from-purple-50 to-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Items</p>
              <p className="mt-1 text-2xl font-semibold text-purple-700">{mockData.inventory.length}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Package className="text-purple-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-amber-500 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
              <p className="mt-1 text-2xl font-semibold text-amber-700">
                {mockData.inventory.filter(item => item.currentStock < item.minimumStock).length}
              </p>
            </div>
            <div className="bg-amber-100 p-3 rounded-full">
              <AlertTriangle className="text-amber-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-purple-500 bg-gradient-to-br from-purple-50 to-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Categories</p>
              <p className="mt-1 text-2xl font-semibold text-purple-700">
                {new Set(mockData.inventory.map(item => item.category)).size}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Settings className="text-purple-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-purple-500 bg-gradient-to-br from-purple-50 to-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Last Updated</p>
              <p className="mt-1 text-sm font-semibold text-purple-700">
                {new Date().toLocaleDateString()}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <RefreshCcw className="text-purple-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-purple-50 to-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search inventory..."
                className="w-full pl-10 pr-4 py-2 border border-purple-200 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-purple-500" size={18} />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <select
                className="appearance-none pl-10 pr-8 py-2 border border-purple-200 rounded-lg bg-white focus:ring-purple-500 focus:border-purple-500"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="electronics">Electronics</option>
                <option value="mechanical">Mechanical</option>
              </select>
              <Filter className="absolute left-3 top-2.5 text-purple-500" size={16} />
            </div>

            <Button className="flex items-center bg-purple-600 hover:bg-purple-700 ">
              <Plus size={20} className="mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-purple-200">
            <thead className="bg-purple-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                  <div className="flex items-center cursor-pointer hover:text-purple-900">
                    Item Name
                    <ArrowUpDown size={14} className="ml-1" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                  Stock Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                  Last Restocked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-purple-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-purple-100">
              {mockData.inventory.map((item) => (
                <tr key={item.id} className="hover:bg-purple-50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="bg-purple-100 rounded-lg p-2 mr-3">
                        <Package className="text-purple-600" size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-purple-900">{item.name}</div>
                        <div className="text-sm text-purple-500">{item.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-700">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm text-purple-700 mr-2">
                        {item.currentStock}/{item.minimumStock}
                      </span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            item.currentStock < item.minimumStock
                              ? 'bg-red-500'
                              : item.currentStock < item.minimumStock * 1.5
                              ? 'bg-amber-500'
                              : 'bg-purple-500'
                          }`}
                          style={{ width: `${(item.currentStock / (item.minimumStock * 2)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-700">
                    {item.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-700">
                    {item.lastRestocked}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      variant={item.currentStock < item.minimumStock ? 'danger' : 'success'}
                      className="capitalize"
                    >
                      {item.currentStock < item.minimumStock ? 'Low Stock' : 'In Stock'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-200 text-purple-700 hover:bg-purple-50"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Restock
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-purple-100 pt-4">
          <div className="text-sm text-purple-700">
            Showing <span className="font-medium">{mockData.inventory.length}</span> items
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
              disabled
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
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

export default AdminInventory;