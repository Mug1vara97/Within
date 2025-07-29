// Service Worker для горячих клавиш
// Этот файл будет работать в фоновом режиме и перехватывать клавиши

// Обработчик установки Service Worker
self.addEventListener('install', (event) => {
  console.log('Hotkeys Service Worker установлен');
  self.skipWaiting();
});

// Обработчик активации Service Worker
self.addEventListener('activate', (event) => {
  console.log('Hotkeys Service Worker активирован');
  event.waitUntil(self.clients.claim());
});

// Обработчик сообщений от основного приложения
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'HOTKEY_PRESSED') {
    // Пересылаем сообщение всем клиентам
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'HOTKEY_ACTION',
          action: event.data.action
        });
      });
    });
  }
});

// Обработчик push уведомлений (для будущего использования)
self.addEventListener('push', (event) => {
  console.log('Push уведомление получено');
});

// Обработчик клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  console.log('Клик по уведомлению');
  event.notification.close();
  
  // Открываем приложение при клике на уведомление
  event.waitUntil(
    self.clients.matchAll().then(clients => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});