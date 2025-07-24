using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace Messenger
{
    public class NotificationHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var userId = Context.GetHttpContext()?.Request.Query["userId"].ToString();
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
                Console.WriteLine($"User {userId} connected to NotificationHub");
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.GetHttpContext()?.Request.Query["userId"].ToString();
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");
                Console.WriteLine($"User {userId} disconnected from NotificationHub");
            }
            await base.OnDisconnectedAsync(exception);
        }

        // Присоединиться к группе пользователя
        public async Task JoinUserGroup(int userId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
        }

        // Покинуть группу пользователя
        public async Task LeaveUserGroup(int userId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");
        }

        // Уведомление о прочтении сообщения
        public async Task NotifyMessageRead(int userId, int chatId, long messageId)
        {
            await Clients.Group($"user_{userId}").SendAsync("MessageRead", chatId, messageId);
        }
    }
} 