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
const markerData: Map<L.Marker, { airport: Airport; color: string }> = new Map()
const flightLines: any[] = [] // Using any because geodesic doesn't have types
let currentOpenMarker: L.Marker | null = null

// Animation state
let animationAborted = false
let planeMarker: L.Marker | null = null

// Helsinki coordinates (default center)
const HELSINKI_LAT = 60.1699
const HELSINKI_LNG = 24.9384

// Calculate line weight based on zoom level
function getLineWeight(zoom: number): number {
  // Base weight at zoom level 4
  const baseZoom = 4
  const baseWeight = 2
  
  // Scale factor: increase weight as zoom increases
  // At zoom 2: weight = 1
  // At zoom 4: weight = 2
  // At zoom 8: weight = 4
  // At zoom 12: weight = 6
  const weight = baseWeight * Math.pow(1.4, zoom - baseZoom)
  
  // Clamp between 0.5 and 8
  return Math.max(0.5, Math.min(8, weight))
}

// Calculate marker size based on zoom level
function getMarkerSize(zoom: number): number {
  const baseSize = 16
  
  // Only shrink markers on zoom levels 2-3 (farthest out)
  // Keep at 16px for zoom 4 and above
  if (zoom >= 4) {
    return baseSize
  }
  
  // Linear interpolation for zoom 2-3
  // At zoom 2: size = 10
  // At zoom 3: size = 13
  // At zoom 4+: size = 16
  const minSize = 10
  const zoomRange = 4 - 2 // zoom 2 to 4
  const sizeRange = baseSize - minSize
  const zoomFactor = (zoom - 2) / zoomRange
  
  return minSize + (sizeRange * zoomFactor)
}

// Get color based on frequency (blue = infrequent, red = frequent)
function getFrequencyColor(frequency: number, maxFrequency: number): string {
  if (maxFrequency === 0) return '#667eea' // Default blue
  
  const ratio = frequency / maxFrequency
  
  // Color gradient: blue -> cyan -> green -> orange -> red
  // Adjusted to have more red and orange
  if (ratio <= 0.15) return '#3b82f6' // Blue (0-15%)
  if (ratio <= 0.3) return '#06b6d4' // Cyan (15-30%)
  if (ratio <= 0.5) return '#10b981' // Green (30-50%)
  if (ratio <= 0.75) return '#f59e0b' // Orange (50-75%)
  return '#ef4444' // Red (75-100%)
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

// Format date for display in popup
function formatFlightDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

// Custom marker icon with IATA code and frequency-based color
function createAirportMarker(airport: Airport, color: string, size: number): L.DivIcon {
  const halfSize = size / 2
  // Use CSS custom property to set the base size, let CSS handle hover size
  return L.divIcon({
    className: 'airport-marker',
    html: `<div class="airport-marker-content" style="background-color: ${color}; border-color: white; --marker-size: ${size}px;"><span class="airport-code-text">${airport.iataCode}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [halfSize, halfSize]
  })
}

function clearMarkers() {
  markers.forEach(marker => marker.remove())
  markers.length = 0
  markerData.clear()
  currentOpenMarker = null
}

function clearFlightLines() {
  flightLines.forEach(line => line.remove())
  flightLines.length = 0
}

function updateLineWeights() {
  if (!map) return
  const currentZoom = map.getZoom()
  const newWeight = getLineWeight(currentZoom)
  
  flightLines.forEach(line => {
    line.setStyle({ weight: newWeight })
  })
}

function updateMarkerSizes() {
  if (!map) return
  const currentZoom = map.getZoom()
  const newSize = getMarkerSize(currentZoom)
  
  markers.forEach(marker => {
    const data = markerData.get(marker)
    if (data) {
      const newIcon = createAirportMarker(data.airport, data.color, newSize)
      marker.setIcon(newIcon)
    }
  })
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

  // Group flights by route (bidirectional - A-B and B-A are the same route)
  const routeFlights = new Map<string, FlightVisualizationData[]>()
  visualizations.forEach(viz => {
    // Create a canonical route key (alphabetically sorted to group A-B with B-A)
    const routeKey = [viz.fromAirport.iataCode, viz.toAirport.iataCode].sort().join('-')
    if (!routeFlights.has(routeKey)) {
      routeFlights.set(routeKey, [])
    }
    routeFlights.get(routeKey)!.push(viz)
  })

  // Track which routes we've already drawn (to avoid drawing the same line multiple times)
  const drawnRoutes = new Set<string>()

  // Add flight route lines first (so they appear under markers)
  visualizations.forEach(viz => {
    // Create route key for this specific direction
    const routeKey = [viz.fromAirport.iataCode, viz.toAirport.iataCode].sort().join('-')
    
    // Skip if we've already drawn this route
    if (drawnRoutes.has(routeKey)) {
      return
    }
    drawnRoutes.add(routeKey)
    
    // Get all flights for this route (both directions)
    const flightsOnRoute = routeFlights.get(routeKey) || []
    const fromCoords: L.LatLngExpression = viz.fromAirport.coordinates
    const toCoords: L.LatLngExpression = viz.toAirport.coordinates

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
    
    // Group flights by direction for display
    const outboundFlights = flightsOnRoute.filter(f => 
      f.fromAirport.iataCode === viz.fromAirport.iataCode && 
      f.toAirport.iataCode === viz.toAirport.iataCode
    )
    const returnFlights = flightsOnRoute.filter(f => 
      f.fromAirport.iataCode === viz.toAirport.iataCode && 
      f.toAirport.iataCode === viz.fromAirport.iataCode
    )
    
    // Create popup content with all flights on this route
    let popupContent = `<div class="flight-popup">`
    
    // Show outbound flights
    if (outboundFlights.length > 0) {
      popupContent += `
        <div class="flight-route">
          <span style="color: ${fromColor}; font-weight: bold;">${viz.fromAirport.iataCode}</span>
          →
          <span style="color: ${toColor}; font-weight: bold;">${viz.toAirport.iataCode}</span>
        </div>
      `
      outboundFlights.forEach(f => {
        const flightDate = formatFlightDate(f.departureTimestamp)
        popupContent += `
          <div class="flight-info">
            <span class="flight-number">${f.flight.airline} ${f.flight.flightCode}</span>
            <span class="flight-date">${flightDate}</span>
          </div>
        `
      })
    }
    
    // Show return flights
    if (returnFlights.length > 0) {
      if (outboundFlights.length > 0) {
        popupContent += `<div class="flight-separator"></div>`
      }
      popupContent += `
        <div class="flight-route">
          <span style="color: ${toColor}; font-weight: bold;">${viz.toAirport.iataCode}</span>
          →
          <span style="color: ${fromColor}; font-weight: bold;">${viz.fromAirport.iataCode}</span>
        </div>
      `
      returnFlights.forEach(f => {
        const flightDate = formatFlightDate(f.departureTimestamp)
        popupContent += `
          <div class="flight-info">
            <span class="flight-number">${f.flight.airline} ${f.flight.flightCode}</span>
            <span class="flight-date">${flightDate}</span>
          </div>
        `
      })
    }
    
    popupContent += `</div>`
    
    // Store segments for this flight to share the popup
    const flightSegments: L.Polyline[] = []

    // Draw multiple segments with interpolated colors
    for (let i = 0; i < numSegments; i++) {
      const startIdx = i * segmentSize
      const endIdx = i === numSegments - 1 ? pathPoints.length : (i + 1) * segmentSize
      const segmentPoints = pathPoints.slice(startIdx, endIdx + 1)

      if (segmentPoints.length < 2) continue

      // Interpolate color for this segment
      const ratio = i / (numSegments - 1)
      const segmentColor = interpolateColor(fromColor, toColor, ratio)

      const currentZoom = map!.getZoom()
      const segment = L.polyline(segmentPoints, {
        color: segmentColor,
        weight: getLineWeight(currentZoom),
        opacity: 0.6
      })
        .addTo(map!)

      flightSegments.push(segment)
      flightLines.push(segment)
    }
    
    // Bind popup to the middle segment (5th segment, index 4)
    const middleSegmentIndex = 4
    if (flightSegments[middleSegmentIndex]) {
      const middleSegment = flightSegments[middleSegmentIndex]
      middleSegment.bindPopup(popupContent)
      
      // When any segment is clicked, open the popup on the middle segment
      flightSegments.forEach(segment => {
        segment.on('click', () => {
          middleSegment.openPopup()
        })
      })
    }
  })

  // Add markers for each unique airport (on top of lines)
  const currentZoom = map.getZoom()
  const markerSize = getMarkerSize(currentZoom)
  
  airportsMap.forEach(airport => {
    const coords: L.LatLngExpression = airport.coordinates
    bounds.push(coords)

    const frequency = airportFrequency.get(airport.iataCode) || 0
    const color = getFrequencyColor(frequency, maxFrequency)

    const marker = L.marker(coords, {
      icon: createAirportMarker(airport, color, markerSize)
    })
      .addTo(map!)
      .bindPopup(`
        <div class="airport-popup">
          <div class="airport-popup-code" style="color: ${color};">${airport.iataCode}</div>
          <div class="airport-popup-name">${airport.name}</div>
          <div class="airport-popup-city">${airport.municipality || airport.isoRegion}</div>
          <div class="airport-popup-frequency">${frequency} flight${frequency !== 1 ? 's' : ''}</div>
        </div>
      `)

    // Get the marker element
    const markerElement = marker.getElement()
    
    // Handle popup open event
    marker.on('popupopen', () => {
      // Close previous marker popup if exists
      if (currentOpenMarker && currentOpenMarker !== marker) {
        currentOpenMarker.closePopup()
        const prevElement = currentOpenMarker.getElement()
        if (prevElement) {
          const prevContent = prevElement.querySelector('.airport-marker-content')
          if (prevContent) {
            prevContent.classList.remove('popup-open')
          }
        }
      }
      
      // Set current marker as open
      currentOpenMarker = marker
      
      // Add expanded class to keep it expanded
      if (markerElement) {
        const markerContent = markerElement.querySelector('.airport-marker-content')
        if (markerContent) {
          markerContent.classList.add('popup-open')
        }
      }
    })

    // Handle popup close event
    marker.on('popupclose', () => {
      if (currentOpenMarker === marker) {
        currentOpenMarker = null
      }
      
      // Remove expanded class
      if (markerElement) {
        const markerContent = markerElement.querySelector('.airport-marker-content')
        if (markerContent) {
          markerContent.classList.remove('popup-open')
        }
      }
    })

    markers.push(marker)
    markerData.set(marker, { airport, color })
  })

  // Fit map to show all airports
  if (bounds.length > 0) {
    map.fitBounds(bounds, { 
      padding: [50, 50],
      maxZoom: 4 // Don't zoom out further than level 4
    })
  }
}

// Animation functions
async function startAnimation(): Promise<void> {
  if (!map || !props.flightVisualizations) return
  
  animationAborted = false
  
  // Clear existing visualization
  clearMarkers()
  clearFlightLines()
  
  // Sort flights by departure time
  const sortedFlights = [...props.flightVisualizations].sort((a, b) => 
    a.departureTimestamp.getTime() - b.departureTimestamp.getTime()
  )
  
  // Calculate airport colors once (based on frequency)
  const airportFrequency = new Map<string, number>()
  props.flightVisualizations.forEach(viz => {
    airportFrequency.set(
      viz.fromAirport.iataCode,
      (airportFrequency.get(viz.fromAirport.iataCode) || 0) + 1
    )
    airportFrequency.set(
      viz.toAirport.iataCode,
      (airportFrequency.get(viz.toAirport.iataCode) || 0) + 1
    )
  })
  const maxFrequency = Math.max(...Array.from(airportFrequency.values()))
  
  // Track which airports have been shown
  const shownAirports = new Set<string>()
  
  // Animate each flight
  for (const viz of sortedFlights) {
    if (animationAborted) break
    
    const fromCoords: L.LatLngExpression = viz.fromAirport.coordinates
    const toCoords: L.LatLngExpression = viz.toAirport.coordinates
    
    const fromFreq = airportFrequency.get(viz.fromAirport.iataCode) || 0
    const toFreq = airportFrequency.get(viz.toAirport.iataCode) || 0
    const fromColor = getFrequencyColor(fromFreq, maxFrequency)
    const toColor = getFrequencyColor(toFreq, maxFrequency)
    
    // Show departure airport if not already shown
    if (!shownAirports.has(viz.fromAirport.iataCode)) {
      addAirportMarker(viz.fromAirport, fromColor, true)
      shownAirports.add(viz.fromAirport.iataCode)
    } else {
      // Highlight existing departure airport
      highlightAirportMarker(viz.fromAirport.iataCode)
    }
    
    // Animate the flight route
    await animateFlightRoute(viz, fromCoords, toCoords, fromColor, toColor)
    
    // Show arrival airport if not already shown
    if (!shownAirports.has(viz.toAirport.iataCode)) {
      addAirportMarker(viz.toAirport, toColor, true)
      shownAirports.add(viz.toAirport.iataCode)
    } else {
      // Highlight existing arrival airport
      highlightAirportMarker(viz.toAirport.iataCode)
    }
  }
}

function stopAnimation(): void {
  animationAborted = true
  
  // Remove plane marker if exists
  if (planeMarker && map) {
    planeMarker.remove()
    planeMarker = null
  }
  
  // Re-visualize all flights normally
  if (props.flightVisualizations) {
    visualizeFlights(props.flightVisualizations)
  }
}

function addAirportMarker(airport: Airport, color: string, highlight: boolean = false): void {
  if (!map) return
  
  const currentZoom = map.getZoom()
  const markerSize = getMarkerSize(currentZoom)
  const coords: L.LatLngExpression = airport.coordinates
  
  const marker = L.marker(coords, {
    icon: createAirportMarker(airport, color, markerSize)
  })
    .addTo(map!)
  
  markers.push(marker)
  markerData.set(marker, { airport, color })
  
  // Add highlight effect if requested
  if (highlight) {
    const markerElement = marker.getElement()
    if (markerElement) {
      const markerContent = markerElement.querySelector('.airport-marker-content')
      if (markerContent) {
        markerContent.classList.add('highlight-pulse')
        setTimeout(() => {
          markerContent.classList.remove('highlight-pulse')
        }, 600)
      }
    }
  }
}

function highlightAirportMarker(airportCode: string): void {
  // Find the marker for this airport
  for (const [marker, data] of markerData.entries()) {
    if (data.airport.iataCode === airportCode) {
      const markerElement = marker.getElement()
      if (markerElement) {
        const markerContent = markerElement.querySelector('.airport-marker-content')
        if (markerContent) {
          markerContent.classList.add('highlight-pulse')
          setTimeout(() => {
            markerContent.classList.remove('highlight-pulse')
          }, 600)
        }
      }
      break
    }
  }
}

async function animateFlightRoute(
  _viz: FlightVisualizationData,
  fromCoords: L.LatLngExpression,
  toCoords: L.LatLngExpression,
  fromColor: string,
  toColor: string
): Promise<void> {
  if (!map || animationAborted) return
  
  // Create geodesic line to get the path points
  // @ts-ignore
  const geodesicLine = L.geodesic([fromCoords, toCoords], {
    steps: 50,
    wrap: false
  })
  
  const pathPoints = geodesicLine.getLatLngs()[0] as L.LatLng[]
  const numSegments = 10
  const segmentSize = Math.floor(pathPoints.length / numSegments)
  
  const currentZoom = map.getZoom()
  
  // Animate each segment
  for (let i = 0; i < numSegments; i++) {
    if (animationAborted) break
    
    const startIdx = i * segmentSize
    const endIdx = i === numSegments - 1 ? pathPoints.length : (i + 1) * segmentSize
    const segmentPoints = pathPoints.slice(startIdx, endIdx + 1)
    
    if (segmentPoints.length < 2) continue
    
    // Interpolate color for this segment
    const ratio = i / (numSegments - 1)
    const segmentColor = interpolateColor(fromColor, toColor, ratio)
    
    // Create and add the segment
    const segment = L.polyline(segmentPoints, {
      color: segmentColor,
      weight: getLineWeight(currentZoom),
      opacity: 0.6
    }).addTo(map!)
    
    flightLines.push(segment)
    
    // Show plane emoji at the end of the segment
    const endPoint = segmentPoints[segmentPoints.length - 1]
    showPlaneMarker(endPoint)
    
    // Wait before showing next segment
    await sleep(50)
  }
  
  // Remove plane marker after flight is complete
  if (planeMarker && map) {
    planeMarker.remove()
    planeMarker = null
  }
}

function showPlaneMarker(position: L.LatLng): void {
  if (!map) return
  
  // Remove previous plane marker
  if (planeMarker) {
    planeMarker.remove()
  }
  
  // Create plane icon
  const planeIcon = L.divIcon({
    className: 'plane-marker',
    html: '<div style="font-size: 20px;">✈️</div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  })
  
  planeMarker = L.marker(position, { icon: planeIcon }).addTo(map!)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Expose methods for parent component
defineExpose({
  startAnimation,
  stopAnimation
})

onMounted(() => {
  if (mapContainer.value) {
    // Define world bounds to restrict panning
    const worldBounds = L.latLngBounds(
      L.latLng(-90, -180), // Southwest corner
      L.latLng(90, 180)    // Northeast corner
    )

    // Initialize the map with restrictions
    map = L.map(mapContainer.value, {
      maxBounds: worldBounds,
      maxBoundsViscosity: 1.0, // Makes the bounds solid (can't drag outside)
      minZoom: 2,
      maxZoom: 19
    }).setView([HELSINKI_LAT, HELSINKI_LNG], 4)

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map)

    // Add zoom event listener to update line weights and marker sizes
    map.on('zoomend', () => {
      updateLineWeights()
      updateMarkerSizes()
    })

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
  width: var(--marker-size, 16px);
  height: var(--marker-size, 16px);
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

/* Keep marker expanded when popup is open */
.airport-marker-content.popup-open {
  filter: brightness(0.85);
  width: 48px;
  height: 28px;
  border-radius: 14px;
  padding: 0 8px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.airport-marker-content.popup-open .airport-code-text {
  opacity: 1;
}

.airport-popup {
  text-align: center;
  min-width: 150px;
}

.airport-popup-code {
  font-size: 18px;
  font-weight: 700;
  /* color is set inline to match marker color */
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
  margin-bottom: 2px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.flight-number {
  font-weight: 600;
  color: #374151;
}

.flight-date {
  font-size: 11px;
  color: #9ca3af;
  white-space: nowrap;
}

.flight-separator {
  height: 1px;
  background: #e5e7eb;
  margin: 8px 0;
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

/* Plane marker for animation */
.plane-marker {
  background: transparent;
  border: none;
  pointer-events: none;
  z-index: 10000;
}

/* Highlight pulse effect for airport markers during animation */
.airport-marker-content.highlight-pulse {
  filter: brightness(0.85);
  width: 48px !important;
  height: 28px !important;
  border-radius: 14px;
  padding: 0 8px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.airport-marker-content.highlight-pulse .airport-code-text {
  opacity: 1;
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

