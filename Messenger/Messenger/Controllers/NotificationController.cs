using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Messenger.Models;
using Microsoft.AspNetCore.SignalR;
using Messenger;

namespace Messenger.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationController : ControllerBase
    {
        private readonly MessengerContext _context;
        private readonly IHubContext<NotificationHub> _notificationHub;

        public NotificationController(MessengerContext context, IHubContext<NotificationHub> notificationHub)
        {
            _context = context;
            _notificationHub = notificationHub;
        }

        // Получить уведомления пользователя
        [HttpGet]
        public async Task<IActionResult> GetNotifications([FromQuery] int userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] bool unreadOnly = true)
        {
            try
            {
                IQueryable<Notification> query = _context.Notifications
                    .Where(n => n.UserId == userId)
                    .Include(n => n.Chat)
                    .Include(n => n.Message)
                    .ThenInclude(m => m.User);

                // Фильтруем только непрочитанные уведомления если unreadOnly = true
                if (unreadOnly)
                {
                    query = query.Where(n => !n.IsRead);
                }

                var notifications = await query
                    .OrderByDescending(n => n.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(n => new
                    {
                        n.NotificationId,
                        n.ChatId,
                        n.MessageId,
                        n.Type,
                        n.Content,
                        n.IsRead,
                        n.CreatedAt,
                        n.ReadAt,
                        ChatName = n.Chat.Name,
                        SenderName = n.Message.User.Username,
                        MessageContent = n.Message.Content
                    })
                    .ToListAsync();

                return Ok(notifications);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Получить количество непрочитанных уведомлений
        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount([FromQuery] int userId)
        {
            try
            {
                var count = await _context.Notifications
                    .Where(n => n.UserId == userId && !n.IsRead)
                    .CountAsync();

                return Ok(new { unreadCount = count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Отметить уведомление как прочитанное
        [HttpPut("{notificationId}/read")]
        public async Task<IActionResult> MarkAsRead(int notificationId, [FromQuery] int userId)
        {
            try
            {
                var notification = await _context.Notifications
                    .FirstOrDefaultAsync(n => n.NotificationId == notificationId && n.UserId == userId);

                if (notification == null)
                {
                    return NotFound("Уведомление не найдено");
                }

                notification.IsRead = true;
                notification.ReadAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                // Уведомляем через SignalR об изменении счетчика
                await _notificationHub.Clients.User(userId.ToString()).SendAsync("UnreadCountChanged", await GetUnreadCountForUser(userId));

                return Ok(new { message = "Уведомление отмечено как прочитанное" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Отметить все уведомления чата как прочитанные
        [HttpPut("chat/{chatId}/read")]
        public async Task<IActionResult> MarkChatAsRead(int chatId, [FromQuery] int userId)
        {
            try
            {
                var notifications = await _context.Notifications
                    .Where(n => n.ChatId == chatId && n.UserId == userId && !n.IsRead)
                    .ToListAsync();

                foreach (var notification in notifications)
                {
                    notification.IsRead = true;
                    notification.ReadAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                // Уведомляем через SignalR об изменении счетчика
                await _notificationHub.Clients.User(userId.ToString()).SendAsync("UnreadCountChanged", await GetUnreadCountForUser(userId));

                return Ok(new { message = $"Отмечено {notifications.Count} уведомлений как прочитанные" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Удалить уведомление
        [HttpDelete("{notificationId}")]
        public async Task<IActionResult> DeleteNotification(int notificationId, [FromQuery] int userId)
        {
            try
            {
                var notification = await _context.Notifications
                    .FirstOrDefaultAsync(n => n.NotificationId == notificationId && n.UserId == userId);

                if (notification == null)
                {
                    return NotFound("Уведомление не найдено");
                }

                _context.Notifications.Remove(notification);
                await _context.SaveChangesAsync();

                // Уведомляем через SignalR об изменении счетчика
                await _notificationHub.Clients.User(userId.ToString()).SendAsync("UnreadCountChanged", await GetUnreadCountForUser(userId));

                return Ok(new { message = "Уведомление удалено" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Создать уведомление (внутренний метод)
        public async Task CreateNotification(int userId, int chatId, long? messageId, string type, string content)
        {
            try
            {
                var notification = new Notification
                {
                    UserId = userId,
                    ChatId = chatId,
                    MessageId = messageId,
                    Type = type,
                    Content = content,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();

                // Уведомляем пользователя через SignalR
                await _notificationHub.Clients.User(userId.ToString()).SendAsync("ReceiveNotification", new
                {
                    notification.NotificationId,
                    notification.ChatId,
                    notification.MessageId,
                    notification.Type,
                    notification.Content,
                    notification.IsRead,
                    notification.CreatedAt
                });

                // Обновляем счетчик непрочитанных
                await _notificationHub.Clients.User(userId.ToString()).SendAsync("UnreadCountChanged", await GetUnreadCountForUser(userId));

                Console.WriteLine($"Created notification for user {userId}: {content}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating notification: {ex.Message}");
            }
        }

        private async Task<int> GetUnreadCountForUser(int userId)
        {
            return await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .CountAsync();
        }
    }
} 