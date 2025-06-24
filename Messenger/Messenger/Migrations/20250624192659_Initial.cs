using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Messenger.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "chat_types",
                columns: table => new
                {
                    type_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    type_name = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("chat_types_pkey", x => x.type_id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    user_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    username = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    password = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("users_pkey", x => x.user_id);
                });

            migrationBuilder.CreateTable(
                name: "servers",
                columns: table => new
                {
                    server_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    owner_id = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    banner = table.Column<string>(type: "text", nullable: true),
                    bannercolor = table.Column<string>(type: "text", nullable: true),
                    avatar = table.Column<string>(type: "text", nullable: true),
                    ispublic = table.Column<bool>(type: "boolean", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("servers_pkey", x => x.server_id);
                    table.ForeignKey(
                        name: "servers_owner_id_fkey",
                        column: x => x.owner_id,
                        principalTable: "users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_profiles",
                columns: table => new
                {
                    profile_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    avatar = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    avatar_color = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: true, defaultValueSql: "'#5865F2'::character varying"),
                    description = table.Column<string>(type: "text", nullable: true),
                    banner = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("user_profiles_pkey", x => x.profile_id);
                    table.ForeignKey(
                        name: "user_profiles_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    log_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    server_id = table.Column<int>(type: "integer", nullable: false),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    action_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    target_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    target_id = table.Column<int>(type: "integer", nullable: true),
                    changes = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("audit_logs_pkey", x => x.log_id);
                    table.ForeignKey(
                        name: "audit_logs_server_id_fkey",
                        column: x => x.server_id,
                        principalTable: "servers",
                        principalColumn: "server_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "audit_logs_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "chat_categories",
                columns: table => new
                {
                    category_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    category_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    server_id = table.Column<int>(type: "integer", nullable: false),
                    category_order = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    isprivate = table.Column<bool>(type: "boolean", nullable: false),
                    allowedroleids = table.Column<string>(type: "text", nullable: true),
                    alloweduserids = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("chat_categories_pkey", x => x.category_id);
                    table.ForeignKey(
                        name: "chat_categories_server_id_fkey",
                        column: x => x.server_id,
                        principalTable: "servers",
                        principalColumn: "server_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "server_audit_logs",
                columns: table => new
                {
                    audit_log_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    server_id = table.Column<int>(type: "integer", nullable: false),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    action_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    details = table.Column<string>(type: "text", nullable: false),
                    timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("server_audit_logs_pkey", x => x.audit_log_id);
                    table.ForeignKey(
                        name: "server_audit_logs_server_id_fkey",
                        column: x => x.server_id,
                        principalTable: "servers",
                        principalColumn: "server_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "server_audit_logs_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "server_members",
                columns: table => new
                {
                    server_member_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    server_id = table.Column<int>(type: "integer", nullable: false),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    joined_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("server_members_pkey", x => x.server_member_id);
                    table.ForeignKey(
                        name: "server_members_server_id_fkey",
                        column: x => x.server_id,
                        principalTable: "servers",
                        principalColumn: "server_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "server_members_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "server_roles",
                columns: table => new
                {
                    role_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    server_id = table.Column<int>(type: "integer", nullable: false),
                    role_name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    permissions = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    color = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: true, defaultValueSql: "'#99AAB5'::character varying"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("server_roles_pkey", x => x.role_id);
                    table.ForeignKey(
                        name: "server_roles_server_id_fkey",
                        column: x => x.server_id,
                        principalTable: "servers",
                        principalColumn: "server_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_server_orders",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    server_id = table.Column<int>(type: "integer", nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("user_server_orders_pkey", x => x.id);
                    table.ForeignKey(
                        name: "user_server_orders_server_id_fkey",
                        column: x => x.server_id,
                        principalTable: "servers",
                        principalColumn: "server_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "user_server_orders_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "chats",
                columns: table => new
                {
                    chat_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    type_id = table.Column<int>(type: "integer", nullable: false),
                    category_id = table.Column<int>(type: "integer", nullable: true),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    server_id = table.Column<int>(type: "integer", nullable: true),
                    isprivate = table.Column<bool>(type: "boolean", nullable: false),
                    allowedroleids = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    chat_order = table.Column<int>(type: "integer", nullable: true, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("chats_pkey", x => x.chat_id);
                    table.ForeignKey(
                        name: "chats_category_id_fkey",
                        column: x => x.category_id,
                        principalTable: "chat_categories",
                        principalColumn: "category_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "chats_server_id_fkey",
                        column: x => x.server_id,
                        principalTable: "servers",
                        principalColumn: "server_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "chats_type_id_fkey",
                        column: x => x.type_id,
                        principalTable: "chat_types",
                        principalColumn: "type_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_server_roles",
                columns: table => new
                {
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    server_id = table.Column<int>(type: "integer", nullable: false),
                    role_id = table.Column<int>(type: "integer", nullable: false),
                    assigned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("user_server_roles_pkey", x => new { x.user_id, x.server_id, x.role_id });
                    table.ForeignKey(
                        name: "user_server_roles_role_id_fkey",
                        column: x => x.role_id,
                        principalTable: "server_roles",
                        principalColumn: "role_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "user_server_roles_server_id_fkey",
                        column: x => x.server_id,
                        principalTable: "servers",
                        principalColumn: "server_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "user_server_roles_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "members",
                columns: table => new
                {
                    member_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    chat_id = table.Column<int>(type: "integer", nullable: false),
                    joined_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("members_pkey", x => x.member_id);
                    table.ForeignKey(
                        name: "members_chat_id_fkey",
                        column: x => x.chat_id,
                        principalTable: "chats",
                        principalColumn: "chat_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "members_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "messages",
                columns: table => new
                {
                    message_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    chat_id = table.Column<int>(type: "integer", nullable: false),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true, defaultValueSql: "now()"),
                    content_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    forwardedmessagecontent = table.Column<string>(type: "text", nullable: true),
                    repliedtomessageid = table.Column<long>(type: "bigint", nullable: true),
                    forwardedfrommessageid = table.Column<long>(type: "bigint", nullable: true),
                    forwardedfromchatid = table.Column<int>(type: "integer", nullable: true),
                    forwardedbyuserid = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("messages_pkey", x => x.message_id);
                    table.ForeignKey(
                        name: "messages_chat_id_fkey",
                        column: x => x.chat_id,
                        principalTable: "chats",
                        principalColumn: "chat_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "messages_forwarded_by_user_id_fkey",
                        column: x => x.forwardedbyuserid,
                        principalTable: "users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "messages_forwarded_from_chat_id_fkey",
                        column: x => x.forwardedfromchatid,
                        principalTable: "chats",
                        principalColumn: "chat_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "messages_forwarded_from_message_id_fkey",
                        column: x => x.forwardedfrommessageid,
                        principalTable: "messages",
                        principalColumn: "message_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "messages_replied_to_message_id_fkey",
                        column: x => x.repliedtomessageid,
                        principalTable: "messages",
                        principalColumn: "message_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "messages_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "chat_types",
                columns: new[] { "type_id", "type_name" },
                values: new object[,]
                {
                    { 1, "direct" },
                    { 2, "group" },
                    { 3, "text_chanel" },
                    { 4, "voice_chanel" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_server_id",
                table: "audit_logs",
                column: "server_id");

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_user_id",
                table: "audit_logs",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_chat_categories_server_id",
                table: "chat_categories",
                column: "server_id");

            migrationBuilder.CreateIndex(
                name: "chat_types_type_name_key",
                table: "chat_types",
                column: "type_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_chats_category_id",
                table: "chats",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "IX_chats_server_id",
                table: "chats",
                column: "server_id");

            migrationBuilder.CreateIndex(
                name: "IX_chats_type_id",
                table: "chats",
                column: "type_id");

            migrationBuilder.CreateIndex(
                name: "IX_members_chat_id",
                table: "members",
                column: "chat_id");

            migrationBuilder.CreateIndex(
                name: "members_user_id_chat_id_key",
                table: "members",
                columns: new[] { "user_id", "chat_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_messages_chat_id",
                table: "messages",
                column: "chat_id");

            migrationBuilder.CreateIndex(
                name: "IX_messages_forwardedbyuserid",
                table: "messages",
                column: "forwardedbyuserid");

            migrationBuilder.CreateIndex(
                name: "IX_messages_forwardedfromchatid",
                table: "messages",
                column: "forwardedfromchatid");

            migrationBuilder.CreateIndex(
                name: "IX_messages_forwardedfrommessageid",
                table: "messages",
                column: "forwardedfrommessageid");

            migrationBuilder.CreateIndex(
                name: "IX_messages_repliedtomessageid",
                table: "messages",
                column: "repliedtomessageid");

            migrationBuilder.CreateIndex(
                name: "IX_messages_user_id",
                table: "messages",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_server_audit_logs_server_id",
                table: "server_audit_logs",
                column: "server_id");

            migrationBuilder.CreateIndex(
                name: "IX_server_audit_logs_user_id",
                table: "server_audit_logs",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_server_members_user_id",
                table: "server_members",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "server_members_server_id_user_id_key",
                table: "server_members",
                columns: new[] { "server_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "server_roles_server_id_role_name_key",
                table: "server_roles",
                columns: new[] { "server_id", "role_name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_servers_owner_id",
                table: "servers",
                column: "owner_id");

            migrationBuilder.CreateIndex(
                name: "user_profiles_user_id_key",
                table: "user_profiles",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_server_orders_server_id",
                table: "user_server_orders",
                column: "server_id");

            migrationBuilder.CreateIndex(
                name: "user_server_orders_user_id_server_id_key",
                table: "user_server_orders",
                columns: new[] { "user_id", "server_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_server_roles_role_id",
                table: "user_server_roles",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_server_roles_server_id",
                table: "user_server_roles",
                column: "server_id");

            migrationBuilder.CreateIndex(
                name: "users_username_key",
                table: "users",
                column: "username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "members");

            migrationBuilder.DropTable(
                name: "messages");

            migrationBuilder.DropTable(
                name: "server_audit_logs");

            migrationBuilder.DropTable(
                name: "server_members");

            migrationBuilder.DropTable(
                name: "user_profiles");

            migrationBuilder.DropTable(
                name: "user_server_orders");

            migrationBuilder.DropTable(
                name: "user_server_roles");

            migrationBuilder.DropTable(
                name: "chats");

            migrationBuilder.DropTable(
                name: "server_roles");

            migrationBuilder.DropTable(
                name: "chat_categories");

            migrationBuilder.DropTable(
                name: "chat_types");

            migrationBuilder.DropTable(
                name: "servers");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
