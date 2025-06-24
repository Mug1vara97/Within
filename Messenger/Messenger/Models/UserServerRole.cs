using System;
using System.Collections.Generic;

namespace Messenger.Models;

public partial class UserServerRole
{
    public int UserId { get; set; }

    public int ServerId { get; set; }

    public int RoleId { get; set; }

    public DateTime? AssignedAt { get; set; }

    public virtual ServerRole Role { get; set; } = null!;

    public virtual Server Server { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
