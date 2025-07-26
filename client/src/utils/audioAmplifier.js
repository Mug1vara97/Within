export class AudioAmplifier {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.gainNodes = [];
    this.compressor = null;
    this.limiter = null;
    this._isInitialized = false;
  }

  // Создание каскадного усиления с несколькими gain nodes
  createCascadedGain(totalGain = 10.0, stages = 4) {
    this.gainNodes = [];
    const gainPerStage = Math.pow(totalGain, 1 / stages);
    
    for (let i = 0; i < stages; i++) {
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = gainPerStage;
      this.gainNodes.push(gainNode);
    }
    
    return this.gainNodes;
  }

  // Создание компрессора для предотвращения клиппинга
  createCompressor() {
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    return this.compressor;
  }

  // Создание лимитера для предотвращения искажений
  createLimiter() {
    this.limiter = this.audioContext.createDynamicsCompressor();
    this.limiter.threshold.value = -1;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.1;
    return this.limiter;
  }

  // Применение усиления с защитой от клиппинга
  applyAmplification(volumePercent, maxGain = 10.0) {
    const gainValue = (volumePercent / 100.0) * maxGain;
    
    if (this.gainNodes.length > 0) {
      // Каскадное усиление
      const gainPerStage = Math.pow(gainValue, 1 / this.gainNodes.length);
      this.gainNodes.forEach(gainNode => {
        if (gainNode && gainNode.gain && typeof gainNode.gain.setValueAtTime === 'function') {
          gainNode.gain.setValueAtTime(gainPerStage, this.audioContext.currentTime);
        }
      });
    }
  }

  // Подключение цепочки аудио узлов
  connectChain(sourceNode, destinationNode) {
    let currentNode = sourceNode;
    
    // Подключаем фильтр высоких частот если есть (первым)
    if (this.highPassFilter && typeof this.highPassFilter.connect === 'function') {
      currentNode.connect(this.highPassFilter);
      currentNode = this.highPassFilter;
    }
    
    // Подключаем фильтр низких частот если есть
    if (this.lowPassFilter && typeof this.lowPassFilter.connect === 'function') {
      currentNode.connect(this.lowPassFilter);
      currentNode = this.lowPassFilter;
    }
    
    // Подключаем компрессор если есть
    if (this.compressor && typeof this.compressor.connect === 'function') {
      currentNode.connect(this.compressor);
      currentNode = this.compressor;
    }
    
    // Подключаем каскадные gain nodes
    this.gainNodes.forEach((gainNode) => {
      if (gainNode && typeof gainNode.connect === 'function') {
        currentNode.connect(gainNode);
        currentNode = gainNode;
      }
    });
    
    // Подключаем лимитер если есть
    if (this.limiter && typeof this.limiter.connect === 'function') {
      currentNode.connect(this.limiter);
      currentNode = this.limiter;
    }
    
    // Подключаем к назначению
    if (destinationNode && typeof destinationNode.connect === 'function') {
      currentNode.connect(destinationNode);
    }
  }

  // Создание полной цепочки усиления
  createAmplificationChain(sourceNode, destinationNode, volumePercent = 100) {
    // Создаем фильтр низких частот для устранения шипения
    this.lowPassFilter = this.audioContext.createBiquadFilter();
    this.lowPassFilter.type = 'lowpass';
    this.lowPassFilter.frequency.value = 6000; // Ограничиваем частоты выше 6кГц для устранения шипения
    this.lowPassFilter.Q.value = 0.7; // Более мягкий фильтр
    
    // Создаем фильтр высоких частот для устранения низкочастотного шума
    this.highPassFilter = this.audioContext.createBiquadFilter();
    this.highPassFilter.type = 'highpass';
    this.highPassFilter.frequency.value = 80; // Отсекаем частоты ниже 80Гц
    this.highPassFilter.Q.value = 0.7;
    
    // Создаем компрессор
    this.createCompressor();
    
    // Создаем каскадные gain nodes с меньшим усилением
    this.createCascadedGain(4.0, 3); // Уменьшаем максимальное усиление с 10.0 до 4.0
    
    // Создаем лимитер
    this.createLimiter();
    
    // Подключаем цепочку
    this.connectChain(sourceNode, destinationNode);
    
    // Применяем усиление
    this.applyAmplification(volumePercent);
    
    this._isInitialized = true;
  }

  // Очистка ресурсов
  cleanup() {
    this.gainNodes.forEach(gainNode => {
      if (gainNode && typeof gainNode.disconnect === 'function') {
        gainNode.disconnect();
      }
    });
    
    if (this.highPassFilter && typeof this.highPassFilter.disconnect === 'function') {
      this.highPassFilter.disconnect();
    }
    
    if (this.lowPassFilter && typeof this.lowPassFilter.disconnect === 'function') {
      this.lowPassFilter.disconnect();
    }
    
    if (this.compressor && typeof this.compressor.disconnect === 'function') {
      this.compressor.disconnect();
    }
    
    if (this.limiter && typeof this.limiter.disconnect === 'function') {
      this.limiter.disconnect();
    }
    
    this.gainNodes = [];
    this.highPassFilter = null;
    this.lowPassFilter = null;
    this.compressor = null;
    this.limiter = null;
    this._isInitialized = false;
  }

  isInitialized() {
    return this._isInitialized;
  }
}

// Утилитарные функции для работы с усилением
export const createHighGainChain = (audioContext, sourceNode, destinationNode, volumePercent = 100) => {
  const amplifier = new AudioAmplifier(audioContext);
  amplifier.createAmplificationChain(sourceNode, destinationNode, volumePercent);
  return amplifier;
};

export const applyVolumeWithProtection = (gainNodes, volumePercent, maxGain = 10.0) => {
  const gainValue = (volumePercent / 100.0) * maxGain;
  const gainPerStage = Math.pow(gainValue, 1 / gainNodes.length);
  
  gainNodes.forEach(gainNode => {
    if (gainNode && gainNode.gain && typeof gainNode.gain.setValueAtTime === 'function') {
      gainNode.gain.setValueAtTime(gainPerStage, gainNode.context.currentTime);
    }
  });
}; 