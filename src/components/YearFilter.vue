<template>
  <div class="year-filter">
    <div class="filter-content">
      <div class="filter-controls">
        <label class="filter-label">Year:</label>
        <select v-model="selectedYear" @change="onYearChange" class="year-select">
          <option value="">All years</option>
          <option v-for="year in availableYears" :key="year" :value="year">
            {{ year }}
          </option>
        </select>
      </div>
      <div class="filter-stats">
        <span v-if="selectedYear">
          <strong>{{ filteredFlightsCount }}</strong> flights, 
          <strong>{{ filteredAirportsCount }}</strong> airports
        </span>
        <span v-else>
          <strong>{{ totalFlights }}</strong> flights, 
          <strong>{{ totalAirports }}</strong> airports (all years)
        </span>
      </div>
      <div class="histogram-container">
        <div class="histogram-title">{{ selectedYear ? 'Flights by month' : 'Flights by year' }}</div>
        <div class="histogram-wrapper">
          <div class="histogram-bars">
            <div 
              v-for="(bar, index) in histogramData" 
              :key="index"
              class="histogram-bar"
              :style="{ height: `${bar.height}%` }"
              :title="`${bar.label}: ${bar.count} flight${bar.count !== 1 ? 's' : ''}`"
            >
            </div>
          </div>
          <div class="histogram-labels">
            <span 
              v-for="(bar, index) in histogramData" 
              :key="index"
              class="histogram-label"
            >
              {{ bar.label }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FlightVisualizationData } from '../types/FlightVisualization'

const props = defineProps<{
  visualizations: FlightVisualizationData[]
}>()

const emit = defineEmits<{
  filterChanged: [filteredVisualizations: FlightVisualizationData[]]
}>()

const selectedYear = ref('')

// Extract unique years from visualizations
const availableYears = computed(() => {
  const years = new Set<number>()
  props.visualizations.forEach(viz => {
    const year = viz.departureTimestamp.getFullYear()
    years.add(year)
  })
  return Array.from(years).sort((a, b) => b - a) // Sort descending (newest first)
})

// Filter visualizations by selected year
const filteredVisualizations = computed(() => {
  if (!selectedYear.value) {
    return props.visualizations
  }
  
  const year = parseInt(selectedYear.value)
  return props.visualizations.filter(viz => {
    return viz.departureTimestamp.getFullYear() === year
  })
})

// Statistics for filtered data
const filteredFlightsCount = computed(() => filteredVisualizations.value.length)

const filteredAirportsCount = computed(() => {
  const airports = new Set<string>()
  filteredVisualizations.value.forEach(viz => {
    airports.add(viz.fromAirport.iataCode)
    airports.add(viz.toAirport.iataCode)
  })
  return airports.size
})

const totalFlights = computed(() => props.visualizations.length)

const totalAirports = computed(() => {
  const airports = new Set<string>()
  props.visualizations.forEach(viz => {
    airports.add(viz.fromAirport.iataCode)
    airports.add(viz.toAirport.iataCode)
  })
  return airports.size
})

// Histogram data
const histogramData = computed(() => {
  if (selectedYear.value) {
    // Show months for selected year
    const monthCounts = new Array(12).fill(0)
    const year = parseInt(selectedYear.value)
    
    props.visualizations.forEach(viz => {
      if (viz.departureTimestamp.getFullYear() === year) {
        const month = viz.departureTimestamp.getMonth()
        monthCounts[month]++
      }
    })
    
    const maxCount = Math.max(...monthCounts, 1)
    const monthNames = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
    
    return monthCounts.map((count, index) => ({
      label: monthNames[index],
      count,
      height: (count / maxCount) * 100
    }))
  } else {
    // Show years
    const yearCounts = new Map<number, number>()
    
    props.visualizations.forEach(viz => {
      const year = viz.departureTimestamp.getFullYear()
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
    })
    
    const sortedYears = Array.from(yearCounts.keys()).sort((a, b) => a - b)
    const maxCount = Math.max(...Array.from(yearCounts.values()), 1)
    
    return sortedYears.map(year => ({
      label: year.toString().slice(-2), // Last 2 digits
      count: yearCounts.get(year) || 0,
      height: ((yearCounts.get(year) || 0) / maxCount) * 100
    }))
  }
})

function onYearChange() {
  emit('filterChanged', filteredVisualizations.value)
}

// Emit initial data
watch(() => props.visualizations, () => {
  if (!selectedYear.value) {
    emit('filterChanged', props.visualizations)
  } else {
    emit('filterChanged', filteredVisualizations.value)
  }
}, { immediate: true })

// Reset filter when visualizations change
watch(() => props.visualizations, () => {
  selectedYear.value = ''
})
</script>

<style scoped>
.year-filter {
  background: #f8f9fa;
  border-bottom: 1px solid #e2e8f0;
  padding: 0.75rem 2rem;
  height: 100%;
  display: flex;
  align-items: center;
}

.filter-content {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #4b5563;
}

.year-select {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background-color: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
}

.year-select:hover {
  border-color: #667eea;
}

.year-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filter-stats {
  font-size: 0.875rem;
  color: #6b7280;
}

.filter-stats strong {
  color: #111827;
  font-weight: 600;
}

.histogram-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.histogram-title {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
  text-align: center;
}

.histogram-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  padding: 8px;
}

.histogram-bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 40px;
}

.histogram-bar {
  flex: 1;
  min-width: 8px;
  max-width: 20px;
  background: linear-gradient(to top, #667eea, #764ba2);
  border-radius: 2px 2px 0 0;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 2px;
}

.histogram-bar:hover {
  background: linear-gradient(to top, #764ba2, #667eea);
  transform: scaleY(1.05);
}

.histogram-labels {
  display: flex;
  gap: 3px;
  justify-content: space-between;
}

.histogram-label {
  flex: 1;
  min-width: 8px;
  max-width: 20px;
  font-size: 9px;
  color: #6b7280;
  text-align: center;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .filter-content {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .histogram-wrapper {
    width: 100%;
    margin-top: 0.5rem;
  }
}
</style>
