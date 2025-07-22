using Messenger.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Channels;
using System.Threading.Tasks;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using System.IO;

namespace Messenger.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MessagesController : ControllerBase
    {
        private readonly MessengerContext _context;

        public MessagesController(MessengerContext context)
        {
            _context = context;
        }

        [HttpGet("{chatId}")]
        public async Task<IActionResult> GetMessages(int chatId, [FromQuery] int? userId = null)
        {
            try
            {
                var messages = await _context.Messages
                    .Where(m => m.ChatId == chatId)
                    .Include(m => m.User) // Важно: включаем данные пользователя
                    .Include(m => m.MessageReads).ThenInclude(mr => mr.User) // Включаем информацию о прочитанных сообщениях
                    .OrderBy(m => m.CreatedAt)
                    .Select(m => new
                    {
                        messageId = m.MessageId,
                        content = m.Content,
                        userId = m.UserId,
                        createdAt = m.CreatedAt,
                        user = new
                        {
                            username = m.User.Username,
                            userId = m.User.UserId
                        },
                        isRead = userId.HasValue ? m.MessageReads.Any(mr => mr.UserId == userId.Value) : false,
                        readBy = m.MessageReads.Select(mr => new
                        {
                            userId = mr.UserId,
                            username = mr.User.Username,
                            readAt = mr.ReadAt
                        }).ToList()
                    })
                    .ToListAsync();

                return Ok(messages);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("chatExists")]
        public IActionResult ChatExists([FromBody] ChatCheckRequest request)
        {
            var chatExists = _context.Chats.Any(c =>
                c.TypeId == 1 &&
                _context.Members.Any(m => m.ChatId == c.ChatId && m.UserId == request.UserId) &&
                _context.Members.Any(m2 => m2.ChatId == c.ChatId && m2.UserId == request.ChatPartnerId));

            return Ok(new { exists = chatExists });
        }

        [HttpPost("createChat")]
        public IActionResult CreateChat([FromBody] CreateChatRequest request)
        {
            var user1Exists = _context.Users.Any(u => u.UserId == request.User1Id);
            var user2Exists = _context.Users.Any(u => u.UserId == request.User2Id);

            if (!user1Exists || !user2Exists)
            {
                return BadRequest("One or both users do not exist.");
            }

            var newChat = new Chat
            {
                TypeId = 1,
                CreatedAt = DateTime.UtcNow
            };

            try
            {
                _context.Chats.Add(newChat);
                _context.SaveChanges();

                _context.Members.Add(new Member { UserId = request.User1Id, ChatId = newChat.ChatId });
                _context.Members.Add(new Member { UserId = request.User2Id, ChatId = newChat.ChatId });
                _context.SaveChanges();
            }
            catch (DbUpdateException ex)
            {
                return BadRequest("An error occurred while creating the chat: " + ex.Message);
            }

            return Ok(new { chatId = newChat.ChatId });
        }

        [HttpPost("createGroupChat")]
        public async Task<IActionResult> CreateGroupChat([FromBody] CreateGroupChatRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.ChatName) || request.UserIds == null || !request.UserIds.Any())
            {
                return BadRequest("Invalid request.");
            }

            var usersExist = await _context.Users
                .Where(u => request.UserIds.Contains(u.UserId))
                .Select(u => u.UserId)
                .ToListAsync();

            if (usersExist.Count != request.UserIds.Count)
            {
                return BadRequest("One or more users do not exist.");
            }

            var groupChat = new Chat
            {
                TypeId = 2,
                Name = request.ChatName,
                CreatedAt = DateTime.UtcNow
            };

            _context.Chats.Add(groupChat);
            await _context.SaveChangesAsync();

            var groupChatMembers = request.UserIds.Select(userId => new Member
            {
                ChatId = groupChat.ChatId,
                UserId = userId,
                JoinedAt = DateTime.UtcNow
            }).ToList();

            _context.Members.AddRange(groupChatMembers);
            await _context.SaveChangesAsync();

            return Ok(new { GroupChatId = groupChat.ChatId });
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users
                .Select(u => new
                {
                    user_id = u.UserId,
                    username = u.Username,
                    password = u.Password,
                    created_at = u.CreatedAt
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpPost("servers")]
        public async Task<IActionResult> CreateServer([FromBody] ServerDto request)
        {
            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    // 1. Проверяем существование пользователя (владельца)
                    var ownerExists = await _context.Users.AnyAsync(u => u.UserId == request.OwnerId);
                    if (!ownerExists)
                    {
                        return BadRequest("Owner user does not exist");
                    }

                    // 2. Создаем сервер
                    var server = new Server
                    {
                        Name = request.ServerName,
                        OwnerId = request.OwnerId,
                        CreatedAt = DateTime.UtcNow,
                        IsPublic = request.IsPublic,
                        Description = request.Description
                    };

                    _context.Servers.Add(server);
                    await _context.SaveChangesAsync();

                    // 3. Создаем категорию "Текстовые каналы" для этого сервера
                    var category = new ChatCategory
                    {
                        CategoryName = "Текстовые каналы",
                        ServerId = server.ServerId
                    };

                    _context.ChatCategories.Add(category);
                    await _context.SaveChangesAsync();

                    // 4. Проверяем/создаем тип чата "Channel" (ID=3)
                    var chatType = await _context.ChatTypes.FirstOrDefaultAsync(t => t.TypeId == 3);
                    if (chatType == null)
                    {
                        chatType = new ChatType { TypeName = "Channel" };
                        _context.ChatTypes.Add(chatType);
                        await _context.SaveChangesAsync();
                    }

                    // 5. Создаем основной чат для сервера
                    var chat = new Chat
                    {
                        Name = "Основной",
                        TypeId = 3, // Channel
                        CategoryId = category.CategoryId,
                        ServerId = server.ServerId,
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.Chats.Add(chat);
                    await _context.SaveChangesAsync();

                    // 6. Добавляем владельца как участника сервера
                    var serverMember = new ServerMember
                    {
                        ServerId = server.ServerId,
                        UserId = request.OwnerId,
                        JoinedAt = DateTime.UtcNow
                    };

                    _context.ServerMembers.Add(serverMember);
                    await _context.SaveChangesAsync();

                    // 7. Добавляем владельца в чат
                    var chatMember = new Member
                    {
                        ChatId = chat.ChatId,
                        UserId = request.OwnerId,
                        JoinedAt = DateTime.UtcNow
                    };

                    _context.Members.Add(chatMember);

                    // 8. Создаем запись о позиции сервера для владельца
                    var maxPosition = await _context.UserServerOrders
                        .Where(uso => uso.UserId == request.OwnerId)
                        .Select(uso => (int?)uso.Position)
                        .MaxAsync() ?? -1;

                    var serverOrder = new UserServerOrder
                    {
                        UserId = request.OwnerId,
                        ServerId = server.ServerId,
                        Position = maxPosition + 1 // Добавляем сервер в конец списка
                    };

                    _context.UserServerOrders.Add(serverOrder);
                    await _context.SaveChangesAsync();

                    await transaction.CommitAsync();

                    // Возвращаем информацию о сервере
                    return Ok(new
                    {
                        server.ServerId,
                        server.Name,
                        server.OwnerId,
                        server.CreatedAt,
                        DefaultChannelId = chat.ChatId,
                        Position = serverOrder.Position
                    });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, new { error = ex.Message });
                }
            }
        }

        [HttpGet("test")]
        public async Task<ActionResult<IEnumerable<object>>> GetServersByUserId(int userId)
        {
            // Сначала получаем все серверы, где пользователь является участником (включая владельца)
            var memberServers = await _context.ServerMembers
                .Where(m => m.UserId == userId)
                .Join(
                    _context.Servers,
                    m => m.ServerId,
                    s => s.ServerId,
                    (m, s) => new
                    {
                        s.ServerId,
                        s.Name,
                        s.OwnerId,
                        IsOwner = s.OwnerId == userId // Определяем, является ли пользователь владельцем
                    })
                .ToListAsync();

            // Затем получаем серверы, где пользователь является владельцем, но не участником
            var ownedServersNotMember = await _context.Servers
                .Where(s => s.OwnerId == userId &&
                           !_context.ServerMembers.Any(m => m.ServerId == s.ServerId && m.UserId == userId))
                .Select(s => new
                {
                    s.ServerId,
                    s.Name,
                    s.OwnerId,
                    IsOwner = true
                })
                .ToListAsync();

            // Объединяем результаты, исключая дубликаты
            var allServers = memberServers.Concat(ownedServersNotMember)
                                         .GroupBy(s => s.ServerId)
                                         .Select(g => g.First())
                                         .ToList();

            if (!allServers.Any())
            {
                return NotFound("No servers found for this user.");
            }

            return Ok(allServers);
        }

        [HttpGet("zxc/{serverId}")]
        public async Task<IActionResult> GetServer(int serverId, [FromQuery] int userId)
        {
            try
            {
                // Логируем входные параметры
                Console.WriteLine($"GetServer called with serverId={serverId}, userId={userId}");

                var server = await _context.Servers
                    .FirstOrDefaultAsync(s => s.ServerId == serverId);

                if (server == null) return NotFound();

                // Получаем и логируем все роли пользователя
                var userServerRoles = await _context.UserServerRoles
                    .Where(usr => usr.UserId == userId && usr.ServerId == serverId)
                    .Include(usr => usr.Role)
                    .ToListAsync();

                var userRoles = userServerRoles.Select(usr => usr.RoleId).ToList();

                Console.WriteLine($"User {userId} roles for server {serverId}:");
                foreach (var role in userServerRoles)
                {
                    Console.WriteLine($"Role ID: {role.RoleId}, Name: {role.Role?.RoleName}");
                }

                // Получаем категории с подробным логированием
                var categories = await _context.ChatCategories
                    .Where(c => c.ServerId == serverId)
                    .OrderBy(c => c.CategoryOrder)
                    .ToListAsync();

                Console.WriteLine("\nAll categories in server:");
                foreach (var cat in categories)
                {
                    Console.WriteLine($"Category ID: {cat.CategoryId}");
                    Console.WriteLine($"Name: {cat.CategoryName}");
                    Console.WriteLine($"IsPrivate: {cat.IsPrivate}");
                    Console.WriteLine($"AllowedRoleIds: {cat.AllowedRoleIds}");
                    if (!string.IsNullOrEmpty(cat.AllowedRoleIds))
                    {
                        try
                        {
                            var allowedRoles = JsonSerializer.Deserialize<List<int>>(cat.AllowedRoleIds);
                            var hasAccess = allowedRoles?.Any(roleId => userRoles.Contains(roleId)) == true;
                            Console.WriteLine($"User has access through roles: {hasAccess}");
                            Console.WriteLine($"Matching roles: {string.Join(", ", allowedRoles?.Where(roleId => userRoles.Contains(roleId)) ?? new List<int>())}");
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Error parsing AllowedRoleIds: {ex.Message}");
                        }
                    }
                    Console.WriteLine("---");
                }

                // Получаем чаты
                var chats = await _context.Chats
                    .Where(c => c.ServerId == serverId)
                    .Include(c => c.Category)
                    .Include(c => c.Members)
                    .OrderBy(c => c.ChatOrder)
                    .ToListAsync();

                Console.WriteLine("\nAll chats in server:");
                foreach (var chat in chats)
                {
                    Console.WriteLine($"Chat ID: {chat.ChatId}");
                    Console.WriteLine($"Name: {chat.Name}");
                    Console.WriteLine($"IsPrivate: {chat.IsPrivate}");
                    Console.WriteLine($"AllowedRoleIds: {chat.AllowedRoleIds}");
                    if (!string.IsNullOrEmpty(chat.AllowedRoleIds))
                    {
                        try
                        {
                            var allowedRoles = JsonSerializer.Deserialize<List<int>>(chat.AllowedRoleIds);
                            var hasAccess = allowedRoles?.Any(roleId => userRoles.Contains(roleId)) == true;
                            Console.WriteLine($"User has access through roles: {hasAccess}");
                            Console.WriteLine($"Matching roles: {string.Join(", ", allowedRoles?.Where(roleId => userRoles.Contains(roleId)) ?? new List<int>())}");
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Error parsing AllowedRoleIds: {ex.Message}");
                        }
                    }
                    Console.WriteLine("---");
                }

                // Фильтруем категории с подробным логированием
                var filteredCategories = categories
                    .Where(category =>
                    {
                        if (!category.IsPrivate || server.OwnerId == userId)
                        {
                            return true;
                        }

                        if (!string.IsNullOrEmpty(category.AllowedRoleIds))
                        {
                            try
                            {
                                // Сначала пробуем как массив
                                var allowedRoles = JsonSerializer.Deserialize<List<int>>(category.AllowedRoleIds);
                                if (allowedRoles?.Any(roleId => userRoles.Contains(roleId)) == true)
                                {
                                    return true;
                                }
                            }
                            catch
                            {
                                // Если не получилось как массив, пробуем как одиночное значение
                                var roleIdStr = category.AllowedRoleIds.Trim('[', ']', ' ');
                                if (int.TryParse(roleIdStr, out int roleId))
                                {
                                    if (userRoles.Contains(roleId))
                                    {
                                        return true;
                                    }
                                }
                            }
                        }

                        // Добавляем проверку AllowedUserIds
                        if (!string.IsNullOrEmpty(category.AllowedUserIds))
                        {
                            try
                            {
                                // Сначала пробуем как массив
                                var allowedUsers = JsonSerializer.Deserialize<List<int>>(category.AllowedUserIds);
                                if (allowedUsers?.Contains(userId) == true)
                                {
                                    return true;
                                }
                            }
                            catch
                            {
                                // Если не получилось как массив, пробуем как одиночное значение
                                var userIdStr = category.AllowedUserIds.Trim('[', ']', ' ');
                                if (int.TryParse(userIdStr, out int allowedUserId))
                                {
                                    if (allowedUserId == userId)
                                    {
                                        return true;
                                    }
                                }
                            }
                        }

                        return false;
                    })
                    .Select(category => new
                    {
                        CategoryId = (int?)category.CategoryId,
                        CategoryName = category.CategoryName,
                        CategoryOrder = category.CategoryOrder,
                        IsPrivate = category.IsPrivate,
                        AllowedRoleIds = category.AllowedRoleIds,
                        AllowedUserIds = category.AllowedUserIds,
                        Chats = chats
                            .Where(c => c.CategoryId == category.CategoryId)
                            .Where(chat =>
                            {
                                if (!chat.IsPrivate || server.OwnerId == userId)
                                {
                                    return true;
                                }

                                if (!string.IsNullOrEmpty(chat.AllowedRoleIds))
                                {
                                    try
                                    {
                                        // Сначала пробуем как массив
                                        var allowedRoles = JsonSerializer.Deserialize<List<int>>(chat.AllowedRoleIds);
                                        if (allowedRoles?.Any(roleId => userRoles.Contains(roleId)) == true)
                                        {
                                            return true;
                                        }
                                    }
                                    catch
                                    {
                                        // Если не получилось как массив, пробуем как одиночное значение
                                        var roleIdStr = chat.AllowedRoleIds.Trim('[', ']', ' ');
                                        if (int.TryParse(roleIdStr, out int roleId))
                                        {
                                            if (userRoles.Contains(roleId))
                                            {
                                                return true;
                                            }
                                        }
                                    }
                                }

                                return chat.Members.Any(m => m.UserId == userId);
                            })
                            .OrderBy(c => c.ChatOrder)
                            .Select(c => new
                            {
                                c.ChatId,
                                c.Name,
                                c.TypeId,
                                c.ChatOrder,
                                c.IsPrivate,
                                c.AllowedRoleIds,
                                Members = c.Members.Select(m => new { m.UserId }).ToList()
                            })
                            .ToList()
                    });

                var resultCategories = new List<object>();
                resultCategories.AddRange(filteredCategories);

                // Добавляем чаты без категории
                var uncategorizedChats = chats
                    .Where(c => c.CategoryId == null)
                    .Where(chat =>
                    {
                        if (!chat.IsPrivate || server.OwnerId == userId)
                        {
                            return true;
                        }

                        if (!string.IsNullOrEmpty(chat.AllowedRoleIds))
                        {
                            try
                            {
                                var allowedRoles = JsonSerializer.Deserialize<List<int>>(chat.AllowedRoleIds);
                                if (allowedRoles?.Any(roleId => userRoles.Contains(roleId)) == true)
                                {
                                    return true;
                                }
                            }
                            catch
                            {
                                var roleIdStr = chat.AllowedRoleIds.Trim('[', ']', ' ');
                                if (int.TryParse(roleIdStr, out int roleId))
                                {
                                    if (userRoles.Contains(roleId))
                                    {
                                        return true;
                                    }
                                }
                            }
                        }

                        return chat.Members.Any(m => m.UserId == userId);
                    })
                    .OrderBy(c => c.ChatOrder)
                    .Select(c => new
                    {
                        c.ChatId,
                        c.Name,
                        c.TypeId,
                        c.ChatOrder,
                        c.IsPrivate,
                        c.AllowedRoleIds,
                        Members = c.Members.Select(m => new { m.UserId }).ToList()
                    })
                    .ToList();

                if (uncategorizedChats.Any())
                {
                    resultCategories.Add(new
                    {
                        CategoryId = (int?)null,
                        CategoryName = (string?)null,
                        CategoryOrder = -1,
                        IsPrivate = false,
                        AllowedRoleIds = (string?)null,
                        AllowedUserIds = (string?)null,
                        Chats = uncategorizedChats
                    });
                }

                var result = new
                {
                    server.ServerId,
                    server.Name,
                    Categories = resultCategories,
                    server.OwnerId,
                    UserRoles = userRoles
                };

                // Логируем финальный результат
                Console.WriteLine("\nFinal result:");
                Console.WriteLine(JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }));

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetServer: {ex}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("servers/{serverId}/add-member")]
        public async Task<IActionResult> AddMember(int serverId, [FromBody] AddMemberServerRequest request)
        {
            if (request == null || !request.IsValid())
            {
                return BadRequest(new { error = "Некорректные данные запроса" });
            }

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    var server = await _context.Servers
                        .FirstOrDefaultAsync(s => s.ServerId == serverId);

                    if (server == null)
                    {
                        return NotFound(new { error = "Сервер не найден" });
                    }

                    var userToAdd = await _context.Users
                        .FirstOrDefaultAsync(u => u.UserId == request.UserIdToAdd);

                    if (userToAdd == null)
                    {
                        return NotFound(new { error = "Пользователь не найден" });
                    }

                    var isAlreadyMember = await _context.ServerMembers
                        .AnyAsync(m => m.ServerId == serverId && m.UserId == request.UserIdToAdd);

                    if (isAlreadyMember)
                    {
                        return BadRequest(new { error = "Вы уже являетесь участником этого сервера" });
                    }

                    // Добавляем пользователя как участника сервера
                    var newMember = new ServerMember
                    {
                        ServerId = serverId,
                        UserId = request.UserIdToAdd,
                        JoinedAt = DateTime.UtcNow
                    };

                    _context.ServerMembers.Add(newMember);

                    // Получаем максимальную позицию в списке серверов пользователя
                    var maxPosition = await _context.UserServerOrders
                        .Where(uso => uso.UserId == request.UserIdToAdd)
                        .Select(uso => (int?)uso.Position)
                        .MaxAsync() ?? -1;

                    // Создаем запись о порядке сервера для нового участника
                    var serverOrder = new UserServerOrder
                    {
                        UserId = request.UserIdToAdd,
                        ServerId = serverId,
                        Position = maxPosition + 1 // Добавляем сервер в конец списка
                    };

                    _context.UserServerOrders.Add(serverOrder);

                    // Добавляем пользователя во все публичные чаты сервера
                    var publicChats = await _context.Chats
                        .Where(c => c.ServerId == serverId && !c.IsPrivate)
                        .ToListAsync();

                    foreach (var chat in publicChats)
                    {
                        _context.Members.Add(new Member
                        {
                            ChatId = chat.ChatId,
                            UserId = request.UserIdToAdd,
                            JoinedAt = DateTime.UtcNow
                        });
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return Ok(new { 
                        success = true,
                        message = "Вы успешно присоединились к серверу"
                    });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, new { error = $"Внутренняя ошибка сервера: {ex.Message}" });
                }
            }
        }

        [HttpGet("{serverId}/available-users")]
        public async Task<IActionResult> GetAvailableUsers(int serverId, [FromQuery] int userId)
        {
            var existingMembers = await _context.ServerMembers
                .Where(m => m.ServerId == serverId)
                .Select(m => m.UserId)
                .ToListAsync();

            var usersWithPrivateChats = await _context.Members
                .Where(m => m.UserId == userId) 
                .Join(_context.Chats, 
                    member => member.ChatId,
                    chat => chat.ChatId,
                    (member, chat) => new { member, chat })
                .Where(x => x.chat.TypeId == 1)
                .Select(x => x.member.ChatId)
                .SelectMany(chatId => _context.Members
                    .Where(m => m.ChatId == chatId && m.UserId != userId) 
                    .Select(m => m.UserId))
                .Distinct()
                .ToListAsync();

            var availableUsers = await _context.Users
                .Where(u => usersWithPrivateChats.Contains(u.UserId) && !existingMembers.Contains(u.UserId))
                .Select(u => new { u.UserId, u.Username })
                .ToListAsync();

            return Ok(availableUsers);
        }

        [HttpDelete("delete-chat/{chatId}")]
        public async Task<IActionResult> DeleteChat(int chatId, [FromQuery] int userId)
        {
            try
            {
                // Проверяем, является ли пользователь участником чата
                var isMember = await _context.Members
                    .AnyAsync(m => m.ChatId == chatId && m.UserId == userId);

                if (!isMember)
                {
                    return Forbid("Вы не являетесь участником этого чата.");
                }

                // Получаем чат
                var chat = await _context.Chats
                    .Include(c => c.Members)
                    .FirstOrDefaultAsync(c => c.ChatId == chatId);

                if (chat == null)
                {
                    return NotFound("Чат не найден.");
                }

                // Проверяем, что это личный чат (type_id = 1)
                if (chat.TypeId != 1)
                {
                    return BadRequest("Можно удалять только личные чаты.");
                }

                // Удаляем все сообщения в чате
                var messages = await _context.Messages
                    .Where(m => m.ChatId == chatId)
                    .ToListAsync();
                _context.Messages.RemoveRange(messages);

                // Удаляем всех участников чата
                _context.Members.RemoveRange(chat.Members);

                // Удаляем сам чат
                _context.Chats.Remove(chat);

                await _context.SaveChangesAsync();

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Произошла ошибка при удалении чата.");
            }
        }

        [HttpGet("servers")]
        public async Task<IActionResult> GetUserServers(int userId)
        {
            try
            {
                // Получаем все серверы пользователя
                var userServers = await _context.ServerMembers
                    .Include(sm => sm.Server)
                    .Where(sm => sm.UserId == userId)
                    .Select(sm => new
                    {
                        sm.Server.ServerId,
                        sm.Server.Name,
                        sm.Server.Avatar,
                        Position = _context.UserServerOrders
                            .Where(uso => uso.UserId == userId && uso.ServerId == sm.ServerId)
                            .Select(uso => uso.Position)
                            .FirstOrDefault()
                    })
                    .ToListAsync();

                // Сортируем серверы по возрастанию позиции (0 в начале)
                var sortedServers = userServers
                    .OrderBy(s => s.Position)
                    .ToList();

                return Ok(sortedServers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPut("servers/reorder")]
        public async Task<IActionResult> ReorderServers([FromBody] ServerReorderRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Удаляем старые позиции
                var existingOrders = await _context.UserServerOrders
                    .Where(uso => uso.UserId == request.UserId)
                    .ToListAsync();
                _context.UserServerOrders.RemoveRange(existingOrders);

                // Добавляем новые позиции
                var newOrders = request.ServerOrders.Select(so => new UserServerOrder
                {
                    UserId = request.UserId,
                    ServerId = so.ServerId,
                    Position = so.Position
                });
                await _context.UserServerOrders.AddRangeAsync(newOrders);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return Ok();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("search/{chatId}")]
        public async Task<IActionResult> SearchMessages(int chatId, [FromQuery] string query)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(query))
                {
                    return BadRequest("Поисковый запрос не может быть пустым");
                }

                var messages = await _context.Messages
                    .Where(m => m.ChatId == chatId && 
                           (m.Content.Contains(query) || m.User.Username.Contains(query)))
                    .Include(m => m.User)
                    .Include(m => m.User.UserProfile)
                    .OrderByDescending(m => m.CreatedAt)
                    .Take(50)
                    .Select(m => new
                    {
                        messageId = m.MessageId,
                        content = m.Content,
                        senderUsername = m.User.Username,
                        userId = m.UserId,
                        avatarUrl = m.User.UserProfile.Avatar,
                        avatarColor = m.User.UserProfile.AvatarColor,
                        createdAt = m.CreatedAt
                    })
                    .ToListAsync();

                return Ok(messages);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("available-chats/{userId}")]
        public async Task<IActionResult> GetAvailableChats(int userId)
        {
            try
            {
                var chats = await _context.Members
                    .Where(m => m.UserId == userId)
                    .Select(m => m.Chat)
                    .Select(c => new
                    {
                        chatId = c.ChatId,
                        name = c.Name,
                        username = c.TypeId == 1 ? // Если это личный чат
                            _context.Members
                                .Where(m => m.ChatId == c.ChatId && m.UserId != userId)
                                .Join(_context.Users,
                                    m => m.UserId,
                                    u => u.UserId,
                                    (m, u) => u.Username)
                                .FirstOrDefault()
                            : null,
                        type = c.TypeId
                    })
                    .ToListAsync();

                return Ok(chats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Ошибка при получении списка чатов: {ex.Message}");
            }
        }

        [HttpPut("servers/{serverId}/banner")]
        public async Task<IActionResult> UpdateServerBanner(int serverId, [FromQuery] int userId, [FromBody] UpdateServerBannerRequest request)
        {
            try
            {
                var server = await _context.Servers
                    .FirstOrDefaultAsync(s => s.ServerId == serverId);

                if (server == null)
                    return NotFound("Сервер не найден");

                

                server.Banner = request.Banner;
                server.BannerColor = request.BannerColor;

                await _context.SaveChangesAsync();

                return Ok(new { 
                    server.ServerId, 
                    server.Name, 
                    server.Banner, 
                    server.BannerColor 
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpDelete("servers/{serverId}/banner")]
        public async Task<IActionResult> RemoveServerBanner(int serverId, [FromQuery] int userId)
        {
            try
            {
                var server = await _context.Servers
                    .FirstOrDefaultAsync(s => s.ServerId == serverId);

                if (server == null)
                    return NotFound("Сервер не найден");

                if (server.OwnerId != userId)
                    return Forbid("Только владелец сервера может удалить баннер");

                server.Banner = null;
                server.BannerColor = null;

                await _context.SaveChangesAsync();

                return Ok(new { 
                    server.ServerId, 
                    server.Name 
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("{serverId}/create-channel")]
        public async Task<IActionResult> CreateChannel(int serverId, [FromBody] CreateChannelRequest request)
        {
            try
            {
                // Проверяем существование сервера
                var server = await _context.Servers
                    .FirstOrDefaultAsync(s => s.ServerId == serverId);

                if (server == null)
                    return NotFound("Сервер не найден");

                // Проверяем тип чата
                if (request.ChatType != 3 && request.ChatType != 4)
                    return BadRequest("Недопустимый тип чата");

                // Создаем новый чат
                var newChat = new Chat
                {
                    Name = request.ChatName.Trim(),
                    TypeId = request.ChatType,
                    CategoryId = request.CategoryId,
                    ServerId = serverId,
                    CreatedAt = DateTime.UtcNow,
                    ChatOrder = await GetNextChatOrder(serverId, request.CategoryId)
                };

                _context.Chats.Add(newChat);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    ChatId = newChat.ChatId,
                    newChat.Name,
                    newChat.TypeId,
                    newChat.CategoryId,
                    newChat.ChatOrder
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        private async Task<int> GetNextChatOrder(int serverId, int? categoryId)
        {
            if (categoryId == null)
            {
                // Для чатов без категории
                return await _context.Chats
                    .Where(c => c.ServerId == serverId && c.CategoryId == null)
                    .Select(c => (int?)c.ChatOrder)
                    .MaxAsync() ?? -1 + 1;
            }
            else
            {
                // Для чатов в категории
                return await _context.Chats
                    .Where(c => c.ServerId == serverId && c.CategoryId == categoryId)
                    .Select(c => (int?)c.ChatOrder)
                    .MaxAsync() ?? -1 + 1;
            }
        }

        [HttpPost("servers/{serverId}/leave")]
        public async Task<IActionResult> LeaveServer(int serverId, [FromBody] LeaveServerRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Проверяем, является ли пользователь владельцем сервера
                var server = await _context.Servers
                    .FirstOrDefaultAsync(s => s.ServerId == serverId);

                if (server == null)
                    return NotFound(new { error = "Сервер не найден" });

                if (server.OwnerId == request.UserId)
                    return BadRequest(new { error = "Владелец сервера не может покинуть сервер" });

                // Получаем участника сервера
                var member = await _context.ServerMembers
                    .FirstOrDefaultAsync(sm => sm.ServerId == serverId && sm.UserId == request.UserId);

                if (member == null)
                    return NotFound(new { error = "Вы не являетесь участником этого сервера" });

                // Получаем запись о порядке серверов для пользователя
                var serverOrder = await _context.UserServerOrders
                    .FirstOrDefaultAsync(uso => uso.ServerId == serverId && uso.UserId == request.UserId);

                if (serverOrder != null)
                {
                    var position = serverOrder.Position;
                    
                    // Удаляем запись о порядке
                    _context.UserServerOrders.Remove(serverOrder);
                    
                    // Обновляем позиции остальных серверов
                    var otherServers = await _context.UserServerOrders
                        .Where(uso => uso.UserId == request.UserId && uso.Position > position)
                        .ToListAsync();

                    foreach (var order in otherServers)
                    {
                        order.Position--;
                    }
                }

                // Удаляем все роли пользователя на сервере
                var userRoles = await _context.UserServerRoles
                    .Where(usr => usr.UserId == request.UserId && usr.ServerId == serverId)
                    .ToListAsync();
                _context.UserServerRoles.RemoveRange(userRoles);

                // Удаляем участника из всех чатов сервера
                var chatMembers = await _context.Members
                    .Where(m => m.UserId == request.UserId && m.Chat.ServerId == serverId)
                    .ToListAsync();
                _context.Members.RemoveRange(chatMembers);

                // Удаляем участника из сервера
                _context.ServerMembers.Remove(member);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { error = $"Внутренняя ошибка сервера: {ex.Message}" });
            }
        }

        [HttpPut("servers/{serverId}/avatar")]
        public async Task<IActionResult> UpdateServerAvatar(int serverId, IFormFile file)
        {
            try
            {
                var server = await _context.Servers
                    .FirstOrDefaultAsync(s => s.ServerId == serverId);

                if (server == null)
                    return NotFound("Сервер не найден");

                if (file == null || file.Length == 0)
                    return BadRequest("Файл не был предоставлен");

                // Проверяем тип файла
                var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif" };
                if (!allowedTypes.Contains(file.ContentType.ToLower()))
                {
                    return BadRequest("Недопустимый формат файла. Разрешены только JPEG, PNG и GIF");
                }

                // Создаем директорию, если она не существует
                var uploadPath = Path.Combine("Uploads", "ServerAvatar");
                if (!Directory.Exists(uploadPath))
                {
                    Directory.CreateDirectory(uploadPath);
                }

                // Генерируем уникальное имя файла
                var fileName = $"{serverId}_{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
                var filePath = Path.Combine(uploadPath, fileName);

                // Удаляем старый файл, если он существует
                if (!string.IsNullOrEmpty(server.Avatar))
                {
                    var oldFilePath = Path.Combine(Directory.GetCurrentDirectory(), server.Avatar.TrimStart('/'));
                    if (System.IO.File.Exists(oldFilePath))
                    {
                        System.IO.File.Delete(oldFilePath);
                    }
                }

                // Сохраняем новый файл
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // Обновляем путь к аватару в базе данных
                server.Avatar = $"/Uploads/ServerAvatar/{fileName}";
                await _context.SaveChangesAsync();

                return Ok(new { 
                    server.ServerId, 
                    server.Name, 
                    server.Avatar
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpDelete("servers/{serverId}/avatar")]
        public async Task<IActionResult> RemoveServerAvatar(int serverId, [FromQuery] int userId)
        {
            try
            {
                var server = await _context.Servers
                    .FirstOrDefaultAsync(s => s.ServerId == serverId);

                if (server == null)
                    return NotFound("Сервер не найден");

                if (server.OwnerId != userId)
                    return Forbid("Только владелец сервера может удалить аватар");

                // Удаляем файл, если он существует
                if (!string.IsNullOrEmpty(server.Avatar))
                {
                    var filePath = Path.Combine(Directory.GetCurrentDirectory(), server.Avatar.TrimStart('/'));
                    if (System.IO.File.Exists(filePath))
                    {
                        System.IO.File.Delete(filePath);
                    }
                }

                server.Avatar = null;
                await _context.SaveChangesAsync();

                return Ok(new { 
                    server.ServerId, 
                    server.Name 
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// Отметить сообщения как прочитанные
        /// </summary>
        [HttpPost("mark-as-read")]
        public async Task<IActionResult> MarkMessagesAsRead([FromBody] MarkAsReadRequest request)
        {
            try
            {
                if (request == null || request.UserId <= 0 || request.ChatId <= 0)
                {
                    return BadRequest("Invalid request parameters");
                }

                // Получаем все сообщения в чате, которые еще не прочитаны пользователем
                var unreadMessages = await _context.Messages
                    .Where(m => m.ChatId == request.ChatId && 
                               m.UserId != request.UserId && // Не отмечаем свои сообщения
                               !m.MessageReads.Any(mr => mr.UserId == request.UserId))
                    .ToListAsync();

                // Создаем записи о прочтении
                var messageReads = unreadMessages.Select(m => new MessageRead
                {
                    MessageId = m.MessageId,
                    UserId = request.UserId,
                    ReadAt = DateTime.UtcNow
                }).ToList();

                if (messageReads.Any())
                {
                    _context.MessageReads.AddRange(messageReads);
                    await _context.SaveChangesAsync();
                }

                return Ok(new { markedCount = messageReads.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Получить количество непрочитанных сообщений для чата
        /// </summary>
        [HttpGet("unread-count/{chatId}")]
        public async Task<IActionResult> GetUnreadCount(int chatId, [FromQuery] int userId)
        {
            try
            {
                if (userId <= 0 || chatId <= 0)
                {
                    return BadRequest("Invalid parameters");
                }

                var unreadCount = await _context.Messages
                    .Where(m => m.ChatId == chatId && 
                               m.UserId != userId && // Не считаем свои сообщения
                               !m.MessageReads.Any(mr => mr.UserId == userId))
                    .CountAsync();

                return Ok(new { chatId, unreadCount });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Получить количество непрочитанных сообщений для всех чатов пользователя
        /// </summary>
        [HttpGet("unread-counts/{userId}")]
        public async Task<IActionResult> GetAllUnreadCounts(int userId)
        {
            try
            {
                if (userId <= 0)
                {
                    return BadRequest("Invalid user ID");
                }

                // Получаем все чаты пользователя
                var userChats = await _context.Members
                    .Where(m => m.UserId == userId)
                    .Select(m => m.ChatId)
                    .ToListAsync();

                // Получаем количество непрочитанных сообщений для каждого чата
                var unreadCounts = await _context.Messages
                    .Where(m => userChats.Contains(m.ChatId) && 
                               m.UserId != userId && // Не считаем свои сообщения
                               !m.MessageReads.Any(mr => mr.UserId == userId))
                    .GroupBy(m => m.ChatId)
                    .Select(g => new
                    {
                        chatId = g.Key,
                        unreadCount = g.Count()
                    })
                    .ToListAsync();

                return Ok(unreadCounts);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Отметить конкретное сообщение как прочитанное
        /// </summary>
        [HttpPost("mark-message-read")]
        public async Task<IActionResult> MarkMessageAsRead([FromBody] MarkMessageReadRequest request)
        {
            try
            {
                if (request == null || request.UserId <= 0 || request.MessageId <= 0)
                {
                    return BadRequest("Invalid request parameters");
                }

                // Проверяем, не прочитано ли уже сообщение
                var existingRead = await _context.MessageReads
                    .FirstOrDefaultAsync(mr => mr.MessageId == request.MessageId && mr.UserId == request.UserId);

                if (existingRead != null)
                {
                    return Ok(new { alreadyRead = true });
                }

                // Проверяем, что сообщение существует и не является сообщением самого пользователя
                var message = await _context.Messages
                    .FirstOrDefaultAsync(m => m.MessageId == request.MessageId && m.UserId != request.UserId);

                if (message == null)
                {
                    return NotFound("Message not found or is your own message");
                }

                // Создаем запись о прочтении
                var messageRead = new MessageRead
                {
                    MessageId = request.MessageId,
                    UserId = request.UserId,
                    ReadAt = DateTime.UtcNow
                };

                _context.MessageReads.Add(messageRead);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, readAt = messageRead.ReadAt });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        public class MarkAsReadRequest
        {
            public int UserId { get; set; }
            public int ChatId { get; set; }
        }

        public class MarkMessageReadRequest
        {
            public int UserId { get; set; }
            public long MessageId { get; set; }
        }

        public class LeaveServerRequest
        {
            public int UserId { get; set; }
        }

        public class ServerDto
        {
            public string ServerName { get; set; }
            public int OwnerId { get; set; }
            public bool IsPublic { get; set; }
            public string? Description { get; set; }
        }

        public class CreateGroupChatRequest
        {
            public string ChatName { get; set; }
            public List<int> UserIds { get; set; }
        }

        public class ChatCheckRequest
        {
            public int UserId { get; set; }
            public int ChatPartnerId { get; set; }
        }

        public class CreateChatRequest
        {
            public int User1Id { get; set; }
            public int User2Id { get; set; }
        }
        public class AddMemberServerRequest
        {
            public int RequestingUserId { get; set; }
            public int UserIdToAdd { get; set; }

            public bool IsValid()
            {
                return RequestingUserId > 0 && UserIdToAdd > 0;
            }
        }

        public class UpdateServerBannerRequest
        {
            public string? Banner { get; set; }
            public string? BannerColor { get; set; }
        }

        public class CreateChannelRequest
        {
            public string ChatName { get; set; }
            public int ChatType { get; set; }
            public int? CategoryId { get; set; }
        }
    }
}