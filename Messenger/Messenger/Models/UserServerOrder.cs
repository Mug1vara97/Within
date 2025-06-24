using System;

namespace Messenger.Models;

public partial class UserServerOrder
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int ServerId { get; set; }
    public int Position { get; set; }

    public virtual User User { get; set; }
    public virtual Server Server { get; set; }
} 