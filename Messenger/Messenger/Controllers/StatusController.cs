using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Messenger.Models;
using System;
using System.Threading.Tasks;

namespace Messenger.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatusController : ControllerBase
{
    private readonly MessengerContext _context;

    public StatusController(MessengerContext context)
    {
        _context = context;
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

            user.Status = request.Status;
            user.LastSeen = DateTime.UtcNow;

            await _context.SaveChangesAsync();

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
            var chat = await _context.Chats
                .Include(c => c.Members)
                .ThenInclude(m => m.User)
                .FirstOrDefaultAsync(c => c.ChatId == chatId);

            if (chat == null)
            {
                return NotFound("Чат не найден");
            }

            var userStatuses = chat.Members.Select(m => new
            {
                UserId = m.User.UserId,
                Username = m.User.Username,
                Status = m.User.Status,
                LastSeen = m.User.LastSeen
            }).ToList();

            return Ok(userStatuses);
        }
        catch (Exception ex)
        {
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