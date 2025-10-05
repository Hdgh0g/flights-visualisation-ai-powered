<template>
  <div class="app-container">
    <!-- First row: Upload and Filter side by side -->
    <div class="top-row">
      <div class="upload-section">
        <FileUploadModal 
          @file-uploaded="handleFileUpload" 
          :is-processing="isProcessing"
          :disabled="isAnimating"
        />
      </div>
      <div class="filter-section" v-if="flightVisualizations.length > 0">
        <YearFilter 
          :visualizations="flightVisualizations"
          @filter-changed="handleFilterChanged"
          :disabled="isAnimating"
        />
      </div>
      <div class="play-section" v-if="flightVisualizations.length > 0">
        <PlayControl 
          :is-playing="isAnimating"
          @toggle="handlePlayToggle"
        />
      </div>
    </div>

    <!-- Second row: Result banner with errors -->
    <ResultBanner 
      :parse-result="parseResult"
      :distinct-airports-count="distinctAirportsCount"
    />

    <!-- Third row: Map -->
    <MapView 
      ref="mapViewRef"
      :flight-visualizations="filteredVisualizations" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import FileUploadModal from './components/FileUploadModal.vue'
import MapView from './components/MapView.vue'
import YearFilter from './components/YearFilter.vue'
import ResultBanner from './components/ResultBanner.vue'
import PlayControl from './components/PlayControl.vue'
import { parseFlightsCsv } from './utils/flightDataParser'
import { loadAirportsWithReplacements } from './utils/airportsParser'
import { buildFlightVisualizations } from './utils/flightVisualizationBuilder'
import type { Flight } from './types/Flight'
import type { ParseResult } from './types/Flight'
import type { AirportsMap } from './types/Airport'
import type { FlightVisualizationData } from './types/FlightVisualization'

// Map of old airport codes to new codes (for airports that have changed their IATA codes)
type CodeReplacementMap = Map<string, string>

const isProcessing = ref(false)
const parseResult = ref<ParseResult | null>(null)
const flights = ref<Flight[]>([])
const flightVisualizations = ref<FlightVisualizationData[]>([])
const filteredVisualizations = ref<FlightVisualizationData[]>([])
const distinctAirportsCount = ref(0)
const airportsMap = ref<AirportsMap>(new Map())
const codeReplacements = ref<CodeReplacementMap>(new Map())
const isLoadingAirports = ref(true)
const isAnimating = ref(false)
const mapViewRef = ref<InstanceType<typeof MapView> | null>(null)

// Load airports and code replacements on mount
onMounted(async () => {
  console.log('Loading airports database and code replacements...')
  const { airportsMap: airports, replacements } = await loadAirportsWithReplacements()
  airportsMap.value = airports
  codeReplacements.value = replacements
  isLoadingAirports.value = false
  console.log(`Loaded ${airportsMap.value.size} airports with IATA codes`)
  console.log(`Loaded ${codeReplacements.value.size} airport code replacements`)
})

const handleFileUpload = async (file: File) => {
  isProcessing.value = true
  parseResult.value = null
  flights.value = []
  flightVisualizations.value = []

  try {
    // Parse CSV file
    const text = await file.text()
    const csvParseResult = parseFlightsCsv(text)
    
    // Build visualizations with airport data and code replacements
    const vizResult = buildFlightVisualizations(csvParseResult.flights, airportsMap.value, codeReplacements.value)
    
    // Combine all errors (CSV parsing + airport resolution)
    const allErrors = [...csvParseResult.errors, ...vizResult.errors]
    
    // Update state
    flights.value = csvParseResult.flights
    flightVisualizations.value = vizResult.visualizations
    distinctAirportsCount.value = vizResult.distinctAirports.size
    
    parseResult.value = {
      flights: csvParseResult.flights,
      errors: allErrors,
      totalRows: csvParseResult.totalRows,
      successfulRows: vizResult.visualizations.length, // Only count flights with resolved airports
      failedRows: csvParseResult.failedRows + (csvParseResult.flights.length - vizResult.visualizations.length)
    }

    // Initialize filtered visualizations with all data
    filteredVisualizations.value = vizResult.visualizations

    console.log('Parsed flights:', csvParseResult.flights.length)
    console.log('Visualizable flights:', vizResult.visualizations.length)
    console.log('Distinct airports:', vizResult.distinctAirports.size)
    console.log('Unresolved airports:', Array.from(vizResult.unresolvedAirports))
    console.log('All errors:', allErrors)
  } catch (error) {
    parseResult.value = {
      flights: [],
      errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0
    }
  } finally {
    isProcessing.value = false
  }
}

const handleFilterChanged = (filtered: FlightVisualizationData[]) => {
  filteredVisualizations.value = filtered
}

const handlePlayToggle = () => {
  if (isAnimating.value) {
    // Stop animation
    isAnimating.value = false
    if (mapViewRef.value) {
      mapViewRef.value.stopAnimation()
    }
  } else {
    // Start animation
    isAnimating.value = true
    if (mapViewRef.value) {
      mapViewRef.value.startAnimation().then(() => {
        // Animation completed
        isAnimating.value = false
      })
    }
  }
}
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.top-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  border-bottom: 1px solid #e2e8f0;
  background-color: #f9fafb;
  min-height: 80px;
}

.upload-section {
  flex: 1;
  min-width: 350px;
}

.filter-section {
  flex: 1;
  min-width: 350px;
}

.play-section {
  flex: 0 0 auto;
  min-width: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 700px) {
  .top-row {
    flex-direction: column;
  }
  
  .upload-section,
  .filter-section,
  .play-section {
    width: 100%;
    min-width: 150px;
  }
  
  .upload-section,
  .filter-section {
    min-width: 350px;
  }
}
</style>

