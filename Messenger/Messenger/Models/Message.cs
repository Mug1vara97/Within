using System;
using System.Collections.Generic;

namespace Messenger.Models;

public partial class Message
{
    public long MessageId { get; set; }

    public int ChatId { get; set; }

    public int UserId { get; set; }

    public string Content { get; set; } = null!;

    public DateTime? CreatedAt { get; set; }

    public string? ContentType { get; set; }
    
    public string? ForwardedMessageContent { get; set; }

    public long? RepliedToMessageId { get; set; }

    public long? ForwardedFromMessageId { get; set; }

    public int? ForwardedFromChatId { get; set; }

    public int? ForwardedByUserId { get; set; }

    public virtual Chat Chat { get; set; } = null!;

    public virtual User User { get; set; } = null!;

    public virtual Message? RepliedToMessage { get; set; }

    public virtual Message? ForwardedFromMessage { get; set; }

    public virtual Chat? ForwardedFromChat { get; set; }

    public virtual User? ForwardedByUser { get; set; }

    public virtual ICollection<Message> Replies { get; set; } = new List<Message>();

    public virtual ICollection<MessageRead> MessageReads { get; set; } = new List<MessageRead>();
}
