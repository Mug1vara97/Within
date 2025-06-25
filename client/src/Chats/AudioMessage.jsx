import React, { useRef, useEffect, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { useAudio } from '../contexts/AudioContext';

const AudioMessage = ({ src }) => {
    const waveformRef = useRef(null); // Ref для контейнера waveform
    const wavesurferRef = useRef(null); // Ref для экземпляра WaveSurfer
    const [isPlaying, setIsPlaying] = useState(false); // Состояние воспроизведения
    const [duration, setDuration] = useState(0); // Длительность аудио
    const [currentTime, setCurrentTime] = useState(0); // Текущее время воспроизведения
    const [error, setError] = useState(null); // Состояние для ошибок
    const { setCurrentAudio } = useAudio();

    // Проверка доступности аудиофайла
    useEffect(() => {
        const checkAudioFile = async () => {
            try {
                const response = await fetch(src, { method: 'HEAD' });
                if (!response.ok) {
                    throw new Error('Аудиофайл недоступен');
                }
            } catch (err) {
                setError('Ошибка при загрузке аудио');
                console.error('Ошибка при проверке аудиофайла:', err);
            }
        };

        checkAudioFile();
    }, [src]);

    // Инициализация WaveSurfer
    useEffect(() => {
        let isMounted = true;

        if (!waveformRef.current || error) return;

        // Создаем экземпляр WaveSurfer
        wavesurferRef.current = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: '#4a90e2',
            progressColor: '#2c3e50',
            cursorColor: '#000',
            barWidth: 2,
            barHeight: 0.7,
            responsive: true,
            height: 40,
            cursorWidth: 0,
            minPxPerSec: 1,
        });

        // Загружаем аудио
        wavesurferRef.current.load(src);

        // Обработчики событий
        wavesurferRef.current.on('ready', () => {
            if (isMounted) {
                setDuration(wavesurferRef.current.getDuration());
            }
        });

        wavesurferRef.current.on('audioprocess', () => {
            if (isMounted) {
                setCurrentTime(wavesurferRef.current.getCurrentTime());
            }
        });

        wavesurferRef.current.on('finish', () => {
            if (isMounted) {
                setIsPlaying(false);
            }
        });

        // Обработка ошибок
        wavesurferRef.current.on('error', (err) => {
            if (isMounted) {
                setError('Ошибка при загрузке аудио');
                console.error('WaveSurfer error:', err);
            }
        });

        // Очистка при размонтировании
        return () => {
            isMounted = false;
            if (wavesurferRef.current) {
                // Останавливаем воспроизведение перед уничтожением
                wavesurferRef.current.stop();
                // Уничтожаем экземпляр WaveSurfer
                wavesurferRef.current.destroy();
                wavesurferRef.current = null;
            }
        };
    }, [src, error]);

    // Управление воспроизведением
    const togglePlay = () => {
        if (wavesurferRef.current) {
            if (!isPlaying) {
                setCurrentAudio(wavesurferRef.current);
            }
            wavesurferRef.current.playPause();
            setIsPlaying(!isPlaying);
        }
    };

    // Форматирование времени в минуты и секунды
    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div className="audio-message">
            {error ? (
                <div className="error-message">{error}</div>
            ) : (
                <>
                    <button onClick={togglePlay} className="play-pause-button">
                        {isPlaying ? (
                            <PauseIcon sx={{ width: 24, height: 24, color: '#4a90e2' }} />
                        ) : (
                            <PlayArrowIcon sx={{ width: 24, height: 24, color: '#4a90e2' }} />
                        )}
                    </button>
                    <div ref={waveformRef} className="waveform-container" style={{ width: '200px', height: '40px' }} />
                    <span className="duration">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                </>
            )}
        </div>
    );
};

export default AudioMessage;