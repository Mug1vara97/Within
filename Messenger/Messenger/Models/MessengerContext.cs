using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace Messenger.Models;

public partial class MessengerContext : DbContext
{
    public MessengerContext()
    {
    }

    public MessengerContext(DbContextOptions<MessengerContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AuditLog> AuditLogs { get; set; }

    public virtual DbSet<Chat> Chats { get; set; }

    public virtual DbSet<ChatCategory> ChatCategories { get; set; }

    public virtual DbSet<ChatType> ChatTypes { get; set; }

    public virtual DbSet<Member> Members { get; set; }

    public virtual DbSet<Message> Messages { get; set; }

    public virtual DbSet<MessageRead> MessageReads { get; set; }

    public virtual DbSet<Server> Servers { get; set; }

    public virtual DbSet<ServerMember> ServerMembers { get; set; }

    public virtual DbSet<ServerRole> ServerRoles { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<UserProfile> UserProfiles { get; set; }

    public virtual DbSet<UserServerRole> UserServerRoles { get; set; }

    public virtual DbSet<UserServerOrder> UserServerOrders { get; set; }

    public virtual DbSet<ServerAuditLog> ServerAuditLogs { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseNpgsql("Host=db;Port=5432;Database=Whithin;Username=postgres;Password=1000-7");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Настройка для PostgreSQL
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            // Преобразование имен таблиц и столбцов в нижний регистр
            entity.SetTableName(entity.GetTableName().ToLower());

            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(property.GetColumnName().ToLower());
            }
        }

        // Добавляем начальные данные для типов чатов
        modelBuilder.Entity<ChatType>().HasData(
            new ChatType { TypeId = 1, TypeName = "direct" },
            new ChatType { TypeId = 2, TypeName = "group" },
            new ChatType { TypeId = 3, TypeName = "text_chanel" },
            new ChatType { TypeId = 4, TypeName = "voice_chanel" }
        );

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.LogId).HasName("audit_logs_pkey");

            entity.ToTable("audit_logs");

            entity.Property(e => e.LogId).HasColumnName("log_id");
            entity.Property(e => e.ActionType)
                .HasMaxLength(50)
                .HasColumnName("action_type");
            entity.Property(e => e.Changes)
                .HasColumnType("jsonb")
                .HasColumnName("changes");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.ServerId).HasColumnName("server_id");
            entity.Property(e => e.TargetId).HasColumnName("target_id");
            entity.Property(e => e.TargetType)
                .HasMaxLength(50)
                .HasColumnName("target_type");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Server).WithMany(p => p.AuditLogs)
                .HasForeignKey(d => d.ServerId)
                .HasConstraintName("audit_logs_server_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.AuditLogs)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("audit_logs_user_id_fkey");
        });

        modelBuilder.Entity<Chat>(entity =>
        {
            entity.HasKey(e => e.ChatId).HasName("chats_pkey");

            entity.ToTable("chats");

            entity.Property(e => e.ChatId).HasColumnName("chat_id");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.ChatOrder)
                .HasDefaultValue(0)
                .HasColumnName("chat_order");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.ServerId).HasColumnName("server_id");
            entity.Property(e => e.TypeId).HasColumnName("type_id");

            entity.HasOne(d => d.Category).WithMany(p => p.Chats)
                .HasForeignKey(d => d.CategoryId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("chats_category_id_fkey");

            entity.HasOne(d => d.Server).WithMany(p => p.Chats)
                .HasForeignKey(d => d.ServerId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("chats_server_id_fkey");

            entity.HasOne(d => d.Type).WithMany(p => p.Chats)
                .HasForeignKey(d => d.TypeId)
                .HasConstraintName("chats_type_id_fkey");
        });

        modelBuilder.Entity<ChatCategory>(entity =>
        {
            entity.HasKey(e => e.CategoryId).HasName("chat_categories_pkey");

            entity.ToTable("chat_categories");

            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.CategoryName)
                .HasMaxLength(100)
                .HasColumnName("category_name");
            entity.Property(e => e.CategoryOrder)
                .HasDefaultValue(0)
                .HasColumnName("category_order");
            entity.Property(e => e.ServerId).HasColumnName("server_id");

            entity.HasOne(d => d.Server).WithMany(p => p.ChatCategories)
                .HasForeignKey(d => d.ServerId)
                .HasConstraintName("chat_categories_server_id_fkey");
        });

        modelBuilder.Entity<ChatType>(entity =>
        {
            entity.HasKey(e => e.TypeId).HasName("chat_types_pkey");

            entity.ToTable("chat_types");

            entity.HasIndex(e => e.TypeName, "chat_types_type_name_key").IsUnique();

            entity.Property(e => e.TypeId).HasColumnName("type_id");
            entity.Property(e => e.TypeName)
                .HasMaxLength(20)
                .HasColumnName("type_name");
        });

        modelBuilder.Entity<Member>(entity =>
        {
            entity.HasKey(e => e.MemberId).HasName("members_pkey");

            entity.ToTable("members");

            entity.HasIndex(e => new { e.UserId, e.ChatId }, "members_user_id_chat_id_key").IsUnique();

            entity.Property(e => e.MemberId).HasColumnName("member_id");
            entity.Property(e => e.ChatId).HasColumnName("chat_id");
            entity.Property(e => e.JoinedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("joined_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Chat).WithMany(p => p.Members)
                .HasForeignKey(d => d.ChatId)
                .HasConstraintName("members_chat_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.Members)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("members_user_id_fkey");
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(e => e.MessageId).HasName("messages_pkey");

            entity.ToTable("messages");

            entity.Property(e => e.MessageId).HasColumnName("message_id");
            entity.Property(e => e.ChatId).HasColumnName("chat_id");
            entity.Property(e => e.Content).HasColumnName("content");
            entity.Property(e => e.ContentType)
                .HasMaxLength(50)
                .HasColumnName("content_type");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Chat).WithMany(p => p.Messages)
                .HasForeignKey(d => d.ChatId)
                .HasConstraintName("messages_chat_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.Messages)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("messages_user_id_fkey");

            entity.HasOne(d => d.RepliedToMessage)
                .WithMany(p => p.Replies)
                .HasForeignKey(d => d.RepliedToMessageId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("messages_replied_to_message_id_fkey");

            entity.HasOne(d => d.ForwardedFromMessage)
                .WithMany()
                .HasForeignKey(d => d.ForwardedFromMessageId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("messages_forwarded_from_message_id_fkey");

            entity.HasOne(d => d.ForwardedFromChat)
                .WithMany()
                .HasForeignKey(d => d.ForwardedFromChatId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("messages_forwarded_from_chat_id_fkey");

            entity.HasOne(d => d.ForwardedByUser)
                .WithMany()
                .HasForeignKey(d => d.ForwardedByUserId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("messages_forwarded_by_user_id_fkey");
        });

        modelBuilder.Entity<MessageRead>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("message_reads_pkey");

            entity.ToTable("message_reads");

            entity.HasIndex(e => new { e.MessageId, e.UserId }, "message_reads_message_id_user_id_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MessageId).HasColumnName("message_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.ReadAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("read_at");

            entity.HasOne(d => d.Message).WithMany(p => p.MessageReads)
                .HasForeignKey(d => d.MessageId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("message_reads_message_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.MessageReads)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("message_reads_user_id_fkey");
        });

        modelBuilder.Entity<Server>(entity =>
        {
            entity.HasKey(e => e.ServerId).HasName("servers_pkey");

            entity.ToTable("servers");

            entity.Property(e => e.ServerId).HasColumnName("server_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.OwnerId).HasColumnName("owner_id");

            entity.HasOne(d => d.Owner).WithMany(p => p.Servers)
                .HasForeignKey(d => d.OwnerId)
                .HasConstraintName("servers_owner_id_fkey");
        });

        modelBuilder.Entity<ServerMember>(entity =>
        {
            entity.HasKey(e => e.ServerMemberId).HasName("server_members_pkey");

            entity.ToTable("server_members");

            entity.HasIndex(e => new { e.ServerId, e.UserId }, "server_members_server_id_user_id_key").IsUnique();

            entity.Property(e => e.ServerMemberId).HasColumnName("server_member_id");
            entity.Property(e => e.JoinedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("joined_at");
            entity.Property(e => e.ServerId).HasColumnName("server_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Server).WithMany(p => p.ServerMembers)
                .HasForeignKey(d => d.ServerId)
                .HasConstraintName("server_members_server_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.ServerMembers)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("server_members_user_id_fkey");
        });

        modelBuilder.Entity<ServerRole>(entity =>
        {
            entity.HasKey(e => e.RoleId).HasName("server_roles_pkey");

            entity.ToTable("server_roles");

            entity.HasIndex(e => new { e.ServerId, e.RoleName }, "server_roles_server_id_role_name_key").IsUnique();

            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.Color)
                .HasMaxLength(7)
                .HasDefaultValueSql("'#99AAB5'::character varying")
                .HasColumnName("color");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Permissions)
                .HasDefaultValueSql("'{}'::jsonb")
                .HasColumnType("jsonb")
                .HasColumnName("permissions");
            entity.Property(e => e.RoleName)
                .HasMaxLength(50)
                .HasColumnName("role_name");
            entity.Property(e => e.ServerId).HasColumnName("server_id");

            entity.HasOne(d => d.Server).WithMany(p => p.ServerRoles)
                .HasForeignKey(d => d.ServerId)
                .HasConstraintName("server_roles_server_id_fkey");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("users_pkey");

            entity.ToTable("users");

            entity.HasIndex(e => e.Username, "users_username_key").IsUnique();

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Password)
                .HasMaxLength(255)
                .HasColumnName("password");
            entity.Property(e => e.Username)
                .HasMaxLength(32)
                .HasColumnName("username");
        });

        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.HasKey(e => e.ProfileId).HasName("user_profiles_pkey");

            entity.ToTable("user_profiles");

            entity.HasIndex(e => e.UserId, "user_profiles_user_id_key").IsUnique();

            entity.Property(e => e.ProfileId).HasColumnName("profile_id");
            entity.Property(e => e.Avatar)
                .HasMaxLength(255)
                .HasColumnName("avatar");
            entity.Property(e => e.AvatarColor)
                .HasMaxLength(7)
                .HasDefaultValueSql("'#5865F2'::character varying")
                .HasColumnName("avatar_color");
            entity.Property(e => e.Banner)
                .HasMaxLength(255)
                .HasColumnName("banner");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithOne(p => p.UserProfile)
                .HasForeignKey<UserProfile>(d => d.UserId)
                .HasConstraintName("user_profiles_user_id_fkey");
        });

        modelBuilder.Entity<UserServerRole>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.ServerId, e.RoleId }).HasName("user_server_roles_pkey");

            entity.ToTable("user_server_roles");

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.ServerId).HasColumnName("server_id");
            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.AssignedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("assigned_at");

            entity.HasOne(d => d.Role).WithMany(p => p.UserServerRoles)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("user_server_roles_role_id_fkey");

            entity.HasOne(d => d.Server).WithMany(p => p.UserServerRoles)
                .HasForeignKey(d => d.ServerId)
                .HasConstraintName("user_server_roles_server_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.UserServerRoles)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("user_server_roles_user_id_fkey");
        });

        modelBuilder.Entity<UserServerOrder>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("user_server_orders_pkey");

            entity.ToTable("user_server_orders");

            entity.HasIndex(e => new { e.UserId, e.ServerId }, "user_server_orders_user_id_server_id_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.ServerId).HasColumnName("server_id");
            entity.Property(e => e.Position).HasColumnName("position");

            entity.HasOne(d => d.User).WithMany(p => p.UserServerOrders)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("user_server_orders_user_id_fkey");

            entity.HasOne(d => d.Server).WithMany(p => p.UserServerOrders)
                .HasForeignKey(d => d.ServerId)
                .HasConstraintName("user_server_orders_server_id_fkey");
        });

        modelBuilder.Entity<ServerAuditLog>(entity =>
        {
            entity.HasKey(e => e.AuditLogId).HasName("server_audit_logs_pkey");

            entity.ToTable("server_audit_logs");

            entity.Property(e => e.AuditLogId).HasColumnName("audit_log_id");
            entity.Property(e => e.ServerId).HasColumnName("server_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.ActionType)
                .HasMaxLength(50)
                .HasColumnName("action_type");
            entity.Property(e => e.Details)
                .HasColumnType("text")
                .HasColumnName("details");
            entity.Property(e => e.Timestamp)
                .HasDefaultValueSql("now()")
                .HasColumnName("timestamp");

            entity.HasOne(d => d.Server)
                .WithMany(p => p.ServerAuditLogs)
                .HasForeignKey(d => d.ServerId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("server_audit_logs_server_id_fkey");

            entity.HasOne(d => d.User)
                .WithMany(p => p.ServerAuditLogs)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("server_audit_logs_user_id_fkey");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
