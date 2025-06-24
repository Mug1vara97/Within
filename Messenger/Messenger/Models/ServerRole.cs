using System;
using System.Collections.Generic;

namespace Messenger.Models;

public partial class ServerRole
{
    public int RoleId { get; set; }

    public int ServerId { get; set; }

    public string RoleName { get; set; } = null!;

    public string Permissions { get; set; } = null!;

    public string? Color { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Server Server { get; set; } = null!;

    public virtual ICollection<UserServerRole> UserServerRoles { get; set; } = new List<UserServerRole>();
}
