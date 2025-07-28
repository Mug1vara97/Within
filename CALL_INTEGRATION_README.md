# Интеграция звонков в чаты 1 на 1

## Обзор

Данная интеграция добавляет функциональность звонков в чаты 1 на 1, используя существующий компонент `VoiceChat.jsx`. Система поддерживает как аудио, так и видео звонки.

## Компоненты

### 1. CallButton (`client/src/components/CallButton.jsx`)
Кнопка для инициации звонка в заголовке чата.

**Функции:**
- Отображение состояния звонка (активный, входящий, неактивный)
- Анимации для входящих звонков
- Интеграция с системой управления звонками

### 2. Интегрированный VoiceChat
VoiceChat компонент интегрирован в чат через React Portal.

**Функции:**
- Локальное состояние звонка в GroupChat
- Интеграция в чат через Portal (не поверх всего приложения)
- Управление звонком (мут, громкость, завершение)
- Использование существующей инфраструктуры VoiceChat
- Автоматическое отображение в нужном чате

### 3. React Portal
Используется для рендера VoiceChat в правильном контейнере.

**Функции:**
- Рендер VoiceChat в контейнер личных сообщений
- Интеграция с существующей системой VoiceChat
- Правильное позиционирование в интерфейсе

## Интеграция в GroupChat

### Добавленные импорты:
```javascript
import CallButton from '../components/CallButton';
import VoiceChat from '../VoiceChat';
import { createPortal } from 'react-dom';
```

### Добавленное состояние:
```javascript
// Состояние для звонков 1 на 1
const [isInCall, setIsInCall] = useState(false);
const [callData, setCallData] = useState(null);
```

### Обработчики звонков:
```javascript
const handleCallStart = async (callData) => {
  // Логика начала звонка
};

const handleCallEnd = async () => {
  // Логика завершения звонка
};
```

### Кнопка звонка в заголовке:
```javascript
{/* Кнопка звонка для чатов 1 на 1 */}
{!isGroupChat && (
  <CallButton
    chatId={chatId}
    partnerId={members.find(member => member.id !== userId)?.id}
    partnerName={members.find(member => member.id !== userId)?.name}
    userId={userId}
    username={username}
    onCallStart={handleCallStart}
    onCallEnd={handleCallEnd}
    isInCall={isInCall}
  />
)}
```

### Интегрированный звонок:
```javascript
{/* Интегрированный звонок - в чате с глобальным состоянием */}
{activeCall && activeCall.chatId === chatId && (
  <div className="integrated-call-container">
    <VoiceChat
      roomId={`call-${chatId}`}
      roomName={`Звонок с ${activeCall.partnerName}`}
      userName={username}
      userId={userId}
      serverId={null}
      autoJoin={true}
      showUI={true}
      isVisible={true}
      onLeave={handleCallEnd}
      onManualLeave={handleCallEnd}
      initialMuted={false}
      initialAudioEnabled={true}
    />
  </div>
)}
```

## Стили

Добавлены стили в `client/src/Chats/group-chat.css`:

```css
/* Стили для кнопки звонка */
.call-button {
    background: none;
    border: none;
    color: var(--textMuted);
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 8px;
}

.call-button:hover {
    background-color: var(--hover);
    color: var(--primary);
    transform: scale(1.1);
}

.call-button.active {
    color: #ed4245;
    animation: call-pulse 2s infinite;
}

.call-button.ringing {
    color: #43b581;
    animation: ringing-pulse 1s infinite;
}

/* Стили для интегрированного звонка */
.integrated-call-container {
    position: relative;
    width: 100%;
    height: 300px;
    background-color: var(--background);
    border-bottom: 1px solid var(--border);
    overflow: hidden;
    z-index: 10;
}

.integrated-call-container .voice-chat {
    height: 100%;
    width: 100%;
}
```

## Требования к серверу

На данный момент система звонков работает локально без серверной части. VoiceChat компонент использует WebRTC для прямого соединения между пользователями.

### Возможные расширения:

В будущем можно добавить:
- SignalR Hub для signaling звонков
- API endpoints для истории звонков
- Уведомления о пропущенных звонках
- Групповые звонки

## Использование

### Для чатов 1 на 1:
1. Кнопка звонка появляется в заголовке чата
2. При клике сразу открывается VoiceChat в верхней части чата
3. VoiceChat автоматически подключается к комнате звонка
4. Звонок продолжается при переключении между чатами
5. Поддерживается аудио и видео звонки

### Для групповых чатов:
- Функциональность звонков не отображается (только для чатов 1 на 1)

## Интеграция с VoiceChat

Система использует существующий компонент `VoiceChat` для обработки медиа потоков. VoiceChat уже имеет свой сервер для WebRTC signaling.

### Логика комнат:

- **Общая комната**: `call-${chatId}` - все участники чата попадают в одну комнату
- **Автоматическое подключение**: VoiceChat автоматически подключается к комнате при открытии
- **WebRTC соединение**: Прямое соединение между пользователями через существующий сервер VoiceChat

```javascript
<VoiceChat
  roomId={`call-${chatId}`}
  roomName={`Звонок с ${partnerName}`}
  userName={username}
  userId={userId}
  serverId={null}
  autoJoin={true}
  showUI={true}
  isVisible={true}
  onLeave={handleCallEnd}
  onManualLeave={handleCallEnd}
  initialMuted={false}
  initialAudioEnabled={true}
/>
```

## Безопасность

- Проверка прав доступа к чату
- Валидация данных звонка
- Защита от спама звонками
- Логирование всех действий

## Производительность

- Оптимизированные компоненты с React.memo
- Ленивая загрузка медиа компонентов
- Эффективное управление состоянием
- Автоматическая очистка ресурсов

## Расширения

Возможные улучшения:
1. Групповые видеозвонки
2. Запись звонков
3. Экранное демонстрирование
4. Виртуальный фон
5. Фильтры и эффекты
6. Интеграция с календарем 