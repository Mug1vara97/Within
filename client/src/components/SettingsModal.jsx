import React, { useState, useEffect } from 'react';
import { IoClose, IoMic, IoMicOff } from 'react-icons/io5';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose }) => {
    const [noiseSuppression, setNoiseSuppression] = useState(() => {
        const saved = localStorage.getItem('noiseSuppression');
        return saved ? JSON.parse(saved) : false;
    });

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
                </div>
            </div>
        </div>
    );
};

export default SettingsModal; 