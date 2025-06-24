using System;
using System.Collections.Generic;

namespace Messenger.Models;

public partial class Chat
{
    public int ChatId { get; set; }

    public int TypeId { get; set; }

    public int? CategoryId { get; set; }

    public string? Name { get; set; }

    public int? ServerId { get; set; }

    public bool IsPrivate { get; set; }

    public string? AllowedRoleIds { get; set; } 

    public DateTime? CreatedAt { get; set; }

    public int? ChatOrder { get; set; }

    public virtual ChatCategory? Category { get; set; }

    public virtual ICollection<Member> Members { get; set; } = new List<Member>();

    public virtual ICollection<Message> Messages { get; set; } = new List<Message>();

    public virtual Server? Server { get; set; }

    public virtual ChatType Type { get; set; } = null!;
}
