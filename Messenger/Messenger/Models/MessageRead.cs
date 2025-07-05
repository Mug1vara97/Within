using System;

namespace Messenger.Models;

public partial class MessageRead
{
    public long Id { get; set; }
    
    public long MessageId { get; set; }
    
    public int UserId { get; set; }
    
    public DateTime ReadAt { get; set; }
    
    public virtual Message Message { get; set; } = null!;
    
    public virtual User User { get; set; } = null!;
} 