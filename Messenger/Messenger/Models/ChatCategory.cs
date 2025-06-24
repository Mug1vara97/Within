using System;
using System.Collections.Generic;

namespace Messenger.Models;

public partial class ChatCategory
{
    public int CategoryId { get; set; }

    public string CategoryName { get; set; } = null!;

    public int ServerId { get; set; }

    public int CategoryOrder { get; set; }

    public bool IsPrivate { get; set; }

    public string? AllowedRoleIds { get; set; } 

    public string? AllowedUserIds { get; set; }

    public virtual ICollection<Chat> Chats { get; set; } = new List<Chat>();

    public virtual Server Server { get; set; } = null!;
}
