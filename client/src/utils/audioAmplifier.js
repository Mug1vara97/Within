import * as Tone from 'tone';

class AudioAmplifier {
  constructor() {
    this.isInitialized = false;
    this.amplifier = null;
    this.compressor = null;
    this.limiter = null;
    this.input = null;
    this.output = null;
    this.gainValue = 1.0;
    this.isEnabled = true;
  }

  async initialize(audioContext) {
    if (this.isInitialized) {
      return;
    }

    try {
      // Инициализируем Tone.js с существующим AudioContext
      await Tone.setContext(audioContext);
      
      // Создаем качественный усилитель с компрессором для предотвращения искажений
      this.amplifier = new Tone.Gain({
        gain: 0, // Начинаем с 0dB
        units: 'decibels'
      });

      // Добавляем компрессор для предотвращения клиппинга
      this.compressor = new Tone.Compressor({
        threshold: -24,
        ratio: 4,
        attack: 0.003,
        release: 0.25
      });

      // Добавляем лимитер для предотвращения искажений
      this.limiter = new Tone.Limiter({
        threshold: -1
      });

      // Создаем выходной узел
      this.output = new Tone.MediaStreamDestination();

      // Подключаем цепочку: amplifier -> compressor -> limiter -> output
      this.amplifier.connect(this.compressor);
      this.compressor.connect(this.limiter);
      this.limiter.connect(this.output);

      this.isInitialized = true;
      console.log('AudioAmplifier initialized with Tone.js');
    } catch (error) {
      console.error('Failed to initialize AudioAmplifier:', error);
      throw error;
    }
  }

  async processStream(inputStream) {
    if (!this.isInitialized) {
      throw new Error('AudioAmplifier not initialized');
    }

    try {
      // Создаем MediaStreamSource из входного потока
      const source = Tone.context.createMediaStreamSource(inputStream);
      
      // Подключаем источник к нашему усилителю
      source.connect(this.amplifier);
      
      // Возвращаем обработанный поток
      return this.output.stream;
    } catch (error) {
      console.error('Error processing stream with AudioAmplifier:', error);
      throw error;
    }
  }

  setGain(gainValue) {
    if (!this.amplifier) {
      return;
    }

    // Преобразуем линейное значение в децибелы
    // gainValue от 0 до 4 (как было в Web Audio API)
    const dbValue = Math.log10(Math.max(0.001, gainValue)) * 20;
    
    this.gainValue = gainValue;
    this.amplifier.gain.value = Math.max(-60, dbValue); // Минимум -60dB
    
    console.log(`AudioAmplifier gain set to ${gainValue} (${dbValue.toFixed(2)}dB)`);
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    if (this.amplifier) {
      if (enabled) {
        const dbValue = Math.log10(Math.max(0.001, this.gainValue)) * 20;
        this.amplifier.gain.value = Math.max(-60, dbValue);
      } else {
        this.amplifier.gain.value = -60; // Полное отключение
      }
    }
  }

  getGain() {
    return this.gainValue;
  }

  isEnabled() {
    return this.isEnabled;
  }

  // Метод для получения статистики обработки
  getStats() {
    if (!this.compressor || !this.limiter) {
      return null;
    }

    return {
      gain: this.gainValue,
      gainDb: Math.log10(Math.max(0.001, this.gainValue)) * 20,
      compressorReduction: this.compressor.reduction,
      limiterReduction: this.limiter.reduction,
      isEnabled: this.isEnabled
    };
  }

  // Очистка ресурсов
  dispose() {
    if (this.amplifier) {
      this.amplifier.dispose();
      this.amplifier = null;
    }
    
    if (this.compressor) {
      this.compressor.dispose();
      this.compressor = null;
    }
    
    if (this.limiter) {
      this.limiter.dispose();
      this.limiter = null;
    }
    
    if (this.input) {
      this.input.dispose();
      this.input = null;
    }
    
    if (this.output) {
      this.output.dispose();
      this.output = null;
    }
    
    this.isInitialized = false;
    console.log('AudioAmplifier disposed');
  }
}

export default AudioAmplifier;