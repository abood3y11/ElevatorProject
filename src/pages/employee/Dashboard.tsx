import React from 'react';
import { Calendar, Clock, MapPin, CheckCircle, User, Package, AlertCircle, ArrowRight } from 'lucide-react';
import Layout from '../../components/common/Layout';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { Link } from 'react-router-dom';

// Mock data
const todayAppointments = [
  {
    id: 1,
    time: '09:00 AM',
    customer: 'TechCorp Inc.',
    building: 'Main Office Tower',
    address: '123 Business Ave, Downtown',
    type: 'Monthly Maintenance',
    status: 'completed'
  },
  {
    id: 2,
    time: '11:30 AM',
    customer: 'Highrise Apartments',
    building: 'West Residential Block',
    address: '456 Living St, Westside',
    type: 'Service Request',
    status: 'completed'
  },
  {
    id: 3,
    time: '02:00 PM',
    customer: 'Median Healthcare',
    building: 'Medical Center',
    address: '789 Health Blvd, Eastside',
    type: 'Monthly Maintenance',
    status: 'in_progress'
  },
  {
    id: 4,
    time: '04:30 PM',
    customer: 'Urban Shopping Mall',
    building: 'Central Mall',
    address: '101 Retail Road, Northside',
    type: 'Emergency Repair',
    status: 'upcoming'
  }
];

const pendingParts = [
  {
    id: 'REQ-2025-042',
    part: 'Door Sensor Assembly',
    requestDate: '2025-03-25',
    status: 'approved',
    eta: '2025-03-30'
  },
  {
    id: 'REQ-2025-039',
    part: 'Motor Controller PCB',
    requestDate: '2025-03-22',
    status: 'pending',
    eta: '-'
  }
];

const EmployeeDashboard: React.FC = () => {
  const currentAppointment = todayAppointments.find(appointment => appointment.status === 'in_progress');
  const nextAppointment = todayAppointments.find(appointment => appointment.status === 'upcoming');
  
  const completedCount = todayAppointments.filter(appointment => appointment.status === 'completed').length;
  const remainingCount = todayAppointments.filter(appointment => ['upcoming', 'in_progress'].includes(appointment.status)).length;
  
  return (
    <Layout role="employee" title="Employee Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="border-l-4 border-emerald-500 hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Today's Tasks</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">{todayAppointments.length}</p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-full">
              <Calendar className="text-emerald-600" size={24} />
            </div>
          </div>
        </Card>
        
        <Card className="border-l-4 border-emerald-500 hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">{completedCount}</p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-full">
              <CheckCircle className="text-emerald-600" size={24} />
            </div>
          </div>
        </Card>
        
        <Card className="border-l-4 border-emerald-500 hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Remaining</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">{remainingCount}</p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-full">
              <Clock className="text-emerald-600" size={24} />
            </div>
          </div>
        </Card>
        
        <Card className="border-l-4 border-emerald-500 hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Part Requests</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">{pendingParts.length}</p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-full">
              <Package className="text-emerald-600" size={24} />
            </div>
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {currentAppointment && (
            <Card title="Current Task" className="bg-gradient-to-br from-emerald-50 to-white">
              <div className="border border-emerald-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-lg text-emerald-900">{currentAppointment.customer}</h3>
                    <p className="text-emerald-700">{currentAppointment.building}</p>
                  </div>
                  <Badge variant="success">In Progress</Badge>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center text-sm text-emerald-700">
                    <Clock size={16} className="mr-2 text-emerald-600" />
                    <span>{currentAppointment.time}</span>
                  </div>
                  <div className="flex items-center text-sm text-emerald-700">
                    <User size={16} className="mr-2 text-emerald-600" />
                    <span>{currentAppointment.type}</span>
                  </div>
                  <div className="flex items-start col-span-2 text-sm text-emerald-700">
                    <MapPin size={16} className="mr-2 mt-0.5 flex-shrink-0 text-emerald-600" />
                    <span>{currentAppointment.address}</span>
                  </div>
                </div>
                
                <div className="mt-4 flex space-x-2">
                  <Link to={`/employee/maintenance/${currentAppointment.id}`}>
                    
                      <Button className="flex items-center bg-emerald-600 hover:bg-emerald-700">
                      Complete Task
                      <ArrowRight size={16} className="ml-1" />
                      </Button> 
                    
                    
                  </Link>
                  <Button variant="outline" className="text-emerald-700 border-emerald-300 hover:bg-emerald-50">
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          )}
          
          <Card title="Today's Schedule">
            <div className="space-y-4">
              {todayAppointments.map(appointment => (
                <div 
                  key={appointment.id} 
                  className={`border rounded-lg p-4 transition-all duration-200 ${
                    appointment.status === 'completed' 
                      ? 'border-gray-200 bg-gray-50' 
                      : appointment.status === 'in_progress' 
                        ? 'border-emerald-200 bg-emerald-50' 
                        : 'border-emerald-100 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-emerald-900">{appointment.customer}</h4>
                      <p className="text-sm text-emerald-600">{appointment.building}</p>
                    </div>
                    {appointment.status === 'completed' ? (
                      <Badge variant="success">Completed</Badge>
                    ) : appointment.status === 'in_progress' ? (
                      <Badge variant="info">In Progress</Badge>
                    ) : (
                      <Badge variant="warning">Upcoming</Badge>
                    )}
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="flex items-center text-sm text-emerald-700">
                      <Clock size={16} className="mr-1 text-emerald-500" />
                      <span>{appointment.time}</span>
                    </div>
                    <div className="flex items-center text-sm text-emerald-700">
                      <User size={16} className="mr-1 text-emerald-500" />
                      <span>{appointment.type}</span>
                    </div>
                  </div>
                  
                  {appointment.status !== 'completed' && (
                    <div className="mt-3 flex space-x-2">
                      <Link to={`/employee/maintenance/${appointment.id}`}>
                        <Button 
                          size="sm" 
                          className={appointment.status === 'in_progress' 
                            ? 'bg-emerald-600 hover:bg-emerald-700' 
                            : 'border-emerald-300 text-emerald-700 bg-emerald-600 hover:bg-emerald-700'
                          }
                        >
                          {appointment.status === 'in_progress' ? 'Continue' : 'start'}
                        </Button>
                      </Link>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      >
                        Details
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <span className="text-sm text-emerald-700">
                <CheckCircle size={16} className="inline mr-1 text-emerald-500" /> 
                {completedCount} of {todayAppointments.length} completed
              </span>
              <Link to="/employee/schedule">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  Full Schedule
                </Button>
              </Link>
            </div>
          </Card>
        </div>
        
        <div className="space-y-6">
          {nextAppointment && (
            <Card title="Next Appointment" className="bg-gradient-to-br from-emerald-50 to-white">
              <div className="border border-emerald-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-lg text-emerald-900">{nextAppointment.customer}</h3>
                    <p className="text-emerald-700">{nextAppointment.building}</p>
                  </div>
                  <Badge variant="warning">Upcoming</Badge>
                </div>
                
                <div className="mt-3 space-y-2">
                  <div className="flex items-center text-sm text-emerald-700">
                    <Clock size={16} className="mr-2 text-emerald-600" />
                    <span>{nextAppointment.time}</span>
                  </div>
                  <div className="flex items-center text-sm text-emerald-700">
                    <User size={16} className="mr-2 text-emerald-600" />
                    <span>{nextAppointment.type}</span>
                  </div>
                  <div className="flex items-start text-sm text-emerald-700">
                    <MapPin size={16} className="mr-2 mt-0.5 flex-shrink-0 text-emerald-600" />
                    <span>{nextAppointment.address}</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    Get Directions
                  </Button>
                </div>
              </div>
            </Card>
          )}
          
          <Card title="Parts Requests">
            {pendingParts.length > 0 ? (
              <div className="space-y-4">
                {pendingParts.map(part => (
                  <div key={part.id} className="border border-emerald-200 rounded-lg p-3 hover:shadow-md transition-shadow duration-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-emerald-600">{part.id}</p>
                        <h4 className="font-medium text-emerald-900 mt-1">{part.part}</h4>
                      </div>
                      <Badge 
                        variant={part.status === 'approved' ? 'success' : 'warning'}
                        className="capitalize"
                      >
                        {part.status}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between text-sm mt-3">
                      <span className="text-emerald-600">Requested: {part.requestDate}</span>
                      {part.status === 'approved' && (
                        <span className="text-emerald-800">ETA: {part.eta}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4">
                <AlertCircle className="text-emerald-400 mb-2" size={24} />
                <p className="text-emerald-600 mb-4">No pending part requests</p>
                <Link to="/employee/inventory">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    Request Parts
                  </Button>
                </Link>
              </div>
            )}
            
            <div className="mt-4">
              <Link to="/employee/inventory">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  View Inventory
                </Button>
              </Link>
            </div>
          </Card>
          
          <Card title="Reminders">
            <ul className="space-y-3">
              <li className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                </div>
                <p className="ml-2 text-sm text-emerald-700">Submit weekly report by Friday</p>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                </div>
                <p className="ml-2 text-sm text-emerald-700">Team meeting tomorrow at 8:30 AM</p>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                </div>
                <p className="ml-2 text-sm text-emerald-700">Safety training completion due next week</p>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default EmployeeDashboard;