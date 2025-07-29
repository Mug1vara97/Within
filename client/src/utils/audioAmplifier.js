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
    this.useToneJS = true; // Флаг для использования Tone.js
  }

  async initialize(audioContext) {
    if (this.isInitialized) {
      return;
    }

    try {
      // Проверяем, что Tone доступен
      if (!Tone || !Tone.Gain) {
        console.warn('Tone.js not available, falling back to Web Audio API');
        this.useToneJS = false;
        this.initializeWebAudioAPI(audioContext);
        return;
      }

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
      console.error('Failed to initialize AudioAmplifier with Tone.js, falling back to Web Audio API:', error);
      this.useToneJS = false;
      this.initializeWebAudioAPI(audioContext);
    }
  }

  // Fallback на Web Audio API
  initializeWebAudioAPI(audioContext) {
    try {
      // Создаем простой gain node
      this.amplifier = audioContext.createGain();
      this.amplifier.gain.value = this.gainValue;

      // Создаем выходной узел
      this.output = audioContext.createMediaStreamDestination();

      // Подключаем amplifier к output
      this.amplifier.connect(this.output);

      this.isInitialized = true;
      console.log('AudioAmplifier initialized with Web Audio API (fallback)');
    } catch (error) {
      console.error('Failed to initialize AudioAmplifier with Web Audio API:', error);
      throw error;
    }
  }

  async processStream(inputStream) {
    if (!this.isInitialized) {
      throw new Error('AudioAmplifier not initialized');
    }

    try {
      // Создаем MediaStreamSource из входного потока
      const source = this.useToneJS 
        ? Tone.context.createMediaStreamSource(inputStream)
        : this.amplifier.context.createMediaStreamSource(inputStream);
      
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

    this.gainValue = gainValue;

    if (this.useToneJS) {
      // Преобразуем линейное значение в децибелы для Tone.js
      const dbValue = Math.log10(Math.max(0.001, gainValue)) * 20;
      this.amplifier.gain.value = Math.max(-60, dbValue);
      console.log(`AudioAmplifier (Tone.js) gain set to ${gainValue} (${dbValue.toFixed(2)}dB)`);
    } else {
      // Используем линейное значение для Web Audio API
      this.amplifier.gain.value = gainValue;
      console.log(`AudioAmplifier (Web Audio API) gain set to ${gainValue}`);
    }
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    if (this.amplifier) {
      if (enabled) {
        if (this.useToneJS) {
          const dbValue = Math.log10(Math.max(0.001, this.gainValue)) * 20;
          this.amplifier.gain.value = Math.max(-60, dbValue);
        } else {
          this.amplifier.gain.value = this.gainValue;
        }
      } else {
        if (this.useToneJS) {
          this.amplifier.gain.value = -60; // Полное отключение
        } else {
          this.amplifier.gain.value = 0; // Полное отключение
        }
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
    if (!this.amplifier) {
      return null;
    }

    const stats = {
      gain: this.gainValue,
      isEnabled: this.isEnabled,
      useToneJS: this.useToneJS
    };

    if (this.useToneJS && this.compressor && this.limiter) {
      stats.gainDb = Math.log10(Math.max(0.001, this.gainValue)) * 20;
      stats.compressorReduction = this.compressor.reduction;
      stats.limiterReduction = this.limiter.reduction;
    } else {
      stats.currentGain = this.amplifier.gain.value;
    }

    return stats;
  }

  // Очистка ресурсов
  dispose() {
    if (this.amplifier) {
      this.amplifier.disconnect();
      this.amplifier = null;
    }
    
    if (this.useToneJS) {
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
    } else {
      if (this.output) {
        this.output.disconnect();
        this.output = null;
      }
    }
    
    this.isInitialized = false;
    console.log('AudioAmplifier disposed');
  }
}

export default AudioAmplifier;