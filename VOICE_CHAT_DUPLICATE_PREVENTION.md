# Предотвращение дублирования пользователей в голосовых чатах

## Описание проблемы
Проблема дублирования пользователей в голосовых чатах возникает когда:
- Пользователь обновляет страницу во время голосового вызова
- Происходит временная потеря соединения с последующим автоматическим переподключением
- Пользователь быстро переключается между голосовыми каналами
- Происходят race conditions при множественных подключениях

## Реализованные решения

### 1. Серверная сторона (server/src/server.js)

#### Проверка на существующие соединения при join
```javascript
// Проверяем если пир уже подключен
const existingPeer = peers.get(socket.id);
if (existingPeer) {
    console.log(`Peer ${socket.id} is already connected. Cleaning up old connection.`);
    // Очищаем существующее соединение
}

// Проверяем дубликаты по имени пользователя
const duplicatePeer = Array.from(room.getPeers().values())
    .find(p => p.name === name && p.id !== socket.id);
if (duplicatePeer) {
    // Удаляем дубликат
}
```

#### Улучшенная обработка отключений
```javascript
// Обработка события disconnecting (до отключения)
socket.on('disconnecting', () => {
    // Уведомляем других пользователей о выходе
    // Закрываем всех producers
});

// Обработка события disconnect (после отключения)
socket.on('disconnect', (reason) => {
    // Полная очистка ресурсов
});
```

### 2. Модель комнаты (server/src/Room.js)

#### Защита от дублирования в addPeer
```javascript
addPeer(peer) {
    // Проверяем существующего пира с тем же ID
    if (this.peers.has(peer.id)) {
        const existingPeer = this.peers.get(peer.id);
        if (existingPeer && existingPeer !== peer) {
            existingPeer.close();
        }
    }

    // Проверяем пиров с тем же именем
    const duplicateNamePeer = Array.from(this.peers.values())
        .find(p => p.name === peer.name && p.id !== peer.id);
    if (duplicateNamePeer) {
        this.removePeer(duplicateNamePeer.id);
        if (duplicateNamePeer.socket && duplicateNamePeer.socket.connected) {
            duplicateNamePeer.socket.disconnect(true);
        }
    }
}
```

### 3. Клиентская сторона

#### Утилиты предотвращения дублирования (client/src/utils/voiceChatUtils.js)
- `generateConnectionId()` - генерирует уникальный идентификатор соединения
- `canJoinVoiceChat(roomData)` - проверяет возможность подключения
- `isDuplicateConnection()` - определяет дублированные соединения
- `cleanupExpiredConnections()` - очищает устаревшие данные
- `debounce()` - предотвращает множественные вызовы

#### Улучшенный контекст голосового чата (client/src/contexts/VoiceChatContext.jsx)
```javascript
const joinVoiceRoom = useCallback((roomData) => {
    // Проверка на существующее подключение
    if (voiceRoom && 
        voiceRoom.roomId === roomData.roomId && 
        voiceRoom.userName === roomData.userName &&
        voiceRoom.userId === roomData.userId &&
        isVoiceChatActive) {
        console.log('Already connected to this room with same user');
        return;
    }

    // Обработка переключения между комнатами
    if (isVoiceChatActive) {
        setIsVoiceChatActive(false);
        setTimeout(() => {
            setVoiceRoom(roomData);
            setIsVoiceChatActive(true);
        }, 100);
        return;
    }
});
```

#### Защищенная функция подключения (client/src/VoiceChat.jsx)
```javascript
const handleJoin = debounce(async () => {
    // Проверка валидности данных
    const { canJoin, reason } = canJoinVoiceChat(roomData);
    if (!canJoin) {
        console.log('Cannot join voice chat:', reason);
        return;
    }

    // Генерация уникального ID соединения
    const connectionId = generateConnectionId();
    saveConnectionId(connectionId);

    // Защита от повторных подключений
    if (connectionAttemptRef.current || isJoined || socketRef.current) {
        return;
    }
}, 500);
```

## Использование

### 1. Автоматическая защита
Все описанные механизмы работают автоматически и не требуют дополнительной настройки.

### 2. Ручное управление
```javascript
import { canJoinVoiceChat, cleanupExpiredConnections } from './utils/voiceChatUtils';

// Проверка возможности подключения
const { canJoin, reason } = canJoinVoiceChat({
    roomId: 'room123',
    userName: 'user',
    userId: 'user123',
    serverId: 'server456'
});

if (!canJoin) {
    console.log('Cannot join:', reason);
}

// Очистка устаревших соединений
cleanupExpiredConnections();
```

### 3. Отладка
Для отладки добавлены подробные логи:
- Попытки подключения: `logConnectionAttempt(roomData, 'join')`
- Обнаружение дубликатов: `'Removing duplicate peer...'`
- Состояние соединений: `'Connection attempt already in progress'`

## Конфигурация

### Таймауты
```javascript
// В voiceChatUtils.js
const isConnectionExpired = (timestamp, timeoutMs = 30000) => {
    return Date.now() - timestamp > timeoutMs;
};
```

### Debounce задержка
```javascript
// В VoiceChat.jsx
const handleJoin = debounce(async () => {
    // ...
}, 500); // 500ms задержка
```

## Мониторинг

### Проверка состояния
1. localStorage хранит данные о соединениях
2. Console logs показывают все этапы подключения
3. Серверные логи отображают обработку дубликатов

### Ключевые индикаторы
- `voiceRoomState` в localStorage - данные текущей комнаты
- `voiceChatActive` в localStorage - статус активности
- `voiceConnectionId` в localStorage - уникальный ID соединения

## Решение проблем

### Если дублирование все еще происходит:
1. Проверьте логи в консоли браузера
2. Убедитесь что localStorage не блокируется
3. Проверьте серверные логи на наличие ошибок
4. Увеличьте debounce задержку при необходимости

### Очистка вручную:
```javascript
// Очистка localStorage
localStorage.removeItem('voiceRoomState');
localStorage.removeItem('voiceChatActive');
localStorage.removeItem('voiceConnectionId');
```

Эта система обеспечивает надежную защиту от дублирования пользователей в голосовых чатах на всех уровнях приложения.
