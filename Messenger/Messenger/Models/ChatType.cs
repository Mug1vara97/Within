using System;
using System.Collections.Generic;

namespace Messenger.Models;

public partial class ChatType
{
    public int TypeId { get; set; }

    public string TypeName { get; set; } = null!;

    public virtual ICollection<Chat> Chats { get; set; } = new List<Chat>();
}
