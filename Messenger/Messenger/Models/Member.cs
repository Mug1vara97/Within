using System;
using System.Collections.Generic;

namespace Messenger.Models;

public partial class Member
{
    public long MemberId { get; set; }

    public int UserId { get; set; }

    public int ChatId { get; set; }

    public DateTime? JoinedAt { get; set; }

    public virtual Chat Chat { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
