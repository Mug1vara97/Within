// Background Script для перехвата горячих клавиш
// Этот скрипт будет работать в фоновом режиме браузера

// Функция для перехвата клавиш
function setupHotkeyListener() {
  // Создаем скрытый iframe для перехвата клавиш
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-1000px';
  iframe.style.left = '-1000px';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-1';
  
  // Добавляем iframe в DOM
  document.body.appendChild(iframe);
  
  // Создаем HTML для iframe с обработчиком клавиш
  const iframeContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Hotkey Listener</title>
    </head>
    <body style="margin: 0; padding: 0; background: transparent;">
      <script>
        // Обработчик клавиш в iframe
        document.addEventListener('keydown', function(event) {
          // Ctrl + ~ для переключения микрофона
          if (event.ctrlKey && event.key === '\`') {
            event.preventDefault();
            event.stopPropagation();
            
            // Отправляем сообщение в родительское окно
            window.parent.postMessage({
              type: 'HOTKEY_PRESSED',
              action: 'toggle_mic',
              key: 'Ctrl + ~'
            }, '*');
            
            console.log('Горячая клавиша перехвачена: Ctrl + ~ (микрофон)');
          }
          
          // Ctrl + F1 для переключения наушников
          if (event.ctrlKey && event.key === 'F1') {
            event.preventDefault();
            event.stopPropagation();
            
            // Отправляем сообщение в родительское окно
            window.parent.postMessage({
              type: 'HOTKEY_PRESSED',
              action: 'toggle_audio',
              key: 'Ctrl + F1'
            }, '*');
            
            console.log('Горячая клавиша перехвачена: Ctrl + F1 (наушники)');
          }
        }, true);
        
        // Фокус на iframe для перехвата клавиш
        window.focus();
        document.body.focus();
        
        // Поддерживаем фокус
        setInterval(() => {
          if (document.activeElement !== document.body) {
            document.body.focus();
          }
        }, 100);
        
        console.log('Hotkey listener iframe загружен');
      </script>
    </body>
    </html>
  `;
  
  // Загружаем контент в iframe
  iframe.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(iframeContent);
  
  // Обработчик сообщений от iframe
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'HOTKEY_PRESSED') {
      console.log('Получена горячая клавиша:', event.data);
      
      // Отправляем сообщение в Service Worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'HOTKEY_PRESSED',
          action: event.data.action,
          key: event.data.key
        });
      }
      
      // Также отправляем сообщение напрямую в основное приложение
      window.postMessage({
        type: 'HOTKEY_ACTION',
        action: event.data.action,
        key: event.data.key
      }, '*');
    }
  });
  
  return iframe;
}

// Инициализация при загрузке страницы
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupHotkeyListener);
} else {
  setupHotkeyListener();
}

// Альтернативный метод через глобальный обработчик
window.addEventListener('keydown', function(event) {
  // Ctrl + ~ для переключения микрофона
  if (event.ctrlKey && event.key === '`') {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Глобальная горячая клавиша: Ctrl + ~ (микрофон)');
    
    // Отправляем сообщение в основное приложение
    window.postMessage({
      type: 'HOTKEY_ACTION',
      action: 'toggle_mic',
      key: 'Ctrl + ~'
    }, '*');
  }
  
  // Ctrl + F1 для переключения наушников
  if (event.ctrlKey && event.key === 'F1') {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Глобальная горячая клавиша: Ctrl + F1 (наушники)');
    
    // Отправляем сообщение в основное приложение
    window.postMessage({
      type: 'HOTKEY_ACTION',
      action: 'toggle_audio',
      key: 'Ctrl + F1'
    }, '*');
  }
}, true);

console.log('Background hotkey listener загружен');