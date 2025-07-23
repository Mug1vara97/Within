import { BASE_URL } from '../config/apiConfig';

const API_BASE_URL = BASE_URL;

export const notificationService = {
    // Получить уведомления пользователя
    async getNotifications(userId, page = 1, pageSize = 20) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/notification?userId=${userId}&page=${page}&pageSize=${pageSize}`);
            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    },

    // Получить количество непрочитанных уведомлений
    async getUnreadCount(userId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/notification/unread-count?userId=${userId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch unread count');
            }
            const data = await response.json();
            return data.unreadCount;
        } catch (error) {
            console.error('Error fetching unread count:', error);
            return 0;
        }
    },

    // Отметить уведомление как прочитанное
    async markAsRead(notificationId, userId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/notification/${notificationId}/read?userId=${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('Failed to mark notification as read');
            }
            return await response.json();
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    },

    // Отметить все уведомления чата как прочитанные
    async markChatAsRead(chatId, userId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/notification/chat/${chatId}/read?userId=${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('Failed to mark chat notifications as read');
            }
            return await response.json();
        } catch (error) {
            console.error('Error marking chat notifications as read:', error);
            throw error;
        }
    },

    // Удалить уведомление
    async deleteNotification(notificationId, userId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/notification/${notificationId}?userId=${userId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error('Failed to delete notification');
            }
            return await response.json();
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }
}; 