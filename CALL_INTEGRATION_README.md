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

### 2. CallModal (`client/src/components/CallModal.jsx`)
Модальное окно для отображения активного звонка.

**Функции:**
- Интеграция с VoiceChat компонентом
- Управление звонком (мут, громкость, завершение)
- Полноэкранный режим
- Обработка входящих звонков

### 3. useCallManager (`client/src/hooks/useCallManager.js`)
Хук для управления звонками через SignalR.

**Функции:**
- Установка SignalR соединения
- Обработка входящих/исходящих звонков
- Управление состоянием звонков
- Интеграция с VoiceChat компонентом

## Интеграция в GroupChat

### Добавленные импорты:
```javascript
import CallButton from '../components/CallButton';
import CallModal from '../components/CallModal';
import useCallManager from '../hooks/useCallManager';
```

### Добавленное состояние:
```javascript
// Состояние для звонков
const [isCallModalOpen, setIsCallModalOpen] = useState(false);
const [currentCallData, setCurrentCallData] = useState(null);
const [isIncomingCall, setIsIncomingCall] = useState(false);

// Хук для управления звонками
const {
  incomingCall,
  isInCall,
  startCall,
  endCall
} = useCallManager(userId, username);
```

### Обработчики звонков:
```javascript
const handleCallStart = async (callData) => {
  // Логика начала звонка
};

const handleCallEnd = async () => {
  // Логика завершения звонка
};

const handleIncomingCall = (callData) => {
  // Обработка входящего звонка
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
    isIncomingCall={isIncomingCall}
    incomingCallData={incomingCall}
  />
)}
```

### Модальное окно звонка:
```javascript
{/* Модальное окно звонка */}
<CallModal
  open={isCallModalOpen}
  onClose={() => setIsCallModalOpen(false)}
  callData={currentCallData}
  onCallEnd={handleCallEnd}
  isIncomingCall={isIncomingCall}
/>
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
```

## Требования к серверу

### SignalR Hub для звонков

Необходимо создать SignalR Hub `CallHub` со следующими методами:

```csharp
public class CallHub : Hub
{
    // Начать звонок
    public async Task StartCall(CallRequest request)
    
    // Принять звонок
    public async Task AcceptCall(string callId)
    
    // Отклонить звонок
    public async Task RejectCall(string callId)
    
    // Завершить звонок
    public async Task EndCall(string callId)
    
    // Обновить состояние звонка
    public async Task UpdateCallState(CallStateUpdate update)
    
    // Проверить доступность пользователя
    public async Task<bool> CheckUserAvailability(string userId)
}
```

### API Endpoints

```csharp
// Получить историю звонков
[HttpGet("api/calls/history/{chatId}")]
public async Task<IActionResult> GetCallHistory(string chatId)

// Отправить уведомление о пропущенном звонке
[HttpPost("api/calls/missed")]
public async Task<IActionResult> SendMissedCallNotification(CallData callData)
```

## Использование

### Для чатов 1 на 1:
1. Кнопка звонка появляется в заголовке чата
2. При клике начинается звонок
3. Открывается модальное окно с VoiceChat
4. Поддерживается входящий/исходящий звонок

### Для групповых чатов:
- Функциональность звонков не отображается (только для чатов 1 на 1)

## Интеграция с VoiceChat

Система использует существующий компонент `VoiceChat` для обработки медиа потоков:

```javascript
<VoiceChat
  roomId={`call-${chatId}-${userId}-${partnerId}`}
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