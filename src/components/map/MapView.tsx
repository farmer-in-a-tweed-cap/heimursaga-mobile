import React, { useState, useRef, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Text, Dimensions, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api';
// import type { IMapQueryPayload, MapQueryContext } from '@repo/types';

// Try to import Mapbox, fallback if not available
let MapboxGL: any;
let MAPBOX_ACCESS_TOKEN: string;
let MAP_STYLES: any;

try {
  MapboxGL = require('@rnmapbox/maps').default;
  const mapboxConfig = require('../../config/mapbox');
  MAPBOX_ACCESS_TOKEN = mapboxConfig.MAPBOX_ACCESS_TOKEN;
  MAP_STYLES = mapboxConfig.MAP_STYLES;
  
  // Set Mapbox access token if available
  if (MapboxGL && MAPBOX_ACCESS_TOKEN) {
    MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
  }
} catch (e) {
}

interface MapViewProps {
  onWaypointPress?: (waypoint: any) => void;
  selectedWaypoint?: any;
  onRegionChange?: () => void;
  initialCenterCoordinate?: [number, number];
  initialZoomLevel?: number;
  onMapStateChange?: (state: { centerCoordinate: [number, number]; zoomLevel: number }) => void;
  waypointsData?: any; // Waypoints data from parent
  hideScaleBar?: boolean; // Control scale bar visibility
  drawerHeightFraction?: number; // Current drawer height as fraction of screen (0.4 or 0.9)
  selectedJourney?: any; // Selected journey data for line rendering
  journeyWaypoints?: any[]; // Specific waypoints for the selected journey
  // New props for location selection
  initialLocation?: { lat: number; lon: number };
  selectedLocation?: { lat: number; lon: number };
  onMapPress?: (coordinate: { latitude: number; longitude: number }) => void;
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
}

export interface MapViewRef {
  centerOnLocation: (longitude: number, latitude: number, zoomLevel?: number) => void;
  fitToBounds: (bounds: [[number, number], [number, number]], padding?: number) => void;
  getCurrentBounds: () => Promise<any>;
  fitJourneyBounds: (waypoints: any[]) => void;
}

export const MapView = forwardRef<MapViewRef, MapViewProps>(({ 
  onWaypointPress, 
  selectedWaypoint, 
  onRegionChange, 
  initialCenterCoordinate,
  initialZoomLevel,
  onMapStateChange,
  waypointsData,
  hideScaleBar = false,
  drawerHeightFraction = 0.4,
  selectedJourney,
  journeyWaypoints = [],
  // New props for location selection
  initialLocation,
  selectedLocation,
  onMapPress,
  showsUserLocation,
  followsUserLocation
}, ref) => {
  const mapRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const [, setMapBounds] = useState<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isCentering, setIsCentering] = useState(false);
  const hasInitialized = useRef(false);

  // Set initial camera position if provided and map is ready
  useEffect(() => {
    if (isMapReady && cameraRef.current && !hasInitialized.current && initialCenterCoordinate && initialZoomLevel) {
      hasInitialized.current = true;
      cameraRef.current.setCamera({
        centerCoordinate: initialCenterCoordinate,
        zoomLevel: initialZoomLevel,
        animationDuration: 0, // No animation for initial positioning
      });
    } else if (isMapReady && !hasInitialized.current) {
      hasInitialized.current = true;
    }
  }, [isMapReady, initialCenterCoordinate, initialZoomLevel]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    centerOnLocation: (longitude: number, latitude: number, zoomLevel?: number) => {
      if (cameraRef.current && isMapReady) {
        const cameraConfig: any = {
          centerCoordinate: [longitude, latitude],
          animationDuration: 1000,
        };
        
        // Only set zoom level if explicitly provided
        if (zoomLevel !== undefined) {
          cameraConfig.zoomLevel = zoomLevel;
        }
        
        cameraRef.current.setCamera(cameraConfig);
      }
    },
    fitToBounds: (bounds: [[number, number], [number, number]], padding = 20) => {
      if (cameraRef.current && isMapReady) {
        const [ne, sw] = bounds; // we receive [northeast, southwest] 
        const [eastLon, northLat] = ne;
        const [westLon, southLat] = sw;
        
        console.log('Simple fitToBounds call');
        
        cameraRef.current.fitBounds(
          [eastLon, northLat], // northeast
          [westLon, southLat], // southwest  
          padding,
          1500 // animation duration
        );
      }
    },
    getCurrentBounds: async () => {
      if (mapRef.current && isMapReady) {
        try {
          const bounds = await mapRef.current.getVisibleBounds();
          
          // bounds[0] = southwest [lon, lat]
          // bounds[1] = northeast [lon, lat]
          const swLon = bounds[0][0];
          const swLat = bounds[0][1];
          const neLon = bounds[1][0];
          const neLat = bounds[1][1];
          
          const result = {
            ne: { lat: Math.max(swLat, neLat), lon: Math.max(swLon, neLon) },
            sw: { lat: Math.min(swLat, neLat), lon: Math.min(swLon, neLon) },
          };
          
          return result;
        } catch (error) {
          return null;
        }
      }
      return null;
    },
    fitJourneyBounds: (waypoints: any[]) => {
      if (cameraRef.current && isMapReady && waypoints.length > 0) {
        const coordinates = waypoints.map(wp => [wp.lon, wp.lat]);
        
        if (coordinates.length === 1) {
          // Single point - center on it
          cameraRef.current.setCamera({
            centerCoordinate: coordinates[0],
            zoomLevel: 14,
            animationDuration: 1000,
          });
        } else {
          // Multiple points - fit bounds
          const lons = coordinates.map(coord => coord[0]);
          const lats = coordinates.map(coord => coord[1]);
          
          const minLon = Math.min(...lons);
          const maxLon = Math.max(...lons);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          
          // Add padding
          const lonRange = maxLon - minLon;
          const latRange = maxLat - minLat;
          const lonPadding = Math.max(lonRange * 0.1, 0.01);
          const latPadding = Math.max(latRange * 0.1, 0.01);
          
          cameraRef.current.fitBounds(
            [minLon - lonPadding, minLat - latPadding], // southwest
            [maxLon + lonPadding, maxLat + latPadding], // northeast
            50, // padding
            1000 // animation duration
          );
        }
      }
    },
  }));

  // Don't automatically load waypoints - let parent control this
  // const { data: waypointsData, isLoading, error } = useQuery({
  //   queryKey: ['map-waypoints-global'],
  //   queryFn: async () => {
  //     const queryPayload: IMapQueryPayload = {
  //       context: 'global' as MapQueryContext,
  //       limit: 100,
  //     };
      
  //     const result = await api.map.queryMap(queryPayload);
  //     return result;
  //   },
  //   enabled: false, // Disabled - parent will provide waypoints
  // });

  // Use waypoints data from parent (waypointsData prop)
  const isLoading = false;
  const error = null;

  const handleRegionDidChange = useCallback(async () => {
    if (!mapRef.current || !cameraRef.current || isCentering) {
      if (isCentering) {
      }
      return;
    }
    
    try {
      const bounds = await mapRef.current.getVisibleBounds();
      const newBounds = {
        ne: bounds[1], // [lon, lat]
        sw: bounds[0], // [lon, lat]
      };
      
      setMapBounds(newBounds);
      
      // Get current camera state for persistence
      if (onMapStateChange) {
        try {
          const center = await mapRef.current.getCenter();
          const zoom = await mapRef.current.getZoom();
          onMapStateChange({
            centerCoordinate: center,
            zoomLevel: zoom,
          });
        } catch (error) {
          // Map state update failed, continue with region change
        }
      }
      
      // Notify parent component of region change
      if (onRegionChange) {
        onRegionChange();
      }
    } catch (error) {
      // Region change handling failed, but don't break the app
    }
  }, [onRegionChange, onMapStateChange, isCentering]);

  const handleMapPress = useCallback((feature: any) => {
    if (onMapPress) {
      const coordinates = feature.geometry.coordinates;
      onMapPress({
        latitude: coordinates[1],
        longitude: coordinates[0],
      });
    }
  }, [onMapPress]);

  const handleWaypointPress = (waypoint: any) => {
    if (onWaypointPress) {
      onWaypointPress(waypoint);
    }
    // Removed automatic zoom/centering behavior on tap
  };

  const renderedWaypoints = useMemo(() => {
    // Use journey waypoints if a journey is selected, otherwise use regular waypoints
    const waypointsToRender = selectedJourney && journeyWaypoints.length > 0 
      ? journeyWaypoints 
      : waypointsData?.waypoints;
    
    if (!waypointsToRender || waypointsToRender.length === 0) {
      return null;
    }
    
    return waypointsToRender.filter((waypoint: any) => {
      // Filter out waypoints with invalid coordinates
      return typeof waypoint.lon === 'number' && typeof waypoint.lat === 'number' &&
             !isNaN(waypoint.lon) && !isNaN(waypoint.lat) &&
             waypoint.lon !== 0 && waypoint.lat !== 0;
    }).map((waypoint: any, index: number) => {
      // Handle selection for both entries (with posts) and waypoints (without posts)
      const isSelected = selectedWaypoint && (
        (waypoint.post?.id && selectedWaypoint.post?.id === waypoint.post.id) ||
        (waypoint.id && selectedWaypoint.id === waypoint.id) ||
        (!waypoint.post?.id && !waypoint.id && selectedWaypoint === waypoint)
      );
      
      // Determine marker type: entry (has post) or waypoint (no post)
      const hasEntry = !!waypoint.post;
      
      const markerStyle = hasEntry 
        ? styles.waypointMarker // Primary color for entries
        : styles.waypointMarkerGray; // Gray for waypoints
      const selectedStyle = hasEntry
        ? styles.waypointMarkerSelected
        : styles.waypointMarkerGraySelected;
      
      
      return (
      <MapboxGL.PointAnnotation
        key={`waypoint-${waypoint.post?.id || waypoint.id || index}`}
        id={`waypoint-${waypoint.post?.id || waypoint.id || index}`}
        coordinate={[waypoint.lon, waypoint.lat]}
        onSelected={() => {
          handleWaypointPress(waypoint);
        }}
      >
        <View style={[
          markerStyle,
          isSelected && selectedStyle
        ]} />
      </MapboxGL.PointAnnotation>
      );
    });
  }, [waypointsData?.waypoints, selectedWaypoint, handleWaypointPress, selectedJourney, journeyWaypoints]);

  // If MapboxGL is available, render the full map
  if (MapboxGL) {
    return (
      <View style={styles.container}>
        <MapboxGL.MapView
          ref={mapRef}
          style={styles.map}
          onDidFinishLoadingMap={() => setIsMapReady(true)}
          onMapIdle={isCentering ? undefined : handleRegionDidChange}
          onPress={onMapPress ? handleMapPress : undefined}
          styleURL={MAP_STYLES?.custom}
          rotateEnabled={true}
          pitchEnabled={false}
          scrollEnabled={true}
          zoomEnabled={true}
          scaleBarEnabled={!hideScaleBar}
        >
          <MapboxGL.Camera
            ref={cameraRef}
            zoomLevel={initialZoomLevel || (initialLocation ? 12 : 1.5)}
            centerCoordinate={
              initialCenterCoordinate || 
              (initialLocation ? [initialLocation.lon, initialLocation.lat] : [0, 45])
            }
            animationMode="none"
            animationDuration={0}
          />
          
          {/* Journey Lines - Render first so they appear under waypoints */}
          {selectedJourney && journeyWaypoints.length > 1 && (() => {
            const coordinates = journeyWaypoints.map((wp: any) => [wp.lon || wp.lng, wp.lat]).filter((coord: number[]) => coord[0] && coord[1]);
            
            if (coordinates.length > 1) {
              return (
                <MapboxGL.ShapeSource
                  id="journey-background-lines"
                  shape={{
                    type: 'Feature',
                    geometry: {
                      type: 'LineString',
                      coordinates: coordinates
                    },
                    properties: {}
                  }}
                >
                  <MapboxGL.LineLayer
                    id="journey-background-line"
                    style={{
                      lineColor: '#AC6D46',
                      lineWidth: 3,
                      lineOpacity: 0.8,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                    belowLayerID="poi-label"
                  />
                </MapboxGL.ShapeSource>
              );
            }
            return null;
          })()}
          
          {/* Waypoints - Render after lines so they appear on top */}
          {renderedWaypoints}
          
          {/* Selected Location Marker for location selection */}
          {selectedLocation && (
            <MapboxGL.PointAnnotation
              key="selected-location"
              id="selected-location"
              coordinate={[selectedLocation.lon, selectedLocation.lat]}
              anchor={{ x: 0.5, y: 0.5 }}
              allowOverlap={true}
              onSelected={() => {}} // Prevent any selection behavior
            >
              <View style={styles.selectedLocationMarker} />
            </MapboxGL.PointAnnotation>
          )}
          
        </MapboxGL.MapView>
        
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Loading waypoints...</Text>
          </View>
        )}
        
        {error && (
          <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(220, 38, 38, 0.9)' }]}>
            <Text style={styles.loadingText}>Error loading waypoints</Text>
            <Text style={[styles.loadingText, { fontSize: 12, marginTop: 4 }]}>
              {error ? (error as any).message || 'Unknown error' : 'Unknown error'}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Fallback when MapboxGL isn't available
  return (
    <View style={styles.container}>
      <View style={[styles.map, styles.fallback]}>
        <Text style={styles.fallbackText}>🗺️ Map View</Text>
        <Text style={styles.fallbackSubtext}>
          {onMapPress ? 'Tap anywhere to select location' : 'Mapbox integration coming soon'}
        </Text>
        {selectedLocation && (
          <Text style={styles.fallbackSubtext}>
            Selected: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lon.toFixed(4)}
          </Text>
        )}
        {waypointsData?.waypoints && (
          <Text style={styles.fallbackSubtext}>
            {waypointsData.waypoints.length} waypoints available
          </Text>
        )}
        {onMapPress && (
          <TouchableOpacity
            style={{ padding: 20, backgroundColor: '#4676AC', borderRadius: 8, marginTop: 20 }}
            onPress={() => onMapPress({ latitude: 37.7749, longitude: -122.4194 })}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>
              Select San Francisco (Demo)
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  map: {
    flex: 1,
  },
  
  waypointTouchArea: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  waypointMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#AA6C46', // Using your brand color
    borderWidth: 3,
    borderColor: '#AC6D46', // Primary color border by default
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  waypointMarkerSelected: {
    borderColor: '#ffffff', // White border when selected
  },

  waypointMarkerGray: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8E8E93', // Gray for waypoints without entries
    borderWidth: 3,
    borderColor: '#8E8E93', // Matching gray border
    alignItems: 'center',
    justifyContent: 'center',
  },

  waypointMarkerGraySelected: {
    borderColor: '#ffffff', // White border when selected
  },
  
  waypointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  
  waypointDotSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  
  loadingOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  
  loadingText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  
  crosshairs: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#AC6D46',
    backgroundColor: 'transparent',
    opacity: 0.8,
  },

  fallback: {
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  fallbackText: {
    fontSize: 32,
    marginBottom: 8,
  },

  fallbackSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 4,
  },
  
  selectedLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#AC6D46', // Primary copper color
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});