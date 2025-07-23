using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Messenger.Models;
using System.Linq;

namespace Messenger.Hubs
{
    public class ChatListHub : Hub
    {
        private readonly MessengerContext _context;
        private readonly IHubContext<ChatListHub> _hubContext;

        public ChatListHub(MessengerContext context, IHubContext<ChatListHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        public async Task JoinChatGroup(int chatId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"chat-{chatId}");
        }

        public async Task LeaveChatGroup(int chatId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"chat-{chatId}");
        }

        public async Task GetUserChats(int userId)
        {
            try
            {
                var oneOnOneChats = await _context.Members
                    .Where(m => m.UserId == userId)
                    .Select(m => m.Chat)
                    .Where(c => c.TypeId == 1) // Личные чаты
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
                        avatarUrl = _context.Members
                            .Where(m => m.ChatId == c.ChatId && m.UserId != userId)
                            .Select(m => m.User.UserProfile.Avatar)
                            .FirstOrDefault(),
                        avatarColor = _context.Members
                            .Where(m => m.ChatId == c.ChatId && m.UserId != userId)
                            .Select(m => m.User.UserProfile.AvatarColor)
                            .FirstOrDefault(),
                        user_status = _context.Members
                            .Where(m => m.ChatId == c.ChatId && m.UserId != userId)
                            .Select(m => m.User.Status)
                            .FirstOrDefault() ?? "offline",
                        last_seen = _context.Members
                            .Where(m => m.ChatId == c.ChatId && m.UserId != userId)
                            .Select(m => m.User.LastSeen)
                            .FirstOrDefault(),
                        isGroupChat = false,
                        lastMessage = _context.Messages
                            .Where(m => m.ChatId == c.ChatId)
                            .OrderByDescending(m => m.CreatedAt)
                            .Select(m => m.Content)
                            .FirstOrDefault(),
                        lastMessageTime = _context.Messages
                            .Where(m => m.ChatId == c.ChatId)
                            .OrderByDescending(m => m.CreatedAt)
                            .Select(m => m.CreatedAt)
                            .FirstOrDefault() ?? c.CreatedAt
                    })
                    .ToListAsync();

                var groupChats = await _context.Members
                    .Where(m => m.UserId == userId)
                    .Select(m => m.Chat)
                    .Where(c => c.TypeId == 2) // Групповые чаты
                    .Select(c => new
                    {
                        chat_id = c.ChatId,
                        username = c.Name,
                        user_id = userId,
                        avatarUrl = (string)null, // Групповые чаты не имеют аватаров
                        avatarColor = (string)null, // Групповые чаты не имеют аватаров
                        isGroupChat = true,
                        lastMessage = _context.Messages
                            .Where(m => m.ChatId == c.ChatId)
                            .OrderByDescending(m => m.CreatedAt)
                            .Select(m => m.Content)
                            .FirstOrDefault(),
                        lastMessageTime = _context.Messages
                            .Where(m => m.ChatId == c.ChatId)
                            .OrderByDescending(m => m.CreatedAt)
                            .Select(m => m.CreatedAt)
                            .FirstOrDefault() ?? c.CreatedAt
                    })
                    .ToListAsync();

                // Объединяем и сортируем чаты по времени последнего сообщения
                var allChats = oneOnOneChats
                    .Cast<dynamic>()
                    .Concat(groupChats.Cast<dynamic>())
                    .OrderByDescending(c => c.lastMessageTime)
                    .ToList();

                // Логируем данные аватаров для отладки
                foreach (var chat in allChats)
                {
                    Console.WriteLine($"ChatListHub: Chat {chat.chat_id} - username={chat.username}, avatarUrl={chat.avatarUrl}, avatarColor={chat.avatarColor}");
                }

                await Clients.Caller.SendAsync("ReceiveChats", allChats);
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", "Произошла ошибка при получении списка чатов: " + ex.Message);
                Console.Error.WriteLine($"Error in GetUserChats: {ex}");
            }
        }

        public async Task CreatePrivateChat(int userId, int targetUserId)
        {
            try
            {
                // Проверяем существование пользователей
                var user1Exists = await _context.Users.AnyAsync(u => u.UserId == userId);
                var user2Exists = await _context.Users.AnyAsync(u => u.UserId == targetUserId);

                if (!user1Exists || !user2Exists)
                {
                    await Clients.Caller.SendAsync("Error", "Один или оба пользователя не существуют");
                    return;
                }

                // Проверяем, существует ли уже чат между этими пользователями
                var existingChat = await _context.Members
                    .Where(m => m.UserId == userId)
                    .Select(m => m.Chat)
                    .Where(c => c.TypeId == 1) // Личный чат
                    .Where(c => _context.Members.Any(m => m.ChatId == c.ChatId && m.UserId == targetUserId))
                    .FirstOrDefaultAsync();

                if (existingChat != null)
                {
                    // Если чат существует, возвращаем его ID
                    await Clients.Caller.SendAsync("ChatExists", existingChat.ChatId);
                    return;
                }

                // Создаем новый чат
                var newChat = new Chat
                {
                    TypeId = 1, // Личный чат
                    CreatedAt = DateTime.UtcNow
                };

                _context.Chats.Add(newChat);
                await _context.SaveChangesAsync();

                // Добавляем участников в чат
                _context.Members.Add(new Member { UserId = userId, ChatId = newChat.ChatId });
                _context.Members.Add(new Member { UserId = targetUserId, ChatId = newChat.ChatId });
                await _context.SaveChangesAsync();

                // Отправляем уведомление о создании чата
                await Clients.All.SendAsync("ChatCreated", userId, newChat.ChatId);
                await Clients.All.SendAsync("ChatCreated", targetUserId, newChat.ChatId);

                // Отправляем ID созданного чата
                await Clients.Caller.SendAsync("PrivateChatCreated", newChat.ChatId);
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", "Произошла ошибка при создании чата: " + ex.Message);
            }
        }

        public async Task CreateGroupChat(string chatName, List<int> userIds)
        {
            try
            {
                if (string.IsNullOrEmpty(chatName) || userIds == null || !userIds.Any())
                {
                    await Clients.Caller.SendAsync("Error", "Неверные данные для создания группового чата.");
                    return;
                }

                // Проверяем существование всех пользователей
                var usersExist = await _context.Users
                    .Where(u => userIds.Contains(u.UserId))
                    .Select(u => u.UserId)
                    .ToListAsync();

                if (usersExist.Count != userIds.Count)
                {
                    await Clients.Caller.SendAsync("Error", "Один или несколько пользователей не существуют.");
                    return;
                }

                // Создаем групповой чат
                var groupChat = new Chat
                {
                    TypeId = 2, // Тип группового чата
                    Name = chatName,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Chats.Add(groupChat);
                await _context.SaveChangesAsync();

                // Добавляем участников в чат
                var groupChatMembers = userIds.Select(userId => new Member
                {
                    ChatId = groupChat.ChatId,
                    UserId = userId,
                    JoinedAt = DateTime.UtcNow
                }).ToList();

                _context.Members.AddRange(groupChatMembers);
                await _context.SaveChangesAsync();

                // Отправляем уведомление всем участникам
                foreach (var userId in userIds)
        {
                    await Clients.All.SendAsync("ChatCreated", userId, groupChat.ChatId);
                }

                // Отправляем информацию о созданном чате
                await Clients.Caller.SendAsync("GroupChatCreated", new
                {
                    chatId = groupChat.ChatId,
                    name = groupChat.Name,
                    members = userIds
                });
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", "Произошла ошибка при создании группового чата: " + ex.Message);
            }
        }

        public async Task DeleteChat(int chatId, int userId)
        {
            try
            {
                var chat = await _context.Chats
                    .Include(c => c.Members)
                    .FirstOrDefaultAsync(c => c.ChatId == chatId);

                if (chat == null)
                {
                    await Clients.Caller.SendAsync("Error", "Чат не найден.");
                    return;
                }

                var isMember = chat.Members.Any(m => m.UserId == userId);
                if (!isMember)
                {
                    await Clients.Caller.SendAsync("Error", "Вы не являетесь участником этого чата.");
                    return;
                }

                if (chat.TypeId != 1)
                {
                    await Clients.Caller.SendAsync("Error", "Можно удалять только личные чаты.");
                    return;
                }

                var otherMember = chat.Members.FirstOrDefault(m => m.UserId != userId);
                if (otherMember == null)
                {
                    await Clients.Caller.SendAsync("Error", "Не удалось найти второго участника чата.");
                    return;
                }

                var messages = await _context.Messages
                    .Where(m => m.ChatId == chatId)
                    .ToListAsync();
                _context.Messages.RemoveRange(messages);

                _context.Members.RemoveRange(chat.Members);
                _context.Chats.Remove(chat);

                await _context.SaveChangesAsync();

            await Clients.All.SendAsync("ChatDeleted", userId, chatId);
                await Clients.All.SendAsync("ChatDeleted", otherMember.UserId, chatId);
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", "Произошла ошибка при удалении чата.");
            }
        }

        public async Task SearchUsers(string name, int currentUserId)
        {
            if (string.IsNullOrWhiteSpace(name) || name.Length < 1)
            {
                await Clients.Caller.SendAsync("Error", "Поисковый запрос должен содержать минимум 2 символа.");
                return;
            }

            var normalizedName = name.Trim().ToLower();

            var existingChatUserIds = await _context.Members
                .Where(m => m.UserId == currentUserId)
                .Select(m => m.ChatId)
                .SelectMany(chatId => _context.Members
                    .Where(m => m.ChatId == chatId && m.UserId != currentUserId)
                    .Select(m => m.UserId))
                .Distinct()
                .ToListAsync();

            var users = await _context.Users
                .Where(u => u.UserId != currentUserId)
                .Where(u =>
                    u.Username.ToLower().Contains(normalizedName) ||
                    u.Username.ToLower().Replace(" ", "").Contains(normalizedName.Replace(" ", "")) ||
                    u.Username.ToLower().StartsWith(normalizedName) ||
                    u.Username.ToLower().EndsWith(normalizedName))
                .Select(u => new
                {
                    user_id = u.UserId,
                    username = u.Username,
                    avatarUrl = u.UserProfile.Avatar,
                    avatarColor = u.UserProfile.AvatarColor,
                    user_status = u.Status ?? "offline",
                    last_seen = u.LastSeen,
                    has_existing_chat = existingChatUserIds.Contains(u.UserId)
                })
                .OrderByDescending(u => u.has_existing_chat)
                .ThenBy(u => u.username)
                .Take(20)
                .ToListAsync();

            await Clients.Caller.SendAsync("ReceiveSearchResults", users);
        }

        public async Task GetUserContacts(int userId)
        {
            try
            {
                var contacts = await _context.Members
                    .Where(m => m.UserId == userId)
                    .Select(m => m.Chat)
                    .Where(c => c.TypeId == 1) // Только личные чаты
                    .Select(c => new
                    {
                        user_id = _context.Members
                            .Where(m => m.ChatId == c.ChatId && m.UserId != userId)
                            .Select(m => m.UserId)
                            .FirstOrDefault(),
                        username = _context.Members
                            .Where(m => m.ChatId == c.ChatId && m.UserId != userId)
                            .Select(m => m.User.Username)
                            .FirstOrDefault()
                    })
                    .Where(c => c.user_id != 0) // Исключаем случаи, когда второй участник не найден
                    .ToListAsync();

                await Clients.Caller.SendAsync("ReceiveContacts", contacts);
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", "Произошла ошибка при получении списка контактов: " + ex.Message);
            }
        }

        public async Task OnNewMessage(int chatId, int userId)
        {
            try
            {
                Console.WriteLine($"Updating chat list for user {userId} after new message in chat {chatId}");

                var oneOnOneChats = await _context.Members
                    .Include(m => m.User)
                    .ThenInclude(u => u.UserProfile)
                    .Where(m => m.UserId == userId)
                    .Select(m => m.Chat)
                    .Where(c => c.TypeId == 1)
                    .Select(c => new
                    {
                        chat_id = c.ChatId,
                        username = _context.Members
                            .Include(m => m.User)
                            .Where(m => m.ChatId == c.ChatId && m.UserId != userId)
                            .Select(m => m.User.Username)
                            .FirstOrDefault() ?? "Unknown",
                        user_id = _context.Members
                            .Where(m => m.ChatId == c.ChatId && m.UserId != userId)
                            .Select(m => m.UserId)
                            .FirstOrDefault(),
                        avatarUrl = _context.Members
                            .Include(m => m.User)
                            .ThenInclude(u => u.UserProfile)
                            .Where(m => m.ChatId == c.ChatId && m.UserId != userId)
                            .Select(m => m.User.UserProfile.Avatar)
                            .FirstOrDefault(),
                        avatarColor = _context.Members
                            .Include(m => m.User)
                            .ThenInclude(u => u.UserProfile)
                            .Where(m => m.ChatId == c.ChatId && m.UserId != userId)
                            .Select(m => m.User.UserProfile.AvatarColor)
                            .FirstOrDefault(),
                        user_status = _context.Members
                            .Where(m => m.ChatId == c.ChatId && m.UserId != userId)
                            .Select(m => m.User.Status)
                            .FirstOrDefault() ?? "offline",
                        last_seen = _context.Members
                            .Where(m => m.ChatId == c.ChatId && m.UserId != userId)
                            .Select(m => m.User.LastSeen)
                            .FirstOrDefault(),
                        isGroupChat = false,
                        lastMessage = _context.Messages
                            .Where(m => m.ChatId == c.ChatId)
                            .OrderByDescending(m => m.CreatedAt)
                            .Select(m => m.Content)
                            .FirstOrDefault(),
                        lastMessageTime = _context.Messages
                            .Where(m => m.ChatId == c.ChatId)
                            .OrderByDescending(m => m.CreatedAt)
                            .Select(m => m.CreatedAt)
                            .FirstOrDefault() ?? c.CreatedAt
                    })
                    .ToListAsync();

                var groupChats = await _context.Members
                    .Where(m => m.UserId == userId)
                    .Select(m => m.Chat)
                    .Where(c => c.TypeId == 2)
                    .Select(c => new
                    {
                        chat_id = c.ChatId,
                        username = c.Name ?? "Unnamed Group",
                        user_id = userId,
                        avatarUrl = (string)null, // Групповые чаты не имеют аватаров
                        avatarColor = (string)null, // Групповые чаты не имеют аватаров
                        isGroupChat = true,
                        lastMessage = _context.Messages
                            .Where(m => m.ChatId == c.ChatId)
                            .OrderByDescending(m => m.CreatedAt)
                            .Select(m => m.Content)
                            .FirstOrDefault(),
                        lastMessageTime = _context.Messages
                            .Where(m => m.ChatId == c.ChatId)
                            .OrderByDescending(m => m.CreatedAt)
                            .Select(m => m.CreatedAt)
                            .FirstOrDefault() ?? c.CreatedAt
                    })
                    .ToListAsync();

                var allChats = oneOnOneChats
                    .Cast<dynamic>()
                    .Concat(groupChats.Cast<dynamic>())
                    .OrderByDescending(c => c.lastMessageTime)
                    .ToList();

                Console.WriteLine($"Found {allChats.Count} chats for user {userId}");
                
                // Логируем данные аватаров для отладки
                foreach (var chat in allChats)
                {
                    Console.WriteLine($"OnNewMessage - Chat {chat.chat_id}: username={chat.username}, avatarUrl={chat.avatarUrl}, avatarColor={chat.avatarColor}");
                }

                // Отправляем обновленный список чатов через IHubContext
                await _hubContext.Clients.User(userId.ToString()).SendAsync("ReceiveChats", allChats);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error in OnNewMessage: {ex}");
                throw;
            }
        }
    }
} 