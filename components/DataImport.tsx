
import React, { useState, useMemo } from 'react';
import { Shipment } from '../types';
import { Card } from './ui/Card';
import { findClosestMatch } from '../services/data';

interface DataImportProps {
  currentShipments: Shipment[];
  onImport: (newShipments: Shipment[]) => void;
}

interface ConflictItem {
  id: string; // Temporary ID for the row
  shipment: Shipment;
  field: 'shipperName' | 'consigneeName' | 'notifyParty';
  importedValue: string;
  suggestion: string;
  resolution: 'use_suggestion' | 'keep_imported';
}

export const DataImport: React.FC<DataImportProps> = ({ currentShipments, onImport }) => {
  const [step, setStep] = useState<'upload' | 'review' | 'complete'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importLog, setImportLog] = useState<{type: 'success' | 'error' | 'info', msg: string}[]>([]);
  
  // Staging state
  const [validRecords, setValidRecords] = useState<Shipment[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  
  // Statistics state
  const [stats, setStats] = useState({ added: 0, rejected: 0, flagged: 0 });

  // Existing Data Sets for Matching
  const existingShippers = useMemo(() => Array.from(new Set(currentShipments.map(s => s.shipperName))), [currentShipments]);
  const existingConsignees = useMemo(() => Array.from(new Set(currentShipments.map(s => s.consigneeName))), [currentShipments]);
  const existingNotify = useMemo(() => Array.from(new Set(currentShipments.map(s => s.notifyParty || ''))).filter(Boolean), [currentShipments]);

  // Simulation of CSV parsing and Validation Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportLog([]);
    setValidRecords([]);
    setConflicts([]);
    setStats({ added: 0, rejected: 0, flagged: 0 });

    // Simulate async processing
    setTimeout(() => {
      // Create fake data to represent the uploaded file
      // Includes: Valid New, Duplicate BOL (Reject), Near-Match Names (Review)
      const randomId = Math.floor(Math.random() * 100000);
      const fakeNewBatch: Shipment[] = [
        // 1. Valid Record (Clean)
        {
          houseBolNumber: `HBL-NEW-${randomId}`,
          shipperName: `New Market Ent ${randomId}`,
          consigneeName: 'Test Consignee',
          consigneeCity: 'Miami',
          consigneeAddress: '123 Ocean Dr',
          notifyParty: 'Test Notify',
          placeOfReceipt: 'Hamburg',
          usArrivalPort: 'New York/New Jersey',
          arrivalDate: '2024-06-01',
          teu: 5,
          nvoccName: 'Test NVOCC',
          voccCode: 'HLCU',
          voccName: 'Hapag-Lloyd'
        },
        // 2. Duplicate BOL (Should be rejected)
        {
          houseBolNumber: currentShipments[0]?.houseBolNumber || 'HBL-DUPE-TEST',
          shipperName: 'Duplicate Inc',
          consigneeName: 'Dup',
          consigneeCity: 'Nowhere',
          consigneeAddress: '000',
          placeOfReceipt: 'Nowhere',
          usArrivalPort: 'Nowhere',
          arrivalDate: '2024-01-01',
          teu: 1,
          nvoccName: 'Dup',
          voccCode: 'DUP',
          voccName: 'Dup'
        },
        // 3. Close Match: Shipper Name "Acme Global Logistix" vs "Acme Global Logistics"
        {
          houseBolNumber: `HBL-FUZZY-1-${randomId}`,
          shipperName: 'Acme Global Logistix', // Typo
          consigneeName: 'Target Distribution', // Exact match
          consigneeCity: 'Seattle',
          consigneeAddress: '555 Pine St',
          placeOfReceipt: 'Tokyo',
          usArrivalPort: 'Seattle',
          arrivalDate: '2024-06-05',
          teu: 2,
          nvoccName: 'Expeditors',
          voccCode: 'MAEU',
          voccName: 'Maersk Line'
        },
        // 4. Close Match: Consignee "Wallmart DC #405" vs "Walmart DC #405"
        {
          houseBolNumber: `HBL-FUZZY-2-${randomId}`,
          shipperName: 'FreshFoods Intl',
          consigneeName: 'Wallmart DC #405', // Typo
          consigneeCity: 'Los Angeles',
          consigneeAddress: '777 Sunset Blvd',
          placeOfReceipt: 'Lima',
          usArrivalPort: 'Long Beach',
          arrivalDate: '2024-06-10',
          teu: 10,
          nvoccName: 'Flexport',
          voccCode: 'MSCU',
          voccName: 'MSC'
        }
      ];

      const newLogs: typeof importLog = [];
      const tempValid: Shipment[] = [];
      const tempConflicts: ConflictItem[] = [];
      const existingBolSet = new Set(currentShipments.map(s => s.houseBolNumber));
      let rejectedCount = 0;

      fakeNewBatch.forEach((record, idx) => {
        // 1. Check Duplicate BOL
        if (existingBolSet.has(record.houseBolNumber)) {
          rejectedCount++;
          newLogs.push({ 
            type: 'error', 
            msg: `REJECTED: Record with House BOL ${record.houseBolNumber} already exists.` 
          });
          return;
        }

        // 2. Check Fuzzy Matches for Names
        let hasConflict = false;

        // Check Shipper
        const shipperMatch = findClosestMatch(record.shipperName, existingShippers);
        if (shipperMatch && shipperMatch !== record.shipperName) {
           tempConflicts.push({
             id: `conf-ship-${idx}`,
             shipment: record,
             field: 'shipperName',
             importedValue: record.shipperName,
             suggestion: shipperMatch,
             resolution: 'use_suggestion' // Default to suggestion
           });
           hasConflict = true;
        }

        // Check Consignee
        const consigneeMatch = findClosestMatch(record.consigneeName, existingConsignees);
        if (consigneeMatch && consigneeMatch !== record.consigneeName) {
           tempConflicts.push({
             id: `conf-cons-${idx}`,
             shipment: record,
             field: 'consigneeName',
             importedValue: record.consigneeName,
             suggestion: consigneeMatch,
             resolution: 'use_suggestion'
           });
           hasConflict = true;
        }

        // Check Notify Party
        if (record.notifyParty) {
            const notifyMatch = findClosestMatch(record.notifyParty, existingNotify);
            if (notifyMatch && notifyMatch !== record.notifyParty) {
               tempConflicts.push({
                 id: `conf-not-${idx}`,
                 shipment: record,
                 field: 'notifyParty',
                 importedValue: record.notifyParty,
                 suggestion: notifyMatch,
                 resolution: 'use_suggestion'
               });
               hasConflict = true;
            }
        }

        // If it's a valid BOL, we add it to tempValid. 
        // Note: The shipment object inside tempValid will be mutated later if user accepts suggestions.
        // If it has conflicts, it's still "valid" structure-wise, just needs cleanup.
        tempValid.push(record);
        if (!hasConflict) {
             newLogs.push({ type: 'success', msg: `House BOL ${record.houseBolNumber} ready for import.` });
        } else {
             newLogs.push({ type: 'info', msg: `House BOL ${record.houseBolNumber} flagged for data quality review.` });
        }
      });

      setValidRecords(tempValid);
      setConflicts(tempConflicts);
      setImportLog(newLogs);
      
      // Update stats before knowing final "Added" count (which depends on if user finishes)
      setStats({
          added: 0,
          rejected: rejectedCount,
          flagged: tempConflicts.length
      });

      setIsProcessing(false);
      
      if (tempConflicts.length > 0) {
        setStep('review');
      } else if (tempValid.length > 0) {
        // Direct complete if no conflicts
        onImport(tempValid);
        setStats(prev => ({ ...prev, added: tempValid.length }));
        setStep('complete');
      } else {
        // Only errors found
        setStep('complete'); 
      }
      
      e.target.value = '';
    }, 1500);
  };

  const handleResolutionChange = (id: string, resolution: 'use_suggestion' | 'keep_imported') => {
    setConflicts(prev => prev.map(c => c.id === id ? { ...c, resolution } : c));
  };

  const finalizeImport = () => {
    // Apply resolutions to the validRecords
    const finalRecords = validRecords.map(record => {
      // Find all conflicts associated with this record
      const recordConflicts = conflicts.filter(c => c.shipment === record); // matching by reference
      
      if (recordConflicts.length === 0) return record;

      const updatedRecord = { ...record };
      recordConflicts.forEach(conf => {
        if (conf.resolution === 'use_suggestion') {
          // Apply the fix
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
        <Card title="Import Shipping Data" subtitle="Upload CSV files to update the database">
            {step === 'upload' && (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-12 bg-slate-50">
                    <svg className="w-12 h-12 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <p className="mb-2 text-sm text-slate-700 font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-slate-500 mb-6">CSV files only (Max 10MB)</p>
                    <input 
                        type="file" 
                        accept=".csv"
                        onChange={handleFileUpload}
                        disabled={isProcessing}
                        className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100
                        max-w-xs cursor-pointer
                        "
                    />
                </div>
            )}
            
            {step === 'upload' && isProcessing && (
                <div className="mt-4 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                    <p className="text-blue-600">Processing file and validating data...</p>
                </div>
            )}

            {step === 'review' && (
                <div className="animate-fade-in">
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-amber-800">Data Standardization Required</h3>
                                <p className="text-sm text-amber-700 mt-1">
                                    We found <span className="font-bold">{conflicts.length}</span> records with names that closely match existing entries in your database. 
                                    Using the suggested matches ensures your reporting remains accurate and prevents duplicate entities.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg mb-6 shadow-sm">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Affected Field</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Imported Value</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Suggested Match</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {conflicts.map((conf) => (
                                    <tr key={conf.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700 capitalize">
                                            {conf.field.replace(/([A-Z])/g, ' $1').trim()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex items-center text-red-600 line-through decoration-slate-400 opacity-75">
                                                {conf.importedValue}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                                {conf.suggestion}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex items-center space-x-4">
                                                <label className="inline-flex items-center cursor-pointer group">
                                                    <input 
                                                        type="radio" 
                                                        className="form-radio text-blue-600 h-4 w-4 transition duration-150 ease-in-out"
                                                        name={conf.id}
                                                        checked={conf.resolution === 'use_suggestion'}
                                                        onChange={() => handleResolutionChange(conf.id, 'use_suggestion')}
                                                    />
                                                    <span className="ml-2 group-hover:text-blue-700 font-medium text-slate-700">Accept Match</span>
                                                </label>
                                                <label className="inline-flex items-center cursor-pointer group">
                                                    <input 
                                                        type="radio" 
                                                        className="form-radio text-slate-400 h-4 w-4 transition duration-150 ease-in-out"
                                                        name={conf.id}
                                                        checked={conf.resolution === 'keep_imported'}
                                                        onChange={() => handleResolutionChange(conf.id, 'keep_imported')}
                                                    />
                                                    <span className="ml-2 group-hover:text-slate-700 text-slate-500">Keep New</span>
                                                </label>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end space-x-3">
                        <button 
                            onClick={reset}
                            className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                        >
                            Cancel Import
                        </button>
                        <button 
                            onClick={finalizeImport}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Finalize Import ({validRecords.length} Records)
                        </button>
                    </div>
                </div>
            )}

            {step === 'complete' && (
                 <div className="text-center py-8 animate-fade-in">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                        <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-lg leading-6 font-medium text-slate-900">Import Process Completed</h3>
                    
                    <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-md mx-auto mt-6 shadow-sm">
                        <h4 className="font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100 text-left">Summary</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600 text-sm">Successfully Added</span>
                                <span className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs">{stats.added} Records</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600 text-sm">Rejected (Duplicates)</span>
                                <span className="font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs">{stats.rejected} Records</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600 text-sm">Flagged for Review</span>
                                <span className="font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-xs">{stats.flagged} Records</span>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={reset}
                        className="mt-8 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm"
                    >
                        Import Another File
                    </button>
                 </div>
            )}

            {/* Always show logs if any */}
            {importLog.length > 0 && step !== 'complete' && (
                <div className="mt-6 bg-slate-900 rounded-lg p-4 font-mono text-xs overflow-y-auto max-h-60">
                    {importLog.map((entry, idx) => (
                        <div key={idx} className={`mb-1 ${
                            entry.type === 'error' ? 'text-red-400' : 
                            entry.type === 'success' ? 'text-green-400' : 'text-blue-300'
                        }`}>
                            [{new Date().toLocaleTimeString()}] {entry.msg}
                        </div>
                    ))}
                </div>
            )}
        </Card>
    </div>
  );
};
