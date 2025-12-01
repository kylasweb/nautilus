import React, { useState, useMemo } from 'react';
import { Shipment, DateRange } from '../types';
import { Card } from './ui/Card';

interface TradeLaneAnalysisProps {
  shipments: Shipment[];
}

export const TradeLaneAnalysis: React.FC<TradeLaneAnalysisProps> = ({ shipments }) => {
  const [localDateRange, setLocalDateRange] = useState<DateRange>({ from: '2023-01-01', to: '2024-12-31' });
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [generated, setGenerated] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Shipment | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  // Extract unique options
  const uniqueOrigins = useMemo(() => Array.from(new Set(shipments.map(s => s.placeOfReceipt))).sort(), [shipments]);
  const uniqueDests = useMemo(() => Array.from(new Set(shipments.map(s => s.usArrivalPort))).sort(), [shipments]);

  const toggleSelection = (item: string, currentList: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (currentList.includes(item)) {
      setter(currentList.filter(i => i !== item));
    } else {
      setter([...currentList, item]);
    }
  };

  const filteredData = useMemo(() => {
    if (!generated) return [];
    return shipments.filter(s => {
      const dateMatch = s.arrivalDate >= localDateRange.from && s.arrivalDate <= localDateRange.to;
      const originMatch = selectedOrigins.length === 0 || selectedOrigins.includes(s.placeOfReceipt);
      const destMatch = selectedDestinations.length === 0 || selectedDestinations.includes(s.usArrivalPort);
      return dateMatch && originMatch && destMatch;
    });
  }, [shipments, generated, localDateRange, selectedOrigins, selectedDestinations]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        // @ts-ignore
        const aValue = a[sortConfig.key];
        // @ts-ignore
        const bValue = b[sortConfig.key];

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const requestSort = (key: keyof Shipment) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Shipment) => {
    if (sortConfig.key !== key) {
        return <span className="text-slate-300 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">↕</span>;
    }
    return sortConfig.direction === 'asc' ? <span className="text-blue-600 ml-1">↑</span> : <span className="text-blue-600 ml-1">↓</span>;
  };

  const handleExport = () => {
    const headers = ["Place Of Receipt", "US Arrival Port", "Shipper", "Consignee", "TEU", "Date"];
    const rows = sortedData.map(s => 
      [s.placeOfReceipt, s.usArrivalPort, s.shipperName, s.consigneeName, s.teu, s.arrivalDate].join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "trade_lane_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <Card title="Trade Lane Filters" subtitle="Configure your report parameters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
            <div className="flex space-x-2">
              <input 
                type="date" 
                value={localDateRange.from}
                onChange={(e) => setLocalDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2"
              />
              <input 
                type="date" 
                value={localDateRange.to}
                onChange={(e) => setLocalDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2"
              />
            </div>
          </div>

          {/* Origins Multi-select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Place of Receipt</label>
            <div className="h-32 overflow-y-auto border border-slate-300 rounded-md p-2 bg-white custom-scrollbar">
              {uniqueOrigins.map(origin => (
                <div key={origin} className="flex items-center mb-1">
                  <input 
                    type="checkbox" 
                    checked={selectedOrigins.includes(origin)}
                    onChange={() => toggleSelection(origin, selectedOrigins, setSelectedOrigins)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-slate-700">{origin}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dests Multi-select */}
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">US Arrival Port</label>
             <div className="h-32 overflow-y-auto border border-slate-300 rounded-md p-2 bg-white custom-scrollbar">
              {uniqueDests.map(dest => (
                <div key={dest} className="flex items-center mb-1">
                  <input 
                    type="checkbox" 
                    checked={selectedDestinations.includes(dest)}
                    onChange={() => toggleSelection(dest, selectedDestinations, setSelectedDestinations)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-slate-700">{dest}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
            <button 
                onClick={() => setGenerated(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                Generate Report
            </button>
        </div>
      </Card>

      {generated && (
          <Card title="Results" subtitle={`${sortedData.length} records found`}>
              <div className="mb-4 flex justify-end">
                  <button onClick={handleExport} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      Download CSV
                  </button>
              </div>
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                          <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Place of Receipt</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">US Arrival Port</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Shipper</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Consignee</th>
                              <th 
                                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 select-none"
                                onClick={() => requestSort('teu')}
                              >
                                <div className="flex items-center">
                                    TEU {getSortIcon('teu')}
                                </div>
                              </th>
                              <th 
                                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 select-none"
                                onClick={() => requestSort('arrivalDate')}
                              >
                                <div className="flex items-center">
                                    Date {getSortIcon('arrivalDate')}
                                </div>
                              </th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                          {sortedData.map((s, idx) => (
                              <tr key={`${s.houseBolNumber}-${idx}`}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{s.placeOfReceipt}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{s.usArrivalPort}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{s.shipperName}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{s.consigneeName}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{s.teu}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{s.arrivalDate}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  {sortedData.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                          No records found matching criteria.
                      </div>
                  )}
              </div>
          </Card>
      )}
    </div>
  );
};
