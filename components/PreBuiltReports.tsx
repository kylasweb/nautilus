
import React, { useState, useMemo } from 'react';
import { Shipment } from '../types';
import { Card } from './ui/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface PreBuiltReportsProps {
  shipments: Shipment[];
}

interface AggregatedData {
  name: string;
  teu: number;
}

export const PreBuiltReports: React.FC<PreBuiltReportsProps> = ({ shipments }) => {
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [selectedOrigin, setSelectedOrigin] = useState<string>('');

  // unique lists for dropdowns
  const uniquePorts = useMemo(() => 
    Array.from(new Set(shipments.map(s => s.usArrivalPort))).sort(), 
  [shipments]);

  const uniqueOrigins = useMemo(() => 
    Array.from(new Set(shipments.map(s => s.placeOfReceipt))).sort(), 
  [shipments]);

  // Logic to find the single top shipper based on filter
  const getTopShipper = (field: 'usArrivalPort' | 'placeOfReceipt', value: string): AggregatedData | null => {
    if (!value) return null;
    
    const shipperMap = new Map<string, number>();
    
    shipments.forEach(s => {
      // @ts-ignore
      if (s[field] === value) {
        shipperMap.set(s.shipperName, (shipperMap.get(s.shipperName) || 0) + s.teu);
      }
    });

    const sorted = Array.from(shipperMap.entries())
      .map(([name, teu]) => ({ name, teu }))
      .sort((a, b) => b.teu - a.teu);
      
    return sorted.length > 0 ? sorted[0] : null;
  };

  // Logic to get route breakdown for that specific shipper
  const getShipperBreakdown = (
    shipperName: string, 
    filterField: 'usArrivalPort' | 'placeOfReceipt', 
    filterValue: string,
    groupByField: 'usArrivalPort' | 'placeOfReceipt'
  ): AggregatedData[] => {
    if (!shipperName || !filterValue) return [];

    const groupMap = new Map<string, number>();

    shipments.forEach(s => {
      // @ts-ignore
      if (s.shipperName === shipperName && s[filterField] === filterValue) {
        // @ts-ignore
        const key = s[groupByField];
        groupMap.set(key, (groupMap.get(key) || 0) + s.teu);
      }
    });

    return Array.from(groupMap.entries())
      .map(([name, teu]) => ({ name, teu }))
      .sort((a, b) => b.teu - a.teu)
      .slice(0, 5); // Top 5 routes for this shipper
  };

  // 1. Calculations for US Arrival Port Report
  const topShipperByPort = useMemo(() => getTopShipper('usArrivalPort', selectedPort), [selectedPort, shipments]);
  
  // For the top shipper to this port, where do they ship FROM?
  const portBreakdownData = useMemo(() => {
    if (!topShipperByPort) return [];
    return getShipperBreakdown(topShipperByPort.name, 'usArrivalPort', selectedPort, 'placeOfReceipt');
  }, [topShipperByPort, selectedPort, shipments]);


  // 2. Calculations for Place of Receipt Report
  const topShipperByOrigin = useMemo(() => getTopShipper('placeOfReceipt', selectedOrigin), [selectedOrigin, shipments]);

  // For the top shipper from this origin, where do they ship TO?
  const originBreakdownData = useMemo(() => {
    if (!topShipperByOrigin) return [];
    return getShipperBreakdown(topShipperByOrigin.name, 'placeOfReceipt', selectedOrigin, 'usArrivalPort');
  }, [topShipperByOrigin, selectedOrigin, shipments]);


  // Helper to render the result card
  const renderResultSection = (
    title: string, 
    options: string[], 
    selectedValue: string, 
    setValue: (val: string) => void,
    winner: AggregatedData | null,
    chartData: AggregatedData[],
    chartTitle: string,
    placeholder: string
  ) => {
    return (
      <Card title={title} className="h-full">
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Location</label>
          <select 
            value={selectedValue}
            onChange={(e) => setValue(e.target.value)}
            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
          >
            <option value="">{placeholder}</option>
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {selectedValue && (
          <div className="animate-fade-in space-y-6">
            {/* Winner Badge */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-center shadow-sm">
                <div className="p-3 bg-indigo-100 rounded-full text-indigo-600 mr-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                </div>
                <div>
                    <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wide">Top Shipper</h4>
                    {winner ? (
                        <>
                             <div className="text-xl font-bold text-slate-900">{winner.name}</div>
                             <div className="text-sm text-slate-600"><span className="font-semibold">{winner.teu} TEU</span> Total Volume</div>
                        </>
                    ) : (
                        <div className="text-sm text-slate-500">No data found for this selection.</div>
                    )}
                </div>
            </div>

            {/* Context Chart */}
            {chartData.length > 0 && (
                <div className="h-64">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">{chartTitle}</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                             <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                             <XAxis type="number" stroke="#64748b" fontSize={12} />
                             <YAxis dataKey="name" type="category" width={110} stroke="#64748b" fontSize={11} tickFormatter={(val) => val.length > 15 ? val.slice(0, 15) + '...' : val} />
                             <Tooltip 
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                cursor={{fill: 'transparent'}}
                             />
                             <Bar dataKey="teu" radius={[0, 4, 4, 0]} barSize={20}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#94a3b8'} />
                                ))}
                             </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
          </div>
        )}

        {!selectedValue && (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <p>Select a location above to see results.</p>
            </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Pre-built Reports</h2>
          <p className="text-slate-500">Quickly identify top performing shippers based on specific routes and ports.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderResultSection(
            "High Volume to US Port", 
            uniquePorts, 
            selectedPort, 
            setSelectedPort, 
            topShipperByPort,
            portBreakdownData,
            topShipperByPort ? `${topShipperByPort.name}'s Top Origins` : 'Top Origins',
            "-- Select US Arrival Port --"
        )}

        {renderResultSection(
            "High Volume from Origin", 
            uniqueOrigins, 
            selectedOrigin, 
            setSelectedOrigin, 
            topShipperByOrigin,
            originBreakdownData,
            topShipperByOrigin ? `${topShipperByOrigin.name}'s Top US Destinations` : 'Top Destinations',
            "-- Select Place of Receipt --"
        )}
      </div>
    </div>
  );
};
