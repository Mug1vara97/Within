import React, { useState, useEffect } from 'react';
import { IoClose, IoMic, IoMicOff, IoTrash, IoEye, IoEyeOff, IoKeypad } from 'react-icons/io5';
import './SettingsModal.css';
import volumeStorage from '../utils/volumeStorage';
import hotkeyStorage from '../utils/hotkeyStorage';

const SettingsModal = ({ isOpen, onClose }) => {
    const [noiseSuppression, setNoiseSuppression] = useState(() => {
        const saved = localStorage.getItem('noiseSuppression');
        return saved ? JSON.parse(saved) : false;
    });
    const [volumeStats, setVolumeStats] = useState(null);
    const [isClearingVolumes, setIsClearingVolumes] = useState(false);
    const [showVolumeEntries, setShowVolumeEntries] = useState(false);
    
    // Состояние для горячих клавиш
    const [hotkeys, setHotkeys] = useState(() => hotkeyStorage.getHotkeys());
    const [editingHotkey, setEditingHotkey] = useState(null);
    const [tempKey, setTempKey] = useState('');

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

    // Функции для работы с горячими клавишами
    const handleHotkeyEdit = (action) => {
        setEditingHotkey(action);
        setTempKey(hotkeys[action] || '');
    };

    const handleHotkeyCancel = () => {
        setEditingHotkey(null);
        setTempKey('');
    };

    const handleHotkeySave = (action) => {
        if (tempKey) {
            // Проверяем, не используется ли уже эта клавиша
            const usedBy = hotkeyStorage.isKeyUsed(tempKey, action);
            if (usedBy) {
                alert(`Клавиша "${tempKey}" уже используется для: ${getActionName(usedBy)}`);
                return;
            }
        }

        const newHotkeys = { ...hotkeys, [action]: tempKey };
        setHotkeys(newHotkeys);
        hotkeyStorage.saveHotkeys(newHotkeys);
        setEditingHotkey(null);
        setTempKey('');
    };

    const handleHotkeyKeyDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Игнорируем только модификаторы
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
            return;
        }
        
        const keyString = hotkeyStorage.parseKeyEvent(e);
        setTempKey(keyString);
    };

    const handleHotkeyReset = () => {
        if (window.confirm('Сбросить все горячие клавиши к значениям по умолчанию?')) {
            hotkeyStorage.resetToDefaults();
            setHotkeys(hotkeyStorage.getHotkeys());
        }
    };

    const getActionName = (action) => {
        const actionNames = {
            toggleMic: 'Переключить микрофон',
            toggleAudio: 'Переключить наушники'
        };
        return actionNames[action] || action;
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

                    <div className="settings-section">
                        <h3>Горячие клавиши</h3>
                        
                        <div className="settings-item">
                            <div className="settings-item-info">
                                <div className="settings-item-header">
                                    <IoKeypad className="settings-icon" />
                                    <span>Переключить микрофон</span>
                                </div>
                                <p className="settings-description">
                                    Горячая клавиша для включения/выключения микрофона
                                </p>
                            </div>
                            {editingHotkey === 'toggleMic' ? (
                                <div className="hotkey-edit-container">
                                    <input
                                        type="text"
                                        className="hotkey-input"
                                        value={hotkeyStorage.formatKey(tempKey)}
                                        onKeyDown={handleHotkeyKeyDown}
                                        placeholder="Нажмите клавишу..."
                                        autoFocus
                                        readOnly
                                    />
                                    <button 
                                        className="hotkey-save-btn"
                                        onClick={() => handleHotkeySave('toggleMic')}
                                    >
                                        ✓
                                    </button>
                                    <button 
                                        className="hotkey-cancel-btn"
                                        onClick={handleHotkeyCancel}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <div className="hotkey-display-container">
                                    <span className="hotkey-display">
                                        {hotkeyStorage.formatKey(hotkeys.toggleMic)}
                                    </span>
                                    <button 
                                        className="hotkey-edit-btn"
                                        onClick={() => handleHotkeyEdit('toggleMic')}
                                    >
                                        Изменить
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="settings-item">
                            <div className="settings-item-info">
                                <div className="settings-item-header">
                                    <IoKeypad className="settings-icon" />
                                    <span>Переключить наушники</span>
                                </div>
                                <p className="settings-description">
                                    Горячая клавиша для включения/выключения звука в наушниках
                                </p>
                            </div>
                            {editingHotkey === 'toggleAudio' ? (
                                <div className="hotkey-edit-container">
                                    <input
                                        type="text"
                                        className="hotkey-input"
                                        value={hotkeyStorage.formatKey(tempKey)}
                                        onKeyDown={handleHotkeyKeyDown}
                                        placeholder="Нажмите клавишу..."
                                        autoFocus
                                        readOnly
                                    />
                                    <button 
                                        className="hotkey-save-btn"
                                        onClick={() => handleHotkeySave('toggleAudio')}
                                    >
                                        ✓
                                    </button>
                                    <button 
                                        className="hotkey-cancel-btn"
                                        onClick={handleHotkeyCancel}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <div className="hotkey-display-container">
                                    <span className="hotkey-display">
                                        {hotkeyStorage.formatKey(hotkeys.toggleAudio)}
                                    </span>
                                    <button 
                                        className="hotkey-edit-btn"
                                        onClick={() => handleHotkeyEdit('toggleAudio')}
                                    >
                                        Изменить
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="settings-item">
                            <div className="settings-item-info">
                                <div className="settings-item-header">
                                    <IoTrash className="settings-icon" />
                                    <span>Сбросить горячие клавиши</span>
                                </div>
                                <p className="settings-description">
                                    Вернуть все горячие клавиши к значениям по умолчанию
                                </p>
                            </div>
                            <button 
                                className="settings-clear-btn"
                                onClick={handleHotkeyReset}
                            >
                                Сбросить
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal; 