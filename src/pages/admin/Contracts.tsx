import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  FileText, 
  Calendar, 
  AlertCircle, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  Eye,
  TrendingUp,
  Download,
  RefreshCw
} from 'lucide-react';
import Layout from '../../components/common/Layout';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { 
  useContracts, 
  useContractSummary, 
  useBuildings, 
  useCustomers,
  useCreateContract, 
  useUpdateContract, 
  useDeleteContract,
} from '../../services/admin/hooks';
import { contractsService } from '../../services/admin/contractsService';
import { Contract, Building, Customer } from '../../services/admin/types';

const AdminContracts: React.FC = () => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form state for contract creation/editing - using proper field names from types.ts
  const [formData, setFormData] = useState({
    customer_id: '',
    contract_number: '',
    start_date: '',
    end_date: '',
    contract_type: 'maintenance',
    contract_status: 'pending',
    maintenance_frequency: 'monthly',
    total_amount: 0,
    payment_status: 'pending',
    payment_method: 'bank_transfer',
    contract_file_url: '',
    notes: ''
  });

  // Fetch contracts with hooks
  const { 
    data: contracts, 
    isLoading: isLoadingContracts, 
    error: contractsError,
    count: totalContracts,
    refetch: refetchContracts
  } = useContracts(searchTerm, statusFilter, currentPage, itemsPerPage);

  // Fetch summary data
  const { 
    data: summary, 
    isLoading: isLoadingSummary,
    refetch: refetchSummary
  } = useContractSummary();

  // Fetch buildings and customers for dropdowns
  const { data: buildings, isLoading: isLoadingBuildings } = useBuildings();
  const { data: customers, isLoading: isLoadingCustomers } = useCustomers();

  // Mutation hooks
  const { mutate: createContract, isLoading: isCreating } = useCreateContract();
  const { mutate: updateContract, isLoading: isUpdating } = useUpdateContract();
  const { mutate: deleteContract, isLoading: isDeleting } = useDeleteContract();

  // Handle comprehensive data fetch
  const handleGetAllData = async () => {
    setIsRefreshing(true);
    try {
      const result = await contractsService.getAllData();
      console.log('Comprehensive data fetch result:', result);
      
      if (result.error) {
        console.error('Error fetching data:', result.error);
      } else {
        await Promise.all([
          refetchContracts(),
          refetchSummary()
        ]);
      }
    } catch (error) {
      console.error('Error in comprehensive data fetch:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle search input with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle status filter change
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  // Form handlers
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  // Modal handlers
  const handleNewContract = () => {
    setSelectedContract(null);
    setFormData({
      customer_id: '',
      contract_number: '',
      start_date: '',
      end_date: '',
      contract_type: 'maintenance',
      contract_status: 'pending',
      maintenance_frequency: 'monthly',
      total_amount: 0,
      payment_status: 'pending',
      payment_method: 'bank_transfer',
      contract_file_url: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleEditContract = async (contractId: string) => {
    setSelectedContract(contractId);
    
    const { data: contract } = await contractsService.getContractById(contractId);
    if (contract) {
      setFormData({
        customer_id: contract.customer_id || '',
        contract_number: contract.contract_number || '',
        start_date: contract.start_date || '',
        end_date: contract.end_date || '',
        contract_type: contract.contract_type || 'maintenance',
        contract_status: contract.contract_status || 'pending',
        maintenance_frequency: contract.maintenance_frequency || 'monthly',
        total_amount: contract.total_amount || 0,
        payment_status: contract.payment_status || 'pending',
        payment_method: contract.payment_method || 'bank_transfer',
        contract_file_url: contract.contract_file_url || '',
        notes: contract.notes || ''
      });
    }
    setIsModalOpen(true);
  };

  const handleViewContract = async (contractId: string) => {
    const { data: contract } = await contractsService.getContractById(contractId);
    if (contract) {
      console.log('Viewing contract:', contract);
    }
  };

  const handleCloseModal = () => {
    setSelectedContract(null);
    setIsModalOpen(false);
  };

  // Handle contract form submission
  const handleSubmitContract = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedContract) {
        await updateContract({ id: selectedContract, data: formData });
      } else {
        await createContract(formData);
      }
      
      handleCloseModal();
      await refetchContracts();
      await refetchSummary();
    } catch (error) {
      console.error('Error saving contract:', error);
    }
  };

  // Handle contract deletion
  const handleDeleteContract = (contractId: string) => {
    setConfirmDelete(contractId);
  };

  

  const confirmDeleteContract = async () => {
    if (confirmDelete) {
      try {
        await deleteContract(confirmDelete);
        setConfirmDelete(null);
        await refetchContracts();
        await refetchSummary();
      } catch (error) {
        console.error('Error deleting contract:', error);
      }
    }
  };

  const cancelDeleteContract = () => {
    setConfirmDelete(null);
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (totalContracts && currentPage * itemsPerPage < totalContracts) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Get badge variant based on contract status
  const getBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'expired':
        return 'danger';
      case 'cancelled':
        return 'secondary';
      default:
        return 'info';
    }
  };

  // Get customer name by ID
  const getCustomerName = (customerId: string) => {
    return customers?.find(c => c.id === customerId)?.name || 'Unknown Customer';
  };

  // Get building name by ID - using proper field names from types.ts
  const getBuildingName = (customerId: string) => {
    // Find buildings that belong to the customer
    const customerBuildings = buildings?.filter(b => b.customer_id === customerId);
    if (customerBuildings && customerBuildings.length > 0) {
      return customerBuildings[0].name;
    }
    return 'No Building Assigned';
  };

  // Handle loading and error states
  if (contractsError) {
    return (
      <Layout role="admin" title="Contract Management">
        <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-800 px-6 py-4 rounded-xl shadow-lg">
          <div className="flex items-center">
            <AlertCircle className="mr-3" size={24} />
            <div>
              <strong className="font-bold">Error Loading Contracts</strong>
              <p className="text-sm mt-1">Unable to load contracts data. Please try refreshing the page.</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="admin" title="Contract Management">
      {/* Enhanced Summary Cards with Gradients and Shadows */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-start justify-between p-6">
            <div>
              <p className="text-sm font-medium text-blue-600 mb-2">Active Contracts</p>
              <p className="text-3xl font-bold text-blue-800">
                {isLoadingSummary ? '...' : summary?.activeContracts || 0}
              </p>
              <p className="text-xs text-blue-500 mt-1">Currently running</p>
            </div>
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-4 rounded-full shadow-lg">
              <FileText className="text-white" size={28} />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-start justify-between p-6">
            <div>
              <p className="text-sm font-medium text-emerald-600 mb-2">Total Value</p>
              <p className="text-3xl font-bold text-emerald-800">
                {isLoadingSummary ? '...' : `$${(summary?.totalValue || 0).toLocaleString()}`}
              </p>
              <p className="text-xs text-emerald-500 mt-1">Annual revenue</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-4 rounded-full shadow-lg">
              <TrendingUp className="text-white" size={28} />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-start justify-between p-6">
            <div>
              <p className="text-sm font-medium text-amber-600 mb-2">Expiring Soon</p>
              <p className="text-3xl font-bold text-amber-800">
                {isLoadingSummary ? '...' : summary?.expiringSoon || 0}
              </p>
              <p className="text-xs text-amber-500 mt-1">Next 30 days</p>
            </div>
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-4 rounded-full shadow-lg">
              <Calendar className="text-white" size={28} />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-start justify-between p-6">
            <div>
              <p className="text-sm font-medium text-purple-600 mb-2">Pending Renewal</p>
              <p className="text-3xl font-bold text-purple-800">
                {isLoadingSummary ? '...' : summary?.pendingRenewal || 0}
              </p>
              <p className="text-xs text-purple-500 mt-1">Awaiting action</p>
            </div>
            <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-4 rounded-full shadow-lg">
              <AlertCircle className="text-white" size={28} />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Card with Enhanced Design */}
      <Card className="bg-white shadow-2xl border-0 rounded-2xl overflow-hidden">
        {/* Header with Gradient Background */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Contract Management</h2>
              <p className="text-indigo-100">Manage all your contracts in one place</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button 
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm transition-all duration-300"
                onClick={handleGetAllData}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <RefreshCw size={18} className="mr-2 animate-spin" />
                ) : (
                  <RefreshCw size={18} className="mr-2" />
                )}
                Refresh Data
              </Button>
              
              <Button 
                className="bg-white text-indigo-600 hover:bg-gray-50 shadow-lg transition-all duration-300 transform hover:scale-105"
                onClick={handleNewContract}
                disabled={isCreating}
              >
                <Plus size={20} className="mr-2" />
                New Contract
              </Button>
            </div>
          </div>
        </div>

        {/* Filters and Search Section */}
        <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Enhanced Search Input */}
            <div className="flex-1">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Search contracts, customers, or buildings..."
                  className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>

            {/* Enhanced Status Filter */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <select 
                className="appearance-none pl-10 pr-8 py-3 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 text-gray-900 min-w-[150px]"
                value={statusFilter}
                onChange={handleStatusChange}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Export Button */}
            <Button 
              variant="outline" 
              className="border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <Download size={18} className="mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Enhanced Contracts Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contract Details</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer & Building</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Financial</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Timeline</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {isLoadingContracts ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      <p className="text-gray-500">Loading contracts...</p>
                    </div>
                  </td>
                </tr>
              ) : contracts && contracts.length > 0 ? (
                contracts.map((contract) => (
                  <tr 
                    key={contract.id} 
                    className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 group"
                  >
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-900">#{contract.contract_number}</p>
                        <p className="text-xs text-gray-500 capitalize">{contract.contract_type}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">{getCustomerName(contract.customer_id)}</p>
                        <p className="text-xs text-gray-500">{getBuildingName(contract.customer_id)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-emerald-600">${contract.total_amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 capitalize">{contract.payment_status}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-900">{new Date(contract.start_date).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500">to {new Date(contract.end_date).toLocaleDateString()}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        variant={getBadgeVariant(contract.contract_status)} 
                        className="capitalize shadow-sm"
                      >
                        {contract.contract_status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm"
                          onClick={() => handleViewContract(contract.id)}
                        >
                          <Eye size={14} className="mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-amber-200 text-amber-700 hover:bg-amber-50 shadow-sm"
                          onClick={() => handleEditContract(contract.id)}
                        >
                          <Edit size={14} className="mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-red-200 text-red-600 hover:bg-red-50 shadow-sm"
                          onClick={() => handleDeleteContract(contract.id)}
                        >
                          <Trash2 size={14} className="mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <FileText className="h-12 w-12 text-gray-300" />
                      <p className="text-gray-500">No contracts found.</p>
                      <Button 
                        className="mt-2 bg-indigo-600 hover:bg-indigo-700"
                        onClick={handleNewContract}
                      >
                        <Plus size={16} className="mr-2" />
                        Create First Contract
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Enhanced Pagination */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{contracts?.length || 0}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalContracts || 0}</span> contracts
            </div>

            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-gray-200 text-gray-700 hover:bg-white shadow-sm" 
                disabled={currentPage === 1 || isLoadingContracts}
                onClick={handlePreviousPage}
              >
                Previous
              </Button>
              
              <div className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-lg text-sm font-medium">
                Page {currentPage}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="border-gray-200 text-gray-700 hover:bg-white shadow-sm" 
                disabled={!totalContracts || currentPage * itemsPerPage >= totalContracts || isLoadingContracts}
                onClick={handleNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Enhanced Contract Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
              <h3 className="text-2xl font-bold text-white">
                {selectedContract ? 'Edit Contract' : 'Create New Contract'}
              </h3>
              <p className="text-indigo-100 mt-1">
                {selectedContract ? 'Update contract information' : 'Fill in the details to create a new contract'}
              </p>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmitContract} className="space-y-6">
                {/* Contract Basic Information */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contract Number *
                      </label>
                      <input
                        type="text"
                        name="contract_number"
                        value={formData.contract_number}
                        onChange={handleFormChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Status
                      </label>
                      <select
                        name="payment_status"
                        value={formData.payment_status}
                        onChange={handleFormChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method
                      </label>
                      <select
                        name="payment_method"
                        value={formData.payment_method}
                        onChange={handleFormChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                      >
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="credit_card">Credit Card</option>
                        <option value="check">Check</option>
                        <option value="cash">Cash</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Timeline Information */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Timeline & Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleFormChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date *
                      </label>
                      <input
                        type="date"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleFormChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status *
                      </label>
                      <select
                        name="contract_status"
                        value={formData.contract_status}
                        onChange={handleFormChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                        required
                      >
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maintenance Frequency *
                      </label>
                      <select
                        name="maintenance_frequency"
                        value={formData.maintenance_frequency}
                        onChange={handleFormChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                        required
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="semi_annual">Semi-Annual</option>
                        <option value="annual">Annual</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-xl">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contract File URL
                      </label>
                      <input
                        type="url"
                        name="contract_file_url"
                        value={formData.contract_file_url}
                        onChange={handleFormChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                        placeholder="https://example.com/contract.pdf"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleFormChange}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                        placeholder="Additional notes about the contract..."
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t">
              <Button 
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={handleCloseModal}
                disabled={isCreating || isUpdating}
              >
                Cancel
              </Button>
              
              <Button 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
                onClick={handleSubmitContract}
                disabled={isCreating || isUpdating}
              >
                {isCreating || isUpdating ? (
                  <>
                    <RefreshCw size={16} className="mr-2 animate-spin" />
                    {selectedContract ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {selectedContract ? 'Update Contract' : 'Create Contract'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6">
              <div className="flex items-center">
                <div className="bg-white/20 p-3 rounded-full mr-4">
                  <AlertCircle className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Confirm Deletion</h3>
                  <p className="text-red-100 text-sm mt-1">This action cannot be undone</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this contract? All associated data will be permanently removed.
              </p>
              
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  onClick={cancelDeleteContract}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
                  onClick={confirmDeleteContract}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw size={16} className="mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} className="mr-2" />
                      Delete Contract
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminContracts;