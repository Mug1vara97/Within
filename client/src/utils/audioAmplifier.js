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
        gainNode.gain.setValueAtTime(gainPerStage, this.audioContext.currentTime);
      });
    }
  }

  // Подключение цепочки аудио узлов
  connectChain(sourceNode, destinationNode) {
    let currentNode = sourceNode;
    
    // Подключаем компрессор если есть
    if (this.compressor) {
      currentNode.connect(this.compressor);
      currentNode = this.compressor;
    }
    
    // Подключаем каскадные gain nodes
    this.gainNodes.forEach((gainNode) => {
      currentNode.connect(gainNode);
      currentNode = gainNode;
    });
    
    // Подключаем лимитер если есть
    if (this.limiter) {
      currentNode.connect(this.limiter);
      currentNode = this.limiter;
    }
    
    // Подключаем к назначению
    currentNode.connect(destinationNode);
  }

  // Создание полной цепочки усиления
  createAmplificationChain(sourceNode, destinationNode, volumePercent = 100) {
    // Создаем компрессор
    this.createCompressor();
    
    // Создаем каскадные gain nodes
    this.createCascadedGain(10.0, 4);
    
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
      gainNode.disconnect();
    });
    
    if (this.compressor) {
      this.compressor.disconnect();
    }
    
    if (this.limiter) {
      this.limiter.disconnect();
    }
    
    this.gainNodes = [];
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
    gainNode.gain.setValueAtTime(gainPerStage, gainNode.context.currentTime);
  });
}; 