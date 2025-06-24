using System;

namespace Messenger.Models;

public partial class ServerAuditLog
{
    public int AuditLogId { get; set; }
    public int ServerId { get; set; }
    public int UserId { get; set; }
    public string ActionType { get; set; }
    public string Details { get; set; }
    public DateTime Timestamp { get; set; }

    // Навигационные свойства
    public virtual Server Server { get; set; }
    public virtual User User { get; set; }
} 