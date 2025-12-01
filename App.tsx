
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ViewState, Shipment, ShipperContact, DateRange, UserRole
} from './types';
import { 
  getUniqueShippers 
} from './services/data';
import { fetchShipments, fetchContacts, seedDatabase } from './services/db';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Dashboard } from './components/Dashboard';
import { TradeLaneAnalysis } from './components/TradeLaneAnalysis';
import { ShipperContacts } from './components/ShipperContacts';
import { DataImport } from './components/DataImport';
import { PreBuiltReports } from './components/PreBuiltReports';
import { MapView } from './components/MapView';
import { LandingPage } from './components/LandingPage';
import { Login } from './components/Login';

// --- Sidebar Icon Components ---
const DashboardIcon = () => <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
const TableIcon = () => <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const ChartIcon = () => <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>;
const MapIcon = () => <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ContactIcon = () => <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const UploadIcon = () => <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" /></svg>;

const MainApp: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  
  // --- App State ---
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  
  // "Database" State
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [contacts, setContacts] = useState<ShipperContact[]>([]);

  // Filter State (Global for Dashboard)
  const [selectedShipper, setSelectedShipper] = useState<string>('');
  const [globalDateRange, setGlobalDateRange] = useState<DateRange>({ from: '2023-01-01', to: '2024-12-31' });

  // Autocomplete State
  const [shipperSearch, setShipperSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // --- Initialization ---
  useEffect(() => {
    const initData = async () => {
      try {
        let dbShipments = await fetchShipments();
        let dbContacts = await fetchContacts();

        if (dbShipments.length === 0) {
          await seedDatabase();
          dbShipments = await fetchShipments();
          dbContacts = await fetchContacts();
        }

        setShipments(dbShipments);
        setContacts(dbContacts);

        if (dbShipments.length > 0) {
           const unique = getUniqueShippers(dbShipments);
           if (unique.length > 0) {
             setSelectedShipper(unique[0]);
             setShipperSearch(unique[0]);
           }
        }
      } catch (e) {
        console.error("Initialization Failed:", e);
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  // Computed State
  const shipperList = useMemo(() => getUniqueShippers(shipments), [shipments]);

  const filteredShipperList = useMemo(() => {
    if (!shipperSearch) return shipperList;
    return shipperList.filter(s => s.toLowerCase().includes(shipperSearch.toLowerCase()));
  }, [shipperList, shipperSearch]);

  // --- Handlers ---
  const handleShipperSelect = (name: string) => {
    setSelectedShipper(name);
    setShipperSearch(name);
    setIsDropdownOpen(false);
  };

  const handleDataImport = (newBatch: Shipment[]) => {
    setShipments(prev => [...prev, ...newBatch]);
    const existingShipperNames = new Set(contacts.map(c => c.shipperName));
    const newContacts: ShipperContact[] = [];

    newBatch.forEach(s => {
      if (!existingShipperNames.has(s.shipperName)) {
        newContacts.push({
          shipperName: s.shipperName,
          email: '',
          contactNumber: '',
          address: '',
          panNumber: '',
          cinNumber: '',
          customerType: '',
          companySize: '',
          contactPersonName: '',
          designation: ''
        });
        existingShipperNames.add(s.shipperName);
      }
    });

    if (newContacts.length > 0) {
      setContacts(prev => [...prev, ...newContacts]);
      alert(`${newContacts.length} new shippers detected. Please update their contact info.`);
    }
  };

  const handleContactUpdate = (updatedContact: ShipperContact) => {
    setContacts(prev => prev.map(c => c.shipperName === updatedContact.shipperName ? updatedContact : c));
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col fixed h-full z-10 transition-all duration-300">
        <div className="h-16 flex items-center px-6 bg-slate-950 font-bold text-white tracking-wider">
          <span className="text-blue-500 mr-2">NAUTILUS</span> INTEL
        </div>
        
        {/* User Profile Mini */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center">
            <img src={user?.avatar} alt={user?.name} className="w-8 h-8 rounded-full mr-3" />
            <div className="overflow-hidden">
                <div className="text-sm font-medium text-white truncate">{user?.name}</div>
                <div className="text-xs text-slate-500 truncate">{user?.role}</div>
            </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Analysis</p>
          <button 
            onClick={() => setCurrentView(ViewState.DASHBOARD)}
            className={`w-full flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${currentView === ViewState.DASHBOARD ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <DashboardIcon /> Dashboard
          </button>
          <button 
             onClick={() => setCurrentView(ViewState.TRADE_LANE)}
             className={`w-full flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${currentView === ViewState.TRADE_LANE ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <TableIcon /> Trade Lane Analysis
          </button>
          <button 
             onClick={() => setCurrentView(ViewState.PRE_BUILT_REPORTS)}
             className={`w-full flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${currentView === ViewState.PRE_BUILT_REPORTS ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <ChartIcon /> Pre-built Reports
          </button>
          <button 
             onClick={() => setCurrentView(ViewState.MAP_VIEW)}
             className={`w-full flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${currentView === ViewState.MAP_VIEW ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <MapIcon /> Map View
          </button>

          <div className="pt-4 pb-2">
            <p className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Data Management</p>
            
            {/* Permission Check: Viewers cannot see Contacts */}
            {hasPermission(['Admin', 'Analyst']) && (
                <button 
                onClick={() => setCurrentView(ViewState.CONTACTS)}
                className={`w-full flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${currentView === ViewState.CONTACTS ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
                >
                <ContactIcon /> Shipper Contacts
                </button>
            )}

            {/* Permission Check: Only Admins can Import */}
            {hasPermission(['Admin']) && (
                <button 
                onClick={() => setCurrentView(ViewState.IMPORT)}
                className={`w-full flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${currentView === ViewState.IMPORT ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
                >
                <UploadIcon /> Data Import
                </button>
            )}
            
            {!hasPermission(['Admin', 'Analyst']) && !hasPermission(['Admin']) && (
                <div className="px-2 text-xs text-slate-600 italic mt-2">
                    Read-only access enabled.
                </div>
            )}
          </div>
        </nav>

        <div className="p-4 bg-slate-950 text-xs text-slate-500 border-t border-slate-900">
           <button onClick={logout} className="w-full mb-4 text-left text-slate-400 hover:text-white flex items-center">
             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
             Sign Out
           </button>

          <div className="flex justify-between items-center mb-2">
            <span>System Status:</span>
            <span className={`flex items-center ${isLoading ? "text-yellow-500" : "text-green-500"}`}>
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing...
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Online
                </>
              )}
            </span>
          </div>
          <p>Records: <span className="text-slate-300">{shipments.length}</span></p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        
        {/* Header Controls (Only for Dashboard) */}
        {currentView === ViewState.DASHBOARD && (
          <header className="mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="w-full md:w-1/3 relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Shipper</label>
                <div className="relative">
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input 
                          type="text"
                          value={shipperSearch}
                          onChange={(e) => {
                              setShipperSearch(e.target.value);
                              setIsDropdownOpen(true);
                          }}
                          onFocus={() => setIsDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                          className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 pl-10 pr-10"
                          placeholder="Search Shipper..."
                          autoComplete="off"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                        {shipperSearch ? (
                            <button 
                                onClick={() => {
                                    setShipperSearch('');
                                    setIsDropdownOpen(true);
                                }}
                                className="text-slate-400 hover:text-slate-600 focus:outline-none"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        ) : (
                            <svg className="h-5 w-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        )}
                      </div>
                    </div>

                    {isDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                            {filteredShipperList.length > 0 ? (
                                filteredShipperList.map(s => (
                                    <div 
                                        key={s}
                                        className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 text-slate-900 ${selectedShipper === s ? 'bg-blue-50' : ''}`}
                                        onClick={() => handleShipperSelect(s)}
                                    >
                                        <span className={`block truncate ${selectedShipper === s ? 'font-semibold' : 'font-normal'}`}>
                                            {s}
                                        </span>
                                        {selectedShipper === s && (
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </span>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="cursor-default select-none relative py-2 pl-3 pr-9 text-slate-500 italic">
                                    {isLoading ? 'Loading shippers...' : 'No shippers found'}
                                </div>
                            )}
                        </div>
                    )}
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
                  <input 
                    type="date" 
                    value={globalDateRange.from}
                    onChange={(e) => setGlobalDateRange(prev => ({...prev, from: e.target.value}))}
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                  <input 
                    type="date" 
                    value={globalDateRange.to}
                    onChange={(e) => setGlobalDateRange(prev => ({...prev, to: e.target.value}))}
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  />
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Dynamic View Content */}
        <div className="animate-fade-in">
          {currentView === ViewState.DASHBOARD && (
            <Dashboard 
              shipments={shipments} 
              selectedShipper={selectedShipper} 
              dateRange={globalDateRange} 
            />
          )}

          {currentView === ViewState.TRADE_LANE && (
             <div className="space-y-4">
               <h2 className="text-2xl font-bold text-slate-800">Trade Lane Analysis</h2>
               <p className="text-slate-500">Detailed lane reporting and data extraction.</p>
               <TradeLaneAnalysis shipments={shipments} />
             </div>
          )}
          
          {currentView === ViewState.PRE_BUILT_REPORTS && (
            <PreBuiltReports shipments={shipments} />
          )}

          {currentView === ViewState.MAP_VIEW && (
            <MapView shipments={shipments} contacts={contacts} />
          )}

          {/* Middleware Logic: Redirect or Show Warning if accessing unauthorized view via state */}
          {currentView === ViewState.CONTACTS && (
             hasPermission(['Admin', 'Analyst']) ? (
               <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-slate-800">Shipper Contact Management</h2>
                  <p className="text-slate-500">Maintain up-to-date contact information for compliance.</p>
                  <ShipperContacts contacts={contacts} onUpdateContact={handleContactUpdate} />
               </div>
             ) : (
                <div className="p-4 bg-red-100 text-red-700 rounded-lg">Access Denied: You do not have permission to view this page.</div>
             )
          )}

          {currentView === ViewState.IMPORT && (
             hasPermission(['Admin']) ? (
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-slate-800">Data Import</h2>
                    <p className="text-slate-500">Upload new shipping manifests. Duplicates will be rejected automatically based on House BOL.</p>
                    <DataImport currentShipments={shipments} onImport={handleDataImport} />
                </div>
             ) : (
                <div className="p-4 bg-red-100 text-red-700 rounded-lg">Access Denied: You do not have permission to view this page.</div>
             )
          )}
        </div>
      </main>
    </div>
  );
};

const Root: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  // Router Logic (State Based)
  if (isAuthenticated) {
    return <MainApp />;
  }

  if (showLogin) {
    return <Login onBack={() => setShowLogin(false)} />;
  }

  return <LandingPage onLoginClick={() => setShowLogin(true)} />;
};

export default function AppWrapper() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
