using System.Collections.Generic;

namespace Messenger.Models
{
    public class ServerReorderRequest
    {
        public int UserId { get; set; }
        public List<ServerOrderItem> ServerOrders { get; set; }
    }

    public class ServerOrderItem
    {
        public int ServerId { get; set; }
        public int Position { get; set; }
    }
} 