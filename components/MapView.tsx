import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Shipment, ShipperContact } from '../types';
import { Card } from './ui/Card';
import { CITY_COORDINATES } from '../services/data';

interface MapViewProps {
  shipments: Shipment[];
  contacts: ShipperContact[];
}

interface MapPoint {
  id: string;
  name: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  count?: number;
  email?: string;
  contactNumber?: string;
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
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // 1. Script Loading Logic with Polling
  useEffect(() => {
    const scriptId = 'mappls-sdk-script';
    let checkInterval: any;

    const checkLibrary = (retries = 20) => {
        if (window.mappls && window.mappls.Map) {
            setScriptLoaded(true);
            return;
        }
        if (retries <= 0) {
            setLoadError(true);
            return;
        }
        checkInterval = setTimeout(() => checkLibrary(retries - 1), 500);
    };
    
    // Check if script already exists (e.g. from previous mount)
    if (document.getElementById(scriptId)) {
        checkLibrary();
        return () => clearTimeout(checkInterval);
    }

    // Inject Script
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = "https://apis.mappls.com/advancedmaps/api/xgshaoprqmorkrzhbsqrthjspqyzznmvwfxe/map_sdk?layer=vector&v=3.0";
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
        // Start polling for the global object once script loads
        checkLibrary();
    };
    
    script.onerror = () => {
        setLoadError(true);
    };

    document.body.appendChild(script);

    return () => clearTimeout(checkInterval);
  }, []);

  // 2. Prepare Data Points
  const points = useMemo(() => {
    const dataPoints: MapPoint[] = [];

    if (viewMode === 'shippers') {
      contacts.forEach(c => {
        // Use precise coordinates if available, otherwise fall back to City lookup
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
            contactNumber: c.contactNumber
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

  // 3. Initialize Map
  useEffect(() => {
    if (!scriptLoaded || mapInstanceRef.current || !mapContainerRef.current) return;

    try {
        if (window.mappls && window.mappls.Map) {
            mapInstanceRef.current = new window.mappls.Map(mapContainerRef.current.id, {
                center: [28.0, 78.0], // Default Center
                zoom: 3,
                zoomControl: true,
                hybrid: false,
                search: false, // Disable search bar to keep it simple
                location: false // Disable user location
            });
            console.log('Mappls initialized successfully');
        }
    } catch (e) {
        console.error('Error initializing Mappls map:', e);
        // Don't set global load error here if it's a transient init error, just log it
    }

    // Cleanup: We intentionally DO NOT remove the map instance on unmount for this specific library
    // because standard Mappls SDKs can struggle with rapid mount/unmount cycles in SPAs.
    // Instead we check if instance exists at the top of this effect.
    // If strict mode is causing issues, this singleton pattern helps.
    
    return () => {
        // Optional: Perform specific marker cleanup if needed, but keep map instance if possible
        // or ensure full teardown if resources allow.
        // For robustness in this specific demo:
        if (mapInstanceRef.current && mapInstanceRef.current.remove) {
           try {
             mapInstanceRef.current.remove();
           } catch(e) {}
           mapInstanceRef.current = null;
        }
    };
  }, [scriptLoaded]);

  // 4. Update Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.mappls) return;

    // Clear existing markers if we have references
    if (markersRef.current.length > 0) {
        try {
            markersRef.current.forEach(marker => {
                if (marker && marker.remove) marker.remove();
            });
        } catch (e) { console.warn("Marker removal error", e); }
        markersRef.current = [];
    }

    // Add new markers
    points.forEach(point => {
        // Basic popup HTML
        const popupContent = `
            <div style="padding: 10px; font-family: sans-serif; min-width: 220px; text-align: left;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px; color: #1e3a8a;">${point.name}</div>
                <div style="font-size: 12px; color: #334155; margin-bottom: 4px;">
                    <strong>Address:</strong> ${point.address || 'N/A'}
                </div>
                <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">${point.city}</div>
                
                ${point.contactNumber ? `
                <div style="font-size: 12px; color: #334155; margin-bottom: 2px;">
                    <strong>Tel:</strong> ${point.contactNumber}
                </div>` : ''}
                
                ${point.email ? `
                <div style="font-size: 12px; color: #334155;">
                    <strong>Email:</strong> ${point.email}
                </div>` : ''}

                ${point.count ? `<div style="font-size: 12px; color: #16a34a; font-weight: bold; margin-top: 5px;">${point.count} Shipments</div>` : ''}
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
        } catch (err) {
            console.warn("Failed to create marker", err);
        }
    });

  }, [points, viewMode, scriptLoaded]); // Re-run when scriptLoaded ensures map is ready

  return (
    <div className="space-y-6">
      <Card title="Global Logistics Map" subtitle="Geographic distribution of partners via Mappls">
        <div className="flex justify-end mb-4">
            <div className="bg-slate-100 p-1 rounded-lg inline-flex">
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
             <div id="mappls-map" ref={mapContainerRef} className="w-full h-full" style={{width: '100%', height: '100%'}}></div>
             
             {/* Loading State */}
             {!scriptLoaded && !loadError && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 z-10">
                     <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-2"></div>
                     <p className="text-slate-500 text-sm">Initializing Map Engine...</p>
                 </div>
             )}

             {/* Error State */}
             {loadError && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
                     <svg className="w-10 h-10 text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                     <p className="text-slate-800 font-medium">Map failed to load</p>
                     <p className="text-slate-500 text-xs mt-1 max-w-xs text-center">
                        Please check if the API Key is valid and the domain <strong>swen-nautilus.vercel.app</strong> is whitelisted in your Mappls Dashboard.
                     </p>
                     <button 
                        onClick={() => window.location.reload()}
                        className="mt-4 px-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50"
                     >
                        Reload Page
                     </button>
                 </div>
             )}
        </div>
        
        <div className="mt-4 text-xs text-slate-500 flex justify-center space-x-6">
            <p>Powered by Mappls API</p>
        </div>
      </Card>
    </div>
  );
};