using Messenger.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace Messenger.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly MessengerContext _context;

        public AuthController(MessengerContext context)
        {
            _context = context;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] UserLoginModel model)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == model.Username && u.Password == model.Password);

            if (user == null)
            {
                return Unauthorized(new { message = "Invalid username or password" });
            }

            return Ok(new { userId = user.UserId, username = user.Username });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserRegisterModel model)
        {
            if (await _context.Users.AnyAsync(u => u.Username == model.Username))
            {
                return BadRequest(new { message = "Username already exists" });
            }

            var user = new User
            {
                Username = model.Username,
                Password = model.Password, 
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var profile = new UserProfile
            {
                UserId = user.UserId,
                AvatarColor = "#" + new Random().Next(0x1000000).ToString("X6")
            };

            _context.UserProfiles.Add(profile);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Registration successful" });
        }


        [HttpGet("chats/{userId}")]
        public IActionResult GetChats(int userId)
        {
            var oneOnOneChats = _context.Members
                .Where(m => m.UserId == userId)
                .Select(m => m.Chat)
                .Where(c => c.TypeId == 1)
                .Select(c => new
                {
                    chat_id = c.ChatId,
                    username = _context.Members
                        .Where(m => m.ChatId == c.ChatId && m.UserId != userId)
                        .Select(m => m.User.Username)
                        .FirstOrDefault(),
                    user_id = _context.Members
                        .Where(m => m.ChatId == c.ChatId && m.UserId != userId)
                        .Select(m => m.UserId)
                        .FirstOrDefault(),
                    isGroupChat = false
                })
                .ToList();

            var groupChats = _context.Members
                .Where(m => m.UserId == userId)
                .Select(m => m.Chat)
                .Where(c => c.TypeId == 2)
                .Select(c => new
                {
                    chat_id = c.ChatId,
                    username = c.Name,
                    user_id = userId,
                    isGroupChat = true
                })
                .ToList();

            var allChats = oneOnOneChats.Cast<dynamic>().Concat(groupChats.Cast<dynamic>()).ToList();

            return Ok(allChats);
        }


        [HttpGet("searchUsers")]
        public IActionResult SearchUsers([FromQuery] string name, [FromQuery] int currentUserId)
        {
            if (string.IsNullOrWhiteSpace(name) || name.Length < 1)
            {
                return BadRequest("Поисковый запрос должен содержать минимум 2 символа.");
            }

            // Нормализация поискового запроса
            var normalizedName = name.Trim().ToLower();

            // Получаем пользователей, с которыми уже есть чаты
            var existingChatUserIds = _context.Members
                .Where(m => m.UserId == currentUserId)
                .Select(m => m.ChatId)
                .SelectMany(chatId => _context.Members
                    .Where(m => m.ChatId == chatId && m.UserId != currentUserId)
                    .Select(m => m.UserId))
                .Distinct()
                .ToList();

            // Поиск пользователей с учетом различных вариантов написания
            var users = _context.Users
                .Where(u => u.UserId != currentUserId)
                .Where(u =>
                    u.Username.ToLower().Contains(normalizedName) || // Точное совпадение
                    u.Username.ToLower().Replace(" ", "").Contains(normalizedName.Replace(" ", "")) || // Без пробелов
                    u.Username.ToLower().StartsWith(normalizedName) || // Начинается с
                    u.Username.ToLower().EndsWith(normalizedName)) // Заканчивается на
                .Select(u => new
                {
                    user_id = u.UserId,
                    username = u.Username,
                    has_existing_chat = existingChatUserIds.Contains(u.UserId)
                })
                .OrderByDescending(u => u.has_existing_chat) // Сначала показываем пользователей с существующими чатами
                .ThenBy(u => u.username) // Затем сортируем по имени
                .Take(20) // Ограничиваем количество результатов
                .ToList();

            return Ok(users);
        }
    }

    public class UserRegisterModel
    {
        public string Username { get; set; }
        public string Password { get; set; }
    }

    public class UserLoginModel
    {
        public string Username { get; set; }
        public string Password { get; set; }
    }
}