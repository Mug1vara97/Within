using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Messenger.Models;
using Messenger;
using Microsoft.AspNetCore.SignalR;
using System.Text.Json;
using System.IO;
using Microsoft.AspNetCore.Http;

namespace Messenger.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ServerController : ControllerBase
    {
        private readonly MessengerContext _context;
        private readonly IHubContext<ServerHub> _hubContext;
        private readonly IWebHostEnvironment _environment;
        private readonly string _uploadPath;

        public ServerController(
          MessengerContext context,
          IHubContext<ServerHub> hubContext,
          IWebHostEnvironment environment)
        {
            _context = context;
            _hubContext = hubContext;
            _environment = environment;
            _uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "ServerBanner");
            if (!Directory.Exists(_uploadPath))
            {
                Directory.CreateDirectory(_uploadPath);
            }
        }


        [HttpPost("{serverId}/create-chanel")]
        public async Task<IActionResult> CreateChanel(int serverId, [FromBody] CreateChanelRequest request)
        {
            var category = await _context.ChatCategories
                .FirstOrDefaultAsync(c => c.CategoryId == request.CategoryId);

            if (category == null)
            {
                return NotFound("Категория не найдена");
            }

            var server = await _context.Servers
                .FirstOrDefaultAsync(s => s.ServerId == serverId);

            if (server == null)
            {
                return NotFound("Сервер не найден");
            }

            if (request.ChatType != 3 && request.ChatType != 4)
            {
                return BadRequest("Недопустимый тип чата");
            }

            var newChat = new Chat
            {
                TypeId = request.ChatType,
                CategoryId = request.CategoryId,
                Name = request.ChatName,
                ServerId = serverId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Chats.Add(newChat);
            await _context.SaveChangesAsync();

            return Ok(new { ChatId = newChat.ChatId, Message = "Чат успешно создан" });
        }

        [HttpPut("{serverId}/update-chat-name")]
        public async Task<IActionResult> UpdateChatName(int serverId, [FromBody] UpdateChatNameRequest request)
        {
            var chat = await _context.Chats
                .FirstOrDefaultAsync(c => c.ChatId == request.ChatId && c.ServerId == serverId);

            if (chat == null)
            {
                return NotFound("Чат не найден");
            }

            chat.Name = request.NewName;
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Название чата успешно изменено" });
        }

        [HttpDelete("{serverId}/delete-chat")]
        public async Task<IActionResult> DeleteChat(int serverId, [FromBody] DeleteChatRequest request)
        {
            var chat = await _context.Chats
                .FirstOrDefaultAsync(c => c.ChatId == request.ChatId && c.ServerId == serverId);

            if (chat == null)
            {
                return NotFound("Чат не найден");
            }

            _context.Chats.Remove(chat);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Чат успешно удален" });
        }

        [HttpPost("{serverId}/create-category")]
        public async Task<IActionResult> CreateCategory(int serverId, [FromBody] CreateCategoryRequest request)
        {
            // Проверяем, существует ли сервер
            var server = await _context.Servers
                .FirstOrDefaultAsync(s => s.ServerId == serverId);

            if (server == null)
            {
                return NotFound("Сервер не найден");
            }

            // Проверяем уникальность имени категории в рамках сервера
            var categoryExists = await _context.ChatCategories
                .AnyAsync(c => c.ServerId == serverId && c.CategoryName == request.CategoryName);

            if (categoryExists)
            {
                return Conflict("Категория с таким именем уже существует на этом сервере");
            }

            // Создаем новую категорию
            var newCategory = new ChatCategory
            {
                CategoryName = request.CategoryName,
                ServerId = serverId // Устанавливаем связь с сервером
            };

            _context.ChatCategories.Add(newCategory);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                CategoryId = newCategory.CategoryId,
                Message = "Категория успешно создана"
            });
        }

        [HttpPut("{serverId}/update-categories-order")]
        public async Task<IActionResult> UpdateCategoriesOrder(int serverId, [FromBody] UpdateCategoriesOrderRequest request)
        {
            try
            {
                var categories = await _context.ChatCategories
                    .Where(c => c.ServerId == serverId)
                    .ToListAsync();

                foreach (var categoryUpdate in request.Categories)
                {
                    var category = categories.FirstOrDefault(c => c.CategoryId == categoryUpdate.CategoryId);
                    if (category != null) category.CategoryOrder = categoryUpdate.Order;
                }

                await _context.SaveChangesAsync();

                await _hubContext.Clients.Group(serverId.ToString())
                    .SendAsync("CategoriesOrderUpdated", serverId);

                return Ok(new { Message = "Порядок категорий обновлён" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Ошибка: {ex.Message}" });
            }
        }


        [HttpPut("{serverId}/update-chats-order")]
        public async Task<IActionResult> UpdateChatsOrder(int serverId, [FromBody] UpdateChatsOrderRequest request)
        {
            try
            {
                var category = await _context.ChatCategories
                    .Include(c => c.Chats)
                    .FirstOrDefaultAsync(c => c.CategoryId == request.CategoryId);

                if (category == null) return NotFound("Категория не найдена");

                foreach (var chatUpdate in request.Chats)
                {
                    var chat = category.Chats.FirstOrDefault(c => c.ChatId == chatUpdate.ChatId);
                    if (chat != null) chat.ChatOrder = chatUpdate.Order;
                }

                await _context.SaveChangesAsync();

                await _hubContext.Clients.Group(serverId.ToString())
                    .SendAsync("ChatsOrderUpdated", serverId, request.CategoryId);

                return Ok(new { Message = "Порядок чатов обновлён" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Ошибка: {ex.Message}" });
            }
        }

        [HttpPut("{serverId}/move-chat")]
        public async Task<IActionResult> MoveChat(int serverId, [FromBody] MoveChatRequest request)
        {
            try
            {
                // Находим чат и исходную категорию
                var sourceCategory = await _context.ChatCategories
                    .Include(c => c.Chats)
                    .FirstOrDefaultAsync(c => c.CategoryId == request.FromCategoryId && c.ServerId == serverId);

                if (sourceCategory == null)
                {
                    return NotFound("Source category not found");
                }

                var chat = sourceCategory.Chats.FirstOrDefault(c => c.ChatId == request.ChatId);
                if (chat == null)
                {
                    return NotFound("Chat not found in source category");
                }

                // Если чат перемещается в другую категорию
                if (request.FromCategoryId != request.ToCategoryId)
                {
                    // Удаляем из исходной категории
                    sourceCategory.Chats.Remove(chat);

                    // Добавляем в целевую категорию
                    var targetCategory = await _context.ChatCategories
                        .Include(c => c.Chats)
                        .FirstOrDefaultAsync(c => c.CategoryId == request.ToCategoryId && c.ServerId == serverId);

                    if (targetCategory == null)
                    {
                        return NotFound("Target category not found");
                    }

                    // Обновляем categoryId у чата
                    chat.CategoryId = request.ToCategoryId;

                    // Вставляем на нужную позицию
                    targetCategory.Chats.Add(chat);
                }

                // Обновляем порядок чатов в обеих категориях
                await UpdateChatsOrderInCategory(sourceCategory.CategoryId);
                if (request.FromCategoryId != request.ToCategoryId)
                {
                    await UpdateChatsOrderInCategory(request.ToCategoryId);
                }

                await _context.SaveChangesAsync();
                await _hubContext.Clients.Group(serverId.ToString())
                    .SendAsync("ChatsOrderUpdated", serverId, request.FromCategoryId);

                if (request.FromCategoryId != request.ToCategoryId)
                {
                    await _hubContext.Clients.Group(serverId.ToString())
                        .SendAsync("ChatsOrderUpdated", serverId, request.ToCategoryId);
                }
                return Ok(new { Message = "Chat moved successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Error moving chat: {ex.Message}" });
            }
        }

        private async Task UpdateChatsOrderInCategory(int categoryId)
        {
            var category = await _context.ChatCategories
                .Include(c => c.Chats)
                .FirstOrDefaultAsync(c => c.CategoryId == categoryId);

            if (category != null)
            {
                var orderedChats = category.Chats.OrderBy(c => c.ChatOrder).ToList();
                for (int i = 0; i < orderedChats.Count; i++)
                {
                    orderedChats[i].ChatOrder = i;
                }
            }
        }

        [HttpDelete("{serverId}/kick/{userId}")]
        public async Task<IActionResult> KickMember(int serverId, int userId)
        {
            var member = await _context.ServerMembers
                .FirstOrDefaultAsync(sm => sm.ServerId == serverId && sm.UserId == userId);

            if (member == null) return NotFound("Участник не найден");

            var server = await _context.Servers.FindAsync(serverId);
            if (server == null) return NotFound("Сервер не найден");

            _context.ServerMembers.Remove(member);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Участник успешно удален" });
        }

        [HttpPost("openChat")]
        public async Task<IActionResult> OpenChat([FromBody] OpenChatRequest request)
        {
            try
            {
                var user1 = await _context.Users.FindAsync(request.CurrentUserId);
                var user2 = await _context.Users.FindAsync(request.TargetUserId);

                if (user1 == null || user2 == null)
                {
                    return NotFound("Один из пользователей не найден");
                }

                var existingChatId = await _context.Members
                    .Where(m => m.UserId == request.CurrentUserId)
                    .Join(_context.Members,
                        m1 => m1.ChatId,
                        m2 => m2.ChatId,
                        (m1, m2) => new { m1, m2 })
                    .Where(x => x.m2.UserId == request.TargetUserId)
                    .Join(_context.Chats,
                        x => x.m1.ChatId,
                        c => c.ChatId,
                        (x, c) => c)
                    .Where(c => c.TypeId == 1) 
                    .Select(c => c.ChatId)
                    .FirstOrDefaultAsync();

                if (existingChatId != default)
                {
                    return Ok(new
                    {
                        chatId = existingChatId,
                        exists = true
                    });
                }

                var newChat = new Chat
                {
                    TypeId = 1,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Chats.Add(newChat);
                await _context.SaveChangesAsync();

                _context.Members.Add(new Member
                {
                    ChatId = newChat.ChatId,
                    UserId = request.CurrentUserId
                });

                _context.Members.Add(new Member
                {
                    ChatId = newChat.ChatId,
                    UserId = request.TargetUserId
                });

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    chatId = newChat.ChatId,
                    created = true
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Ошибка сервера: {ex.Message}" });
            }
        }

        [HttpPost("{serverId}/create-private-channel")]
        public async Task<IActionResult> CreatePrivateChannel(int serverId, [FromBody] CreatePrivateChannelRequest request)
        {
            try
            {
                var server = await _context.Servers
                    .FirstOrDefaultAsync(s => s.ServerId == serverId);

                if (server == null)
                {
                    return NotFound("Сервер не найден");
                }

                // Проверяем, является ли создатель владельцем сервера или имеет права на создание приватных каналов
                var userRoles = await _context.UserServerRoles
                    .Where(usr => usr.ServerId == serverId && usr.UserId == request.CreatorId)
                    .Include(usr => usr.Role)
                    .ToListAsync();

                bool hasPermission = server.OwnerId == request.CreatorId || 
                                   userRoles.Any(ur => {
                                       try {
                                           var permissions = !string.IsNullOrEmpty(ur.Role.Permissions) 
                                               ? System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, bool>>(ur.Role.Permissions) ?? new Dictionary<string, bool>()
                                               : new Dictionary<string, bool>();
                                           return permissions.GetValueOrDefault("manageChannels", false);
                                       }
                                       catch {
                                           return false;
                                       }
                                   });

                if (!hasPermission)
                {
                    return Forbid("Недостаточно прав для создания приватных каналов");
                }

                var category = await _context.ChatCategories
                    .FirstOrDefaultAsync(c => c.CategoryId == request.CategoryId);

                if (category == null)
                {
                    return NotFound("Категория не найдена");
                }

                // Проверяем корректность типа чата
                if (request.ChatType != 3 && request.ChatType != 4)
                {
                    return BadRequest("Недопустимый тип чата");
                }

                // Проверяем, что хотя бы одна роль или пользователь выбраны
                if ((request.AllowedRoleIds == null || !request.AllowedRoleIds.Any()) && 
                    (request.AllowedUserIds == null || !request.AllowedUserIds.Any()))
                {
                    return BadRequest("Необходимо выбрать хотя бы одну роль или пользователя");
                }

                var newChat = new Chat
                {
                    TypeId = request.ChatType,
                    CategoryId = request.CategoryId,
                    Name = request.ChannelName,
                    ServerId = serverId,
                    IsPrivate = true,
                    AllowedRoleIds = System.Text.Json.JsonSerializer.Serialize(request.AllowedRoleIds),
                    CreatedAt = DateTime.UtcNow
                };

                _context.Chats.Add(newChat);
                await _context.SaveChangesAsync();

                // Добавляем создателя в канал
                _context.Members.Add(new Member
                {
                    ChatId = newChat.ChatId,
                    UserId = request.CreatorId
                });

                // Добавляем выбранных пользователей в канал
                foreach (var userId in request.AllowedUserIds)
                {
                    _context.Members.Add(new Member
                    {
                        ChatId = newChat.ChatId,
                        UserId = userId
                    });
                }

                await _context.SaveChangesAsync();

                // Уведомляем всех пользователей сервера об обновлении
                await _hubContext.Clients.Group(serverId.ToString())
                    .SendAsync("ChatCreated", newChat);

                return Ok(new { ChatId = newChat.ChatId, Message = "Приватный канал успешно создан" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Ошибка при создании приватного канала: {ex.Message}" });
            }
        }

        [HttpGet("{serverId}/available-channels/{userId}")]
        public async Task<IActionResult> GetAvailableChannels(int serverId, int userId)
        {
            try
            {
                // Проверяем, является ли пользователь участником сервера
                var serverMember = await _context.ServerMembers
                    .FirstOrDefaultAsync(sm => sm.ServerId == serverId && sm.UserId == userId);

                if (serverMember == null)
                {
                    return NotFound("Пользователь не является участником сервера");
                }

                var server = await _context.Servers
                    .FirstOrDefaultAsync(s => s.ServerId == serverId);

                if (server == null)
                {
                    return NotFound("Сервер не найден");
                }

                // Получаем все каналы сервера
                var allChannels = await _context.Chats
                    .Where(c => c.ServerId == serverId)
                    .ToListAsync();

                // Получаем роли пользователя
                var userRoleIds = await _context.UserServerRoles
                    .Where(usr => usr.ServerId == serverId && usr.UserId == userId)
                    .Select(usr => usr.RoleId)
                    .ToListAsync();

                var availableChannels = allChannels.Where(channel =>
                {
                    // Если канал не приватный или пользователь владелец сервера - разрешаем доступ
                    if (!channel.IsPrivate || server.OwnerId == userId)
                        return true;

                    // Для приватных каналов проверяем роли пользователя
                    if (!string.IsNullOrEmpty(channel.AllowedRoleIds))
                    {
                        var allowedRoleIds = System.Text.Json.JsonSerializer.Deserialize<List<int>>(channel.AllowedRoleIds);
                        if (allowedRoleIds.Any(roleId => userRoleIds.Contains(roleId)))
                            return true;
                    }

                    // Проверяем, есть ли пользователь в списке участников канала
                    return _context.Members.Any(m => m.ChatId == channel.ChatId && m.UserId == userId);
                }).ToList();

                return Ok(availableChannels);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Ошибка при получении доступных каналов: {ex.Message}" });
            }
        }

        [HttpGet("{serverId}/roles")]
        public async Task<IActionResult> GetServerRoles(int serverId)
        {
            try
            {
                var server = await _context.Servers
                    .FirstOrDefaultAsync(s => s.ServerId == serverId);

                if (server == null)
                {
                    return NotFound("Сервер не найден");
                }

                var roles = await _context.ServerRoles
                    .Where(r => r.ServerId == serverId)
                    .Select(r => new
                    {
                        r.RoleId,
                        r.RoleName,
                        r.Color,
                        r.Permissions
                    })
                    .ToListAsync();

                return Ok(roles);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Ошибка при получении ролей: {ex.Message}" });
            }
        }

        [HttpGet("{serverId}/banner")]
        public async Task<IActionResult> GetServerBanner(int serverId)
        {
            try
            {
                var server = await _context.Servers
                    .FirstOrDefaultAsync(s => s.ServerId == serverId);

                if (server == null)
                {
                    return NotFound("Сервер не найден");
                }

                return Ok(new
                {
                    server.Banner,
                    server.BannerColor
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Ошибка при получении баннера: {ex.Message}" });
            }
        }

        [HttpPost("{serverId}/banner")]
        public async Task<IActionResult> UploadServerBanner(int serverId, IFormFile file)
        {
            try
            {
                var server = await _context.Servers
                    .FirstOrDefaultAsync(s => s.ServerId == serverId);

                if (server == null)
                {
                    return NotFound("Сервер не найден");
                }

                // Проверяем, является ли файл изображением
                if (file == null || !file.ContentType.StartsWith("image/"))
                {
                    return BadRequest("Загружаемый файл должен быть изображением");
                }

                // Удаляем старый баннер, если он существует
                if (!string.IsNullOrEmpty(server.Banner))
                {
                    var oldBannerPath = Path.Combine(_uploadPath, Path.GetFileName(server.Banner));
                    if (System.IO.File.Exists(oldBannerPath))
                    {
                        System.IO.File.Delete(oldBannerPath);
                    }
                }

                // Генерируем уникальное имя файла
                var fileExtension = Path.GetExtension(file.FileName);
                var fileName = $"{serverId}_{Guid.NewGuid()}{fileExtension}";
                var filePath = Path.Combine(_uploadPath, fileName);

                // Сохраняем новый файл
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // Обновляем путь к баннеру в базе данных
                server.Banner = $"/Uploads/ServerBanner/{fileName}";
                await _context.SaveChangesAsync();

                // Уведомляем клиентов об обновлении баннера
                await _hubContext.Clients.Group(serverId.ToString())
                    .SendAsync("ServerBannerUpdated", serverId, server.Banner);

                return Ok(new { 
                    Message = "Баннер успешно загружен",
                    BannerUrl = server.Banner
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Ошибка при загрузке баннера: {ex.Message}" });
            }
        }

        [HttpDelete("{serverId}/banner")]
        public async Task<IActionResult> DeleteServerBanner(int serverId)
        {
            try
            {
                var server = await _context.Servers
                    .FirstOrDefaultAsync(s => s.ServerId == serverId);

                if (server == null)
                {
                    return NotFound("Сервер не найден");
                }

                if (!string.IsNullOrEmpty(server.Banner))
                {
                    var bannerPath = Path.Combine(_uploadPath, Path.GetFileName(server.Banner));
                    if (System.IO.File.Exists(bannerPath))
                    {
                        System.IO.File.Delete(bannerPath);
                    }

                    server.Banner = null;
                    await _context.SaveChangesAsync();

                    // Уведомляем клиентов об удалении баннера
                    await _hubContext.Clients.Group(serverId.ToString())
                        .SendAsync("ServerBannerUpdated", serverId, null);
                }

                return Ok(new { Message = "Баннер успешно удален" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Ошибка при удалении баннера: {ex.Message}" });
            }
        }

        // Получение списка публичных серверов
        [HttpGet("public")]
        public async Task<IActionResult> GetPublicServers()
        {
            try
            {
                var publicServers = await _context.Servers
                    .Where(s => s.IsPublic)
                    .Select(s => new
                    {
                        s.ServerId,
                        s.Name,
                        s.Description,
                        s.Banner,
                        s.BannerColor,
                        s.Avatar,
                        OwnerName = _context.Users
                            .Where(u => u.UserId == s.OwnerId)
                            .Select(u => u.Username)
                            .FirstOrDefault()
                    })
                    .ToListAsync();

                return Ok(publicServers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Обновление настроек публичности сервера
        [HttpPut("{serverId}/visibility")]
        public async Task<IActionResult> UpdateServerVisibility(int serverId, [FromBody] UpdateServerVisibilityRequest request)
        {
            try
            {
                var server = await _context.Servers
                    .FirstOrDefaultAsync(s => s.ServerId == serverId);

                if (server == null)
                {
                    return NotFound("Сервер не найден");
                }

                // Проверяем, является ли пользователь владельцем сервера
                if (server.OwnerId != request.UserId)
                {
                    return Forbid("Только владелец сервера может изменять его видимость");
                }

                server.IsPublic = request.IsPublic;
                server.Description = request.Description;

                await _context.SaveChangesAsync();

                return Ok(new { Message = "Настройки видимости сервера обновлены" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Ошибка при обновлении настроек видимости: {ex.Message}" });
            }
        }

        // Поиск публичных серверов
        [HttpGet("search")]
        public async Task<IActionResult> SearchPublicServers([FromQuery] string query)
        {
            try
            {
                var servers = await _context.Servers
                    .Where(s => s.IsPublic && 
                        (s.Name.Contains(query) || 
                        (s.Description != null && s.Description.Contains(query))))
                    .Select(s => new
                    {
                        s.ServerId,
                        s.Name,
                        s.Description,
                        s.Banner,
                        s.BannerColor,
                        OwnerName = s.Owner.Username
                    })
                    .ToListAsync();

                return Ok(servers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Ошибка при поиске серверов: {ex.Message}" });
            }
        }

        public class OpenChatRequest
        {
            public int CurrentUserId { get; set; }
            public int TargetUserId { get; set; }
        }

        public class UpdateChatsOrderRequest
        {
            public int CategoryId { get; set; }
            public List<ChatOrderUpdate> Chats { get; set; }
        }

        public class ChatOrderUpdate
        {
            public int ChatId { get; set; }
            public int Order { get; set; }
        }

        public class MoveChatRequest
        {
            public int ChatId { get; set; }
            public int FromCategoryId { get; set; }
            public int ToCategoryId { get; set; }
            public int NewIndex { get; set; }
        }

        public class UpdateCategoriesOrderRequest
        {
            public List<CategoryOrderUpdate> Categories { get; set; }
        }

        public class CategoryOrderUpdate
        {
            public int CategoryId { get; set; }
            public int Order { get; set; }
        }

        public class CreateChanelRequest
        {
            public int CategoryId { get; set; }
            public string ChatName { get; set; }
            public int ChatType { get; set; } // 3 - текстовый, 4 - голосовой
        }

        public class CreateCategoryRequest
        {
            public string CategoryName { get; set; }
        }

        public class DeleteChatRequest
        {
            public int ChatId { get; set; }
        }

        public class UpdateChatNameRequest
        {
            public int ChatId { get; set; }
            public string NewName { get; set; }
        }

        public class CreatePrivateChannelRequest
        {
            public int CreatorId { get; set; }
            public int CategoryId { get; set; }
            public required string ChannelName { get; set; }
            public int ChatType { get; set; }
            public required List<int> AllowedRoleIds { get; set; }
            public required List<int> AllowedUserIds { get; set; }
        }

        public class UpdateServerVisibilityRequest
        {
            public int UserId { get; set; }
            public bool IsPublic { get; set; }
            public string? Description { get; set; }
        }
    }
}
