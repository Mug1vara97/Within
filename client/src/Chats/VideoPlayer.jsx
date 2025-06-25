import React, { useRef, useState, useEffect } from "react";
import "../videoplayer.css";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

const VideoPlayer = ({ src }) => {
    const videoRef = useRef(null);
    const playerRef = useRef(null);
    const progressBarRef = useRef(null);
    const volumeSliderRef = useRef(null); // Добавляем ref для ползунка звука
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Устанавливаем начальное значение --fill-percent при монтировании
    useEffect(() => {
        if (volumeSliderRef.current) {
            const fillPercent = (volume * 100) + '%';
            volumeSliderRef.current.style.setProperty('--fill-percent', fillPercent);
        }
    }, [volume]);

    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    };

    const togglePlayPause = () => {
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            const progressPercent = (videoRef.current.currentTime / duration) * 100;
            progressBarRef.current.style.width = `${progressPercent}%`;
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const videoDuration = videoRef.current.duration;
            setDuration(videoDuration);
        }
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        videoRef.current.volume = newVolume;
        setVolume(newVolume);

        // Обновляем значение --fill-percent
        const fillPercent = (newVolume * 100) + '%';
        e.target.style.setProperty('--fill-percent', fillPercent);
    };

    const toggleMute = () => {
        videoRef.current.muted = !videoRef.current.muted;
        setIsMuted(videoRef.current.muted);
    };

    const handleSeek = (e) => {
        const timelineWidth = e.currentTarget.clientWidth;
        const seekTime = (e.nativeEvent.offsetX / timelineWidth) * duration;
        videoRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    const toggleFullscreen = () => {
        if (!isFullscreen) {
            if (playerRef.current.requestFullscreen) {
                playerRef.current.requestFullscreen();
            } else if (playerRef.current.mozRequestFullScreen) { // Firefox
                playerRef.current.mozRequestFullScreen();
            } else if (playerRef.current.webkitRequestFullscreen) { // Chrome, Safari and Opera
                playerRef.current.webkitRequestFullscreen();
            } else if (playerRef.current.msRequestFullscreen) { // IE/Edge
                playerRef.current.msRequestFullscreen();
            }
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) { // Firefox
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { // IE/Edge
                document.msExitFullscreen();
            }
            setIsFullscreen(false);
        }
    };

    return (
        <div className="video-player" ref={playerRef}>
            <video
                ref={videoRef}
                src={src}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                style={{ width: "100%" }}
            >
                Ваш браузер не поддерживает видео.
            </video>

            <div className="video-controls-overlay">
                {/* Прогресс-бар */}
                <div className="video-timeline" onClick={handleSeek}>
                    <div className="progress-area">
                        <div className="progress-bar" ref={progressBarRef}></div>
                    </div>
                </div>

                {/* Элементы управления */}
                <div className="video-controls">
                    {/* Левая группа: кнопки воспроизведения, громкости */}
                    <div className="controls-left">
                        <button onClick={togglePlayPause} className="control-button">
                            {isPlaying ? (
                                <PauseIcon sx={{ width: 24, height: 24, color: '#fff' }} />
                            ) : (
                                <PlayArrowIcon sx={{ width: 24, height: 24, color: '#fff' }} />
                            )}
                        </button>
                        <button onClick={toggleMute} className="control-button">
                            {isMuted ? (
                                <VolumeOffIcon sx={{ width: 24, height: 24, color: '#fff' }} />
                            ) : (
                                <VolumeUpIcon sx={{ width: 24, height: 24, color: '#fff' }} />
                            )}
                        </button>
                        <input
                            ref={volumeSliderRef} // Добавляем ref для ползунка звука
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={handleVolumeChange}
                            style={{ width: "80px" }}
                        />
                    </div>

                    {/* Правая группа: таймер и полноэкранный режим */}
                    <div className="controls-right">
                        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                        <button onClick={toggleFullscreen} className="control-button">
                            {isFullscreen ? (
                                <FullscreenExitIcon sx={{ width: 24, height: 24, color: '#fff' }} />
                            ) : (
                                <FullscreenIcon sx={{ width: 24, height: 24, color: '#fff' }} />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;