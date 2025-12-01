
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Shipment, DriveFile } from '../types';
import { Card } from './ui/Card';
import { findClosestMatch } from '../services/data';
import { initGapiClient, initGisClient, requestAccessToken, listCsvFiles, downloadFileContent } from '../services/drive';
import { Upload, HardDrive, RefreshCw, CheckCircle, AlertCircle, FileText, ExternalLink, Loader2, Download } from 'lucide-react';

interface DataImportProps {
  currentShipments: Shipment[];
  onImport: (newShipments: Shipment[]) => void;
}

interface ConflictItem {
  id: string; 
  shipment: Shipment;
  field: 'shipperName' | 'consigneeName' | 'notifyParty';
  importedValue: string;
  suggestion: string;
  resolution: 'use_suggestion' | 'keep_imported';
}

interface SyncLog {
  id: string;
  timestamp: string;
  status: 'success' | 'error';
  records: number;
  message: string;
}

export const DataImport: React.FC<DataImportProps> = ({ currentShipments, onImport }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'drive'>('upload');
  const [step, setStep] = useState<'upload' | 'review' | 'complete'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importLog, setImportLog] = useState<{type: 'success' | 'error' | 'info', msg: string}[]>([]);
  
  // Staging state
  const [validRecords, setValidRecords] = useState<Shipment[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [stats, setStats] = useState({ added: 0, rejected: 0, flagged: 0 });

  // Drive State
  const [isDriveInitialized, setIsDriveInitialized] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncLog[]>([]);
  
  const syncIntervalRef = useRef<any>(null);

  // Existing Data Sets for Matching
  const existingShippers = useMemo(() => Array.from(new Set(currentShipments.map(s => s.shipperName))), [currentShipments]);
  const existingConsignees = useMemo(() => Array.from(new Set(currentShipments.map(s => s.consigneeName))), [currentShipments]);

  // --- Initialize Google Scripts ---
  useEffect(() => {
      const initGoogle = async () => {
          try {
              // Wait for script tags in index.html to load
              if (window.gapi && window.google) {
                await initGapiClient();
                await initGisClient();
                setIsDriveInitialized(true);
              }
          } catch (e) {
              console.error("Failed to initialize Google Drive API", e);
              setImportLog([{ type: 'error', msg: 'Failed to initialize Google API. Check network or AdBlocker.' }]);
          }
      };
      
      // Short delay to ensure scripts are parsed
      const timer = setTimeout(initGoogle, 1000);
      return () => clearTimeout(timer);
  }, []);

  // --- Auth Handler ---
  const handleGoogleAuth = async () => {
      setImportLog([]);
      try {
          await requestAccessToken();
          setIsDriveConnected(true);
          // Auto fetch files after login
          const files = await listCsvFiles();
          setDriveFiles(files);
          if (files.length > 0) setSelectedFileId(files[0].id);
      } catch (e: any) {
          // Only log real errors, suppress user cancellations
          if (e?.type !== 'popup_closed' && e?.error !== 'popup_closed_by_user') {
               console.error("Auth Failed", e);
          }
          
          let msg = 'Google Authentication Failed.';
          
          if (e?.type === 'token_failed' || (e?.error && e.error.includes('invalid_request'))) {
              msg = 'Configuration Error: Add this domain to Authorized Origins in Google Cloud Console.';
          } else if (e?.error === 'popup_closed_by_user' || e?.type === 'popup_closed') {
              msg = 'Authentication cancelled by user.';
          }
          
          setImportLog([{ type: 'error', msg }]);
      }
  };

  // --- CSV Parsing Logic ---
  const parseCSVLine = (text: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            result.push(cur.trim().replace(/^"|"$/g, ''));
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    let d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3 && parts[2].length === 4) {
         return new Date(`${parts[2]}-${parts[0]}-${parts[1]}`).toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  };

  const processCSVText = (text: string, source: 'upload' | 'drive') => {
    setIsProcessing(true);
    setImportLog([]);
    setValidRecords([]);
    setConflicts([]);
    setStats({ added: 0, rejected: 0, flagged: 0 });

    const lines = text.split(/\r\n|\n|\r/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
            setImportLog([{ type: 'error', msg: 'File appears to be empty or missing headers.' }]);
            setIsProcessing(false);
            return;
    }

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/^\ufeff/, '').trim());
    const getIndex = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

    const colMap = {
        hbl: getIndex(['house bol', 'hbl', 'house bill', 'bol']),
        shipper: getIndex(['shipper name', 'shipper']),
        consignee: getIndex(['consignee name', 'consignee']),
        // Specific keys first to avoid 'Shipper City' matching 'city'
        consCity: getIndex(['consignee city', 'pod city', 'destination city']),
        consAddress: getIndex(['consignee address']),
        notify: getIndex(['notify name', 'notify']),
        receipt: getIndex(['place of receipt', 'receipt', 'origin']),
        port: getIndex(['us arrival port', 'arrival port', 'pod', 'discharge']),
        date: getIndex(['arrival date', 'eta']), // 'arrival' keyword alone might match 'us arrival port'
        teu: getIndex(['teu', 'volume']), // 'TEU' is explicit
        nvocc: getIndex(['nvocc name', 'nvocc']),
        voccCode: getIndex(['vocc code', 'scac']),
        voccName: getIndex(['vocc name', 'carrier name'])
    };

    // Fallback if VOCC Name is not found but VOCC Code is, or generic 'vocc' was used but captured code
    // If strict matching failed, try broader search for VOCC name, ensuring it's not the same index as code
    if (colMap.voccName === -1) {
         // Try finding column with 'vocc' that isn't the code column
         const potentialIndex = headers.findIndex((h, idx) => h.includes('vocc') && idx !== colMap.voccCode);
         if (potentialIndex !== -1) colMap.voccName = potentialIndex;
    }

    const missingCols: string[] = [];
    if (colMap.hbl === -1) missingCols.push('House BOL');
    if (colMap.shipper === -1) missingCols.push('Shipper Name');
    if (colMap.teu === -1) missingCols.push('TEU/Volume');

    if (missingCols.length > 0) {
            setImportLog([
                { type: 'error', msg: `Critical columns missing: ${missingCols.join(', ')}.` },
                { type: 'info', msg: `Found Headers: ${headers.join(', ')}` }
            ]);
            setIsProcessing(false);
            if (source === 'drive') {
               setSyncHistory(prev => [{
                   id: Date.now().toString(),
                   timestamp: new Date().toLocaleTimeString(),
                   status: 'error',
                   records: 0,
                   message: 'Critical columns missing in synced file.'
               }, ...prev]);
            }
            return;
    }

    const tempValid: Shipment[] = [];
    const tempConflicts: ConflictItem[] = [];
    const existingBolSet = new Set(currentShipments.map(s => s.houseBolNumber));
    let rejectedCount = 0;

    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (row.length < 3) continue; 

        const hbl = colMap.hbl > -1 ? row[colMap.hbl] : `UNKNOWN-${i}`;
        
        if (!hbl || (existingBolSet.has(hbl) && hbl !== `UNKNOWN-${i}`)) {
            rejectedCount++;
            continue;
        }

        const record: Shipment = {
            houseBolNumber: hbl,
            shipperName: colMap.shipper > -1 ? (row[colMap.shipper] || 'Unknown Shipper') : 'Unknown Shipper',
            consigneeName: colMap.consignee > -1 ? (row[colMap.consignee] || 'Unknown Consignee') : 'Unknown Consignee',
            consigneeCity: colMap.consCity > -1 ? row[colMap.consCity] : '',
            consigneeAddress: colMap.consAddress > -1 ? row[colMap.consAddress] : '',
            notifyParty: colMap.notify > -1 ? row[colMap.notify] : undefined,
            placeOfReceipt: colMap.receipt > -1 ? row[colMap.receipt] : 'Unknown Origin',
            usArrivalPort: colMap.port > -1 ? row[colMap.port] : 'Unknown Port',
            arrivalDate: normalizeDate(colMap.date > -1 ? row[colMap.date] : ''),
            teu: (colMap.teu > -1 ? parseFloat(row[colMap.teu]) : 0) || 0,
            nvoccName: colMap.nvocc > -1 ? row[colMap.nvocc] : '',
            voccCode: colMap.voccCode > -1 ? row[colMap.voccCode] : '',
            voccName: colMap.voccName > -1 ? row[colMap.voccName] : ''
        };

        let hasConflict = false;
        const shipperMatch = findClosestMatch(record.shipperName, existingShippers);
        if (shipperMatch && shipperMatch !== record.shipperName) {
            tempConflicts.push({ id: `conf-ship-${i}`, shipment: record, field: 'shipperName', importedValue: record.shipperName, suggestion: shipperMatch, resolution: 'use_suggestion' });
            hasConflict = true;
        }

        const consigneeMatch = findClosestMatch(record.consigneeName, existingConsignees);
        if (consigneeMatch && consigneeMatch !== record.consigneeName) {
            tempConflicts.push({ id: `conf-cons-${i}`, shipment: record, field: 'consigneeName', importedValue: record.consigneeName, suggestion: consigneeMatch, resolution: 'use_suggestion' });
            hasConflict = true;
        }

        tempValid.push(record);
    }

    setValidRecords(tempValid);
    setConflicts(tempConflicts);
    setStats({ added: 0, rejected: rejectedCount, flagged: tempConflicts.length });
    setIsProcessing(false);
    
    if (source === 'drive') {
        if (tempValid.length > 0) {
            setLastSynced(new Date().toLocaleString());
            setSyncHistory(prev => [{
                id: Date.now().toString(),
                timestamp: new Date().toLocaleTimeString(),
                status: 'success',
                records: tempValid.length,
                message: `Synced ${tempValid.length} records (${rejectedCount} duplicates)`
            }, ...prev]);
        }
    }

    if (tempConflicts.length > 0) {
        setStep('review');
    } else if (tempValid.length > 0) {
        setStep('complete'); 
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) processCSVText(text, 'upload');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDriveSync = async () => {
      if (!isDriveConnected || !selectedFileId) return;
      setIsProcessing(true);
      
      try {
          const content = await downloadFileContent(selectedFileId);
          processCSVText(content, 'drive');
      } catch (e) {
          console.error("Drive Sync Failed", e);
          setImportLog([{ type: 'error', msg: 'Failed to download file content from Google Drive.' }]);
          setIsProcessing(false);
      }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "Arrival Date", "Place Of Receipt", "Shipper Name", "Shipper Address", "Shipper City", "Shipper State", 
      "Master Shipper Name", "Consignee Name", "Consignee Address", "Consignee City", "Master Consignee Name", 
      "Notify Name", "Notify Address", "Notify City", "Container Number", "HS Code", "US Arrival Port", 
      "US Inland Clearing Port", "TEU", "NVOCC Name", "VOCC Code", "Bill Type", "House BOL Number", 
      "Master BOL Number", "Container Content", "Container Count", "Container Load"
    ];
    
    const sampleRow = [
      "28-Nov-2025", "COCHIN", "ACCELERATED FREEZE DRYING CO. LTD.", "EP/IV/513, EZHUPUNNA P.O. ALAPPUZHA DIST., KERALA, INDIA", "ALAPPUZHA", "", "TMC GLOBAL FORWARDING", "INTERNATIONAL CREATIVE FOODS INC", "200 CENTER STREET EL SEGUNDO , CA 90245 , USA", "EL SEGUNDO", "TRANSMODAL S.A.", "VANTAGE POINT SERVICES, LLC", "22513 MARINE VIEW DR.S SUITE 200 DES MOINES, WA 98198", "DES MOINES", "ONEU0923597", "03061711", "Los Angeles Seaport, California", "", "2.00", "TMC GLOBAL FORWARDING INDIA PRIVATE LIMITED", "ONEY", "House", "TBSVTMCGIND00710", "ONEYCOKF06939800", "FREEZE DRIED SHRIMP", "1", "Full"
    ];

    const toCsvRow = (row: string[]) => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",");
    const csvContent = "data:text/csv;charset=utf-8," + [toCsvRow(headers), toCsvRow(sampleRow)].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "shipment_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Continuous Sync Logic
  useEffect(() => {
    if (isSyncEnabled && isDriveConnected && selectedFileId) {
        const intervalId = setInterval(async () => {
            // In a real app, check 'modifiedTime' metadata first before downloading full content
            // For this demo, we just attempt a sync every 60 seconds
            console.log("Auto-Syncing...");
            handleDriveSync();
        }, 60000); // 60 seconds
        syncIntervalRef.current = intervalId;
    } else {
        if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    }
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); }
  }, [isSyncEnabled, isDriveConnected, selectedFileId]);


  const handleResolutionChange = (id: string, resolution: 'use_suggestion' | 'keep_imported') => {
    setConflicts(prev => prev.map(c => c.id === id ? { ...c, resolution } : c));
  };

  const finalizeImport = () => {
    const finalRecords = validRecords.map(record => {
      const recordConflicts = conflicts.filter(c => c.shipment === record);
      if (recordConflicts.length === 0) return record;
      const updatedRecord = { ...record };
      recordConflicts.forEach(conf => {
        if (conf.resolution === 'use_suggestion') {
          // @ts-ignore
          updatedRecord[conf.field] = conf.suggestion;
        }
      });
      return updatedRecord;
    });
    onImport(finalRecords);
    setStats(prev => ({ ...prev, added: finalRecords.length }));
    setStep('complete');
  };

  const reset = () => {
    setStep('upload');
    setImportLog([]);
    setValidRecords([]);
    setConflicts([]);
    setStats({ added: 0, rejected: 0, flagged: 0 });
  };

  return (
    <div className="space-y-6">
        <div className="flex space-x-4 border-b border-slate-200 mb-6">
            <button
                onClick={() => { setActiveTab('upload'); reset(); }}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center ${
                    activeTab === 'upload' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
            >
                <Upload className="w-4 h-4 mr-2" />
                Manual Upload
            </button>
            <button
                onClick={() => { setActiveTab('drive'); reset(); }}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center ${
                    activeTab === 'drive' ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500'
                }`}
            >
                <HardDrive className="w-4 h-4 mr-2" />
                Google Drive
            </button>
        </div>

        {importLog.length > 0 && (
            <div className={`mb-4 p-4 rounded-md border ${importLog[0].type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                {importLog.map((log, i) => (
                    <div key={i} className="flex items-center text-sm mb-1 last:mb-0">
                        {log.type === 'error' ? <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" /> : <div className="w-4 h-4 mr-2" />}
                        {log.msg}
                    </div>
                ))}
            </div>
        )}

        <Card title={activeTab === 'upload' ? "Import Shipping Data" : "Google Drive Sync"} subtitle={activeTab === 'upload' ? "Upload CSV files" : "Sync directly from Cloud"}>
            
            {activeTab === 'upload' && step === 'upload' && (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-12 bg-slate-50 relative">
                    <div className="absolute top-4 right-4">
                        <button 
                            onClick={handleDownloadTemplate}
                            className="flex items-center text-xs text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-3 py-1.5 rounded-md shadow-sm transition-colors hover:bg-blue-50"
                            title="Download CSV Template based on your data structure"
                        >
                            <Download className="w-3 h-3 mr-1.5" />
                            Download Template
                        </button>
                    </div>
                    <Upload className="w-12 h-12 text-slate-400 mb-4" />
                    <p className="mb-2 text-sm text-slate-700 font-medium">Click to upload or drag and drop</p>
                    <input type="file" accept=".csv" onChange={handleFileUpload} disabled={isProcessing} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 max-w-xs cursor-pointer"/>
                </div>
            )}

            {activeTab === 'drive' && step === 'upload' && (
                <div className="space-y-6">
                    {!isDriveConnected ? (
                         <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-lg border border-slate-200">
                             {!isDriveInitialized ? (
                                <p className="text-red-500">Google Scripts failed to load. Please refresh.</p>
                             ) : (
                                <>
                                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                                        <HardDrive className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900 mb-2">Connect Google Drive</h3>
                                    <p className="text-slate-500 text-sm mb-6 text-center max-w-sm">
                                        Requires a Google Cloud Project with Drive API enabled.
                                    </p>
                                    <button onClick={handleGoogleAuth} className="flex items-center px-6 py-3 bg-white border border-slate-300 rounded-lg shadow-sm text-slate-700 font-medium hover:bg-slate-50 transition-colors">
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Authenticate
                                    </button>
                                </>
                             )}
                         </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-6">
                                <div className="bg-white border border-slate-200 rounded-lg p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold mr-3">G</div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-900">Google Account</h4>
                                                <div className="flex items-center text-xs text-green-600 mt-0.5"><CheckCircle className="w-3 h-3 mr-1" />Connected</div>
                                            </div>
                                        </div>
                                        <button onClick={() => setIsDriveConnected(false)} className="text-xs text-slate-500 hover:text-red-600 underline">Disconnect</button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Select File to Sync</label>
                                            {driveFiles.length > 0 ? (
                                                <select 
                                                    value={selectedFileId}
                                                    onChange={(e) => setSelectedFileId(e.target.value)}
                                                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                                >
                                                    {driveFiles.map(f => (
                                                        <option key={f.id} value={f.id}>{f.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <p className="text-sm text-slate-500 italic">No CSV files found in Drive.</p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between py-3 border-t border-slate-100 mt-4">
                                            <div className="flex items-center">
                                                <RefreshCw className={`w-5 h-5 mr-3 ${isSyncEnabled ? 'text-green-600' : 'text-slate-400'}`} />
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900">Continuous Sync</div>
                                                    <div className="text-xs text-slate-500">Check for updates every 60s</div>
                                                </div>
                                            </div>
                                            <button onClick={() => setIsSyncEnabled(!isSyncEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isSyncEnabled ? 'bg-green-600' : 'bg-slate-200'}`}>
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSyncEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
                                        <div className="text-xs text-slate-500">
                                            {lastSynced ? `Last synced: ${lastSynced}` : 'No sync performed yet'}
                                        </div>
                                        <button onClick={handleDriveSync} disabled={isProcessing || !selectedFileId} className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                                            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                            {isProcessing ? 'Syncing...' : 'Sync Now'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 h-full overflow-hidden flex flex-col">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">History</h4>
                                <div className="space-y-3 overflow-y-auto flex-1 custom-scrollbar pr-2">
                                    {syncHistory.map(log => (
                                        <div key={log.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`text-xs font-bold ${log.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{log.status === 'success' ? 'Success' : 'Failed'}</span>
                                                <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                                            </div>
                                            <p className="text-xs text-slate-600">{log.message}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {step === 'review' && (
                <div className="mt-6">
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r-md">
                        <div className="flex"><AlertCircle className="h-5 w-5 text-amber-400" /><div className="ml-3"><h3 className="text-sm font-medium text-amber-800">Review Conflicts</h3><p className="text-sm text-amber-700 mt-1">{conflicts.length} name mismatches found.</p></div></div>
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg mb-6 shadow-sm">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Field</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Imported</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Suggestion</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th></tr></thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {conflicts.slice(0, 50).map((conf) => (
                                    <tr key={conf.id}>
                                        <td className="px-6 py-4 text-sm font-medium capitalize">{conf.field.replace(/([A-Z])/g, ' $1')}</td>
                                        <td className="px-6 py-4 text-sm text-red-600 line-through">{conf.importedValue}</td>
                                        <td className="px-6 py-4 text-sm"><span className="bg-green-100 text-green-800 rounded-full px-2 py-0.5 text-xs">{conf.suggestion}</span></td>
                                        <td className="px-6 py-4 text-sm"><div className="flex space-x-2"><label className="flex items-center"><input type="radio" checked={conf.resolution === 'use_suggestion'} onChange={() => handleResolutionChange(conf.id, 'use_suggestion')} className="mr-1"/> Accept</label><label className="flex items-center"><input type="radio" checked={conf.resolution === 'keep_imported'} onChange={() => handleResolutionChange(conf.id, 'keep_imported')} className="mr-1"/> Keep</label></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end space-x-3"><button onClick={reset} className="px-4 py-2 border rounded">Cancel</button><button onClick={finalizeImport} className="px-4 py-2 bg-blue-600 text-white rounded">Finalize</button></div>
                </div>
            )}

            {step === 'complete' && (
                 <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">Import Complete</h3>
                    <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-md mx-auto mt-6 text-left">
                        <div className="flex justify-between"><span className="text-slate-600 text-sm">Added</span><span className="font-bold text-green-600">{stats.added}</span></div>
                        <div className="flex justify-between"><span className="text-slate-600 text-sm">Rejected</span><span className="font-bold text-red-600">{stats.rejected}</span></div>
                    </div>
                    <button onClick={reset} className="mt-8 px-4 py-2 bg-blue-600 text-white rounded">Done</button>
                 </div>
            )}
        </Card>
    </div>
  );
};
