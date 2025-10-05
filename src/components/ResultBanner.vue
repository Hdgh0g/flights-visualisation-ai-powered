<template>
  <div v-if="parseResult && !isClosed" class="result-banner" :class="parseResult.errors.length > 0 ? 'has-errors' : 'success'">
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
      <div class="button-group">
        <button v-if="parseResult.errors.length > 0" @click="toggleErrors" class="toggle-errors">
          {{ showErrors ? 'Hide' : 'Show' }} Errors ({{ parseResult.errors.length }})
        </button>
        <button @click="closeBanner" class="close-button" title="Close">
          ✕
        </button>
      </div>
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
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ParseResult } from '../types/Flight'

const props = defineProps<{
  parseResult: ParseResult | null
  distinctAirportsCount: number
}>()

const showErrors = ref(false)
const isClosed = ref(false)

const toggleErrors = () => {
  showErrors.value = !showErrors.value
}

const closeBanner = () => {
  isClosed.value = true
  showErrors.value = false
}

// Reset when new parse result comes in
watch(() => props.parseResult, () => {
  isClosed.value = false
  showErrors.value = false
})
</script>

<style scoped>
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
  max-width: 1400px;
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

.button-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

.close-button {
  padding: 0.25rem 0.5rem;
  background-color: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  color: #9ca3af;
  transition: all 0.2s;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  color: #374151;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.errors-list {
  max-width: 1400px;
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
