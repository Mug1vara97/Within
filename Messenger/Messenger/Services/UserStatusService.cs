using Microsoft.EntityFrameworkCore;
using Messenger.Models;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Messenger.Services;

public class UserStatusService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(5); // Проверяем каждые 5 минут
    private readonly TimeSpan _inactiveThreshold = TimeSpan.FromMinutes(10); // Пользователь считается неактивным после 10 минут

    public UserStatusService(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckInactiveUsers();
                await Task.Delay(_checkInterval, stoppingToken);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UserStatusService: {ex.Message}");
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); // Ждем минуту при ошибке
            }
        }
    }

    private async Task CheckInactiveUsers()
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<MessengerContext>();
        var statusHub = scope.ServiceProvider.GetRequiredService<IHubContext<StatusHub>>();

        var cutoffTime = DateTime.UtcNow.Subtract(_inactiveThreshold);
        
        // Находим пользователей, которые неактивны более 10 минут
        var inactiveUsers = await context.Users
            .Where(u => u.Status == "online" && u.LastSeen < cutoffTime)
            .ToListAsync();

        if (inactiveUsers.Any())
        {
            Console.WriteLine($"Found {inactiveUsers.Count} inactive users, setting them to offline");
            
            foreach (var user in inactiveUsers)
            {
                user.Status = "offline";
                user.LastSeen = DateTime.UtcNow;
                
                // Уведомляем всех клиентов об изменении статуса
                await statusHub.Clients.All.SendAsync("UserStatusChanged", user.UserId, "offline");
                Console.WriteLine($"UserStatusService: Set user {user.Username} (ID: {user.UserId}) to offline due to inactivity");
            }
            
            await context.SaveChangesAsync();
        }
    }
} 