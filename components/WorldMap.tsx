
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { WORLD_GEO_JSON_URL } from '../utils/geo';
import { Plus, Minus, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';

// Adapted Interface for our App's data structure
export interface MapPoint {
  id: string;
  name: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  count?: number;
  // Contact & Business Details
  email?: string;
  contactNumber?: string;
  customerType?: string;
  companySize?: string;
  panNumber?: string;
  cinNumber?: string;
  contactPersonName?: string;
  designation?: string;
}

interface WorldMapProps {
  points: MapPoint[];
  onPointClick?: (point: MapPoint) => void;
}

const WorldMap: React.FC<WorldMapProps> = ({ points, onPointClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const mapGroupRef = useRef<SVGGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const [geoData, setGeoData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [zoomK, setZoomK] = useState(1);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const fetchMapData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        // Longer timeout for mobile networks
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); 

        const res = await fetch(WORLD_GEO_JSON_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
            throw new Error(`Failed to load map data (${res.status})`);
        }
        const data = await res.json();
        setGeoData(data);
    } catch (err: any) {
        console.error("Map Data Error:", err);
        setError("Unable to load the world map. Check your connection.");
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData, retryTrigger]);

  // Robust dimension detection
  useEffect(() => {
    if (!wrapperRef.current) return;

    // Initial check
    const rect = wrapperRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
          // Use contentRect, but fallback to getBoundingClientRect if needed
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            setDimensions({ width, height });
          } else {
             // Fallback for some mobile browsers returning 0 contentRect initially
             const rect = entry.target.getBoundingClientRect();
             if (rect.width > 0 && rect.height > 0) {
                 setDimensions({ width: rect.width, height: rect.height });
             }
          }
      }
    });
    resizeObserver.observe(wrapperRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const visibleNodes = useMemo(() => {
      if (!points) return [];
      // Pass-through for high zoom or low data count
      if (zoomK >= 2.5 || points.length < 20) {
          return points.map(p => ({ ...p, type: 'point' }));
      }
      // Simple Grid-based clustering for low zoom
      // Note: A real geospatial cluster library like Supercluster is better, but this is a lightweight D3 approach
      const gridSize = 10; // degrees
      const clusters = d3.rollups(points, (v) => {
          const lat = v[0].lat;
          const lng = v[0].lng;
          return {
              id: `cluster-${Math.round(lat)}-${Math.round(lng)}`, 
              name: `${v.length} Locations`, 
              city: 'Multiple',
              address: '',
              lat: d3.mean(v, d => d.lat) || 0,
              lng: d3.mean(v, d => d.lng) || 0,
              type: 'cluster', 
              count: v.length,
              points: v
          };
      }, (d) => `${Math.round(d.lat / gridSize)},${Math.round(d.lng / gridSize)}`);
      
      return clusters.map(([_, data]) => data);
  }, [points, zoomK]);

  useEffect(() => {
    // Only draw if we have data AND valid dimensions
    if (!geoData || !svgRef.current || !mapGroupRef.current || dimensions.width === 0 || dimensions.height === 0) return;
    
    const svg = d3.select(svgRef.current);
    const mapGroup = d3.select(mapGroupRef.current);
    const { width, height } = dimensions;
    
    // Create projection
    // Adjust scale based on screen width
    const baseScale = width / 6.5;
    const effectiveScale = Math.max(baseScale, 60);

    const projection = d3.geoMercator()
        .scale(effectiveScale)
        .center([0, 20])
        .translate([width / 2, height / 2]);
        
    const pathGenerator = d3.geoPath().projection(projection);

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([1, 12])
        .translateExtent([[-width, -height], [2 * width, 2 * height]])
        .on("zoom", (event) => {
            const { transform } = event;
            setZoomK(transform.k);
            mapGroup.attr("transform", transform.toString());
            
            mapGroup.selectAll("path.country")
                .attr("stroke-width", 0.5 / transform.k);
            
            // Node scaling
            mapGroup.selectAll(".node-circle").attr("d", (d: any) => {
                     let size = 64; 
                     if (d.type === 'cluster') size = (12 + Math.min(d.count || 0, 10)) ** 2;
                     else size = 80;
                     
                     return d3.symbol().type(d3.symbolCircle).size(size / (transform.k * 0.6))();
                });

             mapGroup.selectAll(".node-label")
                .attr("font-size", (10 / transform.k) + "px")
                .attr("y", (d: any) => (d.type === 'cluster' ? 14 : 10) / transform.k);
             
             mapGroup.selectAll(".cluster-count")
                .attr("font-size", (10 / transform.k) + "px")
                .attr("dy", (4 / transform.k));
        });

    zoomBehaviorRef.current = zoom;
    
    // Initial Zoom setup
    if (!svg.node()?.__zoom) {
       svg.call(zoom);
    } else {
       svg.on(".zoom", zoom.on("zoom"));
    }

    // --- DRAWING ---

    // 1. Countries
    mapGroup.select(".countries-group").remove();
    const countriesG = mapGroup.insert("g", ":first-child").attr("class", "countries-group");
    
    countriesG.selectAll("path")
        .data(geoData.features || [])
        .join("path")
        .attr("class", "country")
        .attr("d", pathGenerator as any)
        .attr("fill", "#cbd5e1") // Darker gray for land
        .attr("stroke", "#f8fafc") // White borders
        .attr("stroke-width", 0.5 / zoomK)
        .on("mouseenter", function() { d3.select(this).attr("fill", "#94a3b8"); })
        .on("mouseleave", function() { d3.select(this).attr("fill", "#cbd5e1"); });

    // 2. Nodes (Points/Clusters)
    const nodesG = mapGroup.selectAll(".nodes-group").data([null]).join("g").attr("class", "nodes-group");
    const nodes = nodesG.selectAll(".node-group").data(visibleNodes as any[], (d: any) => d.id);
    
    const nodesEnter = nodes.enter().append("g")
        .attr("class", "node-group")
        .attr("transform", (d: any) => {
            const coords = projection([d.lng, d.lat]);
            return coords ? `translate(${coords[0]}, ${coords[1]})` : `translate(0,0)`;
        })
        .attr("cursor", "pointer")
        .on("click", (e, d: any) => { 
            e.stopPropagation(); 
            if (d.type === 'cluster') { 
                const coords = projection([d.lng, d.lat]);
                if (coords) {
                   const [x, y] = coords;
                   svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity.translate(width/2, height/2).scale(zoomK * 2.5).translate(-x, -y)); 
                }
            } else { 
                if (onPointClick) onPointClick(d); 
            } 
        });

    nodesEnter.append("path")
        .attr("class", "node-circle")
        .attr("d", d3.symbol().type(d3.symbolCircle).size(64)())
        .attr("fill", "#64748b")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1);

    nodesEnter.filter((d: any) => d.type === 'cluster').append("text")
        .attr("class", "cluster-count")
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("font-weight", "bold")
        .text((d: any) => d.count);

    nodesEnter.append("text")
        .attr("class", "node-label")
        .attr("text-anchor", "middle")
        .text((d: any) => d.name)
        .attr("opacity", 0)
        .attr("pointer-events", "none")
        .attr("fill", "#1e293b")
        .style("text-shadow", "0px 1px 2px rgba(255,255,255,0.8)");

    nodes.exit().remove();

    // UPDATE PHASE
    nodesG.selectAll(".node-group")
        .attr("transform", (d: any) => { 
             const coords = projection([d.lng, d.lat]); 
             return coords ? `translate(${coords[0]}, ${coords[1]})` : null; 
        });
    
    nodesG.selectAll(".node-circle")
        .attr("fill", (d: any) => {
            if (d.type === 'cluster') return "#3b82f6"; // Blue clusters
            return "#ef4444"; // Red points
        });
        
    mapGroup.selectAll(".node-label")
        .transition().duration(200)
        .attr("opacity", (d: any) => (zoomK > 2.5 || d.type === 'cluster') ? 1 : 0);

  }, [geoData, dimensions, visibleNodes, zoomK]);

  // Combined Loading State
  if (isLoading || (dimensions.width === 0 && !error)) {
      return (
          <div ref={wrapperRef} className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400 min-h-[200px]">
              <Loader2 className="animate-spin mb-3 text-blue-500" size={32} />
              <p className="text-sm font-medium animate-pulse">{isLoading ? "Fetching Map Data..." : "Initializing View..."}</p>
          </div>
      );
  }

  if (error) {
      return (
          <div ref={wrapperRef} className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-600 p-8 text-center min-h-[200px]">
              <div className="bg-red-50 p-4 rounded-full mb-4">
                 <AlertTriangle className="text-red-500" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Map Loading Failed</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-xs">{error}</p>
              <button 
                  onClick={() => setRetryTrigger(prev => prev + 1)} 
                  className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 px-5 py-2 rounded-lg font-medium text-sm shadow-sm transition-all flex items-center gap-2"
              >
                  <RotateCcw size={16}/> Retry Connection
              </button>
          </div>
      );
  }
  
  return (
    <div ref={wrapperRef} className="w-full h-full bg-slate-100 relative overflow-hidden group touch-none rounded-lg border border-slate-200">
        <svg 
            ref={svgRef} 
            width={dimensions.width} 
            height={dimensions.height} 
            className="w-full h-full outline-none block" 
            style={{ background: '#f1f5f9', touchAction: 'none' }} 
        >
            <g ref={mapGroupRef} />
        </svg>
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
            <div className="bg-white/90 backdrop-blur rounded-lg shadow-lg border border-slate-200 p-1 flex flex-col gap-1">
                <button onClick={() => { if(zoomBehaviorRef.current && svgRef.current) d3.select(svgRef.current).call(zoomBehaviorRef.current.scaleBy, 1.5); }} className="p-2 text-slate-600 hover:bg-slate-100 rounded" title="Zoom In"><Plus size={18}/></button>
                <button onClick={() => { if(zoomBehaviorRef.current && svgRef.current) d3.select(svgRef.current).call(zoomBehaviorRef.current.scaleBy, 0.66); }} className="p-2 text-slate-600 hover:bg-slate-100 rounded" title="Zoom Out"><Minus size={18}/></button>
                <button onClick={() => { if(zoomBehaviorRef.current && svgRef.current) d3.select(svgRef.current).call(zoomBehaviorRef.current.transform, d3.zoomIdentity); }} className="p-2 text-slate-600 hover:bg-slate-100 rounded" title="Reset View"><RotateCcw size={18}/></button>
            </div>
        </div>
        <div className="absolute top-2 left-2 bg-white/80 backdrop-blur px-2 py-1 rounded text-[10px] text-slate-500 font-mono">
            Fallback D3 Map
        </div>
    </div>
  );
};

export default WorldMap;
