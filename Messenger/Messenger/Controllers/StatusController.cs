using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Messenger.Models;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;

namespace Messenger.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatusController : ControllerBase
{
    private readonly MessengerContext _context;
    private readonly IHubContext<StatusHub> _statusHub;

    public StatusController(MessengerContext context, IHubContext<StatusHub> statusHub)
    {
        _context = context;
        _statusHub = statusHub;
    }

    // Получить статус пользователя
    [HttpGet("{userId}")]
    public async Task<IActionResult> GetUserStatus(int userId)
    {
        try
        {
            var user = await _context.Users
                .Where(u => u.UserId == userId)
                .Select(u => new { u.Status, u.LastSeen })
                .FirstOrDefaultAsync();

            if (user == null)
            {
                return NotFound("Пользователь не найден");
            }

            return Ok(new { Status = user.Status, LastSeen = user.LastSeen });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // Обновить статус пользователя
    [HttpPut("{userId}")]
    public async Task<IActionResult> UpdateUserStatus(int userId, [FromBody] UpdateStatusRequest request)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound("Пользователь не найден");
            }

            // Валидация статуса
            var validStatuses = new[] { "online", "idle", "dnd", "offline" };
            if (!validStatuses.Contains(request.Status))
            {
                return BadRequest("Неверный статус");
            }

            // Проверяем, изменился ли статус
            var oldStatus = user.Status;
            var statusChanged = oldStatus != request.Status;

            user.Status = request.Status;
            user.LastSeen = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Уведомляем всех клиентов об изменении статуса только если статус действительно изменился
            if (statusChanged)
            {
                await _statusHub.Clients.All.SendAsync("UserStatusChanged", userId, user.Status);
                Console.WriteLine($"StatusController: Notified all clients about user {userId} status change from {oldStatus} to {user.Status}");
            }
            else
            {
                Console.WriteLine($"StatusController: User {userId} status unchanged ({user.Status}), skipping notification");
            }

            return Ok(new { Status = user.Status, LastSeen = user.LastSeen });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // Получить статусы всех пользователей в сервере
    [HttpGet("server/{serverId}")]
    public async Task<IActionResult> GetServerUserStatuses(int serverId)
    {
        try
        {
            var userStatuses = await _context.ServerMembers
                .Where(sm => sm.ServerId == serverId)
                .Include(sm => sm.User)
                .Select(sm => new
                {
                    UserId = sm.User.UserId,
                    Username = sm.User.Username,
                    Status = sm.User.Status,
                    LastSeen = sm.User.LastSeen
                })
                .ToListAsync();

            return Ok(userStatuses);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // Получить статусы пользователей в чате
    [HttpGet("chat/{chatId}")]
    public async Task<IActionResult> GetChatUserStatuses(int chatId)
    {
        try
        {
            Console.WriteLine($"Getting user statuses for chat {chatId}");
            
            var chat = await _context.Chats
                .Include(c => c.Members)
                .ThenInclude(m => m.User)
                .FirstOrDefaultAsync(c => c.ChatId == chatId);

            if (chat == null)
            {
                Console.WriteLine($"Chat {chatId} not found");
                return NotFound("Чат не найден");
            }

            var userStatuses = chat.Members.Select(m => new
            {
                UserId = m.User.UserId,
                Username = m.User.Username,
                Status = m.User.Status ?? "offline",
                LastSeen = m.User.LastSeen
            }).ToList();

            Console.WriteLine($"Found {userStatuses.Count} users in chat {chatId}: {string.Join(", ", userStatuses.Select(u => $"{u.Username}({u.Status})"))}");
            
            return Ok(userStatuses);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error getting chat user statuses: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // Обновить время последней активности
    [HttpPost("{userId}/activity")]
    public async Task<IActionResult> UpdateUserActivity(int userId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound("Пользователь не найден");
            }

            user.LastSeen = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Уведомляем всех клиентов об активности пользователя
            await _statusHub.Clients.All.SendAsync("UserActivity", userId, user.LastSeen);
            Console.WriteLine($"StatusController: Notified all clients about user {userId} activity at {user.LastSeen}");

            return Ok(new { LastSeen = user.LastSeen });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

public class UpdateStatusRequest
{
    public string Status { get; set; } = string.Empty;
} 