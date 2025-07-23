import React from 'react';
import { useNotifications } from '../hooks/useNotifications';
import './NotificationPanel.css';

const NotificationPanel = ({ isOpen, onClose }) => {
    const { 
        notifications, 
        unreadCount, 
        isLoading, 
        hasMore, 
        loadMore, 
        markAsRead, 
        deleteNotification 
    } = useNotifications();

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 1) {
            const diffInMinutes = Math.floor((now - date) / (1000 * 60));
            return `${diffInMinutes} мин назад`;
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)} ч назад`;
        } else {
            return date.toLocaleDateString('ru-RU');
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.isRead) {
            markAsRead(notification.notificationId);
        }
    };

    const handleDelete = (notificationId, e) => {
        e.stopPropagation();
        deleteNotification(notificationId);
    };

    const handleLoadMore = () => {
        if (hasMore && !isLoading) {
            loadMore();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="notification-panel-overlay" onClick={onClose}>
            <div className="notification-panel" onClick={(e) => e.stopPropagation()}>
                <div className="notification-header">
                    <h3>Уведомления</h3>
                    {unreadCount > 0 && (
                        <span className="unread-badge">{unreadCount}</span>
                    )}
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="notification-list">
                    {notifications.length === 0 ? (
                        <div className="no-notifications">
                            <p>Нет уведомлений</p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <div 
                                key={notification.notificationId}
                                className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="notification-content">
                                    <div className="notification-header-row">
                                        <span className="notification-type">
                                            {notification.type === 'direct_message' ? '💬' : 
                                             notification.type === 'group_message' ? '👥' : '🔔'}
                                        </span>
                                        <span className="notification-time">
                                            {formatTime(notification.createdAt)}
                                        </span>
                                        <button 
                                            className="delete-notification"
                                            onClick={(e) => handleDelete(notification.notificationId, e)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <p className="notification-text">{notification.content}</p>
                                    {notification.chatName && (
                                        <span className="chat-name">{notification.chatName}</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    
                    {isLoading && (
                        <div className="loading-notifications">
                            <p>Загрузка...</p>
                        </div>
                    )}
                    
                    {hasMore && !isLoading && (
                        <button className="load-more-button" onClick={handleLoadMore}>
                            Загрузить еще
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationPanel; 