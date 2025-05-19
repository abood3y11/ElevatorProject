import React, { useState } from 'react';
import { Building2, FileText, Calendar, AlertCircle, Plus, Search, Filter, Trash2, Edit, Eye } from 'lucide-react';
import Layout from '../../components/common/Layout';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { 
  useContracts, 
  useContractSummary, 
  useBuildings, 
  useCreateContract, 
  useUpdateContract, 
  useDeleteContract 
} from '../../services/admin/hooks';

const AdminContracts: React.FC = () => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Fetch contracts with hooks
  const { 
    data: contracts, 
    isLoading: isLoadingContracts, 
    error: contractsError,
    count: totalContracts 
  } = useContracts(searchTerm, statusFilter, currentPage, itemsPerPage);

  // Fetch summary data
  const { 
    data: summary, 
    isLoading: isLoadingSummary 
  } = useContractSummary();

  // Fetch buildings for dropdown
  const { 
    data: buildings 
  } = useBuildings();

  // Mutation hooks
  const { createContract, isLoading: isCreating } = useCreateContract();
  const { updateContract, isLoading: isUpdating } = useUpdateContract();
  const { deleteContract, isLoading: isDeleting } = useDeleteContract();

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Reset to first page when search changes
    setCurrentPage(1);
  };

  // Handle status filter change
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    // Reset to first page when filter changes
    setCurrentPage(1);
  };

  // Open modal for new contract
  const handleNewContract = () => {
    setSelectedContract(null);
    setIsModalOpen(true);
  };

  // Open modal for editing contract
  const handleEditContract = (contractId: string) => {
    setSelectedContract(contractId);
    setIsModalOpen(true);
  };

  // Open modal for viewing contract details
  const handleViewContract = (contractId: string) => {
    setSelectedContract(contractId);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setSelectedContract(null);
    setIsModalOpen(false);
  };

  interface ContractFormData {
    buildingId: string;
    type: string;
    value: number;
    startDate: string;
    endDate: string;
    status: string;
    notes?: string; // Optional field
  }

  // Handle contract form submission
  const handleSubmitContract = async (formData: ContractFormData) => {
    try {
      if (selectedContract) {
        // Update existing contract
        await updateContract(selectedContract, formData);
      } else {
        // Create new contract
        await createContract(formData);
      }
      
      // Close modal after successful submission
      handleCloseModal();
    } catch (error) {
      console.error('Error saving contract:', error);
      // You could set an error state here to display to the user
    }
  };

  // Handle contract deletion
  const handleDeleteContract = async (contractId: string) => {
    setConfirmDelete(contractId);
  };

  // Confirm deletion
  const confirmDeleteContract = async () => {
    if (confirmDelete) {
      try {
        await deleteContract(confirmDelete);
        setConfirmDelete(null);
      } catch (error) {
        console.error('Error deleting contract:', error);
      }
    }
  };

  // Cancel deletion
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
      default:
        return 'info';
    }
  };

  // Handle loading and error states
  if (contractsError) {
    return (
      <Layout role="admin" title="Contract Management">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> Failed to load contracts data.</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="admin" title="Contract Management">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Contracts</p>
              <p className="mt-1 text-2xl font-semibold text-purple-700">
                {isLoadingSummary ? '...' : summary?.activeContracts || 0}
              </p>
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
              <p className="mt-1 text-2xl font-semibold text-purple-700">
                {isLoadingSummary ? '...' : `$${(summary?.totalValue || 0).toLocaleString()}`}
              </p>
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
              <p className="mt-1 text-2xl font-semibold text-purple-700">
                {isLoadingSummary ? '...' : summary?.expiringSoon || 0}
              </p>
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
              <p className="mt-1 text-2xl font-semibold text-purple-700">
                {isLoadingSummary ? '...' : summary?.pendingRenewal || 0}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <AlertCircle className="text-purple-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card>
        {/* Filters and Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search contracts..."
                className="w-full pl-10 pr-4 py-2 border border-purple-200 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <Search className="absolute left-3 top-2.5 text-purple-500" size={18} />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative items-center">
              <select 
                className="appearance-none pl-10 pr-8 py-2 border border-purple-200 rounded-lg bg-white focus:ring-purple-500 focus:border-purple-500"
                value={statusFilter}
                onChange={handleStatusChange}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
              </select>
              <Filter className="absolute left-3 top-2.5 text-purple-500" size={16} />
            </div>

            <Button 
              className="flex items-center bg-purple-600 hover:bg-purple-700"
              onClick={handleNewContract}
              disabled={isCreating}
            >
              <Plus size={20} className="mr-2" />
              New Contract
            </Button>
          </div>
        </div>

        {/* Contracts Table */}
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
              {isLoadingContracts ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center">
                      <svg className="animate-spin h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="ml-2">Loading contracts...</span>
                    </div>
                  </td>
                </tr>
              ) : contracts && contracts.length > 0 ? (
                contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-purple-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-900">{contract.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-700">
                      {buildings?.find(b => b.id === contract.buildingId)?.name || 'Unknown Building'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-700">{contract.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-700">${contract.value.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-700">{contract.startDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-700">{contract.endDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getBadgeVariant(contract.status)} className="capitalize">{contract.status}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-purple-200 text-purple-700 hover:bg-purple-50"
                          onClick={() => handleViewContract(contract.id)}
                        >
                          <Eye size={16} className="mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-purple-200 text-purple-700 hover:bg-purple-50"
                          onClick={() => handleEditContract(contract.id)}
                        >
                          <Edit size={16} className="mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteContract(contract.id)}
                        >
                          <Trash2 size={16} className="mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-purple-700">
                    No contracts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between border-t border-purple-100 pt-4">
          <div className="text-sm text-purple-700">
            Showing <span className="font-medium">{contracts?.length || 0}</span> of{' '}
            <span className="font-medium">{totalContracts || 0}</span> contracts
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-purple-200 text-purple-700 hover:bg-purple-50" 
              disabled={currentPage === 1 || isLoadingContracts}
              onClick={handlePreviousPage}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-purple-200 text-purple-700 hover:bg-purple-50" 
              disabled={!totalContracts || currentPage * itemsPerPage >= totalContracts || isLoadingContracts}
              onClick={handleNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Contract Form Modal - You would need to implement this component */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">
              {selectedContract ? 'Edit Contract' : 'New Contract'}
            </h3>
            
            {/* Contract form would go here */}
            {/* This is a placeholder - you would need to implement the actual form */}
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Form implementation needed. This would include fields for:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-500">
                <li>Building selection</li>
                <li>Contract type</li>
                <li>Value</li>
                <li>Start and end dates</li>
                <li>Status</li>
              </ul>
            </div>
            
            <div className="mt-6 flex justify-end space-x-2">
              <Button 
                variant="outline"
                className="border-gray-300 text-gray-700"
                onClick={handleCloseModal}
              >
                Cancel
              </Button>
              <Button 
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => handleSubmitContract({} as ContractFormData)} // Type assertion - use only in placeholder code
                disabled={isCreating || isUpdating}
              >
                {isCreating || isUpdating ? 'Saving...' : 'Save Contract'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Confirm Deletion</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this contract? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline"
                className="border-gray-300 text-gray-700"
                onClick={cancelDeleteContract}
              >
                Cancel
              </Button>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmDeleteContract}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Contract'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminContracts;