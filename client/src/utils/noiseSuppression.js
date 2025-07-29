import {
  loadSpeex,
  SpeexWorkletNode,
  loadRnnoise,
  RnnoiseWorkletNode,
  NoiseGateWorkletNode
} from '@sapphi-red/web-noise-suppressor';
import speexWorkletPath from '@sapphi-red/web-noise-suppressor/speexWorklet.js?url';
import noiseGateWorkletPath from '@sapphi-red/web-noise-suppressor/noiseGateWorklet.js?url';
import rnnoiseWorkletPath from '@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url';
import speexWasmPath from '@sapphi-red/web-noise-suppressor/speex.wasm?url';
import rnnoiseWasmPath from '@sapphi-red/web-noise-suppressor/rnnoise.wasm?url';
import rnnoiseWasmSimdPath from '@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url';

export class NoiseSuppressionManager {
  constructor() {
    this.audioContext = null;
    this.sourceNode = null;
    this.destinationNode = null;
    this.gainNode = null;
    this.rnnWorkletNode = null;
    this.speexWorkletNode = null;
    this.noiseGateNode = null;
    this.currentMode = null;
    this.producer = null;
    this.originalStream = null;
    this.processedStream = null;
    this._isInitialized = false;
    this.wasmBinaries = {
      speex: null,
      rnnoise: null
    };
  }

  async initialize(stream) {
    try {
      // Cleanup any existing resources first
      this.cleanup();

      if (!stream) {
        console.error('No stream provided');
        return false;
      }

      this.originalStream = stream;
      
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 48000,
        latencyHint: 'interactive'
      });

      this.processedStream = new MediaStream();

      console.log('Loading WASM binaries...');
      const [speexWasmBinary, rnnoiseWasmBinary] = await Promise.all([
        loadSpeex({ url: speexWasmPath }),
        loadRnnoise({
          url: rnnoiseWasmPath,
          simdUrl: rnnoiseWasmSimdPath
        })
      ]);

      this.wasmBinaries.speex = speexWasmBinary;
      this.wasmBinaries.rnnoise = rnnoiseWasmBinary;

      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      this.destinationNode = this.audioContext.createMediaStreamDestination();
      
      // Add track to processed stream
      const destinationTrack = this.destinationNode.stream.getAudioTracks()[0];
      if (destinationTrack) {
        this.processedStream.addTrack(destinationTrack);
      } else {
        throw new Error('No audio track in destination node');
      }

      console.log('Loading worklet modules...');
      await Promise.all([
        this.audioContext.audioWorklet.addModule(rnnoiseWorkletPath),
        this.audioContext.audioWorklet.addModule(speexWorkletPath),
        this.audioContext.audioWorklet.addModule(noiseGateWorkletPath)
      ]);

      this.rnnWorkletNode = new RnnoiseWorkletNode(this.audioContext, {
        wasmBinary: this.wasmBinaries.rnnoise,
        maxChannels: 1, // Изменено с 2 на 1 для моно
        vadOffset: 0.15, // Уменьшено с 0.25 для менее агрессивного VAD
        gainOffset: -15, // Уменьшено с -25 для лучшего качества
        enableVAD: true
      });

      this.speexWorkletNode = new SpeexWorkletNode(this.audioContext, {
        wasmBinary: this.wasmBinaries.speex,
        maxChannels: 1, // Изменено с 2 на 1 для моно
        denoise: true,
        aggressiveness: 10, // Уменьшено с 15 для менее агрессивной обработки
        vadOffset: 1.0, // Уменьшено с 1.5
        enableVAD: true,
        gainOffset: -10 // Уменьшено с -15 для лучшего качества
      });

      this.noiseGateNode = new NoiseGateWorkletNode(this.audioContext, {
        openThreshold: -60, // Уменьшено с -65 для менее агрессивного гейта
        closeThreshold: -65, // Уменьшено с -70
        holdMs: 100, // Уменьшено с 150 для более быстрой реакции
        maxChannels: 1 // Изменено с 2 на 1 для моно
      });

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.5; // Увеличено с 0.3 для лучшей слышимости

      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.destinationNode);

      this._isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize noise suppression:', error);
      this.cleanup();
      return false;
    }
  }

  isInitialized() {
    return this._isInitialized;
  }

  getProcessedStream() {
    return this.processedStream;
  }

  async enable(mode = 'rnnoise') {
    try {
      if (!this._isInitialized) {
        console.error('Not initialized');
        return false;
      }

      // Disconnect existing connections
      this.sourceNode.disconnect();
      this.gainNode.disconnect();

      let processingNode;
      switch (mode) {
        case 'rnnoise':
          processingNode = this.rnnWorkletNode;
          break;
        case 'speex':
          processingNode = this.speexWorkletNode;
          break;
        case 'noisegate':
          processingNode = this.noiseGateNode;
          break;
        case 'combined':
          this.sourceNode.connect(this.noiseGateNode);
          this.noiseGateNode.connect(this.rnnWorkletNode);
          this.rnnWorkletNode.connect(this.gainNode);
          this.gainNode.connect(this.destinationNode);
          this.currentMode = mode;
          return true;
        default:
          throw new Error('Invalid noise suppression mode');
      }

      // Сначала усиливаем, потом применяем шумоподавление
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(processingNode);
      processingNode.connect(this.destinationNode);

      this.currentMode = mode;

      if (this.producer) {
        try {
          const newTrack = this.processedStream.getAudioTracks()[0];
          if (newTrack) {
            await this.producer.replaceTrack({ track: newTrack });
          }
        } catch (error) {
          console.error('Error replacing producer track:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error enabling noise suppression:', error);
      return false;
    }
  }

  async disable() {
    try {
      if (!this._isInitialized) {
        console.error('Not initialized');
        return false;
      }

      // Disconnect all nodes
      this.sourceNode.disconnect();
      if (this.currentMode) {
        switch (this.currentMode) {
          case 'rnnoise':
            this.rnnWorkletNode?.disconnect();
            break;
          case 'speex':
            this.speexWorkletNode?.disconnect();
            break;
          case 'noisegate':
            this.noiseGateNode?.disconnect();
            break;
          case 'combined':
            this.noiseGateNode?.disconnect();
            this.rnnWorkletNode?.disconnect();
            break;
        }
      }
      this.gainNode.disconnect();

      // Connect source directly to destination
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.destinationNode);

      this.currentMode = null;

      if (this.producer) {
        try {
          const newTrack = this.destinationNode.stream.getAudioTracks()[0];
          if (newTrack) {
            await this.producer.replaceTrack({ track: newTrack });
          }
        } catch (error) {
          console.error('Error replacing producer track:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error disabling noise suppression:', error);
      return false;
    }
  }

  setProducer(producer) {
    this.producer = producer;
  }

  cleanup() {
    try {
      // Disable noise suppression first
      if (this.currentMode) {
        this.disable();
      }

      // Disconnect all nodes
      this.sourceNode?.disconnect();
      this.gainNode?.disconnect();
      this.rnnWorkletNode?.disconnect();
      this.speexWorkletNode?.disconnect();
      this.noiseGateNode?.disconnect();

      // Destroy worklet nodes
      this.rnnWorkletNode?.destroy?.();
      this.speexWorkletNode?.destroy?.();

      // Stop all tracks in the original stream
      if (this.originalStream) {
        this.originalStream.getTracks().forEach(track => {
          track.stop();
        });
      }

      // Stop all tracks in the processed stream
      if (this.processedStream) {
        this.processedStream.getTracks().forEach(track => {
          track.stop();
        });
      }

      // Close audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
      }

      // Reset all properties
      this.audioContext = null;
      this.sourceNode = null;
      this.destinationNode = null;
      this.gainNode = null;
      this.rnnWorkletNode = null;
      this.speexWorkletNode = null;
      this.noiseGateNode = null;
      this.currentMode = null;
      this.producer = null;
      this.originalStream = null;
      this.processedStream = null;
      this._isInitialized = false;
      this.wasmBinaries = {
        speex: null,
        rnnoise: null
      };
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
} 