using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using Messenger.Models;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using static Messenger.Controllers.RoleController;
using System.Text.Json;

namespace Messenger
{
    public class ServerHub : Hub
    {
        private readonly MessengerContext _context;

        public ServerHub(MessengerContext context)
        {
            _context = context;
        }

        public async Task JoinServerGroup(string serverId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, serverId);
        }

        public async Task MoveCategory(int serverId, int categoryId, int newPosition)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                Console.WriteLine($"Starting MoveCategory: serverId={serverId}, categoryId={categoryId}, newPosition={newPosition}");

                // Загружаем все категории с отслеживанием изменений
                var categories = await _context.ChatCategories
                    .Where(c => c.ServerId == serverId)
                    .Include(c => c.Chats)
                        .ThenInclude(ch => ch.Members)
                    .OrderBy(c => c.CategoryOrder)
                    .AsTracking()
                    .ToListAsync();

                var movedCategory = categories.FirstOrDefault(c => c.CategoryId == categoryId);
                if (movedCategory == null)
                {
                    throw new HubException("Category not found");
                }

                var currentPosition = categories.IndexOf(movedCategory);
                if (currentPosition == newPosition) return;

                // Перемещаем категорию
                categories.RemoveAt(currentPosition);
                categories.Insert(newPosition, movedCategory);

                // Обновляем порядок для всех категорий
                for (int i = 0; i < categories.Count; i++)
                {
                    categories[i].CategoryOrder = i;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Получаем обновленные категории для отправки клиентам
                var updatedCategories = await _context.ChatCategories
                    .Where(c => c.ServerId == serverId)
                    .Include(c => c.Chats)
                        .ThenInclude(ch => ch.Members)
                    .OrderBy(c => c.CategoryOrder)
                    .ToListAsync();

                // Получаем чаты без категории
                var uncategorizedChats = await _context.Chats
                    .Where(c => c.ServerId == serverId && c.CategoryId == null)
                    .Include(c => c.Members)
                    .OrderBy(c => c.ChatOrder)
                    .ToListAsync();

                // Создаем список всех категорий, включая null-категорию для чатов без категории
                var allCategories = new List<object>();
                
                // Добавляем чаты без категории как отдельную категорию
                if (uncategorizedChats.Any())
                {
                    allCategories.Add(new
                    {
                        CategoryId = (int?)null,
                        CategoryName = (string?)null,
                        CategoryOrder = -1,
                        IsPrivate = false,
                        AllowedRoleIds = (string?)null,
                        AllowedUserIds = (string?)null,
                        Chats = uncategorizedChats.Select(ch => new
                        {
                            ch.ChatId,
                            ch.Name,
                            ch.CategoryId,
                            ch.ChatOrder,
                            ch.TypeId,
                            ch.IsPrivate,
                            ch.AllowedRoleIds,
                            Members = ch.Members.Select(m => new { m.UserId }).ToList()
                        })
                    });
                }

                // Добавляем остальные категории
                allCategories.AddRange(updatedCategories.Select(c => new
                {
                    c.CategoryId,
                    c.CategoryName,
                    c.CategoryOrder,
                    c.IsPrivate,
                    c.AllowedRoleIds,
                    c.AllowedUserIds,
                    Chats = c.Chats.OrderBy(ch => ch.ChatOrder).Select(ch => new
                    {
                        ch.ChatId,
                        ch.Name,
                        ch.CategoryId,
                        ch.ChatOrder,
                        ch.TypeId,
                        ch.IsPrivate,
                        ch.AllowedRoleIds,
                        Members = ch.Members.Select(m => new { m.UserId }).ToList()
                    })
                }));

                await Clients.Group(serverId.ToString())
                    .SendAsync("CategoriesReordered", allCategories);

                Console.WriteLine("Category move completed successfully");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Console.WriteLine($"MoveCategory error: {ex}");
                throw new HubException($"Category move failed: {ex.Message}");
            }
        }

        public async Task MoveChat(int serverId, int chatId, int sourceCategoryId, int targetCategoryId, int newPosition)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                Console.WriteLine($"Starting MoveChat: serverId={serverId}, chatId={chatId}, from={sourceCategoryId}, to={targetCategoryId}, pos={newPosition}");

                // Загружаем все чаты с отслеживанием изменений
                var allChats = await _context.Chats
                    .Where(c => c.ServerId == serverId)
                    .AsTracking()
                    .ToListAsync();

                // Находим перемещаемый чат
                var chat = allChats.FirstOrDefault(c => c.ChatId == chatId);
                if (chat == null)
                {
                    throw new HubException("Chat not found");
                }

                // Обработка перемещения для чатов без категории
                if (sourceCategoryId == 0 && targetCategoryId == 0)
                {
                    Console.WriteLine("Moving within uncategorized chats");
                    // Перемещение внутри чатов без категории
                    var chats = allChats.Where(c => c.CategoryId == null).OrderBy(c => c.ChatOrder).ToList();
                    var currentPosition = chat.ChatOrder ?? 0;

                    // Если перемещаем вниз
                    if (newPosition > currentPosition)
                    {
                        foreach (var c in chats.Where(c => 
                            c.ChatOrder > currentPosition && 
                            c.ChatOrder <= newPosition && 
                            c.ChatId != chatId))
                        {
                            c.ChatOrder--;
                            Console.WriteLine($"Moving chat {c.ChatId} up to position {c.ChatOrder}");
                        }
                    }
                    // Если перемещаем вверх
                    else if (newPosition < currentPosition)
                    {
                        foreach (var c in chats.Where(c => 
                            c.ChatOrder >= newPosition && 
                            c.ChatOrder < currentPosition && 
                            c.ChatId != chatId))
                        {
                            c.ChatOrder++;
                            Console.WriteLine($"Moving chat {c.ChatId} down to position {c.ChatOrder}");
                        }
                    }

                    chat.ChatOrder = newPosition;
                    Console.WriteLine($"Setting chat {chatId} to position {newPosition}");
                }
                else if (sourceCategoryId == 0)
                {
                    // Перемещение из чатов без категории в категорию
                    // Сначала обновляем порядок оставшихся чатов без категории
                    var sourceChats = allChats.Where(c => c.CategoryId == null && c.ChatId != chatId).OrderBy(c => c.ChatOrder);
                    var order = 0;
                    foreach (var c in sourceChats)
                    {
                        c.ChatOrder = order++;
                    }

                    // Затем обновляем порядок чатов в целевой категории
                    var targetChats = allChats.Where(c => c.CategoryId == targetCategoryId).OrderBy(c => c.ChatOrder);
                    foreach (var c in targetChats.Where(c => c.ChatOrder >= newPosition))
                    {
                        c.ChatOrder++;
                    }

                    chat.CategoryId = targetCategoryId;
                    chat.ChatOrder = newPosition;
                }
                else if (targetCategoryId == 0)
                {
                    // Перемещение из категории в чаты без категории
                    // Сначала обновляем порядок оставшихся чатов в исходной категории
                    var sourceChats = allChats.Where(c => c.CategoryId == sourceCategoryId && c.ChatId != chatId).OrderBy(c => c.ChatOrder);
                    var order = 0;
                    foreach (var c in sourceChats)
                    {
                        c.ChatOrder = order++;
                    }

                    // Затем обновляем порядок чатов без категории
                    var targetChats = allChats.Where(c => c.CategoryId == null).OrderBy(c => c.ChatOrder);
                    foreach (var c in targetChats.Where(c => c.ChatOrder >= newPosition))
                    {
                        c.ChatOrder++;
                    }

                    chat.CategoryId = null;
                    chat.ChatOrder = newPosition;
                }
                else
                {
                    // Стандартное перемещение между категориями
                    // Сначала обновляем порядок оставшихся чатов в исходной категории
                    var sourceChats = allChats.Where(c => c.CategoryId == sourceCategoryId && c.ChatId != chatId).OrderBy(c => c.ChatOrder);
                    var order = 0;
                    foreach (var c in sourceChats)
                    {
                        c.ChatOrder = order++;
                    }

                    // Затем обновляем порядок чатов в целевой категории
                    var targetChats = allChats.Where(c => c.CategoryId == targetCategoryId).OrderBy(c => c.ChatOrder);
                    foreach (var c in targetChats.Where(c => c.ChatOrder >= newPosition))
                    {
                        c.ChatOrder++;
                    }

                    chat.CategoryId = targetCategoryId;
                    chat.ChatOrder = newPosition;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Получаем обновленные категории для отправки клиентам
                var updatedCategories = await _context.ChatCategories
                    .Where(c => c.ServerId == serverId)
                    .Include(c => c.Chats)
                        .ThenInclude(ch => ch.Members)
                    .OrderBy(c => c.CategoryOrder)
                    .ToListAsync();

                // Получаем обновленные чаты без категории
                var updatedUncategorizedChats = await _context.Chats
                    .Where(c => c.ServerId == serverId && c.CategoryId == null)
                    .Include(c => c.Members)
                    .OrderBy(c => c.ChatOrder)
                    .ToListAsync();

                // Создаем список всех категорий, включая null-категорию для чатов без категории
                var allCategories = new List<object>();
                
                // Добавляем чаты без категории как отдельную категорию
                if (updatedUncategorizedChats.Any())
                {
                    allCategories.Add(new
                    {
                        CategoryId = (int?)null,
                        CategoryName = (string?)null,
                        CategoryOrder = -1,
                        IsPrivate = false,
                        AllowedRoleIds = (string?)null,
                        AllowedUserIds = (string?)null,
                        Chats = updatedUncategorizedChats.Select(ch => new
                        {
                            ch.ChatId,
                            ch.Name,
                            ch.CategoryId,
                            ch.ChatOrder,
                            ch.TypeId,
                            ch.IsPrivate,
                            ch.AllowedRoleIds,
                            Members = ch.Members.Select(m => new { m.UserId }).ToList()
                        })
                    });
                }

                // Добавляем остальные категории
                allCategories.AddRange(updatedCategories.Select(c => new
                {
                    c.CategoryId,
                    c.CategoryName,
                    c.CategoryOrder,
                    c.IsPrivate,
                    c.AllowedRoleIds,
                    c.AllowedUserIds,
                    Chats = c.Chats.OrderBy(ch => ch.ChatOrder).Select(ch => new
                    {
                        ch.ChatId,
                        ch.Name,
                        ch.CategoryId,
                        ch.ChatOrder,
                        ch.TypeId,
                        ch.IsPrivate,
                        ch.AllowedRoleIds,
                        Members = ch.Members.Select(m => new { m.UserId }).ToList()
                    })
                }));

                await Clients.Group(serverId.ToString())
                    .SendAsync("ChatsReordered", allCategories);

                Console.WriteLine("Chat move completed successfully");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Console.WriteLine($"MoveChat error: {ex}");
                throw new HubException($"Chat move failed: {ex.Message}");
            }
        }

        public async Task CreateChat(int serverId, int? categoryId, string chatName, int chatType)
        {
            try
            {
                if (chatType != 3 && chatType != 4)
                    throw new HubException("Недопустимый тип чата");

                // Получаем максимальный ChatOrder для чатов без категории, если categoryId == null
                int chatOrder;
                if (categoryId == null)
                {
                    chatOrder = await _context.Chats
                        .Where(c => c.ServerId == serverId && c.CategoryId == null)
                        .Select(c => (int?)c.ChatOrder)
                        .MaxAsync() ?? -1;
                    chatOrder++;
                }
                else
                {
                    var category = await _context.ChatCategories
                        .Include(c => c.Chats)
                        .FirstOrDefaultAsync(c =>
                            c.CategoryId == categoryId &&
                            c.ServerId == serverId);

                    if (category == null)
                        throw new HubException("Категория не найдена");

                    chatOrder = category.Chats.Count;
                }

                var newChat = new Chat
                {
                    TypeId = chatType,
                    CategoryId = categoryId,
                    Name = chatName.Trim(),
                    ServerId = serverId,
                    CreatedAt = DateTime.UtcNow,
                    ChatOrder = chatOrder
                };

                _context.Chats.Add(newChat);
                await _context.SaveChangesAsync();

                // Отправка упрощенного DTO
                await Clients.Group(serverId.ToString()).SendAsync("ChatCreated", new
                {
                    newChat.ChatId,
                    newChat.Name,
                    newChat.TypeId,
                    newChat.CategoryId,
                    newChat.ChatOrder
                }, categoryId);
            }
            catch (DbUpdateException ex)
            {
                var errorMessage = ex.InnerException?.Message ?? ex.Message;
                Console.WriteLine($"Database error: {errorMessage}");
                throw new HubException("Ошибка при сохранении в базу данных");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"CreateChat error: {ex}");
                throw new HubException(ex.Message);
            }
        }
        public async Task UpdateChatName(int serverId, int chatId, string newName)
        {
            try
            {
                var chat = await _context.Chats
                    .FirstOrDefaultAsync(c => c.ChatId == chatId && c.ServerId == serverId);

                if (chat == null) throw new HubException("Чат не найден");

                chat.Name = newName.Trim();
                await _context.SaveChangesAsync();

                await Clients.Group(serverId.ToString())
                    .SendAsync("ChatUpdated", chat);
            }
            catch (Exception ex)
            {
                throw new HubException($"Ошибка изменения названия чата: {ex.Message}");
            }
        }

        public async Task DeleteChat(int serverId, int chatId)
        {
            try
            {
                var chat = await _context.Chats
                    .FirstOrDefaultAsync(c => c.ChatId == chatId && c.ServerId == serverId);

                if (chat == null) throw new HubException("Чат не найден");

                _context.Chats.Remove(chat);
                await _context.SaveChangesAsync();

                await Clients.Group(serverId.ToString())
                    .SendAsync("ChatDeleted", chatId, chat.CategoryId);
            }
            catch (Exception ex)
            {
                throw new HubException($"Ошибка удаления чата: {ex.Message}");
            }
        }

        // ServerHub.cs
       public async Task CreateCategory(int serverId, string categoryName)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Проверяем существование сервера
                var serverExists = await _context.Servers
                    .AnyAsync(s => s.ServerId == serverId);

                if (!serverExists) throw new HubException("Сервер не найден");

                // Проверяем уникальность имени категории
                var categoryExists = await _context.ChatCategories
                    .AnyAsync(c => c.ServerId == serverId && c.CategoryName == categoryName);

                if (categoryExists)
                    throw new HubException("Категория с таким именем уже существует");

                // Получаем текущее количество категорий для определения порядка
                var categoryOrder = await _context.ChatCategories
                    .Where(c => c.ServerId == serverId)
                    .CountAsync();

                var newCategory = new ChatCategory
                {
                    CategoryName = categoryName.Trim(),
                    ServerId = serverId,
                    CategoryOrder = categoryOrder,
                    IsPrivate = false // По умолчанию категория публичная
                };

                _context.ChatCategories.Add(newCategory);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                await Clients.Group(serverId.ToString())
                    .SendAsync("CategoryCreated", newCategory);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Console.WriteLine($"Error creating category: {ex}");
                throw new HubException($"Ошибка создания категории: {ex.Message}");
            }
        }

         public async Task CreatePrivateCategory(int serverId, string categoryName, List<int> allowedRoleIds, List<int> allowedUserIds)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Проверяем существование сервера
                var serverExists = await _context.Servers
                    .AnyAsync(s => s.ServerId == serverId);

                if (!serverExists) throw new HubException("Сервер не найден");

                // Проверяем уникальность имени категории
                var categoryExists = await _context.ChatCategories
                    .AnyAsync(c => c.ServerId == serverId && c.CategoryName == categoryName);

                if (categoryExists)
                    throw new HubException("Категория с таким именем уже существует");

                // Получаем текущее количество категорий для определения порядка
                var categoryOrder = await _context.ChatCategories
                    .Where(c => c.ServerId == serverId)
                    .CountAsync();

                var newCategory = new ChatCategory
                {
                    CategoryName = categoryName.Trim(),
                    ServerId = serverId,
                    CategoryOrder = categoryOrder,
                    IsPrivate = true,
                    AllowedRoleIds = System.Text.Json.JsonSerializer.Serialize(allowedRoleIds),
                    AllowedUserIds = System.Text.Json.JsonSerializer.Serialize(allowedUserIds)
                };

                _context.ChatCategories.Add(newCategory);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                await Clients.Group(serverId.ToString())
                    .SendAsync("CategoryCreated", newCategory);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Console.WriteLine($"Error creating private category: {ex}");
                throw new HubException($"Ошибка создания приватной категории: {ex.Message}");
            }
        }

        public async Task DeleteCategory(int serverId, int categoryId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                Console.WriteLine($"Starting category deletion: {categoryId}");

                var category = await _context.ChatCategories
                    .Include(c => c.Chats)
                        .ThenInclude(chat => chat.Messages)
                    .FirstOrDefaultAsync(c => c.CategoryId == categoryId && c.ServerId == serverId);

                if (category == null)
                {
                    Console.WriteLine("Category not found");
                    throw new HubException("Категория не найдена");
                }

                Console.WriteLine($"Found {category.Chats.Count} chats in category");

                foreach (var chat in category.Chats)
                {
                    Console.WriteLine($"Deleting {chat.Messages.Count} messages from chat {chat.ChatId}");
                    _context.Messages.RemoveRange(chat.Messages);
                }

                Console.WriteLine("Deleting chats...");
                _context.Chats.RemoveRange(category.Chats);

                Console.WriteLine("Deleting category...");
                _context.ChatCategories.Remove(category);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                Console.WriteLine("Deletion completed successfully");

                await Clients.Group(serverId.ToString())
                    .SendAsync("CategoryDeleted", categoryId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error during deletion: {ex}");
                await transaction.RollbackAsync();
                throw new HubException($"Ошибка удаления категории: {ex.Message}");
            }
        }

        public async Task GetRoles(int serverId)
        {
            try
            {
                var roles = await _context.ServerRoles
                    .Where(r => r.ServerId == serverId)
                    .Select(r => new
                    {
                        r.RoleId,
                        r.RoleName,
                        Permissions = JsonSerializer.Serialize(r.Permissions, new JsonSerializerOptions()),
                        r.Color
                    })
                    .AsNoTracking()
                    .ToListAsync();

                await Clients.Caller.SendAsync("RolesLoaded", roles);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetRoles error: {ex}");
                throw new HubException($"Failed to get roles: {ex.Message}");
            }
        }
       public async Task CreateRole(int serverId, ServerRoleCreateRequest request, int currentUserId)
        {
            try
            {
                Console.WriteLine($"Creating role: {request.RoleName} for server {serverId}");
                
                // Проверяем, существует ли уже роль с таким именем на сервере
                var existingRole = await _context.ServerRoles
                    .FirstOrDefaultAsync(r => r.ServerId == serverId && r.RoleName == request.RoleName);

                if (existingRole != null)
                {
                    throw new HubException($"Роль с именем '{request.RoleName}' уже существует на этом сервере");
                }
                
                var role = new ServerRole
                {
                    ServerId = serverId,
                    RoleName = request.RoleName,
                    Permissions = request.Permissions,
                    Color = request.Color
                };

                _context.ServerRoles.Add(role);
                await _context.SaveChangesAsync();

                // Логируем действие
                await LogAuditAction(
                    serverId,
                    currentUserId,
                    "ROLE_CREATED",
                    $"Создана новая роль '{role.RoleName}'"
                );

                await Clients.Group(serverId.ToString())
                    .SendAsync("RoleCreated", new
                    {
                        role.RoleId,
                        role.RoleName,
                        role.Permissions,
                        role.Color
                    });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating role: {ex}");
                if (ex is HubException)
                {
                    throw;
                }
                throw new HubException($"Ошибка создания роли: {ex.Message}");
            }
        }

        public async Task GetServerMembers(int serverId)
        {
            try
            {
                Console.WriteLine($"GetServerMembers called for serverId: {serverId}");
                var membersData = await _context.ServerMembers
                    .Where(sm => sm.ServerId == serverId)
                    .Include(sm => sm.User)
                        .ThenInclude(u => u.UserProfile)
                    .Include(sm => sm.User)
                        .ThenInclude(u => u.UserServerRoles)
                        .ThenInclude(usr => usr.Role)
                    .Select(sm => new
                    {
                        sm.UserId,
                        sm.User.Username,
                        Roles = sm.User.UserServerRoles
                            .Where(usr => usr.ServerId == serverId && usr.Role != null) // Фильтр null
                            .Select(usr => new
                            {
                                usr.Role.RoleId,
                                usr.Role.RoleName,
                                usr.Role.Color,
                                usr.Role.Permissions
                            })
                            .Where(r => r.RoleId > 0), // Дополнительная проверка
                        Avatar = sm.User.UserProfile.Avatar ?? null,
                        AvatarColor = sm.User.UserProfile.AvatarColor ?? "#5865F2"
                    })
                    .AsNoTracking()
                    .ToListAsync();

                var members = membersData.Select(member => new
                {
                    member.UserId,
                    member.Username,
                    Roles = member.Roles.Select(role => {
                        Dictionary<string, bool> permissions = new Dictionary<string, bool>();
                        
                        if (!string.IsNullOrEmpty(role.Permissions))
                        {
                            try
                            {
                                Console.WriteLine($"Attempting to deserialize permissions for role {role.RoleId}: {role.Permissions}");
                                permissions = JsonSerializer.Deserialize<Dictionary<string, bool>>(
                                    role.Permissions,
                                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new Dictionary<string, bool>();
                            }
                            catch (JsonException ex)
                            {
                                Console.WriteLine($"Failed to deserialize permissions for role {role.RoleId}: {ex.Message}");
                                Console.WriteLine($"Raw permissions data: {role.Permissions}");
                                permissions = new Dictionary<string, bool>();
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"Unexpected error deserializing permissions for role {role.RoleId}: {ex.Message}");
                                permissions = new Dictionary<string, bool>();
                            }
                        }
                        
                        return new
                        {
                            role.RoleId,
                            role.RoleName,
                            role.Color,
                            Permissions = permissions
                        };
                    }),
                    member.Avatar,
                    member.AvatarColor
                }).ToList();

                Console.WriteLine($"GetServerMembers: Found {members.Count} members for server {serverId}");
                await Clients.Caller.SendAsync("ServerMembersLoaded", members);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetServerMembers error: {ex}");
                throw new HubException($"Failed to get members: {ex.Message}");
            }
        }

        public async Task AssignRole(int userId, int roleId, int currentUserId)
        {
            try
            {
                var role = await _context.ServerRoles.FindAsync(roleId);
                if (role == null) throw new HubException("Роль не найдена");

                var targetUser = await _context.Users.FindAsync(userId);
                if (targetUser == null) throw new HubException("Пользователь не найден");

                // Проверяем, не назначена ли уже эта роль
                var existingAssignment = await _context.UserServerRoles
                    .FirstOrDefaultAsync(usr => usr.UserId == userId && usr.RoleId == roleId);

                if (existingAssignment != null)
                {
                    throw new HubException("Эта роль уже назначена пользователю");
                }

                var assignment = new UserServerRole
                {
                    UserId = userId,
                    RoleId = roleId,
                    ServerId = role.ServerId
                };

                _context.UserServerRoles.Add(assignment);
                await _context.SaveChangesAsync();

                // Логируем действие
                await LogAuditAction(
                    role.ServerId,
                    currentUserId,
                    "ROLE_ASSIGNED",
                    $"Роль '{role.RoleName}' назначена пользователю {targetUser.Username}"
                );

                Dictionary<string, bool> permissions = new Dictionary<string, bool>();
                
                if (!string.IsNullOrEmpty(role.Permissions))
                {
                    Console.WriteLine($"AssignRole: Processing permissions for role {role.RoleId}: {role.Permissions}");
                    permissions = DeserializePermissions(role.Permissions);
                }

                await Clients.Group(role.ServerId.ToString())
                    .SendAsync("RoleAssigned", userId, new
                    {
                        role.RoleId,
                        role.RoleName,
                        role.Color,
                        Permissions = permissions
                    });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error assigning role: {ex}");
                throw new HubException($"Ошибка назначения роли: {ex.Message}");
            }
        }

        public async Task RemoveRole(int userId, int roleId, int currentUserId)
        {
            try
            {
                Console.WriteLine($"Removing role: userId={userId}, roleId={roleId}, currentUserId={currentUserId}");

                var assignment = await _context.UserServerRoles
                    .Include(usr => usr.Role)
                    .Include(usr => usr.User)
                    .FirstOrDefaultAsync(usr => usr.UserId == userId && usr.RoleId == roleId);

                if (assignment == null)
                {
                    Console.WriteLine("Assignment not found");
                    return;
                }

                var serverId = assignment.Role.ServerId;
                var roleName = assignment.Role.RoleName;
                var targetUser = assignment.User;

                Console.WriteLine($"Found assignment: serverId={serverId}, roleName={roleName}, username={targetUser.Username}");

                // Логируем действие перед удалением
                await LogAuditAction(
                    serverId,
                    currentUserId,
                    "ROLE_REMOVED",
                    $"Роль '{roleName}' удалена у пользователя {targetUser.Username}"
                );

                _context.UserServerRoles.Remove(assignment);
                await _context.SaveChangesAsync();

                Console.WriteLine("Role removed successfully");

                // Получаем оставшиеся роли пользователя
                var remainingRoles = await _context.UserServerRoles
                    .Where(usr => usr.UserId == userId && usr.ServerId == serverId)
                    .Include(usr => usr.Role)
                    .Select(usr => new
                    {
                        usr.Role.RoleId,
                        usr.Role.RoleName,
                        usr.Role.Permissions,
                        usr.Role.Color
                    })
                    .ToListAsync();

                // Объединяем права из оставшихся ролей
                var mergedPermissions = new Dictionary<string, bool>();
                foreach (var role in remainingRoles)
                {
                    if (!string.IsNullOrEmpty(role.Permissions))
                    {
                        Console.WriteLine($"RemoveRole: Processing permissions for role {role.RoleId}: {role.Permissions}");
                        var rolePermissions = DeserializePermissions(role.Permissions);

                        foreach (var (permission, value) in rolePermissions)
                        {
                            if (mergedPermissions.ContainsKey(permission))
                            {
                                mergedPermissions[permission] = mergedPermissions[permission] || value;
                            }
                            else
                            {
                                mergedPermissions[permission] = value;
                            }
                        }
                    }
                }

                // Отправляем уведомление об удалении роли всем клиентам
                await Clients.Group(serverId.ToString())
                    .SendAsync("RoleRemoved", userId, roleId);

                // Отправляем обновленные роли пользователю
                await Clients.User(userId.ToString())
                    .SendAsync("UserRolesLoaded", remainingRoles);

                // Отправляем обновленные права только целевому пользователю
                await Clients.User(userId.ToString())
                    .SendAsync("UserPermissionsUpdated", userId, mergedPermissions);

                Console.WriteLine("Notifications sent successfully");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error removing role: {ex}");
                throw new HubException($"Ошибка удаления роли: {ex.Message}");
            }
        }

        public async Task KickMember(int serverId, int userId, int currentUserId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Получаем участника сервера
                var member = await _context.ServerMembers
                    .Include(sm => sm.User)
                    .FirstOrDefaultAsync(sm => sm.ServerId == serverId && sm.UserId == userId);

                if (member == null) throw new HubException("Участник не найден");

                // Получаем запись о порядке серверов для пользователя
                var serverOrder = await _context.UserServerOrders
                    .FirstOrDefaultAsync(uso => uso.ServerId == serverId && uso.UserId == userId);

                if (serverOrder != null)
                {
                    var position = serverOrder.Position;
                    
                    // Удаляем запись о порядке
                    _context.UserServerOrders.Remove(serverOrder);
                    
                    // Обновляем позиции остальных серверов
                    var otherServers = await _context.UserServerOrders
                        .Where(uso => uso.UserId == userId && uso.Position > position)
                        .ToListAsync();

                    foreach (var order in otherServers)
                    {
                        order.Position--;
                    }
                }

                // Удаляем все роли пользователя на сервере
                var userRoles = await _context.UserServerRoles
                    .Where(usr => usr.UserId == userId && usr.ServerId == serverId)
                    .ToListAsync();
                _context.UserServerRoles.RemoveRange(userRoles);

                // Удаляем участника из всех чатов сервера
                var chatMembers = await _context.Members
                    .Where(m => m.UserId == userId && m.Chat.ServerId == serverId)
                    .ToListAsync();
                _context.Members.RemoveRange(chatMembers);

                // Логируем действие
                await LogAuditAction(
                    serverId,
                    currentUserId,
                    "MEMBER_KICKED",
                    $"Пользователь {member.User.Username} удален с сервера"
                );

                // Удаляем участника из сервера
                _context.ServerMembers.Remove(member);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Отправляем уведомление всем клиентам
                await Clients.Group(serverId.ToString())
                    .SendAsync("MemberKicked", userId);

                // Отправляем уведомление исключенному пользователю
                await Clients.User(userId.ToString())
                    .SendAsync("YouWereKicked", serverId);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Console.WriteLine($"Error kicking member: {ex}");
                throw new HubException($"Ошибка удаления участника: {ex.Message}");
            }
        }

        public async Task GetUserRoles(int userId, int serverId)
        {
            try
            {
                var rolesData = await _context.UserServerRoles
                    .Where(usr => usr.UserId == userId && usr.ServerId == serverId)
                    .Include(usr => usr.Role)
                    .Select(usr => new
                    {
                        RoleId = usr.Role.RoleId,
                        RoleName = usr.Role.RoleName,
                        Permissions = usr.Role.Permissions,
                        Color = usr.Role.Color
                    })
                    .AsNoTracking()
                    .ToListAsync();

                // Десериализуем разрешения для каждой роли
                var roles = rolesData.Select(role => {
                    Dictionary<string, bool> permissions = new Dictionary<string, bool>();
                    
                    if (!string.IsNullOrEmpty(role.Permissions))
                    {
                        Console.WriteLine($"GetUserRoles: Processing permissions for role {role.RoleId}: {role.Permissions}");
                        permissions = DeserializePermissions(role.Permissions);
                    }
                    
                    return new
                    {
                        role.RoleId,
                        role.RoleName,
                        role.Color,
                        Permissions = permissions
                    };
                }).ToList();

                await Clients.Caller.SendAsync("UserRolesLoaded", roles);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetUserRoles error: {ex}");
                await Clients.Caller.SendAsync("UserRolesError", ex.Message);
            }
        }

        public async Task NotifyPermissionsUpdate(int userId, int serverId, string permissionsJson)
        {
            try
            {
                Console.WriteLine($"Updating permissions for user {userId} in server {serverId}");
                Console.WriteLine($"Permissions JSON: {permissionsJson}");

                if (string.IsNullOrWhiteSpace(permissionsJson))
                    throw new ArgumentException("Permissions JSON cannot be empty");

                Dictionary<string, bool> permissions = new Dictionary<string, bool>();
                
                Console.WriteLine($"NotifyPermissionsUpdate: Processing permissions JSON: {permissionsJson}");
                permissions = DeserializePermissions(permissionsJson);

                // Отправляем обновление только целевому пользователю
                await Clients.User(userId.ToString())
                    .SendAsync("UserPermissionsUpdated", userId, permissions);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in NotifyPermissionsUpdate: {ex}");
                // Не выбрасываем исключение, так как это не критическая ошибка
                // Права будут обновлены при следующем обновлении страницы
            }
        }
        public async Task UpdateServerName(int serverId, string newName)
        {
            try
            {
                var server = await _context.Servers
                    .FirstOrDefaultAsync(s => s.ServerId == serverId);

                if (server == null) throw new HubException("Сервер не найден");

                server.Name = newName.Trim();
                await _context.SaveChangesAsync();

                await Clients.Group(serverId.ToString())
                    .SendAsync("ServerNameUpdated", serverId, newName);
            }
            catch (Exception ex)
            {
                throw new HubException($"Ошибка обновления имени: {ex.Message}");
            }
        }
        public async Task<object> GetServerInfo(int serverId)
        {
            return await _context.Servers
                .Where(s => s.ServerId == serverId)
                .Select(s => new {
                    s.ServerId,
                    s.Name,
                    s.OwnerId,
                    s.Banner,
                    s.BannerColor,
                    s.Avatar
                })
                .FirstOrDefaultAsync();
        }

        public async Task UpdateRole(int roleId, ServerRoleCreateRequest request, int currentUserId)
        {
            try
            {
                var role = await _context.ServerRoles.FindAsync(roleId);
                if (role == null) throw new HubException("Роль не найдена");

                var existingRole = await _context.ServerRoles
                    .FirstOrDefaultAsync(r => r.ServerId == role.ServerId && 
                                            r.RoleName == request.RoleName && 
                                            r.RoleId != roleId);

                if (existingRole != null)
                {
                    throw new HubException($"Роль с именем '{request.RoleName}' уже существует на этом сервере");
                }

                var oldName = role.RoleName;
                role.RoleName = request.RoleName;
                role.Permissions = request.Permissions;
                role.Color = request.Color;

                await _context.SaveChangesAsync();

                // Логируем действие
                await LogAuditAction(
                    role.ServerId,
                    currentUserId,
                    "ROLE_UPDATED",
                    $"Роль '{oldName}' переименована в '{role.RoleName}'"
                );

                await Clients.Group(role.ServerId.ToString())
                    .SendAsync("RoleUpdated", new
                    {
                        role.RoleId,
                        role.RoleName,
                        role.Permissions,
                        role.Color
                    });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating role: {ex}");
                throw new HubException($"Ошибка обновления роли: {ex.Message}");
            }
        }

        public async Task DeleteRole(int roleId, int currentUserId)
        {
            try
            {
                var role = await _context.ServerRoles
                    .Include(r => r.UserServerRoles)
                    .FirstOrDefaultAsync(r => r.RoleId == roleId);

                if (role == null) throw new HubException("Роль не найдена");

                // Логируем действие перед удалением
                await LogAuditAction(
                    role.ServerId,
                    currentUserId,
                    "ROLE_DELETED",
                    $"Удалена роль '{role.RoleName}'"
                );

                _context.UserServerRoles.RemoveRange(role.UserServerRoles);
                _context.ServerRoles.Remove(role);
                await _context.SaveChangesAsync();

                await Clients.Group(role.ServerId.ToString())
                    .SendAsync("RoleDeleted", roleId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting role: {ex}");
                throw new HubException($"Ошибка удаления роли: {ex.Message}");
            }
        }

        public async Task GetAuditLog(int serverId, int page = 1, int pageSize = 50)
        {
            try
            {
                var auditLogs = await _context.ServerAuditLogs
                    .Where(log => log.ServerId == serverId)
                    .Include(log => log.User)
                    .OrderByDescending(log => log.Timestamp)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(log => new
                    {
                        log.AuditLogId,
                        log.ActionType,
                        log.Details,
                        log.Timestamp,
                        User = new
                        {
                            log.User.UserId,
                            log.User.Username,
                            Avatar = log.User.UserProfile.Avatar,
                            AvatarColor = log.User.UserProfile.AvatarColor
                        }
                    })
                    .ToListAsync();

                await Clients.Caller.SendAsync("AuditLogLoaded", auditLogs);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetAuditLog error: {ex}");
                throw new HubException($"Ошибка получения журнала аудита: {ex.Message}");
            }
        }

        private async Task LogAuditAction(int serverId, int userId, string actionType, string details)
        {
            try
            {
                var auditLog = new ServerAuditLog
                {
                    ServerId = serverId,
                    UserId = userId,
                    ActionType = actionType,
                    Details = details,
                    Timestamp = DateTime.UtcNow
                };

                _context.ServerAuditLogs.Add(auditLog);
                await _context.SaveChangesAsync();

                // Отправляем новую запись всем клиентам в группе сервера
                await Clients.Group(serverId.ToString())
                    .SendAsync("AuditLogEntryAdded", new
                    {
                        auditLog.AuditLogId,
                        auditLog.ActionType,
                        auditLog.Details,
                        auditLog.Timestamp,
                        User = new
                        {
                            auditLog.User.UserId,
                            auditLog.User.Username,
                            Avatar = auditLog.User.UserProfile.Avatar,
                            AvatarColor = auditLog.User.UserProfile.AvatarColor
                        }
                    });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"LogAuditAction error: {ex}");
            }
        }

        private Dictionary<string, bool> DeserializePermissions(string permissionsJson)
        {
            if (string.IsNullOrEmpty(permissionsJson))
                return new Dictionary<string, bool>();

            try
            {
                // Убираем лишние экранирования, если они есть
                string cleanPermissions = permissionsJson;
                if (cleanPermissions.StartsWith("\"") && cleanPermissions.EndsWith("\""))
                {
                    cleanPermissions = cleanPermissions.Substring(1, cleanPermissions.Length - 2);
                    cleanPermissions = cleanPermissions.Replace("\\\"", "\"");
                }
                
                Console.WriteLine($"DeserializePermissions: Cleaned permissions: {cleanPermissions}");
                
                return JsonSerializer.Deserialize<Dictionary<string, bool>>(cleanPermissions) ?? new Dictionary<string, bool>();
            }
            catch (JsonException ex)
            {
                Console.WriteLine($"DeserializePermissions: Failed to deserialize permissions: {ex.Message}");
                Console.WriteLine($"DeserializePermissions: Raw permissions data: {permissionsJson}");
                return new Dictionary<string, bool>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"DeserializePermissions: Unexpected error deserializing permissions: {ex.Message}");
                return new Dictionary<string, bool>();
            }
        }

        public class ServerRoleCreateRequest
        {
            public string RoleName { get; set; }
            public string Color { get; set; }
            public string Permissions { get; set; }
        }

    }
}