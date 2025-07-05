using System;
using System.Collections.Generic;

namespace Messenger.Models;

public partial class User
{
    public int UserId { get; set; }

    public string Username { get; set; } = null!;

    public DateTime? CreatedAt { get; set; }

    public string Password { get; set; } = null!;

    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();

    public virtual ICollection<Member> Members { get; set; } = new List<Member>();

    public virtual ICollection<Message> Messages { get; set; } = new List<Message>();

    public virtual ICollection<ServerMember> ServerMembers { get; set; } = new List<ServerMember>();

    public virtual ICollection<Server> Servers { get; set; } = new List<Server>();

    public virtual UserProfile? UserProfile { get; set; }

    public virtual ICollection<UserServerRole> UserServerRoles { get; set; } = new List<UserServerRole>();

    public virtual ICollection<UserServerOrder> UserServerOrders { get; set; } = new List<UserServerOrder>();

    public virtual ICollection<ServerAuditLog> ServerAuditLogs { get; set; } = new List<ServerAuditLog>();

    public virtual ICollection<MessageRead> MessageReads { get; set; } = new List<MessageRead>();
}
