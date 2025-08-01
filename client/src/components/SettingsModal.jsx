import React, { useState, useEffect } from 'react';
import { IoClose, IoMic, IoMicOff, IoTrash } from 'react-icons/io5';
import './SettingsModal.css';
import volumeStorage from '../utils/volumeStorage';

const SettingsModal = ({ isOpen, onClose }) => {
    const [noiseSuppression, setNoiseSuppression] = useState(() => {
        const saved = localStorage.getItem('noiseSuppression');
        return saved ? JSON.parse(saved) : false;
    });
    const [volumeStats, setVolumeStats] = useState(null);
    const [isClearingVolumes, setIsClearingVolumes] = useState(false);

    useEffect(() => {
        // Сохраняем настройку в localStorage при изменении
        localStorage.setItem('noiseSuppression', JSON.stringify(noiseSuppression));
        
        // Отправляем событие для обновления шумоподавления в голосовом чате
        window.dispatchEvent(new CustomEvent('noiseSuppressionChanged', {
            detail: { enabled: noiseSuppression }
        }));
    }, [noiseSuppression]);

    const handleNoiseSuppressionToggle = () => {
        setNoiseSuppression(!noiseSuppression);
    };

    const loadVolumeStats = async () => {
        try {
            const stats = await volumeStorage.getVolumeStats();
            setVolumeStats(stats);
        } catch (error) {
            console.error('Failed to load volume stats:', error);
        }
    };

    const handleClearVolumes = async () => {
        if (window.confirm('Вы уверены, что хотите очистить все сохраненные настройки громкости? Это действие нельзя отменить.')) {
            setIsClearingVolumes(true);
            try {
                await volumeStorage.clearAllVolumes();
                await loadVolumeStats();
                alert('Все настройки громкости очищены');
            } catch (error) {
                console.error('Failed to clear volumes:', error);
                alert('Ошибка при очистке настроек громкости');
            } finally {
                setIsClearingVolumes(false);
            }
        }
    };

    // Загружаем статистику при открытии модального окна
    useEffect(() => {
        if (isOpen) {
            loadVolumeStats();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="settings-modal-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="settings-modal-header">
                    <h2>Настройки</h2>
                    <button className="settings-close-btn" onClick={onClose}>
                        <IoClose />
                    </button>
                </div>
                
                <div className="settings-modal-content">
                    <div className="settings-section">
                        <h3>Голосовой чат</h3>
                        
                        <div className="settings-item">
                            <div className="settings-item-info">
                                <div className="settings-item-header">
                                    <IoMic className="settings-icon" />
                                    <span>Шумоподавление</span>
                                </div>
                                <p className="settings-description">
                                    Включите для автоматического подавления фонового шума в голосовом чате
                                </p>
                            </div>
                            <label className="settings-toggle">
                                <input
                                    type="checkbox"
                                    checked={noiseSuppression}
                                    onChange={handleNoiseSuppressionToggle}
                                />
                                <span className="settings-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    
                    <div className="settings-section">
                        <h3>Настройки громкости</h3>
                        
                        <div className="settings-item">
                            <div className="settings-item-info">
                                <div className="settings-item-header">
                                    <IoTrash className="settings-icon" />
                                    <span>Очистить настройки громкости</span>
                                </div>
                                <p className="settings-description">
                                    Удаляет все сохраненные настройки громкости для пользователей
                                    {volumeStats && (
                                        <span className="volume-stats">
                                            <br />
                                            Сохранено настроек: {volumeStats.totalUsers}
                                            {volumeStats.oldestEntry && (
                                                <>
                                                    <br />
                                                    Самая старая запись: {volumeStats.oldestEntry.toLocaleDateString()}
                                                </>
                                            )}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <button 
                                className="settings-clear-btn"
                                onClick={handleClearVolumes}
                                disabled={isClearingVolumes}
                            >
                                {isClearingVolumes ? 'Очистка...' : 'Очистить'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal; 