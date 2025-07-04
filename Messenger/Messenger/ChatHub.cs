﻿using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Messenger.Models;
using System;

public class ChatHub : Hub
{
    private readonly MessengerContext _context;

    public ChatHub(MessengerContext context)
    {
        _context = context;
    }

    public async Task SendMessage(string username, string message, string chatId)
    {
        try
        {
            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (sender == null) throw new Exception("Sender not found");

            if (!int.TryParse(chatId, out int parsedChatId))
            {
                throw new Exception("Invalid chat ID");
            }

            var chat = await _context.Chats
                .Include(c => c.Members)
                .FirstOrDefaultAsync(c => c.ChatId == parsedChatId && c.TypeId == 1);

            if (chat == null) throw new Exception("Chat not found");

            var newMessage = new Message
            {
                ChatId = parsedChatId,
                UserId = sender.UserId,
                Content = message,
                CreatedAt = DateTime.UtcNow
            };

            _context.Messages.Add(newMessage);
            await _context.SaveChangesAsync();

            await Clients.Group(chatId).SendAsync("ReceiveMessage", username, message, newMessage.MessageId);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error sending message: {ex.Message}");
            throw;
        }
    }

    public async Task EditMessage(int messageId, string newContent, string username)
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

    public async Task DeleteMessage(int messageId, string username)
    {
        try
        {
            var message = await _context.Messages
                .Include(m => m.Chat) // Добавляем загрузку чата
                .FirstOrDefaultAsync(m => m.MessageId == messageId);

            if (message == null)
            {
                Console.WriteLine($"Message {messageId} not found");
                return;
            }

            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (caller == null || message.UserId != caller.UserId)
            {
                Console.WriteLine("User not authorized to delete this message");
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

    // Отправка аудиосообщения
    public async Task SendAudioMessage(string username, string audioUrl, int chatId)
    {
        var sender = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
        if (sender == null) throw new Exception("Sender not found");

        var newMessage = new Message
        {
            ChatId = chatId,
            UserId = sender.UserId,
            Content = audioUrl,
            CreatedAt = DateTime.UtcNow
        };

        _context.Messages.Add(newMessage);
        await _context.SaveChangesAsync();

        await Clients.Group(chatId.ToString()).SendAsync("ReceiveMessage", username, audioUrl);
    }

    // Отправка медиафайла
    public async Task SendMediaMessage(string username, string mediaUrl, int chatId)
    {
        try
        {
            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (sender == null) throw new Exception("Sender not found");

            var chat = await _context.Chats
                .Include(c => c.Members)
                .FirstOrDefaultAsync(c => c.ChatId == chatId && c.TypeId == 1);

            if (chat == null) throw new Exception("Chat not found");

            var newMessage = new Message
            {
                ChatId = chatId,
                UserId = sender.UserId,
                Content = mediaUrl,
                CreatedAt = DateTime.UtcNow
            };

            _context.Messages.Add(newMessage);
            await _context.SaveChangesAsync();

            await Clients.Group(chatId.ToString()).SendAsync("ReceiveMessage", username, mediaUrl, newMessage.MessageId);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error sending media message: {ex.Message}");
            throw;
        }
    }

    public async Task JoinGroup(string chatId)
    {
        try
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, chatId);
            Console.WriteLine($"User {Context.ConnectionId} joined group {chatId}");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error joining group {chatId}: {ex.Message}");
            throw;
        }
    }

    public async Task LeaveGroup(string chatId)
    {
        try
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, chatId);
            Console.WriteLine($"User {Context.ConnectionId} left group {chatId}");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error leaving group {chatId}: {ex.Message}");
            throw;
        }
    }
}