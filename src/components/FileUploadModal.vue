<template>
  <div class="upload-section">
    <div class="upload-container">
      <h1 class="title">Flight Data Visualisation</h1>
      <div class="upload-area">
        <label for="file-input" class="upload-label" :class="{ disabled: isProcessing || disabled }">
          <div class="upload-content">
            <div v-if="isProcessing" class="processing-spinner">
              <div class="spinner"></div>
            </div>
            <svg 
              v-else
              class="upload-icon" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                stroke-linecap="round" 
                stroke-linejoin="round" 
                stroke-width="2" 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p class="upload-text">
              <span v-if="isProcessing" class="processing-text">Processing file...</span>
              <template v-else>
                <span class="upload-button-text">Click to upload</span>
                or drag and drop
                <span class="upload-hint">CSV files only</span>
              </template>
            </p>
          </div>
          <input 
            id="file-input"
            type="file" 
            accept=".csv"
            @change="handleFileChange"
            class="file-input"
            :disabled="isProcessing || disabled"
          />
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isProcessing?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  fileUploaded: [file: File]
}>()

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file) {
    emit('fileUploaded', file)
  }
}
</script>

<style scoped>
.upload-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0.75rem 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: 100%;
  display: flex;
  align-items: center;
}

.upload-container {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.title {
  color: white;
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  white-space: nowrap;
  text-align: center;
}

.upload-area {
  background: white;
  border-radius: 8px;
  padding: 0.4rem;
  flex: 1;
  min-width: 280px;
}

.upload-label {
  display: block;
  cursor: pointer;
}

.upload-content {
  border: 2px dashed #cbd5e0;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  text-align: center;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.upload-content:hover {
  border-color: #667eea;
  background-color: #f7fafc;
}

.upload-icon {
  width: 20px;
  height: 20px;
  color: #667eea;
  flex-shrink: 0;
}

.upload-text {
  font-size: 0.8125rem;
  color: #4a5568;
  margin: 0;
}

.upload-button-text {
  color: #667eea;
  font-weight: 600;
}

.upload-hint {
  font-size: 0.75rem;
  color: #a0aec0;
}

.file-input {
  display: none;
}

.upload-label.disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.upload-label.disabled .upload-content {
  pointer-events: none;
}

.processing-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.processing-text {
  color: #667eea;
  font-weight: 600;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

