import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Camera, Upload, Save } from 'lucide-react';
import Layout from '../../components/common/Layout';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

const EmployeeMaintenanceForm: React.FC = () => {
  const { id } = useParams();
  const [formData, setFormData] = useState({
    generalCondition: '',
    doorOperation: '',
    safetyDevices: '',
    controlPanel: '',
    motorCondition: '',
    notes: '',
    partsReplaced: '',
  });
  
  const [checklist, setChecklist] = useState({
    visualInspection: false,
    doorTesting: false,
    safetyTesting: false,
    controlTesting: false,
    motorTesting: false,
  });

  // Mock maintenance data
  const maintenanceData = {
    customer: 'TechCorp Inc.',
    building: 'Main Office Tower',
    elevatorId: 'ELV-2025-042',
    model: 'TechLift 3000',
    lastMaintenance: '2025-02-15',
    type: 'Monthly Maintenance',
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChecklistChange = (item: keyof typeof checklist) => {
    setChecklist(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', { formData, checklist });
  };

  return (
    <Layout role="employee" title="Maintenance Form">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{maintenanceData.customer}</h2>
                <p className="text-gray-600">{maintenanceData.building}</p>
              </div>
              <Badge variant="info">{maintenanceData.type}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Elevator ID</p>
                <p className="font-medium">{maintenanceData.elevatorId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Model</p>
                <p className="font-medium">{maintenanceData.model}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Maintenance</p>
                <p className="font-medium">{maintenanceData.lastMaintenance}</p>
              </div>
            </div>
          </Card>

          <form onSubmit={handleSubmit}>
            <Card title="Maintenance Checklist">
              <div className="space-y-4">
                {Object.entries(checklist).map(([key, value]) => (
                  <div key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      id={key}
                      checked={value}
                      onChange={() => handleChecklistChange(key as keyof typeof checklist)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor={key} className="ml-2 text-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Inspection Details" className="mt-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    General Condition
                  </label>
                  <textarea
                    name="generalCondition"
                    value={formData.generalCondition}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the general condition..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Door Operation
                  </label>
                  <textarea
                    name="doorOperation"
                    value={formData.doorOperation}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe door operation..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Safety Devices
                  </label>
                  <textarea
                    name="safetyDevices"
                    value={formData.safetyDevices}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe safety devices condition..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Control Panel
                  </label>
                  <textarea
                    name="controlPanel"
                    value={formData.controlPanel}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe control panel condition..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motor Condition
                  </label>
                  <textarea
                    name="motorCondition"
                    value={formData.motorCondition}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe motor condition..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parts Replaced
                  </label>
                  <textarea
                    name="partsReplaced"
                    value={formData.partsReplaced}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="List any parts that were replaced..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Any additional notes or observations..."
                  />
                </div>
              </div>
            </Card>

            <div className="mt-6 flex justify-end space-x-3">
              <Button type="button" variant="outline">
                Save Draft
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" type="submit">
                Complete Maintenance
              </Button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <Card title="Documentation">
            <div className="space-y-4">
              <Button variant="outline" className="w-full flex items-center justify-center">
                <Camera className="mr-2" size={18} />
                Take Photos
              </Button>
              
              <Button variant="outline" className="w-full flex items-center justify-center">
                <Upload className="mr-2" size={18} />
                Upload Files
              </Button>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-2">Attached Files</p>
                <p className="text-gray-400 text-sm">No files attached yet</p>
              </div>
            </div>
          </Card>

          <Card title="Safety Checklist">
            <div className="space-y-3">
              <div className="flex items-start">
                <CheckCircle2 className="text-green-500 mt-0.5 mr-2" size={18} />
                <p className="text-sm text-gray-700">Verify all safety devices are operational</p>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="text-green-500 mt-0.5 mr-2" size={18} />
                <p className="text-sm text-gray-700">Check emergency communication system</p>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="text-green-500 mt-0.5 mr-2" size={18} />
                <p className="text-sm text-gray-700">Test emergency lighting and alarms</p>
              </div>
              <div className="flex items-start">
                <AlertTriangle className="text-amber-500 mt-0.5 mr-2" size={18} />
                <p className="text-sm text-gray-700">Ensure proper ventilation in machine room</p>
              </div>
            </div>
          </Card>

          <Card title="Previous Issues">
            <div className="space-y-3">
              <div className="border-l-4 border-amber-500 pl-3">
                <p className="text-sm font-medium">Door Sensor Replacement</p>
                <p className="text-xs text-gray-500">2025-02-15</p>
              </div>
              <div className="border-l-4 border-green-500 pl-3">
                <p className="text-sm font-medium">Motor Belt Adjustment</p>
                <p className="text-xs text-gray-500">2025-01-20</p>
              </div>
              <div className="border-l-4 border-blue-500 pl-3">
                <p className="text-sm font-medium">Control Panel Update</p>
                <p className="text-xs text-gray-500">2024-12-10</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default EmployeeMaintenanceForm;