using System;
using System.Collections.Generic;

namespace Messenger.Models;

public partial class UserProfile
{
    public int ProfileId { get; set; }

    public int UserId { get; set; }

    public string? Avatar { get; set; }

    public string? AvatarColor { get; set; }

    public string? Description { get; set; }

    public string? Banner { get; set; }

    public virtual User User { get; set; } = null!;
}
