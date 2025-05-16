import React, { useState } from 'react';
import { Users as UsersIcon, Search, Filter, Plus, Mail, Phone, Calendar, Building2 } from 'lucide-react';
import Layout from '../../components/common/Layout';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { mockData } from '../../mockData/systemData';

const AdminUsers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  return (
    <Layout role="admin" title="User Management">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="mt-1 text-2xl font-semibold text-purple-700">
                {mockData.employees.length + mockData.customers.length}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <UsersIcon className="text-purple-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Employees</p>
              <p className="mt-1 text-2xl font-semibold text-purple-700">{mockData.employees.length}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Building2 className="text-purple-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Customers</p>
              <p className="mt-1 text-2xl font-semibold text-purple-700">{mockData.customers.length}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Building2 className="text-purple-600" size={24} />
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
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2 border border-purple-200 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-purple-500" size={18} />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex items-center"> 
            <div className="relative">
              <select
                className="flex items-center appearance-none pl-10 pr-8 py-2 border border-purple-200 rounded-lg bg-white focus:ring-purple-500 focus:border-purple-500"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="employee">Employees</option>
                <option value="customer">Customers</option>
              </select>
              <Filter className="absolute left-3 top-2.5 text-purple-500" size={16} />
            </div>
            </div>  

            <Button className="flex items-center bg-purple-600 hover:bg-purple-700">
              <Plus size={20} className="mr-2" />
              Add User
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockData.employees.map((employee) => (
            <div key={employee.id} className="bg-white rounded-lg border border-purple-200 p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-semibold text-lg">
                    {employee.name.charAt(0)}
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-purple-900">{employee.name}</h3>
                    <p className="text-sm text-purple-600">{employee.role}</p>
                  </div>
                </div>
                <Badge variant="info" className="capitalize">Employee</Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-purple-700">
                  <Mail size={16} className="mr-2" />
                  <span className="text-sm">{employee.email}</span>
                </div>
                <div className="flex items-center text-purple-700">
                  <Phone size={16} className="mr-2" />
                  <span className="text-sm">{employee.phone}</span>
                </div>
                <div className="flex items-center text-purple-700">
                  <Calendar size={16} className="mr-2" />
                  <span className="text-sm">Joined {employee.joinDate}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-purple-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  View Profile
                </Button>
              </div>
            </div>
          ))}

          {mockData.customers.map((customer) => (
            <div key={customer.id} className="bg-white rounded-lg border border-purple-200 p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-semibold text-lg">
                    {customer.name.charAt(0)}
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-purple-900">{customer.name}</h3>
                    <p className="text-sm text-purple-600">{customer.contactPerson}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="capitalize">Customer</Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-purple-700">
                  <Mail size={16} className="mr-2" />
                  <span className="text-sm">{customer.email}</span>
                </div>
                <div className="flex items-center text-purple-700">
                  <Phone size={16} className="mr-2" />
                  <span className="text-sm">{customer.phone}</span>
                </div>
                <div className="flex items-center text-purple-700">
                  <Building2 size={16} className="mr-2" />
                  <span className="text-sm">{customer.address}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-purple-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </Layout>
  );
};

export default AdminUsers;