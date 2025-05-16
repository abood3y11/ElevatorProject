// Mock data for the entire system
export const mockData = {
  buildings: [
    {
      id: 'BLD-001',
      name: 'Crystal Tower',
      address: '123 Business District, Downtown',
      floors: 45,
      elevatorCount: 6,
      maintenanceSchedule: 'Monthly',
      lastInspection: '2025-02-15'
    },
    {
      id: 'BLD-002',
      name: 'Sapphire Heights',
      address: '456 Residential Avenue, Westside',
      floors: 30,
      elevatorCount: 4,
      maintenanceSchedule: 'Monthly',
      lastInspection: '2025-03-01'
    },
    {
      id: 'BLD-003',
      name: 'Emerald Plaza',
      address: '789 Commercial Street, Eastside',
      floors: 35,
      elevatorCount: 5,
      maintenanceSchedule: 'Bi-monthly',
      lastInspection: '2025-03-10'
    }
  ],

  elevators: [
    {
      id: 'ELV-001',
      buildingId: 'BLD-001',
      model: 'TechLift Pro 3000',
      capacity: '1600 kg',
      installedDate: '2023-01-15',
      lastMaintenance: '2025-03-01',
      nextMaintenance: '2025-04-01',
      status: 'operational',
      maintenanceHistory: [
        {
          date: '2025-03-01',
          type: 'Regular',
          technician: 'Ahmad Hassan',
          notes: 'Routine inspection and maintenance completed'
        },
        {
          date: '2025-02-01',
          type: 'Regular',
          technician: 'Sarah Lee',
          notes: 'Replaced door sensors and adjusted timing'
        }
      ]
    },
    {
      id: 'ELV-002',
      buildingId: 'BLD-001',
      model: 'TechLift Pro 3000',
      capacity: '1600 kg',
      installedDate: '2023-01-15',
      lastMaintenance: '2025-02-15',
      nextMaintenance: '2025-03-15',
      status: 'maintenance_needed',
      maintenanceHistory: [
        {
          date: '2025-02-15',
          type: 'Emergency',
          technician: 'Ahmad Hassan',
          notes: 'Emergency repair of door mechanism'
        }
      ]
    }
  ],

  contracts: [
    {
      id: 'CTR-001',
      buildingId: 'BLD-001',
      type: 'Premium',
      startDate: '2025-01-01',
      endDate: '2026-01-01',
      value: 75000,
      status: 'active',
      terms: {
        maintenanceFrequency: 'Monthly',
        responseTime: '2 hours',
        includedServices: [
          'Regular Maintenance',
          'Emergency Repairs',
          '24/7 Support',
          'Parts Replacement'
        ]
      }
    },
    {
      id: 'CTR-002',
      buildingId: 'BLD-002',
      type: 'Standard',
      startDate: '2025-02-01',
      endDate: '2026-02-01',
      value: 50000,
      status: 'active',
      terms: {
        maintenanceFrequency: 'Bi-monthly',
        responseTime: '4 hours',
        includedServices: [
          'Regular Maintenance',
          'Emergency Repairs',
          'Business Hours Support'
        ]
      }
    }
  ],

  maintenanceRequests: [
    {
      id: 'REQ-001',
      elevatorId: 'ELV-001',
      buildingId: 'BLD-001',
      requestDate: '2025-03-25',
      scheduledDate: '2025-03-28',
      priority: 'high',
      status: 'scheduled',
      description: 'Unusual noise during operation',
      assignedTo: 'Ahmad Hassan'
    },
    {
      id: 'REQ-002',
      elevatorId: 'ELV-002',
      buildingId: 'BLD-002',
      requestDate: '2025-03-26',
      scheduledDate: '2025-03-27',
      priority: 'emergency',
      status: 'in_progress',
      description: 'Door not closing properly',
      assignedTo: 'Sarah Lee'
    }
  ],

  inventory: [
    {
      id: 'INV-001',
      name: 'Door Sensors',
      category: 'Electronics',
      currentStock: 15,
      minimumStock: 10,
      location: 'Warehouse A',
      lastRestocked: '2025-03-01',
      supplier: 'TechParts Inc',
      unitPrice: 150
    },
    {
      id: 'INV-002',
      name: 'Motor Belts',
      category: 'Mechanical',
      currentStock: 8,
      minimumStock: 12,
      location: 'Warehouse B',
      lastRestocked: '2025-02-15',
      supplier: 'Industrial Supplies Co',
      unitPrice: 75
    }
  ],

  employees: [
    {
      id: 'EMP-001',
      name: 'Ahmad Hassan',
      role: 'Senior Technician',
      email: 'ahmad.hassan@example.com',
      phone: '+1-555-0123',
      department: 'Maintenance',
      certification: 'Master Elevator Technician',
      joinDate: '2023-06-10'
    },
    {
      id: 'EMP-002',
      name: 'Sarah Lee',
      role: 'Technician',
      email: 'sarah.lee@example.com',
      phone: '+1-555-0124',
      department: 'Maintenance',
      certification: 'Elevator Maintenance Specialist',
      joinDate: '2024-01-15'
    }
  ],

  customers: [
    {
      id: 'CUS-001',
      name: 'Crystal Properties Ltd',
      contactPerson: 'John Smith',
      email: 'john.smith@crystal.com',
      phone: '+1-555-0125',
      address: '123 Business District, Downtown',
      contractIds: ['CTR-001']
    },
    {
      id: 'CUS-002',
      name: 'Sapphire Developments',
      contactPerson: 'Emma Wilson',
      email: 'emma.wilson@sapphire.com',
      phone: '+1-555-0126',
      address: '456 Residential Avenue, Westside',
      contractIds: ['CTR-002']
    }
  ]
};