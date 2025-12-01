
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Shipment, DateRange } from '../types';
import { 
  filterShipments, 
  getConsigneeStats, 
  getRouteStats, 
  getCarrierStats, 
  getVolumeTrend 
} from '../services/data';
import { Card } from './ui/Card';

interface DashboardProps {
  shipments: Shipment[];
  selectedShipper: string | null;
  dateRange: DateRange;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

export const Dashboard: React.FC<DashboardProps> = ({ shipments, selectedShipper, dateRange }) => {
  
  // 1. Filter Data
  const filteredData = useMemo(() => 
    filterShipments(shipments, selectedShipper, dateRange.from, dateRange.to),
  [shipments, selectedShipper, dateRange]);

  // 2. Aggregate Data for Charts
  const consigneeData = useMemo(() => getConsigneeStats(filteredData), [filteredData]);
  const routeData = useMemo(() => getRouteStats(filteredData), [filteredData]);
  const { topVOCC, topNVOCC } = useMemo(() => getCarrierStats(filteredData), [filteredData]);
  const trendData = useMemo(() => getVolumeTrend(filteredData), [filteredData]);

  if (!selectedShipper) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p className="text-xl font-medium">Please select a shipper to view the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 mb-2">
        <div className="flex items-center space-x-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
                <p className="text-sm text-blue-800 font-medium">Dashboard Summary</p>
                <p className="text-xs text-blue-600">
                    Showing <span className="font-bold">{filteredData.length}</span> shipments for <span className="font-bold">{selectedShipper}</span> from {dateRange.from} to {dateRange.to}.
                </p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Report 1: Major Consignees */}
        <Card title="Major Consignees" subtitle="Top 10 recipients by TEU Volume">
          <div className="h-80 w-full" style={{ minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={consigneeData} margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis dataKey="name" type="category" width={100} stroke="#64748b" fontSize={12} tickFormatter={(val) => val.length > 12 ? val.slice(0, 12) + '...' : val} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 p-3 shadow-lg rounded-md text-xs">
                          <p className="font-bold text-slate-800 mb-1">{data.name}</p>
                          <p className="text-slate-600">City: {data.city}</p>
                          <p className="text-slate-600">Address: {data.address}</p>
                          <p className="text-blue-600 font-semibold mt-1">Volume: {data.teu} TEU</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="teu" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Report 2: Trade Lanes (Visualized as Flows) */}
        <Card title="Top Trade Lanes" subtitle="Volume flow from Origin to US Port">
          <div className="h-80 w-full relative overflow-y-auto custom-scrollbar">
             {/* Custom simple flow visualization */}
             <div className="space-y-4 px-2 pt-2">
                {routeData.map((route, idx) => {
                  const maxVal = Math.max(...routeData.map(r => r.teu));
                  const widthPercent = (route.teu / maxVal) * 100;
                  
                  return (
                    <div key={idx} className="relative">
                      <div className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 text-xs">{route.origin}</span>
                        <span className="text-slate-400 text-xs flex-grow mx-2 border-b border-dashed border-slate-300 relative top-[-8px]"></span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 text-xs">{route.dest}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 mb-1 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-3 rounded-full transition-all duration-500" 
                          style={{ width: `${widthPercent}%` }}
                        ></div>
                      </div>
                      <div className="text-right text-xs text-emerald-600 font-bold">{route.teu} TEU</div>
                    </div>
                  )
                })}
             </div>
          </div>
        </Card>

        {/* Report 3: Carriers */}
        <Card title="Carrier Analysis" subtitle="Top NVOCCs vs VOCCs Share" className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-80" style={{ minWidth: 0, minHeight: 0 }}>
            {/* Left: NVOCC Bar Chart */}
            <div className="h-full">
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">Top NVOCCs (Volume)</h4>
               <ResponsiveContainer width="100%" height="90%">
                <BarChart data={topNVOCC}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                  <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} stroke="#64748b" tickFormatter={(val) => val.split(' ')[0]}/>
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200 p-4 shadow-xl rounded-lg text-xs z-10 relative min-w-[200px]">
                            <p className="font-bold text-slate-900 mb-2 text-sm">{data.name}</p>
                            <p className="text-blue-600 font-bold mb-3 text-base border-b border-slate-100 pb-2">{data.teu} TEU</p>
                            
                            <div className="space-y-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">Top Arrival Port</span>
                                    <span className="text-slate-800 font-semibold bg-slate-50 px-2 py-1 rounded border border-slate-100 mt-0.5 inline-block">{data.topPort}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">Top Place of Receipt</span>
                                    <span className="text-slate-800 font-semibold bg-slate-50 px-2 py-1 rounded border border-slate-100 mt-0.5 inline-block">{data.topReceipt}</span>
                                </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="teu" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
               </ResponsiveContainer>
            </div>
            
            {/* Right: VOCC Pie Chart */}
            <div className="h-full flex flex-col items-center">
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">Top VOCCs (Market Share)</h4>
               <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={topVOCC}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="teu"
                  >
                    {topVOCC.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    wrapperStyle={{fontSize: '12px'}} 
                    formatter={(value, name) => [`${value} TEU`, name]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px'}}/>
                </PieChart>
               </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Report 4: Trend */}
        <Card title="Shipment Volume Trend" subtitle="Monthly TEU volume over time" className="lg:col-span-2">
          <div className="h-72 w-full" style={{ minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                   itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                />
                <Line type="monotone" dataKey="teu" stroke="#f59e0b" strokeWidth={3} activeDot={{ r: 8 }} dot={{ r: 4, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

      </div>
    </div>
  );
};
