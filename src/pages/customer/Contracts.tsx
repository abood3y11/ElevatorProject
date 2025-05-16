import React from 'react';
import Layout from '../../components/common/Layout';
import Card from '../../components/common/Card';

const CustomerContracts: React.FC = () => {
  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Contracts</h1>
        <div className="grid gap-6">
          <Card>
            <div className="p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Contract Details
              </h2>
              <p className="text-gray-600">
                Your contract information will be displayed here.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default CustomerContracts;