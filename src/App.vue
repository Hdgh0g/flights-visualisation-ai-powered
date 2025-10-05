<template>
  <div class="app-container">
    <FileUploadModal 
      @file-uploaded="handleFileUpload" 
      :is-processing="isProcessing"
    />
    <div v-if="parseResult" class="result-banner" :class="parseResult.errors.length > 0 ? 'has-errors' : 'success'">
      <div class="result-content">
        <div class="result-main">
          <span class="result-icon">{{ parseResult.errors.length > 0 ? '⚠️' : '✅' }}</span>
          <span class="result-text">
            Found <strong>{{ parseResult.successfulRows }}</strong> flights
            <span v-if="distinctAirportsCount > 0">
              from <strong>{{ distinctAirportsCount }}</strong> airports
            </span>
            <span v-if="parseResult.failedRows > 0"> 
              ({{ parseResult.failedRows }} rows failed)
            </span>
          </span>
        </div>
        <button v-if="parseResult.errors.length > 0" @click="showErrors = !showErrors" class="toggle-errors">
          {{ showErrors ? 'Hide' : 'Show' }} Errors ({{ parseResult.errors.length }})
        </button>
      </div>
      <div v-if="showErrors && parseResult.errors.length > 0" class="errors-list">
        <div v-for="(error, index) in parseResult.errors.slice(0, 10)" :key="index" class="error-item">
          {{ error }}
        </div>
        <div v-if="parseResult.errors.length > 10" class="error-item">
          ... and {{ parseResult.errors.length - 10 }} more errors
        </div>
      </div>
    </div>
    <YearFilter 
      v-if="flightVisualizations.length > 0"
      :visualizations="flightVisualizations"
      @filter-changed="handleFilterChanged"
    />
    <MapView :flight-visualizations="filteredVisualizations" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import FileUploadModal from './components/FileUploadModal.vue'
import MapView from './components/MapView.vue'
import YearFilter from './components/YearFilter.vue'
import { parseFlightsCsv } from './utils/flightDataParser'
import { loadAirports } from './utils/airportsParser'
import { buildFlightVisualizations } from './utils/flightVisualizationBuilder'
import type { Flight } from './types/Flight'
import type { ParseResult } from './types/Flight'
import type { AirportsMap } from './types/Airport'
import type { FlightVisualizationData } from './types/FlightVisualization'

const isProcessing = ref(false)
const parseResult = ref<ParseResult | null>(null)
const flights = ref<Flight[]>([])
const flightVisualizations = ref<FlightVisualizationData[]>([])
const filteredVisualizations = ref<FlightVisualizationData[]>([])
const distinctAirportsCount = ref(0)
const showErrors = ref(false)
const airportsMap = ref<AirportsMap>(new Map())
const isLoadingAirports = ref(true)

// Load airports on mount
onMounted(async () => {
  console.log('Loading airports database...')
  airportsMap.value = await loadAirports()
  isLoadingAirports.value = false
  console.log(`Loaded ${airportsMap.value.size} airports with IATA codes`)
})

const handleFileUpload = async (file: File) => {
  isProcessing.value = true
  parseResult.value = null
  flights.value = []
  flightVisualizations.value = []
  showErrors.value = false

  try {
    // Parse CSV file
    const text = await file.text()
    const csvParseResult = parseFlightsCsv(text)
    
    // Build visualizations with airport data
    const vizResult = buildFlightVisualizations(csvParseResult.flights, airportsMap.value)
    
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
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.result-banner {
  padding: 0.75rem 2rem;
  border-bottom: 1px solid #e2e8f0;
  animation: slideDown 0.3s ease-out;
}

.result-banner.success {
  background-color: #f0fdf4;
  border-left: 4px solid #22c55e;
}

.result-banner.has-errors {
  background-color: #fffbeb;
  border-left: 4px solid #f59e0b;
}

.result-content {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.result-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.result-icon {
  font-size: 1.25rem;
}

.result-text {
  font-size: 0.875rem;
  color: #1f2937;
}

.result-text strong {
  font-weight: 700;
  color: #111827;
}

.toggle-errors {
  padding: 0.5rem 1rem;
  background-color: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  transition: all 0.2s;
}

.toggle-errors:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
}

.errors-list {
  max-width: 1000px;
  margin: 0.75rem auto 0;
  padding: 0.75rem;
  background-color: white;
  border-radius: 6px;
  border: 1px solid #fbbf24;
  max-height: 150px;
  overflow-y: auto;
}

.error-item {
  padding: 0.375rem;
  font-size: 0.8rem;
  color: #92400e;
  border-bottom: 1px solid #fef3c7;
}

.error-item:last-child {
  border-bottom: none;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

