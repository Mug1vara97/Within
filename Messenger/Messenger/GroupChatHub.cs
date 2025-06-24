using Messenger;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Messenger.Models;
using Messenger.Hubs;
using System.Threading.Tasks;
using System;
using System.Linq;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace Messenger
{
    public class GroupChatHub : Hub
    {
        private readonly MessengerContext _context;
        private readonly IHubContext<ChatListHub> _chatListHubContext;

        public GroupChatHub(MessengerContext context, IHubContext<ChatListHub> chatListHubContext)
        {
            _context = context;
            _chatListHubContext = chatListHubContext;
        }

        public async Task JoinGroup(int chatId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, chatId.ToString());
            Console.WriteLine($"User {Context.ConnectionId} joined group {chatId}");
        }

        public async Task LeaveGroup(int chatId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, chatId.ToString());
            Console.WriteLine($"User {Context.ConnectionId} left group {chatId}");
        }

        public async Task<List<MessageDto>> GetMessages(int chatId)
        {
            try 
            {
                var messages = await _context.Messages
                    .Where(m => m.ChatId == chatId)
                    .Include(m => m.User)
                        .ThenInclude(u => u.UserProfile)
                    .Include(m => m.ForwardedFromMessage)
                        .ThenInclude(m => m.User)
                    .Include(m => m.ForwardedFromChat)
                    .Include(m => m.ForwardedByUser)
                    .Include(m => m.RepliedToMessage)
                        .ThenInclude(m => m.User)
                    .OrderBy(m => m.CreatedAt)
                    .ToListAsync();

                var messageDtos = messages.Select(m =>
                {
                    var dto = new MessageDto
                    {
                        MessageId = m.MessageId,
                        Content = m.Content,
                        CreatedAt = m.CreatedAt,
                        senderUsername = m.User.Username,
                        AvatarUrl = m.User.UserProfile?.Avatar,
                        AvatarColor = !string.IsNullOrEmpty(m.User.UserProfile?.AvatarColor)
                            ? m.User.UserProfile.AvatarColor
                            : GenerateAvatarColor(m.UserId),
                        RepliedMessage = m.RepliedToMessageId != null && m.RepliedToMessage != null
                            ? new ReplyMessageDto
                            {
                                MessageId = m.RepliedToMessage.MessageId,
                                Content = m.RepliedToMessage.Content,
                                senderUsername = m.RepliedToMessage.User?.Username
                            }
                            : null,
                        ForwardedMessage = m.ForwardedFromMessageId != null && m.ForwardedFromMessage != null
                            ? new ForwardedMessageDto
                            {
                                MessageId = m.ForwardedFromMessage.MessageId,
                                Content = m.ForwardedFromMessage.Content,
                                senderUsername = m.ForwardedFromMessage.User?.Username,
                                OriginalChatName = m.ForwardedFromChat?.Name,
                                ForwardedByUsername = m.ForwardedByUser?.Username,
                                ForwardedMessageContent = m.ForwardedMessageContent
                            }
                            : null
                    };

                    // Логирование для отладки
                    if (m.ForwardedFromMessageId != null)
                    {
                        Console.WriteLine($"Message {m.MessageId} is forwarded:");
                        Console.WriteLine($"ForwardedFromMessageId: {m.ForwardedFromMessageId}");
                        Console.WriteLine($"ForwardedFromChatId: {m.ForwardedFromChatId}");
                        Console.WriteLine($"ForwardedByUserId: {m.ForwardedByUserId}");
                        Console.WriteLine($"ForwardedByUsername: {m.ForwardedByUser?.Username}");
                        Console.WriteLine($"OriginalSenderUsername: {m.ForwardedFromMessage?.User?.Username}");
                        Console.WriteLine($"OriginalChatName: {m.ForwardedFromChat?.Name}");
                    }

                    return dto;
                }).ToList();

                return messageDtos;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error getting messages: {ex}");
                throw;
            }
        }

        private static string GenerateAvatarColor(int userId) 
        {
            string[] colors = { "#5865F2", "#EB459E", "#ED4245", "#FEE75C", "#57F287", "#FAA61A" };
            return colors[userId % colors.Length];
        }
        public async Task SendMessage(string message, string username, int chatId, long? repliedToMessageId = null, long? forwardedFromMessageId = null)
        {
            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (sender == null)
            {
                throw new Exception("Sender not found");
            }

            var profile = await _context.UserProfiles
                .FirstOrDefaultAsync(p => p.UserId == sender.UserId);

            var newMessage = new Message
            {
                ChatId = chatId,
                UserId = sender.UserId,
                Content = message,
                CreatedAt = DateTime.UtcNow,
                RepliedToMessageId = repliedToMessageId,
                ForwardedFromMessageId = forwardedFromMessageId,
                ForwardedByUserId = forwardedFromMessageId.HasValue ? sender.UserId : null
            };

            if (forwardedFromMessageId.HasValue)
            {
                var originalMessage = await _context.Messages
                    .Include(m => m.Chat)
                    .FirstOrDefaultAsync(m => m.MessageId == forwardedFromMessageId);
                if (originalMessage != null)
                {
                    newMessage.ForwardedFromChatId = originalMessage.ChatId;
                }
            }

            _context.Messages.Add(newMessage);
            await _context.SaveChangesAsync();

            // Получаем информацию о сообщении, на которое отвечаем
            ReplyMessageDto? repliedMessage = null;
            if (repliedToMessageId.HasValue)
            {
                var repliedToMessage = await _context.Messages
                    .Include(m => m.User)
                    .FirstOrDefaultAsync(m => m.MessageId == repliedToMessageId);

                if (repliedToMessage != null)
                {
                    repliedMessage = new ReplyMessageDto
                    {
                        MessageId = repliedToMessage.MessageId,
                        Content = repliedToMessage.Content,
                        senderUsername = repliedToMessage.User.Username
                    };
                }
            }

            // Получаем информацию о пересланном сообщении
            ForwardedMessageDto? forwardedMessage = null;
            if (forwardedFromMessageId.HasValue)
            {
                var forwardedFromMessage = await _context.Messages
                    .Include(m => m.User)
                    .Include(m => m.Chat)
                    .FirstOrDefaultAsync(m => m.MessageId == forwardedFromMessageId);

                if (forwardedFromMessage != null)
                {
                    forwardedMessage = new ForwardedMessageDto
                    {
                        MessageId = forwardedFromMessage.MessageId,
                        Content = forwardedFromMessage.Content,
                        senderUsername = forwardedFromMessage.User.Username,
                        OriginalChatName = forwardedFromMessage.Chat.Name,
                        ForwardedByUsername = username,
                        ForwardedMessageContent = forwardedFromMessage.ForwardedMessageContent
                    };
                }
            }

            await Clients.Group(chatId.ToString()).SendAsync("ReceiveMessage",
                username,
                message,
                newMessage.MessageId,
                profile?.Avatar,
                !string.IsNullOrEmpty(profile?.AvatarColor)
                    ? profile.AvatarColor
                    : GenerateAvatarColor(sender.UserId),
                repliedMessage,
                forwardedMessage);

            try
            {
                // Обновляем список чатов для всех участников
                var chatMembers = await _context.Members
                    .Where(m => m.ChatId == chatId)
                    .Select(m => m.UserId)
                    .ToListAsync();

                // Отправляем сообщение в группу
                foreach (var memberId in chatMembers)
                {
                    var oneOnOneChats = await _context.Members
                        .Where(m => m.UserId == memberId)
                        .Select(m => m.Chat)
                        .Where(c => c.TypeId == 1)
                        .Select(c => new
                        {
                            chat_id = c.ChatId,
                            username = _context.Members
                                .Where(m => m.ChatId == c.ChatId && m.UserId != memberId)
                                .Join(_context.Users,
                                    m => m.UserId,
                                    u => u.UserId,
                                    (m, u) => u.Username)
                                .FirstOrDefault() ?? "Unknown",
                            user_id = _context.Members
                                .Where(m => m.ChatId == c.ChatId && m.UserId != memberId)
                                .Select(m => m.UserId)
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
                        .Where(m => m.UserId == memberId)
                        .Select(m => m.Chat)
                        .Where(c => c.TypeId == 2)
                        .Select(c => new
                        {
                            chat_id = c.ChatId,
                            username = c.Name ?? "Unnamed Group",
                            user_id = memberId,
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

                    var allChats = oneOnOneChats.Concat(groupChats)
                        .OrderByDescending(c => c.lastMessageTime)
                        .ToList();

                    await _chatListHubContext.Clients.User(memberId.ToString())
                        .SendAsync("ReceiveChats", allChats);
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error updating chat list: {ex}");
            }
        }

        public async Task SendAudioMessage(string username, string audioUrl, int chatId)
        {
            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (sender == null) throw new Exception("Sender not found");

            // Получаем профиль через отдельный запрос
            var profile = await _context.UserProfiles
                .FirstOrDefaultAsync(p => p.UserId == sender.UserId);

            var newMessage = new Message
            {
                ChatId = chatId,
                UserId = sender.UserId,
                Content = audioUrl,
                CreatedAt = DateTime.UtcNow
            };

            _context.Messages.Add(newMessage);
            await _context.SaveChangesAsync();

            await Clients.Group(chatId.ToString()).SendAsync("ReceiveMessage",
                username,
                audioUrl, // Исправлено: было message
                newMessage.MessageId,
                profile?.Avatar,
                !string.IsNullOrEmpty(profile?.AvatarColor)
                    ? profile.AvatarColor
                    : GroupChatHub.GenerateAvatarColor(sender.UserId));
        }


        public async Task SendMediaMessage(string username, string mediaUrl, int chatId)
        {
            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (sender == null) throw new Exception("Sender not found");

            var profile = await _context.UserProfiles
                .FirstOrDefaultAsync(p => p.UserId == sender.UserId);

            var newMessage = new Message
            {
                ChatId = chatId,
                UserId = sender.UserId,
                Content = mediaUrl,
                CreatedAt = DateTime.UtcNow
            };

            _context.Messages.Add(newMessage);
            await _context.SaveChangesAsync();

            await Clients.Group(chatId.ToString()).SendAsync("ReceiveMessage",
                username,
                mediaUrl, // Исправлено: было message
                newMessage.MessageId,
                profile?.Avatar,
                !string.IsNullOrEmpty(profile?.AvatarColor)
                    ? profile.AvatarColor
                    : GroupChatHub.GenerateAvatarColor(sender.UserId));
        }
        public async Task EditMessage(long messageId, string newContent, string username)
        {
            try
            {
                var message = await _context.Messages
                    .Include(m => m.User)
                    .FirstOrDefaultAsync(m => m.MessageId == messageId);

                if (message == null)
                {
                    Console.WriteLine($"Message {messageId} not found");
                    return;
                }

                var caller = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
                if (caller == null || message.UserId != caller.UserId)
                {
                    Console.WriteLine("User not authorized to edit this message");
                    return;
                }

                message.Content = newContent;
                await _context.SaveChangesAsync();

                await Clients.Group(message.ChatId.ToString())
                    .SendAsync("MessageEdited", messageId, newContent);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error editing message: {ex}");
                throw;
            }
        }

        public async Task DeleteMessage(long messageId, string username)
        {
            try
            {
                var message = await _context.Messages
                    .Include(m => m.Chat)
                    .FirstOrDefaultAsync(m => m.MessageId == messageId);

                if (message == null)
                {
                    Console.WriteLine($"Message {messageId} not found");
                    return;
                }

                _context.Messages.Remove(message);
                await _context.SaveChangesAsync();

                await Clients.Group(message.ChatId.ToString())
                    .SendAsync("MessageDeleted", messageId);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error deleting message: {ex}");
                throw;
            }
        }

        public async Task ForwardMessage(long messageId, int targetChatId, string username, string forwardedMessageContent = null)
        {
            try
            {
                // Получаем исходное сообщение
                var originalMessage = await _context.Messages
                    .Include(m => m.User)
                    .Include(m => m.Chat)
                    .FirstOrDefaultAsync(m => m.MessageId == messageId);

                if (originalMessage == null)
                {
                    throw new HubException("Сообщение не найдено");
                }

                var forwardingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Username == username);

                if (forwardingUser == null)
                {
                    throw new HubException("Пользователь не найден");
                }

                var profile = await _context.UserProfiles
                    .FirstOrDefaultAsync(p => p.UserId == forwardingUser.UserId);

                var newMessage = new Message
                {
                    ChatId = targetChatId,
                    UserId = forwardingUser.UserId,
                    Content = forwardedMessageContent ?? "", // Новое сообщение идет в Content
                    CreatedAt = DateTime.UtcNow,
                    ForwardedFromMessageId = messageId,
                    ForwardedFromChatId = originalMessage.ChatId,
                    ForwardedByUserId = forwardingUser.UserId,
                    ForwardedMessageContent = originalMessage.Content // Оригинальное сообщение идет в ForwardedMessageContent
                };

                _context.Messages.Add(newMessage);
                await _context.SaveChangesAsync();

                var forwardedMessage = new ForwardedMessageDto
                {
                    MessageId = originalMessage.MessageId,
                    Content = originalMessage.Content, // Оригинальное сообщение
                    senderUsername = originalMessage.User.Username,
                    OriginalChatName = originalMessage.Chat.Name,
                    ForwardedByUsername = username,
                    ForwardedMessageContent = forwardedMessageContent // Новое сообщение
                };

                await Clients.Group(targetChatId.ToString()).SendAsync("ReceiveMessage",
                    username,
                    forwardedMessageContent ?? "", // Отправляем новое сообщение как основной контент
                    newMessage.MessageId,
                    profile?.Avatar,
                    !string.IsNullOrEmpty(profile?.AvatarColor)
                        ? profile.AvatarColor
                        : GenerateAvatarColor(forwardingUser.UserId),
                    null, // repliedMessage
                    forwardedMessage);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error forwarding message: {ex}");
                throw;
            }
        }
    }

    public class MessageDto
    {
        public long MessageId { get; set; }
        public string Content { get; set; }
        public DateTime? CreatedAt { get; set; }
        public string senderUsername { get; set; }
        public string AvatarUrl { get; set; }
        public string AvatarColor { get; set; }
        public ReplyMessageDto? RepliedMessage { get; set; }
        public ForwardedMessageDto? ForwardedMessage { get; set; }
    }

    public class ReplyMessageDto
    {
        public long MessageId { get; set; }
        public string Content { get; set; }
        public string senderUsername { get; set; }
    }

    public class ForwardedMessageDto
    {
        public long MessageId { get; set; }
        public string Content { get; set; }
        public string senderUsername { get; set; }
        public string OriginalChatName { get; set; }
        public string ForwardedByUsername { get; set; }
        public string ForwardedMessageContent { get; set; }
    }
}