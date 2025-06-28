/**
 * Утилиты для работы с голосовыми чатами и предотвращения дублирования пользователей
 */

// Ключи для localStorage
const VOICE_ROOM_KEY = 'voiceRoomState';
const VOICE_CHAT_ACTIVE_KEY = 'voiceChatActive';
const VOICE_CONNECTION_ID_KEY = 'voiceConnectionId';

/**
 * Генерирует уникальный идентификатор соединения
 * @returns {string} Уникальный идентификатор
 */
export const generateConnectionId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Сохраняет идентификатор соединения в localStorage
 * @param {string} connectionId - Идентификатор соединения
 */
export const saveConnectionId = (connectionId) => {
  try {
    localStorage.setItem(VOICE_CONNECTION_ID_KEY, connectionId);
  } catch (error) {
    console.error('Error saving connection ID:', error);
  }
};

/**
 * Получает идентификатор соединения из localStorage
 * @returns {string|null} Идентификатор соединения или null
 */
export const getConnectionId = () => {
  try {
    return localStorage.getItem(VOICE_CONNECTION_ID_KEY);
  } catch (error) {
    console.error('Error getting connection ID:', error);
    return null;
  }
};

/**
 * Очищает идентификатор соединения из localStorage
 */
export const clearConnectionId = () => {
  try {
    localStorage.removeItem(VOICE_CONNECTION_ID_KEY);
  } catch (error) {
    console.error('Error clearing connection ID:', error);
  }
};

/**
 * Проверяет, является ли текущее соединение дублированным
 * @param {string} roomId - ID комнаты
 * @param {string} userName - Имя пользователя
 * @param {string} userId - ID пользователя
 * @returns {boolean} true если соединение дублированное
 */
export const isDuplicateConnection = (roomId, userName, userId) => {
  try {
    const savedRoom = localStorage.getItem(VOICE_ROOM_KEY);
    const isActive = localStorage.getItem(VOICE_CHAT_ACTIVE_KEY);
    
    if (!savedRoom || !isActive) {
      return false;
    }
    
    const roomData = JSON.parse(savedRoom);
    const activeState = JSON.parse(isActive);
    
    return (
      activeState === true &&
      roomData.roomId === roomId &&
      roomData.userName === userName &&
      roomData.userId === userId
    );
  } catch (error) {
    console.error('Error checking duplicate connection:', error);
    return false;
  }
};

/**
 * Валидирует данные комнаты голосового чата
 * @param {Object} roomData - Данные комнаты
 * @returns {boolean} true если данные валидные
 */
export const validateRoomData = (roomData) => {
  if (!roomData || typeof roomData !== 'object') {
    return false;
  }
  
  const requiredFields = ['roomId', 'userName', 'userId'];
  return requiredFields.every(field => 
    roomData[field] && typeof roomData[field] === 'string' && roomData[field].trim() !== ''
  );
};

/**
 * Создает уникальный ключ для соединения
 * @param {string} roomId - ID комнаты
 * @param {string} userName - Имя пользователя
 * @param {string} userId - ID пользователя
 * @param {string} serverId - ID сервера (опционально)
 * @returns {string} Уникальный ключ соединения
 */
export const createConnectionKey = (roomId, userName, userId, serverId = null) => {
  const baseKey = `${roomId}:${userName}:${userId}`;
  return serverId ? `${baseKey}:${serverId}` : baseKey;
};

/**
 * Проверяет, истекло ли время соединения
 * @param {number} timestamp - Временная метка соединения
 * @param {number} timeoutMs - Таймаут в миллисекундах (по умолчанию 30 секунд)
 * @returns {boolean} true если соединение истекло
 */
export const isConnectionExpired = (timestamp, timeoutMs = 30000) => {
  return Date.now() - timestamp > timeoutMs;
};

/**
 * Очищает устаревшие данные соединений
 */
export const cleanupExpiredConnections = () => {
  try {
    const connectionId = getConnectionId();
    if (connectionId) {
      const [timestamp] = connectionId.split('-');
      if (isConnectionExpired(parseInt(timestamp, 10))) {
        clearConnectionId();
        localStorage.removeItem(VOICE_ROOM_KEY);
        localStorage.removeItem(VOICE_CHAT_ACTIVE_KEY);
        console.log('Cleaned up expired voice chat connection');
      }
    }
  } catch (error) {
    console.error('Error cleaning up expired connections:', error);
  }
};

/**
 * Дебаунс функция для предотвращения множественных вызовов
 * @param {Function} func - Функция для дебаунса
 * @param {number} delay - Задержка в миллисекундах
 * @returns {Function} Функция с дебаунсом
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

/**
 * Проверяет, может ли пользователь подключиться к голосовому чату
 * @param {Object} roomData - Данные комнаты
 * @returns {Object} Результат проверки с флагом canJoin и причиной
 */
export const canJoinVoiceChat = (roomData) => {
  // Проверяем валидность данных
  if (!validateRoomData(roomData)) {
    return {
      canJoin: false,
      reason: 'Invalid room data provided'
    };
  }
  
  // Проверяем на дублированное соединение
  if (isDuplicateConnection(roomData.roomId, roomData.userName, roomData.userId)) {
    return {
      canJoin: false,
      reason: 'Already connected to this room'
    };
  }
  
  // Очищаем устаревшие соединения
  cleanupExpiredConnections();
  
  return {
    canJoin: true,
    reason: 'Connection allowed'
  };
};

/**
 * Логирует информацию о попытке подключения для отладки
 * @param {Object} roomData - Данные комнаты
 * @param {string} action - Действие (join/leave/switch)
 */
export const logConnectionAttempt = (roomData, action) => {
  console.log(`Voice Chat ${action}:`, {
    roomId: roomData?.roomId,
    userName: roomData?.userName,
    userId: roomData?.userId,
    serverId: roomData?.serverId,
    timestamp: new Date().toISOString(),
    connectionId: getConnectionId()
  });
};
