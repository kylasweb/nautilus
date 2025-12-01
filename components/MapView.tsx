
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Shipment, ShipperContact } from '../types';
import { Card } from './ui/Card';
import { CITY_COORDINATES } from '../services/data';
import WorldMap, { MapPoint } from './WorldMap';

interface MapViewProps {
  shipments: Shipment[];
  contacts: ShipperContact[];
}

declare global {
  interface Window {
    mappls: any;
  }
}

export const MapView: React.FC<MapViewProps> = ({ shipments, contacts }) => {
  const [viewMode, setViewMode] = useState<'shippers' | 'consignees'>('shippers');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // 1. Script Loading Logic with Polling
  useEffect(() => {
    const scriptId = 'mappls-sdk-script';
    let checkInterval: any;
    let timeoutId: any;

    const checkLibrary = () => {
        if (window.mappls && window.mappls.Map) {
            setScriptLoaded(true);
            clearTimeout(timeoutId);
            return;
        }
        checkInterval = setTimeout(checkLibrary, 500);
    };
    
    // Check if script already exists
    if (document.getElementById(scriptId)) {
        checkLibrary();
    } else {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = "https://apis.mappls.com/advancedmaps/api/xgshaoprqmorkrzhbsqrthjspqyzznmvwfxe/map_sdk?layer=vector&v=3.0";
        script.async = true;
        script.defer = true;
        
        script.onload = () => checkLibrary();
        script.onerror = () => setLoadError(true);

        document.body.appendChild(script);
    }

    // Force fallback if Mappls takes too long (e.g. 5 seconds)
    timeoutId = setTimeout(() => {
        if (!window.mappls) {
            console.warn("Mappls load timed out, switching to fallback map.");
            setLoadError(true);
        }
    }, 5000);

    return () => {
        clearTimeout(checkInterval);
        clearTimeout(timeoutId);
    };
  }, []);

  // 2. Prepare Data Points (Shared between Mappls and WorldMap)
  const points = useMemo(() => {
    const dataPoints: MapPoint[] = [];

    if (viewMode === 'shippers') {
      contacts.forEach(c => {
        let lat = c.latitude;
        let lng = c.longitude;
        
        if (!lat || !lng) {
            const cityCoords = CITY_COORDINATES[c.city || ''] || CITY_COORDINATES['Shanghai'];
            lat = cityCoords?.lat;
            lng = cityCoords?.lng;
        }

        if (lat && lng) {
          dataPoints.push({
            id: c.shipperName,
            name: c.shipperName,
            city: c.city || 'Unknown City',
            address: c.address,
            lat: lat,
            lng: lng,
            email: c.email,
            contactNumber: c.contactNumber,
            // Extended Company Details
            customerType: c.customerType,
            companySize: c.companySize,
            panNumber: c.panNumber,
            cinNumber: c.cinNumber,
            contactPersonName: c.contactPersonName,
            designation: c.designation
          });
        }
      });
    } else {
      const consigneeMap = new Map<string, { count: number, city: string, address: string, name: string }>();
      
      shipments.forEach(s => {
        const key = `${s.consigneeName}-${s.consigneeCity}`;
        if (!consigneeMap.has(key)) {
            consigneeMap.set(key, { count: 0, city: s.consigneeCity, address: s.consigneeAddress, name: s.consigneeName });
        }
        consigneeMap.get(key)!.count++;
      });

      consigneeMap.forEach((val, key) => {
          const coords = CITY_COORDINATES[val.city];
          if (coords) {
              dataPoints.push({
                  id: key,
                  name: val.name,
                  city: val.city,
                  address: val.address,
                  lat: coords.lat,
                  lng: coords.lng,
                  count: val.count
              });
          }
      });
    }

    return dataPoints;
  }, [viewMode, contacts, shipments]);

  // 3. Initialize Mappls Map (Only if Script Loaded and No Error)
  useEffect(() => {
    if (!scriptLoaded || loadError || mapInstanceRef.current || !mapContainerRef.current) return;

    try {
        if (window.mappls && window.mappls.Map) {
            mapInstanceRef.current = new window.mappls.Map(mapContainerRef.current.id, {
                center: [28.0, 78.0],
                zoom: 3,
                zoomControl: true,
                hybrid: false,
                search: false,
                location: false
            });
        }
    } catch (e) {
        console.warn('Mappls Init Failed:', e);
        setLoadError(true); 
    }

    return () => {
        if (mapInstanceRef.current && mapInstanceRef.current.remove) {
           try { mapInstanceRef.current.remove(); } catch(e) {}
           mapInstanceRef.current = null;
        }
    };
  }, [scriptLoaded, loadError]);

  // 4. Update Mappls Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.mappls || loadError) return;

    if (markersRef.current.length > 0) {
        try {
            markersRef.current.forEach(marker => marker.remove?.());
        } catch (e) {}
        markersRef.current = [];
    }

    points.forEach(point => {
        // Updated HTML for Mappls Popup to include key details
        const popupContent = `
            <div style="padding: 12px; font-family: 'Inter', sans-serif; min-width: 250px; border-radius: 8px;">
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: #1e293b;">${point.name}</div>
                <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">${point.city}</div>
                
                ${point.companySize ? `<span style="background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">${point.companySize}</span>` : ''}
                ${point.customerType ? `<span style="background: #f3e8ff; color: #7e22ce; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 4px;">${point.customerType}</span>` : ''}
                
                <div style="margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                    ${point.contactPersonName ? `<div style="font-size: 11px; font-weight: 600; color: #334155;">👤 ${point.contactPersonName}</div>` : ''}
                    ${point.email ? `<div style="font-size: 11px; color: #3b82f6; margin-top: 2px;">✉ ${point.email}</div>` : ''}
                </div>
            </div>
        `;

        try {
            const marker = new window.mappls.Marker({
                map: mapInstanceRef.current,
                position: { lat: point.lat, lng: point.lng },
                popupHtml: popupContent,
                title: point.name
            });
            markersRef.current.push(marker);
        } catch (err) {}
    });
  }, [points, loadError]);

  // Handler for fallback map clicks
  const handleFallbackPointClick = (p: MapPoint) => {
      setSelectedPoint(p);
  };

  return (
    <div className="space-y-6">
      <Card title="Global Logistics Map" subtitle={loadError ? "Interactive D3 Visualization (Offline Mode)" : "Geographic distribution via Mappls"}>
        <div className="flex justify-between items-center mb-4">
            {loadError && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">Mappls API unavailable - Using Fallback</span>}
            <div className="bg-slate-100 p-1 rounded-lg inline-flex ml-auto">
                <button
                    onClick={() => setViewMode('shippers')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        viewMode === 'shippers' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Shippers
                </button>
                <button
                    onClick={() => setViewMode('consignees')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        viewMode === 'consignees' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Consignees
                </button>
            </div>
        </div>

        <div className="w-full h-[500px] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative">
             {/* Render Fallback if Error or Timeout */}
             {loadError ? (
                 <WorldMap points={points} onPointClick={handleFallbackPointClick} />
             ) : (
                 <>
                    <div id="mappls-map" ref={mapContainerRef} className="w-full h-full"></div>
                    {!scriptLoaded && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 z-10">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-2"></div>
                            <p className="text-slate-500 text-sm">Initializing Map Engine...</p>
                        </div>
                    )}
                 </>
             )}

             {/* Advanced Company Card Popup for Fallback Map */}
             {loadError && selectedPoint && (
                 <div className="absolute top-4 right-4 bg-white rounded-xl shadow-2xl border border-slate-200 z-20 w-80 animate-fade-in overflow-hidden flex flex-col">
                     {/* Header */}
                     <div className="bg-slate-50 p-4 border-b border-slate-100 relative">
                        <button 
                            onClick={() => setSelectedPoint(null)} 
                            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h4 className="font-bold text-slate-800 text-lg pr-6">{selectedPoint.name}</h4>
                        <div className="flex items-center text-xs text-slate-500 mt-1">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {selectedPoint.city}
                        </div>
                     </div>
                     
                     {/* Body */}
                     <div className="p-4 space-y-4">
                        
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                             {selectedPoint.companySize && (
                                 <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md border border-blue-200">
                                     {selectedPoint.companySize}
                                 </span>
                             )}
                             {selectedPoint.customerType && (
                                 <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-md border border-purple-200">
                                     {selectedPoint.customerType}
                                 </span>
                             )}
                             {selectedPoint.count && (
                                 <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-200">
                                     {selectedPoint.count} Shipments
                                 </span>
                             )}
                        </div>

                        {/* Contact Person Section */}
                        {(selectedPoint.contactPersonName || selectedPoint.designation) && (
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Key Contact</div>
                                <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs mr-3">
                                        {selectedPoint.contactPersonName ? selectedPoint.contactPersonName.charAt(0) : '?'}
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-slate-700">{selectedPoint.contactPersonName || 'N/A'}</div>
                                        <div className="text-xs text-slate-500">{selectedPoint.designation}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Contact Details */}
                        <div className="space-y-2 text-sm">
                            {selectedPoint.email && (
                                <div className="flex items-center text-slate-600">
                                    <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    <a href={`mailto:${selectedPoint.email}`} className="hover:text-blue-600 hover:underline">{selectedPoint.email}</a>
                                </div>
                            )}
                            {selectedPoint.contactNumber && (
                                <div className="flex items-center text-slate-600">
                                    <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    {selectedPoint.contactNumber}
                                </div>
                            )}
                            <div className="flex items-start text-slate-600">
                                <svg className="w-4 h-4 mr-2 text-slate-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <span className="text-xs leading-relaxed">{selectedPoint.address || 'Address not available'}</span>
                            </div>
                        </div>

                        {/* Compliance Footer */}
                        {(selectedPoint.panNumber || selectedPoint.cinNumber) && (
                            <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-2">
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">PAN Number</div>
                                    <div className="text-xs font-mono text-slate-700 bg-slate-50 px-1 py-0.5 rounded">{selectedPoint.panNumber || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">CIN Number</div>
                                    <div className="text-xs font-mono text-slate-700 bg-slate-50 px-1 py-0.5 rounded truncate" title={selectedPoint.cinNumber}>{selectedPoint.cinNumber || 'N/A'}</div>
                                </div>
                            </div>
                        )}
                     </div>
                 </div>
             )}
        </div>
      </Card>
    </div>
  );
};

export default MapView;
