import React, { useState, useEffect } from 'react';
import { IoClose, IoMic, IoMicOff, IoTrash, IoEye, IoEyeOff } from 'react-icons/io5';
import './SettingsModal.css';
import volumeStorage from '../utils/volumeStorage';

const SettingsModal = ({ isOpen, onClose }) => {
    const [noiseSuppression, setNoiseSuppression] = useState(() => {
        const saved = localStorage.getItem('noiseSuppression');
        return saved ? JSON.parse(saved) : false;
    });
    const [volumeStats, setVolumeStats] = useState(null);
    const [isClearingVolumes, setIsClearingVolumes] = useState(false);
    const [showVolumeEntries, setShowVolumeEntries] = useState(false);

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

    const handleDeleteVolumeEntry = async (userId) => {
        if (window.confirm(`Удалить настройку громкости для пользователя ${userId}?`)) {
            try {
                await volumeStorage.deleteUserVolume(userId);
                await loadVolumeStats();
                console.log(`Volume entry deleted for user: ${userId}`);
            } catch (error) {
                console.error('Failed to delete volume entry:', error);
                alert('Ошибка при удалении записи');
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

                        <div className="settings-item">
                            <div className="settings-item-info">
                                <div className="settings-item-header">
                                    {showVolumeEntries ? <IoEyeOff className="settings-icon" /> : <IoEye className="settings-icon" />}
                                    <span>Просмотр записей громкости</span>
                                </div>
                                <p className="settings-description">
                                    {showVolumeEntries ? 'Скрыть список сохраненных настроек громкости' : 'Показать список сохраненных настроек громкости'}
                                </p>
                            </div>
                            <button 
                                className="settings-toggle-btn"
                                onClick={() => setShowVolumeEntries(!showVolumeEntries)}
                            >
                                {showVolumeEntries ? 'Скрыть' : 'Показать'}
                            </button>
                        </div>

                        {showVolumeEntries && volumeStats && volumeStats.entries && (
                            <div className="volume-entries-container">
                                <h4>Сохраненные настройки громкости</h4>
                                {volumeStats.entries.length === 0 ? (
                                    <p className="no-entries">Нет сохраненных настроек громкости</p>
                                ) : (
                                    <div className="volume-entries-list">
                                        {volumeStats.entries.map((entry, index) => (
                                            <div key={index} className="volume-entry-item">
                                                <div className="entry-info">
                                                    <span className="entry-user-id">Пользователь: {entry.userId}</span>
                                                    <span className="entry-volume">Громкость: {entry.volume}%</span>
                                                    <span className="entry-date">{entry.dateString}</span>
                                                </div>
                                                <button 
                                                    className="entry-delete-btn"
                                                    onClick={() => handleDeleteVolumeEntry(entry.userId)}
                                                    title="Удалить запись"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal; 