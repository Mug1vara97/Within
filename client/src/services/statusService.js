import { BASE_URL } from '../config/apiConfig';

class StatusService {
    // Получить статус пользователя
    async getUserStatus(userId) {
        try {
            const response = await fetch(`${BASE_URL}/api/status/${userId}`);
            if (response.ok) {
                return await response.json();
            }
            throw new Error('Ошибка при получении статуса');
        } catch (error) {
            console.error('Error fetching user status:', error);
            return { status: 'offline', lastSeen: null };
        }
    }

    // Обновить статус пользователя
    async updateUserStatus(userId, status) {
        try {
            const response = await fetch(`${BASE_URL}/api/status/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status })
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error('Ошибка при обновлении статуса');
        } catch (error) {
            console.error('Error updating user status:', error);
            throw error;
        }
    }

    // Получить статусы пользователей в сервере
    async getServerUserStatuses(serverId) {
        try {
            const response = await fetch(`${BASE_URL}/api/status/server/${serverId}`);
            if (response.ok) {
                return await response.json();
            }
            throw new Error('Ошибка при получении статусов сервера');
        } catch (error) {
            console.error('Error fetching server user statuses:', error);
            return [];
        }
    }

    // Получить статусы пользователей в чате
    async getChatUserStatuses(chatId) {
        try {
            const response = await fetch(`${BASE_URL}/api/status/chat/${chatId}`);
            if (response.ok) {
                const data = await response.json();
                console.log(`Status service: received statuses for chat ${chatId}:`, data);
                return data;
            }
            throw new Error('Ошибка при получении статусов чата');
        } catch (error) {
            console.error('Error fetching chat user statuses:', error);
            return [];
        }
    }

    // Обновить активность пользователя
    async updateUserActivity(userId) {
        try {
            const response = await fetch(`${BASE_URL}/api/status/${userId}/activity`, {
                method: 'POST'
            });
            
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error updating user activity:', error);
        }
    }
}

export default new StatusService(); 