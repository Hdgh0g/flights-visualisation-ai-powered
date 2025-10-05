<template>
  <div class="map-container">
    <div id="map" ref="mapContainer"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import L from 'leaflet'
// @ts-ignore - no types available for leaflet.geodesic
import 'leaflet.geodesic'
import type { FlightVisualizationData } from '../types/FlightVisualization'
import type { Airport } from '../types/Airport'

const props = defineProps<{
  flightVisualizations?: FlightVisualizationData[]
}>()

const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
const markers: L.Marker[] = []
const flightLines: any[] = [] // Using any because geodesic doesn't have types

// Helsinki coordinates (default center)
const HELSINKI_LAT = 60.1699
const HELSINKI_LNG = 24.9384

// Get color based on frequency (blue = infrequent, red = frequent)
function getFrequencyColor(frequency: number, maxFrequency: number): string {
  if (maxFrequency === 0) return '#667eea' // Default blue
  
  const ratio = frequency / maxFrequency
  
  // Color gradient: blue -> cyan -> green -> yellow -> orange -> red
  if (ratio <= 0.2) return '#3b82f6' // Blue
  if (ratio <= 0.4) return '#06b6d4' // Cyan
  if (ratio <= 0.6) return '#10b981' // Green
  if (ratio <= 0.8) return '#f59e0b' // Orange
  return '#ef4444' // Red
}

// Convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 102, g: 126, b: 234 }
}

// Interpolate between two colors
function interpolateColor(color1: string, color2: string, ratio: number): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  
  const r = Math.round(c1.r + (c2.r - c1.r) * ratio)
  const g = Math.round(c1.g + (c2.g - c1.g) * ratio)
  const b = Math.round(c1.b + (c2.b - c1.b) * ratio)
  
  return `rgb(${r}, ${g}, ${b})`
}

// Custom marker icon with IATA code and frequency-based color
function createAirportMarker(airport: Airport, color: string): L.DivIcon {
  return L.divIcon({
    className: 'airport-marker',
    html: `<div class="airport-marker-content" style="background-color: ${color}; border-color: white;"><span class="airport-code-text">${airport.iataCode}</span></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  })
}

function clearMarkers() {
  markers.forEach(marker => marker.remove())
  markers.length = 0
}

function clearFlightLines() {
  flightLines.forEach(line => line.remove())
  flightLines.length = 0
}

function visualizeFlights(visualizations: FlightVisualizationData[]) {
  if (!map) return

  clearMarkers()
  clearFlightLines()

  if (!visualizations || visualizations.length === 0) {
    // Reset to Helsinki if no data
    map.setView([HELSINKI_LAT, HELSINKI_LNG], 4)
    return
  }

  // Collect unique airports and count their usage frequency
  const airportsMap = new Map<string, Airport>()
  const airportFrequency = new Map<string, number>()
  
  visualizations.forEach(viz => {
    // Track airports
    airportsMap.set(viz.fromAirport.iataCode, viz.fromAirport)
    airportsMap.set(viz.toAirport.iataCode, viz.toAirport)
    
    // Count frequency (each flight counts for both departure and arrival)
    airportFrequency.set(
      viz.fromAirport.iataCode,
      (airportFrequency.get(viz.fromAirport.iataCode) || 0) + 1
    )
    airportFrequency.set(
      viz.toAirport.iataCode,
      (airportFrequency.get(viz.toAirport.iataCode) || 0) + 1
    )
  })

  // Find max frequency for color scaling
  const maxFrequency = Math.max(...Array.from(airportFrequency.values()))

  const bounds: L.LatLngBoundsExpression = []

  // Add flight route lines first (so they appear under markers)
  visualizations.forEach(viz => {
    const fromCoords: L.LatLngExpression = [viz.fromAirport.latitude, viz.fromAirport.longitude]
    const toCoords: L.LatLngExpression = [viz.toAirport.latitude, viz.toAirport.longitude]

    // Get colors for both airports
    const fromFreq = airportFrequency.get(viz.fromAirport.iataCode) || 0
    const toFreq = airportFrequency.get(viz.toAirport.iataCode) || 0
    const fromColor = getFrequencyColor(fromFreq, maxFrequency)
    const toColor = getFrequencyColor(toFreq, maxFrequency)

    // Create geodesic line to get the actual path points
    // @ts-ignore - geodesic doesn't have TypeScript types
    const geodesicLine = L.geodesic([fromCoords, toCoords], {
      steps: 50,
      wrap: false
    })

    // Get the computed geodesic path points
    const pathPoints = geodesicLine.getLatLngs()[0] as L.LatLng[]

    // Number of gradient segments
    const numSegments = 10
    const segmentSize = Math.floor(pathPoints.length / numSegments)

    // Draw multiple segments with interpolated colors
    for (let i = 0; i < numSegments; i++) {
      const startIdx = i * segmentSize
      const endIdx = i === numSegments - 1 ? pathPoints.length : (i + 1) * segmentSize
      const segmentPoints = pathPoints.slice(startIdx, endIdx + 1)

      if (segmentPoints.length < 2) continue

      // Interpolate color for this segment
      const ratio = i / (numSegments - 1)
      const segmentColor = interpolateColor(fromColor, toColor, ratio)

      const segment = L.polyline(segmentPoints, {
        color: segmentColor,
        weight: 2,
        opacity: 0.6
      })
        .addTo(map!)

      // Only add popup to the first segment
      if (i === 0) {
        segment.bindPopup(`
          <div class="flight-popup">
            <div class="flight-route">${viz.fromAirport.iataCode} → ${viz.toAirport.iataCode}</div>
            <div class="flight-info">${viz.airline} ${viz.flightNumber}</div>
          </div>
        `)
      }

      flightLines.push(segment)
    }
  })

  // Add markers for each unique airport (on top of lines)
  airportsMap.forEach(airport => {
    const coords: L.LatLngExpression = [airport.latitude, airport.longitude]
    bounds.push(coords)

    const frequency = airportFrequency.get(airport.iataCode) || 0
    const color = getFrequencyColor(frequency, maxFrequency)

    const marker = L.marker(coords, {
      icon: createAirportMarker(airport, color)
    })
      .addTo(map!)
      .bindPopup(`
        <div class="airport-popup">
          <div class="airport-popup-code">${airport.iataCode}</div>
          <div class="airport-popup-name">${airport.name}</div>
          <div class="airport-popup-city">${airport.municipality || airport.isoRegion}</div>
          <div class="airport-popup-frequency">${frequency} flight${frequency !== 1 ? 's' : ''}</div>
        </div>
      `)

    markers.push(marker)
  })

  // Fit map to show all airports
  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50] })
  }
}

onMounted(() => {
  if (mapContainer.value) {
    // Initialize the map
    map = L.map(mapContainer.value).setView([HELSINKI_LAT, HELSINKI_LNG], 4)

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map)

    // Visualize initial data if available
    if (props.flightVisualizations && props.flightVisualizations.length > 0) {
      visualizeFlights(props.flightVisualizations)
    }
  }
})

// Watch for changes in flight visualizations
watch(() => props.flightVisualizations, (newVisualizations) => {
  if (newVisualizations) {
    visualizeFlights(newVisualizations)
  }
})
</script>

<style>
/* Global styles for Leaflet markers (can't be scoped) */
.airport-marker {
  background: transparent;
  border: none;
}

.airport-marker-content {
  /* background color set inline based on frequency */
  color: white;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  font-weight: 600;
  font-size: 10px;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  border: 2px solid white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  line-height: 1;
  position: relative;
  z-index: 1;
}

.airport-code-text {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.airport-marker-content:hover {
  /* Keep the same background color, just make it slightly darker */
  filter: brightness(0.85);
  width: 48px;
  height: 28px;
  border-radius: 14px;
  padding: 0 8px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.airport-marker-content:hover .airport-code-text {
  opacity: 1;
}

.airport-popup {
  text-align: center;
  min-width: 150px;
}

.airport-popup-code {
  font-size: 18px;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 4px;
}

.airport-popup-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.airport-popup-city {
  font-size: 12px;
  color: #6b7280;
}

.airport-popup-frequency {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 4px;
  font-style: italic;
}

.flight-popup {
  text-align: center;
  min-width: 120px;
}

.flight-route {
  font-size: 14px;
  font-weight: 600;
  color: #667eea;
  margin-bottom: 4px;
}

.flight-info {
  font-size: 12px;
  color: #6b7280;
}

/* Flight route lines */
.flight-route-line {
  pointer-events: visibleStroke;
  cursor: pointer;
}

.flight-route-line:hover {
  stroke-opacity: 1 !important;
  stroke-width: 3 !important;
}
</style>

<style scoped>
.map-container {
  flex: 1;
  width: 100%;
  position: relative;
}

#map {
  width: 100%;
  height: 100%;
}
</style>

