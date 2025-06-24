using Messenger.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Test1.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class SettingsController : ControllerBase
    {
        private readonly MessengerContext _context;

        public SettingsController(MessengerContext context)
        {
            _context = context;
        }

        [HttpGet("{chatId}/members")]
        public async Task<IActionResult> GetMembers(int chatId)
        {
            var members = await _context.Members
                .Where(m => m.ChatId == chatId)
                .Include(m => m.User) 
                .Select(m => new
                {
                    m.User.UserId,
                    m.User.Username
                })
                .ToListAsync();

            if (members.Any())
            {
                return Ok(members);
            }
            return NotFound($"Chat with ID {chatId} not found or has no members.");
        }

        [HttpPost("{chatId}/leave/{userId}")]
        public async Task<IActionResult> LeaveGroup(int chatId, int userId)
        {
            try
            {
                var member = await _context.Members
                    .FirstOrDefaultAsync(m => m.ChatId == chatId && m.UserId == userId);

                if (member == null)
                {
                    return NotFound("User is not a member of this chat");
                }

                _context.Members.Remove(member);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Successfully left the group" });
            }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, "Database error: " + ex.Message);
            }
        }

        [HttpPost("{chatId}/add-member")]
        public async Task<IActionResult> AddMember(int chatId, [FromBody] AddMemberRequest request)
        {
            if (request == null || request.UserId == null || !request.UserId.Any())
            {
                return BadRequest("Некорректные данные запроса");
            }

            var chat = await _context.Chats
                .Include(c => c.Members)
                .FirstOrDefaultAsync(c => c.ChatId == chatId);

            if (chat == null)
            {
                return NotFound("Чат не найден");
            }

            var usersToAdd = await _context.Users
                .Where(u => request.UserId.Contains(u.UserId))
                .ToListAsync();

            if (!usersToAdd.Any())
            {
                return NotFound("Пользователи не найдены");
            }

            foreach (var user in usersToAdd)
            {
                if (!chat.Members.Any(m => m.UserId == user.UserId))
                {
                    var member = new Member
                    {
                        UserId = user.UserId,
                        ChatId = chat.ChatId,
                        JoinedAt = DateTime.UtcNow
                    };
                    _context.Members.Add(member);
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Пользователи успешно добавлены" });
        }

        [HttpGet("{chatId}/available-users/{userId}")]
        public async Task<IActionResult> GetAvailableUsers(int chatId, int userId)
        {
            var chat = await _context.Chats
                .Include(c => c.Members)
                .FirstOrDefaultAsync(c => c.ChatId == chatId);

            if (chat == null)
            {
                return NotFound("Чат не найден");
            }

            var userChats = await _context.Members
                .Where(m => m.UserId == userId)
                .Select(m => m.ChatId)
                .ToListAsync();

            var usersInChats = await _context.Members
                .Where(m => userChats.Contains(m.ChatId)) 
                .Where(m => m.UserId != userId)
                .Select(m => m.UserId)
                .Distinct()
                .ToListAsync();

            var usersInCurrentChat = chat.Members.Select(m => m.UserId).ToList();


            var availableUsers = await _context.Users
                .Where(u => usersInChats.Contains(u.UserId) && !usersInCurrentChat.Contains(u.UserId)) 
                .Select(u => new
                {
                    u.UserId,
                    u.Username
                })
                .ToListAsync();

            return Ok(availableUsers);
        }

        public class AddMemberRequest
        {
            public List<int> UserId { get; set; } 
        }

        public class LeaveRequest
        {
            public int UserId { get; set; }
        }
    }
}
