using System;
using System.Collections.Generic;

namespace Messenger.Models;

public partial class AuditLog
{
    public long LogId { get; set; }

    public int ServerId { get; set; }

    public int UserId { get; set; }

    public string ActionType { get; set; } = null!;

    public string TargetType { get; set; } = null!;

    public int? TargetId { get; set; }

    public string? Changes { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Server Server { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
