import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TwoPanelLayout from './TwoPanelLayout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BankingCenter = ({ accounts, transactions, onRefresh }) => {
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [bankTransactions, setBankTransactions] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentReconciliation, setCurrentReconciliation] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const bankAccounts = accounts.filter(acc => 
    acc.detail_type === 'Checking' || 
    acc.detail_type === 'Savings' || 
    acc.detail_type === 'Credit Card'
  );

  useEffect(() => {
    if (selectedAccount) {
      fetchBankTransactions();
      fetchReconciliations();
    }
  }, [selectedAccount]);

  const fetchBankTransactions = async () => {
    try {
      const response = await axios.get(`${API}/bank-transactions?account_id=${selectedAccount.id}`);
      setBankTransactions(response.data);
    } catch (error) {
      console.error('Error fetching bank transactions:', error);
    }
  };

  const fetchReconciliations = async () => {
    try {
      const response = await axios.get(`${API}/reconciliations?account_id=${selectedAccount.id}`);
      setReconciliations(response.data);
    } catch (error) {
      console.error('Error fetching reconciliations:', error);
    }
  };

  const handleFileImport = async (fileType) => {
    if (!importFile || !selectedAccount) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const endpoint = fileType === 'csv' 
        ? `${API}/bank-import/csv/${selectedAccount.id}` 
        : `${API}/bank-import/qfx/${selectedAccount.id}`;

      const response = await axios.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setImportPreview(response.data);
    } catch (error) {
      console.error('Error importing file:', error);
      alert('Error importing file: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = async () => {
    if (!importPreview || !selectedAccount) return;

    setLoading(true);
    try {
      await axios.post(`${API}/bank-import/confirm/${selectedAccount.id}`, 
        importPreview.preview_transactions);
      
      setImportPreview(null);
      setImportFile(null);
      setShowImportModal(false);
      fetchBankTransactions();
      alert('Transactions imported successfully!');
    } catch (error) {
      console.error('Error confirming import:', error);
      alert('Error importing transactions: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const startReconciliation = async (formData) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/reconciliations`, {
        account_id: selectedAccount.id,
        statement_date: new Date(formData.statement_date),
        statement_ending_balance: parseFloat(formData.ending_balance),
        notes: formData.notes
      });

      setCurrentReconciliation(response.data);
      setShowReconcileModal(false);
      setActiveTab('reconcile');
      fetchReconciliations();
    } catch (error) {
      console.error('Error starting reconciliation:', error);
      alert('Error starting reconciliation: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const toggleTransactionReconciled = async (transactionId, reconciled) => {
    try {
      if (reconciled && currentReconciliation) {
        await axios.put(`${API}/bank-transactions/${transactionId}/reconcile`, null, {
          params: { reconciliation_id: currentReconciliation.id }
        });
      } else {
        await axios.put(`${API}/bank-transactions/${transactionId}/reconcile`, null, {
          params: { reconciliation_id: null }
        });
      }
      fetchBankTransactions();
    } catch (error) {
      console.error('Error updating transaction reconciliation:', error);
    }
  };

  const completeReconciliation = async () => {
    if (!currentReconciliation) return;

    setLoading(true);
    try {
      await axios.post(`${API}/reconciliations/${currentReconciliation.id}/complete`);
      setCurrentReconciliation(null);
      fetchReconciliations();
      fetchBankTransactions();
      alert('Reconciliation completed successfully!');
    } catch (error) {
      console.error('Error completing reconciliation:', error);
      alert('Error completing reconciliation: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const leftPanelActions = (
    <div className="flex space-x-2">
      <button 
        onClick={() => setShowImportModal(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
      >
        📥 Import Bank Data
      </button>
      <button className="px-3 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm">
        🔗 Connect Bank
      </button>
    </div>
  );

  const rightPanelActions = selectedAccount && (
    <div className="flex space-x-2">
      <button 
        onClick={() => setShowReconcileModal(true)}
        className="px-3 py-2 text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors text-sm"
      >
        ⚖️ Start Reconciliation
      </button>
      <button className="px-3 py-2 text-green-600 bg-green-100 rounded-lg hover:bg-green-200 transition-colors text-sm">
        📊 View Reports
      </button>
    </div>
  );

  const leftPanel = (
    <div className="h-full">
      <div className="space-y-1">
        {bankAccounts.map((account) => (
          <div
            key={account.id}
            onClick={() => setSelectedAccount(account)}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedAccount?.id === account.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  account.detail_type === 'Checking' ? 'bg-blue-100' :
                  account.detail_type === 'Savings' ? 'bg-green-100' :
                  'bg-orange-100'
                }`}>
                  <span className="text-lg">
                    {account.detail_type === 'Checking' ? '🏦' :
                     account.detail_type === 'Savings' ? '💰' : '💳'}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{account.name}</div>
                  <div className="text-sm text-gray-500">{account.detail_type}</div>
                  {account.account_number && (
                    <div className="text-xs text-gray-400">***{account.account_number.slice(-4)}</div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-semibold ${
                  account.balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${Math.abs(account.balance).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Current Balance</div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="mt-3 flex space-x-2">
              <button className="flex-1 text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                View Register
              </button>
              <button className="flex-1 text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                Reconcile
              </button>
            </div>
          </div>
        ))}

        {bankAccounts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🏦</div>
            <p>No bank accounts found</p>
            <p className="text-sm">Create bank accounts to start banking operations</p>
          </div>
        )}
      </div>
    </div>
  );

  const rightPanel = selectedAccount ? (
    <div className="h-full">
      {/* Account Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{selectedAccount.name}</h3>
            <p className="text-gray-600">{selectedAccount.detail_type}</p>
            {selectedAccount.account_number && (
              <p className="text-sm text-gray-500">Account: ***{selectedAccount.account_number.slice(-4)}</p>
            )}
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${
              selectedAccount.balance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ${Math.abs(selectedAccount.balance).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Current Balance</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'feeds', 'reconcile', 'register'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Account Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-lg font-semibold text-blue-600">5</div>
                <div className="text-sm text-blue-800">Unreconciled Transactions</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-lg font-semibold text-yellow-600">3</div>
                <div className="text-sm text-yellow-800">Unmatched Bank Feeds</div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Recent Transactions</h4>
              <div className="space-y-2">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs">📄</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.transaction_type} #{transaction.reference_number}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(transaction.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      ${transaction.total.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'feeds' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-semibold text-gray-900">Bank Transactions</h4>
              <button 
                onClick={() => setShowImportModal(true)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                📥 Import Transactions
              </button>
            </div>
            
            <div className="space-y-2">
              {bankTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      transaction.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <span className="text-xs">
                        {transaction.amount > 0 ? '⬇️' : '⬆️'}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                      <div className="text-xs text-gray-500">{new Date(transaction.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`text-sm font-medium ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      transaction.reconciled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {transaction.reconciled ? 'Reconciled' : 'Unreconciled'}
                    </span>
                    {currentReconciliation && (
                      <input
                        type="checkbox"
                        checked={transaction.reconciled}
                        onChange={(e) => toggleTransactionReconciled(transaction.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600"
                      />
                    )}
                  </div>
                </div>
              ))}
              
              {bankTransactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📊</div>
                  <p>No bank transactions found</p>
                  <p className="text-sm">Import bank statements to see transactions</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reconcile' && (
          <div className="space-y-6">
            {currentReconciliation ? (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-blue-900">Active Reconciliation</h4>
                    <p className="text-blue-700 text-sm">
                      Statement Date: {new Date(currentReconciliation.statement_date).toLocaleDateString()}
                    </p>
                    <p className="text-blue-700 text-sm">
                      Statement Balance: ${currentReconciliation.statement_ending_balance.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={completeReconciliation}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Complete Reconciliation'}
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-white p-3 rounded">
                    <div className="text-lg font-semibold text-gray-900">
                      ${currentReconciliation.reconciled_balance.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Reconciled Balance</div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-lg font-semibold text-gray-900">
                      ${currentReconciliation.difference.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Difference</div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-lg font-semibold text-gray-900">
                      {bankTransactions.filter(t => t.reconciled).length}
                    </div>
                    <div className="text-sm text-gray-600">Reconciled Items</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-blue-900 mb-2">Start New Reconciliation</h4>
                <p className="text-blue-700 text-sm mb-4">
                  Reconcile your account with your bank statement to ensure accuracy.
                </p>
                <button 
                  onClick={() => setShowReconcileModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start Reconciliation
                </button>
              </div>
            )}

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Reconciliation History</h4>
              <div className="space-y-2">
                {reconciliations.map((reconciliation) => (
                  <div key={reconciliation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(reconciliation.statement_date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Statement Balance: ${reconciliation.statement_ending_balance.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        reconciliation.status === 'Completed' 
                          ? 'bg-green-100 text-green-800' 
                          : reconciliation.status === 'Discrepancy'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {reconciliation.status}
                      </span>
                      {reconciliation.difference !== 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Difference: ${Math.abs(reconciliation.difference).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {reconciliations.length === 0 && (
                  <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-500">
                    No previous reconciliations found
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'register' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-semibold text-gray-900">Account Register</h4>
              <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                + New Entry
              </button>
            </div>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deposit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">✓</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No register entries found
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="h-full flex items-center justify-center text-gray-500">
      <div className="text-center">
        <div className="text-6xl mb-4">🏦</div>
        <p className="text-lg">Select a bank account</p>
        <p className="text-sm">Choose an account to view banking details and operations</p>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-200px)]">
      <TwoPanelLayout
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        leftPanelTitle={`Bank Accounts (${bankAccounts.length})`}
        rightPanelTitle={selectedAccount ? selectedAccount.name : "Banking Operations"}
        leftPanelActions={leftPanelActions}
        rightPanelActions={rightPanelActions}
        searchable={false}
      />

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Bank Transactions</h3>
            
            {!importPreview ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Bank Statement File
                  </label>
                  <input
                    type="file"
                    accept=".csv,.qfx,.ofx"
                    onChange={(e) => setImportFile(e.target.files[0])}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: CSV, QFX, OFX
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportFile(null);
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (importFile) {
                        const fileType = importFile.name.toLowerCase().endsWith('.csv') ? 'csv' : 'qfx';
                        handleFileImport(fileType);
                      }
                    }}
                    disabled={!importFile || loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Preview Import'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900">Import Preview</h4>
                  <p className="text-blue-700 text-sm">
                    Found {importPreview.total_transactions} transactions
                  </p>
                  {importPreview.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-red-700 text-sm font-medium">Errors:</p>
                      <ul className="text-red-600 text-xs list-disc list-inside">
                        {importPreview.errors.slice(0, 5).map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.preview_transactions.map((transaction, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">{new Date(transaction.date).toLocaleDateString()}</td>
                          <td className="px-3 py-2">{transaction.description}</td>
                          <td className={`px-3 py-2 text-right ${
                            transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ${Math.abs(transaction.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setImportPreview(null);
                      setImportFile(null);
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportPreview(null);
                      setImportFile(null);
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmImport}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Importing...' : 'Confirm Import'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reconciliation Modal */}
      {showReconcileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Start Bank Reconciliation</h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              startReconciliation({
                statement_date: formData.get('statement_date'),
                ending_balance: formData.get('ending_balance'),
                notes: formData.get('notes')
              });
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statement Ending Date *
                </label>
                <input
                  type="date"
                  name="statement_date"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statement Ending Balance *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="ending_balance"
                  placeholder="0.00"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Optional reconciliation notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowReconcileModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Starting...' : 'Start Reconciliation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankingCenter;