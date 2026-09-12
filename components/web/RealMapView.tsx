'use client';

import React, { useEffect, useRef } from 'react';
import { ParkingLocation } from '@/types';
import 'leaflet/dist/leaflet.css';

interface RealMapViewProps {
  locations: ParkingLocation[];
  selectedLocation: ParkingLocation | null;
  onSelectLocation: (location: ParkingLocation) => void;
  vehicleFilter?: 'all' | 'car' | 'bike';
}

export const RealMapView: React.FC<RealMapViewProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  vehicleFilter = 'all'
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersGroup = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    // Dynamically import Leaflet JS to avoid SSR window errors
    import('leaflet').then((L) => {
      if (!leafletMap.current && mapRef.current) {
        // Initialize Leaflet map centered at Madurai (Meenakshi Temple: 9.9195, 78.1193)
        const map = L.map(mapRef.current, {
          center: [9.9195, 78.1193],
          zoom: 15,
          zoomControl: false,
          scrollWheelZoom: true
        });

        // Add 100% Free OpenStreetMap Tile Layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }).addTo(map);

        // Add Zoom Control at Top Right
        L.control.zoom({ position: 'topright' }).addTo(map);

        leafletMap.current = map;
        markersGroup.current = L.layerGroup().addTo(map);
      }

      // Render custom price markers
      if (leafletMap.current && markersGroup.current) {
        markersGroup.current.clearLayers();

        locations.forEach((loc) => {
          const isSelected = selectedLocation?.id === loc.id;
          const rate = vehicleFilter === 'bike' ? loc.hourlyRateBike : loc.hourlyRateCar;

          // Custom HTML Price Tag Icon
          const customIcon = L.divIcon({
            className: 'custom-leaflet-marker',
            html: `
              <div class="cursor-pointer transition-transform transform ${
                isSelected ? 'scale-110' : 'hover:scale-105'
              }">
                <div class="flex items-center space-x-1 px-3 py-1.5 rounded-full shadow-lg font-extrabold text-xs border ${
                  isSelected
                    ? 'bg-emerald-950 text-white border-emerald-400 ring-4 ring-emerald-500/20'
                    : 'bg-white text-emerald-950 border-emerald-300 shadow-md'
                }">
                  <span class="w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-emerald-600'}"></span>
                  <span>₹${rate}</span>
                </div>
              </div>
            `,
            iconSize: [60, 30],
            iconAnchor: [30, 15]
          });

          const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon });

          marker.on('click', () => {
            onSelectLocation(loc);
            if (leafletMap.current) {
              leafletMap.current.panTo([loc.latitude, loc.longitude], { animate: true, duration: 0.8 });
            }
          });

          marker.addTo(markersGroup.current);
        });

        // If selectedLocation changes, pan smoothly to it
        if (selectedLocation && leafletMap.current) {
          leafletMap.current.panTo([selectedLocation.latitude, selectedLocation.longitude], { animate: true });
        }
      }
    });

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Update markers when props change
  useEffect(() => {
    if (typeof window === 'undefined' || !leafletMap.current) return;

    import('leaflet').then((L) => {
      if (markersGroup.current) {
        markersGroup.current.clearLayers();

        locations.forEach((loc) => {
          const isSelected = selectedLocation?.id === loc.id;
          const rate = vehicleFilter === 'bike' ? loc.hourlyRateBike : loc.hourlyRateCar;

          const customIcon = L.divIcon({
            className: 'custom-leaflet-marker',
            html: `
              <div class="cursor-pointer transition-transform transform ${
                isSelected ? 'scale-110' : 'hover:scale-105'
              }">
                <div class="flex items-center space-x-1 px-3 py-1.5 rounded-full shadow-lg font-extrabold text-xs border ${
                  isSelected
                    ? 'bg-emerald-950 text-white border-emerald-400 ring-4 ring-emerald-500/20'
                    : 'bg-white text-emerald-950 border-emerald-300 shadow-md'
                }">
                  <span class="w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-emerald-600'}"></span>
                  <span>₹${rate}</span>
                </div>
              </div>
            `,
            iconSize: [60, 30],
            iconAnchor: [30, 15]
          });

          const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon });

          marker.on('click', () => {
            onSelectLocation(loc);
            if (leafletMap.current) {
              leafletMap.current.panTo([loc.latitude, loc.longitude], { animate: true, duration: 0.8 });
            }
          });

          marker.addTo(markersGroup.current);
        });

        if (selectedLocation && leafletMap.current) {
          leafletMap.current.panTo([selectedLocation.latitude, selectedLocation.longitude], { animate: true });
        }
      }
    });
  }, [locations, selectedLocation, vehicleFilter]);

  return (
    <div className="w-full h-full min-h-[480px] rounded-2xl overflow-hidden relative border border-gray-200">
      <div ref={mapRef} className="w-full h-full absolute inset-0 z-0" />
    </div>
  );
};
