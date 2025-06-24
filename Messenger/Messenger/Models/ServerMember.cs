using System;
using System.Collections.Generic;

namespace Messenger.Models;

public partial class ServerMember
{
    public long ServerMemberId { get; set; }

    public int ServerId { get; set; }

    public int UserId { get; set; }

    public DateTime? JoinedAt { get; set; }

    public virtual Server Server { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
