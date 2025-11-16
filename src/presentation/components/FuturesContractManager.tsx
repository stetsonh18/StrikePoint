import React, { useState, useMemo } from 'react';
import { TrendingUp, Plus, Edit2, Power, Search, AlertCircle } from 'lucide-react';
import { useFuturesContractSpecs, useDeactivateFuturesContractSpec, useActivateFuturesContractSpec } from '@/application/hooks/useFuturesContractSpecs';
import { ContractSpecForm } from './ContractSpecForm';
import type { FuturesContractSpec } from '@/domain/types';

export const FuturesContractManager: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState<FuturesContractSpec | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data: allContracts = [], isLoading } = useFuturesContractSpecs();
  const deactivateMutation = useDeactivateFuturesContractSpec();
  const activateMutation = useActivateFuturesContractSpec();

  // Filter contracts based on search and inactive toggle
  const filteredContracts = useMemo(() => {
    return allContracts.filter(contract => {
      const matchesSearch = !searchQuery ||
        contract.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesActiveFilter = showInactive || contract.is_active;

      return matchesSearch && matchesActiveFilter;
    });
  }, [allContracts, searchQuery, showInactive]);

  const handleEdit = (contract: FuturesContractSpec) => {
    setEditingContract(contract);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingContract(null);
    setShowForm(true);
  };

  const handleToggleActive = async (contract: FuturesContractSpec) => {
    if (contract.is_active) {
      await deactivateMutation.mutateAsync(contract.id);
    } else {
      await activateMutation.mutateAsync(contract.id);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-100">
              Futures Contract Specifications
            </h3>
            <p className="text-sm text-slate-400">
              Manage futures contracts with margin requirements and tick specifications
            </p>
          </div>
        </div>
        <button
          onClick={handleAddNew}
          className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium transition-all"
        >
          <Plus size={18} className="inline mr-2" />
          Add Contract
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by symbol or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
          />
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl cursor-pointer hover:bg-slate-800 transition-all">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 text-emerald-500 bg-slate-900 border-slate-700 rounded focus:ring-2 focus:ring-emerald-500/50"
          />
          <span className="text-sm text-slate-300">Show Inactive</span>
        </label>
      </div>

      {/* Contracts Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            Loading contracts...
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">No contracts found</p>
            {searchQuery && (
              <p className="text-sm text-slate-500 mt-1">
                Try a different search term or add a new contract
              </p>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Exchange
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Multiplier
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Tick Size
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Tick Value
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Margin
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Fees
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredContracts.map((contract) => (
                <tr
                  key={contract.id}
                  className={`hover:bg-slate-800/30 transition-colors ${
                    !contract.is_active ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-semibold text-slate-100">{contract.symbol}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-slate-300">{contract.name}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-slate-400">{contract.exchange || '-'}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-slate-300">
                    {formatNumber(contract.multiplier)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-slate-300">
                    {formatNumber(contract.tick_size)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-slate-300">
                    ${formatNumber(contract.tick_value)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-slate-300">
                    {formatCurrency(contract.initial_margin)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-slate-300">
                    ${formatNumber(contract.fees_per_contract)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        contract.is_active
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                      }`}
                    >
                      {contract.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(contract)}
                        className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Edit contract"
                      >
                        <Edit2 size={16} className="text-slate-400 hover:text-emerald-400" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(contract)}
                        className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                        title={contract.is_active ? 'Deactivate contract' : 'Activate contract'}
                        disabled={deactivateMutation.isPending || activateMutation.isPending}
                      >
                        <Power
                          size={16}
                          className={contract.is_active ? 'text-emerald-400' : 'text-slate-500'}
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-slate-400">
        Showing {filteredContracts.length} of {allContracts.length} contracts
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Contract Form Modal */}
      {showForm && (
        <ContractSpecForm
          contract={editingContract}
          onClose={() => {
            setShowForm(false);
            setEditingContract(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingContract(null);
          }}
        />
      )}
    </div>
  );
};
