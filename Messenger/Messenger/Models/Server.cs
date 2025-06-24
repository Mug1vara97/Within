using System;
using System.Collections.Generic;

namespace Messenger.Models;

public partial class Server
{
    public int ServerId { get; set; }

    public string Name { get; set; } = null!;

    public int OwnerId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public string? Banner { get; set; }

    public string? BannerColor { get; set; }

    public string? Avatar { get; set; }

    public bool IsPublic { get; set; } = false;

    public string? Description { get; set; }

    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();

    public virtual ICollection<ChatCategory> ChatCategories { get; set; } = new List<ChatCategory>();

    public virtual ICollection<Chat> Chats { get; set; } = new List<Chat>();

    public virtual User Owner { get; set; } = null!;

    public virtual ICollection<ServerMember> ServerMembers { get; set; } = new List<ServerMember>();

    public virtual ICollection<ServerRole> ServerRoles { get; set; } = new List<ServerRole>();

    public virtual ICollection<UserServerRole> UserServerRoles { get; set; } = new List<UserServerRole>();

    public virtual ICollection<UserServerOrder> UserServerOrders { get; set; } = new List<UserServerOrder>();

    public virtual ICollection<ServerAuditLog> ServerAuditLogs { get; set; } = new List<ServerAuditLog>();
}
