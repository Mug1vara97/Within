using System.ComponentModel.DataAnnotations;

namespace Messenger.Models
{
    public class Notification
    {
        [Key]
        public int NotificationId { get; set; }
        
        public int UserId { get; set; }
        public User User { get; set; }
        
        public int ChatId { get; set; }
        public Chat Chat { get; set; }
        
        public long? MessageId { get; set; }
        public Message? Message { get; set; }
        
        public string Type { get; set; } = string.Empty; // "direct_message", "group_message", "mention", "reaction"
        
        public string Content { get; set; } = string.Empty;
        
        public bool IsRead { get; set; } = false;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? ReadAt { get; set; }
    }

    public enum NotificationType
    {
        DirectMessage,
        GroupMessage,
        Mention,
        Reaction,
        Invitation
    }
} 