using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using Microsoft.EntityFrameworkCore;
using Messenger.Models;

namespace Messenger;

public class StatusHub : Hub
{
    private static readonly Dictionary<string, string> _userConnections = new();
    private readonly MessengerContext _context;

    public StatusHub(MessengerContext context)
    {
        _context = context;
    }

    public override async Task OnConnectedAsync()
    {
        // Получаем userId из query параметра
        var userId = Context.GetHttpContext()?.Request.Query["userId"].ToString();
        if (!string.IsNullOrEmpty(userId) && int.TryParse(userId, out int userIdInt))
        {
            // Проверяем, есть ли уже активное соединение для этого пользователя
            if (_userConnections.ContainsKey(userId))
            {
                // Если соединение уже существует, это переподключение - не меняем статус
                _userConnections[userId] = Context.ConnectionId;
                Console.WriteLine($"StatusHub: User {userIdInt} reconnected, keeping existing status");
            }
            else
            {
                // Новое подключение - устанавливаем статус online
                _userConnections[userId] = Context.ConnectionId;
                
                // Обновляем статус в базе данных
                var user = await _context.Users.FindAsync(userIdInt);
                if (user != null)
                {
                    user.Status = "online";
                    user.LastSeen = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    
                    await Clients.All.SendAsync("UserStatusChanged", userIdInt, "online");
                    Console.WriteLine($"StatusHub: User {userIdInt} connected, status set to online");
                }
            }
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
            
            // Проверяем, есть ли еще активные соединения для этого пользователя
            if (!_userConnections.ContainsKey(userId))
            {
                // Нет других соединений - устанавливаем статус offline
                var user = await _context.Users.FindAsync(userIdInt);
                if (user != null)
                {
                    user.Status = "offline";
                    user.LastSeen = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    
                    await Clients.All.SendAsync("UserStatusChanged", userIdInt, "offline");
                    Console.WriteLine($"StatusHub: User {userIdInt} disconnected, status set to offline");
                }
            }
            else
            {
                // Есть другие соединения - не меняем статус
                Console.WriteLine($"StatusHub: User {userIdInt} has other active connections, keeping status");
            }
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
} 