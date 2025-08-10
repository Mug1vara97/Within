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
        private readonly IHubContext<NotificationHub> _notificationHub;

        public GroupChatHub(MessengerContext context, IHubContext<ChatListHub> chatListHubContext, IHubContext<NotificationHub> notificationHub)
        {
            _context = context;
            _chatListHubContext = chatListHubContext;
            _notificationHub = notificationHub;
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
                Console.WriteLine($"Error getting messages: {ex.Message}");
                return new List<MessageDto>();
            }
        }

        public async Task<List<MessageDto>> GetMessagesWithPagination(int chatId, int page = 1, int pageSize = 50)
        {
            try 
            {
                var totalMessages = await _context.Messages
                    .Where(m => m.ChatId == chatId)
                    .CountAsync();

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
                    .OrderByDescending(m => m.CreatedAt) // Сначала новые сообщения
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                // Переворачиваем порядок для правильного отображения
                messages.Reverse();

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

                    return dto;
                }).ToList();

                return messageDtos;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting messages with pagination: {ex.Message}");
                return new List<MessageDto>();
            }
        }

        private static string GenerateAvatarColor(int userId) 
        {
            string[] colors = { "#5865F2", "#EB459E", "#ED4245", "#FEE75C", "#57F287", "#FAA61A" };
            return colors[userId % colors.Length];
        }

        private async Task CreateNotificationForMember(int userId, int chatId, long messageId, string type, string content)
        {
            try
            {
                var notification = new Notification
                {
                    UserId = userId,
                    ChatId = chatId,
                    MessageId = messageId,
                    Type = type,
                    Content = content,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();

                // Уведомляем пользователя через SignalR
                await _notificationHub.Clients.User(userId.ToString()).SendAsync("ReceiveNotification", new
                {
                    notification.NotificationId,
                    notification.ChatId,
                    notification.MessageId,
                    notification.Type,
                    notification.Content,
                    notification.IsRead,
                    notification.CreatedAt
                });

                Console.WriteLine($"Created notification for user {userId}: {content}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating notification: {ex.Message}");
            }
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

                // Создаем уведомления для всех участников чата (кроме отправителя)
                var notificationMembers = chatMembers.Where(m => m != sender.UserId).ToList();
                var chat = await _context.Chats.FindAsync(chatId);
                var notificationType = chat.TypeId == 1 ? "direct_message" : "group_message";
                var notificationContent = chat.TypeId == 1 
                    ? $"{username}: {message}"
                    : $"{username} в {chat.Name}: {message}";

                foreach (var memberId in notificationMembers)
                {
                    await CreateNotificationForMember(memberId, chatId, newMessage.MessageId, notificationType, notificationContent);
                }

                // Отправляем обновление времени последнего сообщения для сортировки чатов через NotificationHub
                foreach (var memberId in chatMembers)
                {
                    Console.WriteLine($"Sending ChatUpdated to user {memberId}: chatId={chatId}, message={message}, time={DateTime.UtcNow}");
                    await _notificationHub.Clients.User(memberId.ToString()).SendAsync("ChatUpdated", chatId, message, DateTime.UtcNow);
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error updating chat list: {ex}");
            }
        }

        public async Task<List<MessageDto>> SendBatchMessages(List<BatchMessageRequest> batchMessages, string username, int chatId)
        {
            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
                if (user == null)
                {
                    throw new Exception("User not found");
                }

                var chat = await _context.Chats.FirstOrDefaultAsync(c => c.ChatId == chatId);
                if (chat == null)
                {
                    throw new Exception("Chat not found");
                }

                var createdMessages = new List<MessageDto>();
                var messagesToSave = new List<Message>();

                // Создаем все сообщения в памяти
                foreach (var batchMsg in batchMessages)
                {
                    var message = new Message
                    {
                        Content = batchMsg.Content,
                        UserId = user.UserId,
                        ChatId = chatId,
                        CreatedAt = DateTime.UtcNow,
                        RepliedToMessageId = batchMsg.RepliedToMessageId,
                        ForwardedFromMessageId = batchMsg.ForwardedFromMessageId,
                        ForwardedFromChatId = batchMsg.ForwardedFromChatId,
                        ForwardedByUserId = batchMsg.ForwardedByUserId,
                        ForwardedMessageContent = batchMsg.ForwardedMessageContent
                    };

                    messagesToSave.Add(message);
                }

                // Сохраняем все сообщения одним запросом
                _context.Messages.AddRange(messagesToSave);
                await _context.SaveChangesAsync();

                // Получаем сохраненные сообщения с полной информацией
                var savedMessageIds = messagesToSave.Select(m => m.MessageId).ToList();
                var savedMessages = await _context.Messages
                    .Where(m => savedMessageIds.Contains(m.MessageId))
                    .Include(m => m.User)
                        .ThenInclude(u => u.UserProfile)
                    .Include(m => m.ForwardedFromMessage)
                        .ThenInclude(m => m.User)
                    .Include(m => m.ForwardedFromChat)
                    .Include(m => m.ForwardedByUser)
                    .Include(m => m.RepliedToMessage)
                        .ThenInclude(m => m.User)
                    .ToListAsync();

                // Конвертируем в DTO
                foreach (var msg in savedMessages)
                {
                    var dto = new MessageDto
                    {
                        MessageId = msg.MessageId,
                        Content = msg.Content,
                        CreatedAt = msg.CreatedAt,
                        senderUsername = msg.User.Username,
                        AvatarUrl = msg.User.UserProfile?.Avatar,
                        AvatarColor = !string.IsNullOrEmpty(msg.User.UserProfile?.AvatarColor)
                            ? msg.User.UserProfile.AvatarColor
                            : GenerateAvatarColor(msg.UserId),
                        RepliedMessage = msg.RepliedToMessageId != null && msg.RepliedToMessage != null
                            ? new ReplyMessageDto
                            {
                                MessageId = msg.RepliedToMessage.MessageId,
                                Content = msg.RepliedToMessage.Content,
                                senderUsername = msg.RepliedToMessage.User?.Username
                            }
                            : null,
                        ForwardedMessage = msg.ForwardedFromMessageId != null && msg.ForwardedFromMessage != null
                            ? new ForwardedMessageDto
                            {
                                MessageId = msg.ForwardedFromMessage.MessageId,
                                Content = msg.ForwardedFromMessage.Content,
                                senderUsername = msg.ForwardedFromMessage.User?.Username,
                                OriginalChatName = msg.ForwardedFromChat?.Name,
                                ForwardedByUsername = msg.ForwardedByUser?.Username,
                                ForwardedMessageContent = msg.ForwardedMessageContent
                            }
                            : null
                    };

                    createdMessages.Add(dto);
                }

                // Отправляем уведомления всем участникам чата
                var members = await _context.Members
                    .Where(m => m.ChatId == chatId && m.UserId != user.UserId)
                    .ToListAsync();

                foreach (var member in members)
                {
                    await CreateNotificationForMember(member.UserId, chatId, 0, "new_message", $"Новые сообщения от {username}");
                }

                // Отправляем сообщения всем участникам группы
                await Clients.Group(chatId.ToString()).SendAsync("ReceiveBatchMessages", username, createdMessages);

                // Обновляем список чатов для всех участников
                await _chatListHubContext.Clients.All.SendAsync("UpdateChatList");

                Console.WriteLine($"Batch messages sent to chat {chatId} by {username}. Count: {createdMessages.Count}");

                return createdMessages;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending batch messages: {ex.Message}");
                throw;
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

        public async Task MarkMessageAsRead(long messageId, int userId, int chatId)
        {
            try
            {
                // Проверяем, что сообщение существует и не принадлежит пользователю
                var message = await _context.Messages
                    .FirstOrDefaultAsync(m => m.MessageId == messageId);

                if (message == null || message.UserId == userId)
                {
                    return; // Не отправляем уведомление для собственных сообщений
                }

                // Уведомляем всех участников чата о прочтении сообщения
                await Clients.Group(chatId.ToString()).SendAsync("MessageRead", messageId, userId, DateTime.UtcNow);
                
                Console.WriteLine($"Message {messageId} marked as read by user {userId} in chat {chatId}");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error marking message as read: {ex.Message}");
            }
        }

        public async Task SendCallNotification(int chatId, string caller, int callerId, string targetUser)
        {
            try
            {
                Console.WriteLine($"SendCallNotification called: chatId={chatId}, caller={caller}, callerId={callerId}, targetUser={targetUser}");
                
                // Получаем участников чата
                var chatMembers = await _context.Members
                    .Where(m => m.ChatId == chatId)
                    .Select(m => m.UserId)
                    .ToListAsync();

                Console.WriteLine($"Found {chatMembers.Count} chat members: {string.Join(", ", chatMembers)}");

                // Отправляем уведомление о звонке всем участникам кроме звонящего
                var notificationMembers = chatMembers.Where(m => m != callerId).ToList();
                
                Console.WriteLine($"Sending notifications to {notificationMembers.Count} members: {string.Join(", ", notificationMembers)}");
                
                foreach (var memberId in notificationMembers)
                {
                    Console.WriteLine($"Sending IncomingCall to user {memberId}: chatId={chatId}, caller={caller}, callerId={callerId}, roomId={chatId}");
                    // Отправляем уведомление через SignalR
                    await _notificationHub.Clients.User(memberId.ToString()).SendAsync("IncomingCall", chatId, caller, callerId, chatId.ToString());
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error sending call notification: {ex.Message}");
                throw;
            }
        }

        public async Task TestCallMethod(int testValue)
        {
            Console.WriteLine($"🧪 TEST METHOD CALLED: testValue={testValue}");
        }

        public async Task NotifyCallStarted(int chatId, int callerId)
        {
            try
            {
                Console.WriteLine($"🔥 NotifyCallStarted called: chatId={chatId}, callerId={callerId}");
                
                Console.WriteLine("🔍 Getting chat members...");
                // Получаем участников чата
                var chatMembers = await _context.Members
                    .Where(m => m.ChatId == chatId)
                    .Select(m => m.UserId)
                    .ToListAsync();

                Console.WriteLine($"✅ Found {chatMembers.Count} chat members: {string.Join(", ", chatMembers)}");

                // Отправляем уведомление о начале звонка всем участникам кроме звонящего
                var notificationMembers = chatMembers.Where(m => m != callerId).ToList();
                
                Console.WriteLine($"Sending CallStarted notifications to {notificationMembers.Count} members: {string.Join(", ", notificationMembers)}");
                
                // Отправляем уведомление через группу чата
                Console.WriteLine($"📤 Sending CallStarted to group {chatId}: chatId={chatId}, callerId={callerId}");
                try
                {
                    await Clients.Group(chatId.ToString()).SendAsync("CallStarted", chatId, callerId);
                    Console.WriteLine($"✅ CallStarted sent to group {chatId}");
                }
                catch (Exception sendEx)
                {
                    Console.Error.WriteLine($"❌ Failed to send CallStarted to group {chatId}: {sendEx.Message}");
                }
                
                Console.WriteLine("🎯 NotifyCallStarted completed successfully");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error notifying call started: {ex.Message}");
                throw;
            }
        }

        public async Task NotifyCallEnded(int chatId, int userId)
        {
            try
            {
                Console.WriteLine($"NotifyCallEnded called: chatId={chatId}, userId={userId}");
                
                // Получаем участников чата
                var chatMembers = await _context.Members
                    .Where(m => m.ChatId == chatId)
                    .Select(m => m.UserId)
                    .ToListAsync();

                Console.WriteLine($"Found {chatMembers.Count} chat members: {string.Join(", ", chatMembers)}");

                // Отправляем уведомление о завершении звонка всем участникам
                Console.WriteLine($"Sending CallEnded notifications to {chatMembers.Count} members: {string.Join(", ", chatMembers)}");
                
                // Отправляем уведомление через группу чата
                Console.WriteLine($"Sending CallEnded to group {chatId}: chatId={chatId}");
                await Clients.Group(chatId.ToString()).SendAsync("CallEnded", chatId);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error notifying call ended: {ex.Message}");
                throw;
            }
        }

        public async Task<object> GetCallStatus(int chatId)
        {
            try
            {
                Console.WriteLine($"🔍 GetCallStatus called for chatId={chatId}");
                
                // Здесь можно добавить логику для получения состояния звонка из базы данных
                // Пока возвращаем null - это означает, что активного звонка нет
                // В будущем можно добавить таблицу для отслеживания активных звонков
                
                Console.WriteLine($"📞 No active call found for chatId={chatId}");
                return null;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error getting call status: {ex.Message}");
                return null;
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

    public class BatchMessageRequest
    {
        public string Content { get; set; }
        public long? RepliedToMessageId { get; set; }
        public long? ForwardedFromMessageId { get; set; }
        public int? ForwardedFromChatId { get; set; }
        public int? ForwardedByUserId { get; set; }
        public string ForwardedMessageContent { get; set; }
    }
}