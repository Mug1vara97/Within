import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { BASE_URL } from '../config/apiConfig';
import './audit-log-modal.css';

const AuditLogModal = ({ isOpen, onClose, serverId, connection }) => {
    const [auditLogs, setAuditLogs] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const pageSize = 50; // Размер страницы

    useEffect(() => {
        if (isOpen && connection) {
            loadAuditLogs();
            
            connection.on("AuditLogLoaded", (logs) => {
                setAuditLogs(prev => {
                    // Создаем Set из ID уже существующих логов
                    const existingIds = new Set(prev.map(log => log.auditLogId));
                    // Фильтруем новые логи, исключая дубликаты
                    const uniqueLogs = logs.filter(log => !existingIds.has(log.auditLogId));
                    return [...prev, ...uniqueLogs];
                });
                setHasMore(logs.length === pageSize);
                setLoading(false);
            });

            connection.on("AuditLogEntryAdded", (newLog) => {
                setAuditLogs(prev => {
                    // Проверяем, нет ли уже такой записи
                    if (prev.some(log => log.auditLogId === newLog.auditLogId)) {
                        return prev;
                    }
                    return [newLog, ...prev];
                });
            });

            return () => {
                connection.off("AuditLogLoaded");
                connection.off("AuditLogEntryAdded");
            };
        }
    }, [isOpen, connection, page]);

    const loadAuditLogs = async () => {
        setLoading(true);
        try {
            await connection.invoke("GetAuditLog", parseInt(serverId, 10), page, pageSize);
        } catch (error) {
            console.error('Error loading audit logs:', error);
            setLoading(false);
        }
    };

    const loadMore = () => {
        setPage(prev => prev + 1);
    };

    const formatDate = (date) => {
        return format(new Date(date), 'dd MMMM yyyy, HH:mm', { locale: ru });
    };

    if (!isOpen) return null;

    return (
        <div className="server-settings-members-section">
            <div className="audit-log-content">
                {auditLogs.map(log => (
                    <div key={log.auditLogId} className="audit-log-entry">
                        <div className="audit-log-details">
                            <div className="audit-log-user">
                                <div 
                                    className="server-settings-member-avatar" 
                                    style={{ backgroundColor: log.user.avatarColor || '#5865F2' }}
                                >
                                    {log.user.avatar && (
                                        <img 
                                            src={`${BASE_URL}${log.user.avatar}`}
                                            alt={log.user.username}
                                            className="server-settings-avatar-image"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.parentElement.querySelector('.server-settings-avatar-fallback').style.display = 'flex';
                                            }}
                                        />
                                    )}
                                    <div 
                                        className="server-settings-avatar-fallback"
                                        style={{ 
                                            display: log.user.avatar ? 'none' : 'flex',
                                            backgroundColor: log.user.avatarColor || '#5865F2'
                                        }}
                                    >
                                        {log.user.username[0].toUpperCase()}
                                    </div>
                                </div>
                                <span className="username">{log.user.username}</span>
                            </div>
                            <div className="audit-log-action">{log.details}</div>
                            <div className="audit-log-timestamp">{formatDate(log.timestamp)}</div>
                        </div>
                    </div>
                ))}
                {loading && <div className="loading">Загрузка...</div>}
                {hasMore && !loading && (
                    <button className="load-more-button" onClick={loadMore}>
                        Загрузить еще
                    </button>
                )}
            </div>
        </div>
    );
};

export default AuditLogModal; 