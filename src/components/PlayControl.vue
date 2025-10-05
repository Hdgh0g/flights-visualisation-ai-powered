<template>
  <div class="play-control">
    <button 
      @click="handleClick" 
      class="control-button"
      :class="{ playing: isPlaying }"
    >
      <svg v-if="!isPlaying" class="icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
      <svg v-else class="icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
      </svg>
      <span class="button-text">{{ isPlaying ? 'Stop' : 'Play' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isPlaying: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()

const handleClick = () => {
  emit('toggle')
}
</script>

<style scoped>
.play-control {
  background: #f8f9fa;
  border-bottom: 1px solid #e2e8f0;
  padding: 0.75rem 1rem;
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

.control-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
}

.control-button:active {
  transform: translateY(0);
}

.control-button.playing {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
}

.control-button.playing:hover {
  box-shadow: 0 4px 8px rgba(239, 68, 68, 0.4);
}

.icon {
  width: 16px;
  height: 16px;
}

.button-text {
  white-space: nowrap;
}
</style>
