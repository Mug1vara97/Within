using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;

namespace Messenger;

public class StatusHub : Hub
{
    private static readonly Dictionary<string, string> _userConnections = new();

    public override async Task OnConnectedAsync()
    {
        // Получаем userId из query параметра
        var userId = Context.GetHttpContext()?.Request.Query["userId"].ToString();
        if (!string.IsNullOrEmpty(userId) && int.TryParse(userId, out int userIdInt))
        {
            _userConnections[userId] = Context.ConnectionId;
            // НЕ устанавливаем статус online автоматически при подключении
            // Статус должен быть установлен явно через API
            Console.WriteLine($"StatusHub: User {userIdInt} connected, but status not automatically set to online");
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Получаем userId из query параметра
        var userId = Context.GetHttpContext()?.Request.Query["userId"].ToString();
        if (!string.IsNullOrEmpty(userId) && int.TryParse(userId, out int userIdInt))
        {
            _userConnections.Remove(userId);
            // Устанавливаем статус offline при отключении
            await Clients.All.SendAsync("UserStatusChanged", userIdInt, "offline");
            Console.WriteLine($"StatusHub: User {userIdInt} disconnected, status set to offline");
        }
        await base.OnDisconnectedAsync(exception);
    }

    // Уведомить всех пользователей об изменении статуса
    public async Task NotifyStatusChange(int userId, string status)
    {
        Console.WriteLine($"StatusHub: Notifying all clients about user {userId} status change to {status}");
        await Clients.All.SendAsync("UserStatusChanged", userId, status);
    }

    // Уведомить пользователей сервера об изменении статуса
    public async Task NotifyServerStatusChange(int serverId, int userId, string status)
    {
        await Clients.Group($"server_{serverId}").SendAsync("UserStatusChanged", userId, status);
    }

    // Присоединиться к группе сервера
    public async Task JoinServerGroup(int serverId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"server_{serverId}");
    }

    // Покинуть группу сервера
    public async Task LeaveServerGroup(int serverId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"server_{serverId}");
    }

    // Уведомить о активности пользователя
    public async Task NotifyUserActivity(int userId)
    {
        await Clients.All.SendAsync("UserActivity", userId, DateTime.UtcNow);
    }

    // Метод для установки статуса offline для неактивных пользователей
    public async Task SetInactiveUsersOffline()
    {
        // Этот метод может быть вызван периодически для очистки неактивных пользователей
        Console.WriteLine("StatusHub: Checking for inactive users...");
    }
} 