import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, User, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '../../components/common/Layout';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

// Mock data
const scheduleData = [
  {
    id: 1,
    date: '2025-04-01',
    appointments: [
      {
        id: 'APT-001',
        time: '09:00 AM',
        customer: 'TechCorp Inc.',
        building: 'Main Office Tower',
        address: '123 Business Ave, Downtown',
        type: 'Regular Maintenance',
        status: 'scheduled'
      },
      {
        id: 'APT-002',
        time: '11:30 AM',
        customer: 'Highrise Apartments',
        building: 'West Wing',
        address: '456 Living St, Westside',
        type: 'Emergency Repair',
        status: 'scheduled'
      }
    ]
  },
  {
    id: 2,
    date: '2025-04-02',
    appointments: [
      {
        id: 'APT-003',
        time: '10:00 AM',
        customer: 'City Hospital',
        building: 'Medical Center',
        address: '789 Health Blvd, Eastside',
        type: 'Regular Maintenance',
        status: 'scheduled'
      }
    ]
  }
];

const EmployeeSchedule: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('2025-04-01');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  return (
    <Layout role="employee" title="Work Schedule">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1 w-full md:w-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search appointments..."
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
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="regular">Regular Maintenance</option>
              <option value="emergency">Emergency Repairs</option>
            </select>
            <Filter className="absolute left-3 top-2.5 text-emerald-500" size={16} />
          </div>

          <Button
            variant="outline"
            className="flex items-center border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <CalendarIcon size={16} className="mr-2" />
            View Calendar
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          className="flex items-center border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          <ChevronLeft size={16} className="mr-1" />
          Previous Week
        </Button>

        <div className="text-center">
          <h2 className="text-lg font-semibold text-emerald-900">April 2025</h2>
          <p className="text-sm text-emerald-600">Week 1</p>
        </div>

        <Button
          variant="outline"
          className="flex items-center border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          Next Week
          <ChevronRight size={16} className="ml-1" />
        </Button>
      </div>

      <div className="space-y-6">
        {scheduleData.map((day) => (
          <Card key={day.id} className="overflow-hidden">
            <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100">
              <h3 className="text-lg font-semibold text-emerald-900">
                {new Date(day.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
              <p className="text-sm text-emerald-600">{day.appointments.length} appointments</p>
            </div>

            <div className="divide-y divide-emerald-100">
              {day.appointments.map((appointment) => (
                <div key={appointment.id} className="p-6 hover:bg-emerald-50 transition-colors duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-medium text-emerald-900">{appointment.customer}</h4>
                      <p className="text-emerald-600">{appointment.building}</p>
                    </div>
                    <Badge
                      variant={appointment.type === 'Emergency Repair' ? 'danger' : 'info'}
                      className="capitalize"
                    >
                      {appointment.type}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center text-emerald-700">
                      <Clock size={16} className="mr-2 text-emerald-500" />
                      <span>{appointment.time}</span>
                    </div>
                    <div className="flex items-center text-emerald-700">
                      <User size={16} className="mr-2 text-emerald-500" />
                      <span>{appointment.type}</span>
                    </div>
                    <div className="flex items-center text-emerald-700">
                      <MapPin size={16} className="mr-2 text-emerald-500" />
                      <span>{appointment.address}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      Start Maintenance
                    </Button>
                    <Button
                      variant="outline"
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </Layout>
  );
};

export default EmployeeSchedule;