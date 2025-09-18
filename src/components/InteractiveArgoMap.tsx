"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  FullscreenControl,
  GeolocateControl,
  Map as MapboxMap,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
} from "react-map-gl/mapbox";

// Import the CSS for mapbox-gl
import "mapbox-gl/dist/mapbox-gl.css";

// Dynamically import ArgoVisualizer to avoid SSR issues with Plotly.js
const ArgoVisualizer = dynamic(() => import("./argo"), {
  ssr: false,
  loading: () => (
    <div className="bg-white/95 rounded-xl shadow-lg p-3 min-w-[320px] max-w-[380px] relative">
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>
  ),
});

// You'll need to set your Mapbox access token here
// Get one free at https://account.mapbox.com/
const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  "pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw";

interface ArgoFloat {
  id: number;
  longitude: number;
  latitude: number;
  name: string;
  description: string;
  depth?: number;
  temperature?: number;
  salinity?: number;
}

interface InteractiveArgoMapProps {
  floats?: ArgoFloat[];
}

// Sample Argo float data with realistic Indian Ocean positions
const defaultFloats: ArgoFloat[] = [
  {
    id: 1,
    longitude: 67.5,
    latitude: -8.2,
    name: "Argo Float 001",
    description: "Central Indian Ocean",
    depth: 2000,
    temperature: 28.2,
    salinity: 35.4,
  },
  {
    id: 2,
    longitude: 73.8,
    latitude: 15.5,
    name: "Argo Float 002",
    description: "Arabian Sea deployment",
    depth: 1800,
    temperature: 29.7,
    salinity: 36.8,
  },
  {
    id: 3,
    longitude: 88.1,
    latitude: 12.2,
    name: "Argo Float 003",
    description: "Bay of Bengal",
    depth: 1500,
    temperature: 30.1,
    salinity: 33.8,
  },
  {
    id: 4,
    longitude: 55.7,
    latitude: -20.3,
    name: "Argo Float 004",
    description: "Mauritius Ridge",
    depth: 2200,
    temperature: 24.8,
    salinity: 35.2,
  },
  {
    id: 5,
    longitude: 95.2,
    latitude: -5.5,
    name: "Argo Float 005",
    description: "Indonesian Waters",
    depth: 1200,
    temperature: 29.3,
    salinity: 34.1,
  },
  {
    id: 6,
    longitude: 60.2,
    latitude: -30.5,
    name: "Argo Float 006",
    description: "Southern Indian Ocean",
    depth: 2800,
    temperature: 18.3,
    salinity: 34.9,
  },
];

// Custom marker component for Argo floats
function ArgoMarker({
  float,
  onClick,
  onHover,
  onHoverEnd,
  isSelected,
}: {
  float: ArgoFloat;
  onClick: () => void;
  onHover: (e: MouseEvent) => void;
  onHoverEnd: () => void;
  isSelected: boolean;
}) {
  return (
    <button
      type="button"
      className={`cursor-pointer transition-transform duration-200 border-none bg-transparent p-0 ${
        isSelected ? "scale-125" : "hover:scale-110"
      }`}
      onClick={onClick}
      onMouseEnter={(e) => onHover(e.nativeEvent)}
      onMouseLeave={onHoverEnd}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Argo float ${float.name} at ${float.latitude}, ${float.longitude}`}
    >
      <div className={`relative ${isSelected ? "animate-pulse" : ""}`}>
        {/* Outer glow ring */}
        <div
          className={`absolute inset-0 rounded-full ${
            isSelected ? "bg-yellow-400" : "bg-blue-400"
          } opacity-30 animate-ping`}
        />

        {/* Main marker */}
        <div
          className={`relative w-6 h-6 rounded-full border-2 ${
            isSelected
              ? "bg-yellow-500 border-yellow-700"
              : "bg-blue-500 border-blue-700"
          } shadow-lg flex items-center justify-center`}
        >
          {/* Inner dot */}
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>

        {/* Hover label */}
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
          {float.name}
        </div>
      </div>
    </button>
  );
}

// Map style options
const MAP_STYLES = {
  satellite: "mapbox://styles/mapbox/satellite-v9",
  dark: "mapbox://styles/mapbox/dark-v11",
  streets: "mapbox://styles/mapbox/streets-v11",
  outdoors: "mapbox://styles/mapbox/outdoors-v11",
};

// Control panel component for toggles (hamburger menu style)
function ControlPanel({
  mapStyle,
  setMapStyle,
  isGlobe,
  setIsGlobe,
  isOpen,
  setIsOpen,
}: {
  mapStyle: string;
  setMapStyle: (style: string) => void;
  isGlobe: boolean;
  setIsGlobe: (globe: boolean) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  return (
    <div className="absolute bottom-4 left-4 z-10">
      {/* Hamburger Menu Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white bg-opacity-95 rounded-lg p-3 shadow-lg hover:bg-opacity-100 transition-all duration-200 mb-2"
        aria-label="Toggle map controls"
      >
        <div className="space-y-1">
          <div
            className={`w-5 h-0.5 bg-gray-800 transition-transform duration-200 ${isOpen ? "rotate-45 translate-y-1.5" : ""}`}
          />
          <div
            className={`w-5 h-0.5 bg-gray-800 transition-opacity duration-200 ${isOpen ? "opacity-0" : ""}`}
          />
          <div
            className={`w-5 h-0.5 bg-gray-800 transition-transform duration-200 ${isOpen ? "-rotate-45 -translate-y-1.5" : ""}`}
          />
        </div>
      </button>

      {/* Control Panel (slides up when open) */}
      <div
        className={`bg-white bg-opacity-95 rounded-lg shadow-lg transition-all duration-300 overflow-hidden ${
          isOpen ? "max-h-96 p-4" : "max-h-0 p-0"
        }`}
      >
        <div className="min-w-[250px]">
          <h3 className="font-bold text-gray-900 mb-3 text-sm">Map Controls</h3>

          {/* Map Style Toggle */}
          <div className="mb-4">
            <div className="block text-xs font-medium text-gray-700 mb-2">
              Map Style
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setMapStyle(MAP_STYLES.satellite)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  mapStyle === MAP_STYLES.satellite
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                🛰️ Satellite
              </button>
              <button
                type="button"
                onClick={() => setMapStyle(MAP_STYLES.dark)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  mapStyle === MAP_STYLES.dark
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                🌙 Dark
              </button>
              <button
                type="button"
                onClick={() => setMapStyle(MAP_STYLES.streets)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  mapStyle === MAP_STYLES.streets
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                🗺️ Streets
              </button>
              <button
                type="button"
                onClick={() => setMapStyle(MAP_STYLES.outdoors)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  mapStyle === MAP_STYLES.outdoors
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                🏔️ Outdoors
              </button>
            </div>
          </div>

          {/* 2D/Globe Toggle */}
          <div className="mb-4">
            <div className="block text-xs font-medium text-gray-700 mb-2">
              View Mode
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setIsGlobe(false)}
                className={`px-3 py-2 text-xs rounded border transition-colors ${
                  !isGlobe
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                🗺️ 2D
              </button>
              <button
                type="button"
                onClick={() => setIsGlobe(true)}
                className={`px-3 py-2 text-xs rounded border transition-colors ${
                  isGlobe
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                🌍 Globe
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="text-xs text-gray-600">
            <p className="mb-2">
              {defaultFloats.length} Argo floats in the Indian Ocean
            </p>
            <div className="flex items-center mb-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span>Active Float</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              <span>Selected Float</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InteractiveArgoMap({
  floats = defaultFloats,
}: InteractiveArgoMapProps) {
  const [selectedFloat, setSelectedFloat] = useState<ArgoFloat | null>(null);
  const [hoveredFloat, setHoveredFloat] = useState<ArgoFloat | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [mapStyle, setMapStyle] = useState(MAP_STYLES.dark);
  const [isGlobe, setIsGlobe] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);

  // Calculate the bounds to fit all floats (focused on Indian Ocean)
  const bounds = useMemo(() => {
    if (floats.length === 0) return null;

    // Center on Indian Ocean with appropriate zoom
    return {
      longitude: 75, // Central Indian Ocean longitude
      latitude: 0, // Equatorial latitude
      zoom: isGlobe ? 2 : 4,
    };
  }, [floats, isGlobe]);

  const handleMarkerClick = (float: ArgoFloat) => {
    setSelectedFloat(float);
    setShowProfile(true);
  };

  const handleMarkerHover = (float: ArgoFloat, event: MouseEvent) => {
    setHoveredFloat(float);
    setHoverPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMarkerHoverEnd = () => {
    setHoveredFloat(null);
    setHoverPosition(null);
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
    setSelectedFloat(null);
  };

  return (
    <div className="relative w-full h-full">
      <MapboxMap
        initialViewState={
          bounds || {
            longitude: 75,
            latitude: 0,
            zoom: 4,
          }
        }
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
        mapboxAccessToken={MAPBOX_TOKEN}
        interactiveLayerIds={[]}
        projection={isGlobe ? "globe" : "mercator"}
        onClick={() => {
          // Close popup when clicking on map
          setSelectedFloat(null);
          // Close control panel when clicking on map
          setIsControlPanelOpen(false);
        }}
      >
        {/* Map Controls */}
        <GeolocateControl position="top-left" />
        <FullscreenControl position="top-left" />
        <NavigationControl position="top-left" />
        <ScaleControl position="bottom-left" />

        {/* Argo Float Markers */}
        {floats.map((float) => (
          <Marker
            key={float.id}
            longitude={float.longitude}
            latitude={float.latitude}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              handleMarkerClick(float);
            }}
          >
            <ArgoMarker
              float={float}
              onClick={() => handleMarkerClick(float)}
              onHover={(e) => handleMarkerHover(float, e)}
              onHoverEnd={handleMarkerHoverEnd}
              isSelected={selectedFloat?.id === float.id}
            />
          </Marker>
        ))}

        {/* Popup for selected float */}
        {selectedFloat && !showProfile && (
          <Popup
            longitude={selectedFloat.longitude}
            latitude={selectedFloat.latitude}
            anchor="bottom"
            onClose={() => setSelectedFloat(null)}
            closeButton={true}
            closeOnClick={false}
            className="argo-popup"
          >
            <div className="p-3 min-w-[250px]">
              <h3 className="font-bold text-lg mb-2 text-gray-900">
                {selectedFloat.name}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {selectedFloat.description}
              </p>

              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <span className="font-semibold text-gray-700">Depth:</span>
                  <br />
                  <span className="text-blue-600">{selectedFloat.depth}m</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Temp:</span>
                  <br />
                  <span className="text-red-600">
                    {selectedFloat.temperature}°C
                  </span>
                </div>
              </div>

              <div className="text-sm mb-3">
                <span className="font-semibold text-gray-700">Salinity:</span>
                <br />
                <span className="text-green-600">
                  {selectedFloat.salinity} PSU
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowProfile(true)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                View Full Profile
              </button>
            </div>
          </Popup>
        )}
      </MapboxMap>

      {/* Control Panel */}
      <ControlPanel
        mapStyle={mapStyle}
        setMapStyle={setMapStyle}
        isGlobe={isGlobe}
        setIsGlobe={setIsGlobe}
        isOpen={isControlPanelOpen}
        setIsOpen={setIsControlPanelOpen}
      />

      {/* Floating Hover Preview */}
      {hoveredFloat && hoverPosition && (
        <div
          className="absolute z-40 pointer-events-none"
          style={{
            left: hoverPosition.x + 10,
            top: hoverPosition.y - 100,
          }}
        >
          <div className="bg-white rounded-lg shadow-lg p-3 max-w-[200px] border">
            <ArgoVisualizer onClose={() => {}} />
          </div>
        </div>
      )}

      {/* Argo Profile Overlay */}
      {showProfile && selectedFloat && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative">
            <ArgoVisualizer onClose={handleCloseProfile} />
          </div>
        </div>
      )}
    </div>
  );
}
