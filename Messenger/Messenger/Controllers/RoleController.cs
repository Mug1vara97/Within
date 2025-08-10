using Messenger.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Messenger.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RoleController : ControllerBase
    {

        private readonly MessengerContext _context;

        public RoleController(MessengerContext context)
        {
            _context = context;
        }

        [HttpGet("{serverId}")]
        public async Task<IActionResult> GetRoles(int serverId)
        {
            var roles = await _context.ServerRoles
                .Where(r => r.ServerId == serverId)
                .ToListAsync();

            return Ok(roles);
        }

        [HttpPost("{serverId}")]
        public async Task<IActionResult> CreateRole(int serverId, [FromBody] RoleCreateRequest request)
        {
            try
            {
                var server = await _context.Servers.FindAsync(serverId);
                if (server == null) return NotFound(new { Message = "Сервер не найден" });

                var role = new ServerRole
                {
                    ServerId = serverId,
                    RoleName = request.RoleName,
                    Permissions = JsonSerializer.Serialize(request.Permissions),
                    Color = request.Color
                };

                _context.ServerRoles.Add(role);
                await _context.SaveChangesAsync();

                // Возвращаем DTO вместо полной модели
                return Ok(new
                {
                    role.RoleId,
                    role.RoleName,
                    role.Color,
                    Permissions = JsonSerializer.Deserialize<Dictionary<string, bool>>(role.Permissions)
                });
            }
            catch (Exception ex)
            {
                // Логирование ошибки
                return StatusCode(500, new
                {
                    Message = "Внутренняя ошибка сервера",
                    Details = ex.Message
                });
            }
        }

        [HttpPut("{roleId}")]
        public async Task<IActionResult> UpdateRole(int roleId, [FromBody] RoleUpdateRequest request)
        {
            var role = await _context.ServerRoles.FindAsync(roleId);
            if (role == null) return NotFound();

            role.RoleName = request.RoleName;
            role.Permissions = JsonSerializer.Serialize(request.Permissions);
            role.Color = request.Color;

            await _context.SaveChangesAsync();
            return Ok(role);
        }

        [HttpDelete("{roleId}")]
        public async Task<IActionResult> DeleteRole(int roleId)
        {
            try
            {
                var role = await _context.ServerRoles
                    .Include(r => r.UserServerRoles)
                    .FirstOrDefaultAsync(r => r.RoleId == roleId);

                if (role == null) return NotFound();

                _context.UserServerRoles.RemoveRange(role.UserServerRoles);
                _context.ServerRoles.Remove(role);

                await _context.SaveChangesAsync();
                return Ok(new { Message = "Роль успешно удалена" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Message = "Ошибка при удалении роли",
                    Details = ex.Message
                });
            }
        }

        [HttpPost("{roleId}/assign")]
        public async Task<IActionResult> AssignRole(int roleId, [FromBody] AssignRoleRequest request)
        {
            var role = await _context.ServerRoles
                .Include(r => r.UserServerRoles) // Добавляем включение связанных данных
                .FirstOrDefaultAsync(r => r.RoleId == roleId);

            if (role == null) return NotFound();

            var serverId = role.ServerId; // Получаем serverId из роли

            var user = await _context.Users.FindAsync(request.UserId);
            if (user == null) return NotFound();

            var assignment = new UserServerRole
            {
                UserId = request.UserId,
                ServerId = serverId,
                RoleId = roleId
            };

            _context.UserServerRoles.Add(assignment);
            await _context.SaveChangesAsync();

            var updatedRoles = await _context.ServerRoles
             .Where(r => r.ServerId == serverId &&
                    r.UserServerRoles.Any(ur => ur.UserId == request.UserId))
                  .ToListAsync();

            var userRoles = await _context.UserServerRoles
            .Where(usr => usr.UserId == request.UserId && usr.ServerId == serverId)
            .Include(usr => usr.Role)
            .Select(usr => new {
                usr.Role.RoleId,
                usr.Role.RoleName,
                usr.Role.Color,
                Permissions = JsonSerializer.Deserialize<Dictionary<string, bool>>(
                            usr.Role.Permissions,
                            (JsonSerializerOptions)null)
            })
            .ToListAsync();

            var hubContext = HttpContext.RequestServices.GetRequiredService<IHubContext<ServerHub>>();
            await hubContext.Clients.Group(serverId.ToString())
                .SendAsync("MemberRolesUpdated", request.UserId, userRoles);

            return Ok();
        }

        [HttpGet("{serverId}/members")]
        public async Task<IActionResult> GetServerMembers(int serverId)
        {
            var members = await _context.ServerMembers
                .Where(sm => sm.ServerId == serverId)
                .Include(sm => sm.User)
                .ThenInclude(u => u.UserProfile)
                .Include(sm => sm.User.UserServerRoles)
                .ThenInclude(usr => usr.Role)
                .Select(sm => new
                {
                    sm.UserId,
                    sm.User.Username,
                    Avatar = sm.User.UserProfile.Avatar != null
                        ? $"{Request.Scheme}://{Request.Host}{sm.User.UserProfile.Avatar}"
                        : null,
                    Roles = sm.User.UserServerRoles
                        .Where(usr => usr.ServerId == serverId)
                        .Select(usr => new
                        {
                            usr.Role.RoleId,
                            usr.Role.RoleName,
                            usr.Role.Color,
                            Permissions = JsonSerializer.Deserialize<Dictionary<string, bool>>(
                            usr.Role.Permissions,
                            (JsonSerializerOptions)null)
                        }),
                    AvatarColor = sm.User.UserProfile.AvatarColor
                })
                .ToListAsync();

            return Ok(members);
        }

        [HttpDelete("{roleId}/unassign/{userId}")]
        public async Task<IActionResult> UnassignRole(int roleId, int userId)
        {
            var assignment = await _context.UserServerRoles
                .Include(usr => usr.Role) // Добавляем включение роли
                .FirstOrDefaultAsync(usr => usr.UserId == userId && usr.RoleId == roleId);

            if (assignment == null) return NotFound();

            var serverId = assignment.Role.ServerId; // Получаем serverId из роли

            _context.UserServerRoles.Remove(assignment);
            await _context.SaveChangesAsync();

            var updatedRoles = await _context.ServerRoles
             .Where(r => r.ServerId == serverId &&
                    r.UserServerRoles.Any(ur => ur.UserId == userId))
                 .ToListAsync();

            var userRoles = await _context.UserServerRoles
             .Where(usr => usr.UserId == userId && usr.ServerId == serverId)
             .Include(usr => usr.Role)
             .Select(usr => new {
                 usr.Role.RoleId,
                 usr.Role.RoleName,
                 usr.Role.Color,
                 Permissions = JsonSerializer.Deserialize<Dictionary<string, bool>>(
                            usr.Role.Permissions,
                            (JsonSerializerOptions)null)
             })
             .ToListAsync();

            var hubContext = HttpContext.RequestServices.GetRequiredService<IHubContext<ServerHub>>();
            await hubContext.Clients.Group(serverId.ToString())
                .SendAsync("MemberRolesUpdated", userId, userRoles);

            return NoContent();
        }

        [HttpGet("user/{userId}/roles/{serverId}")]
        public async Task<IActionResult> GetUserRoles(int userId, int serverId)
        {
            try
            {
                var userExists = await _context.Users.AnyAsync(u => u.UserId == userId);
                if (!userExists)
                    return NotFound(new { Message = "Пользователь не найден" });

                var serverExists = await _context.Servers.AnyAsync(s => s.ServerId == serverId);
                if (!serverExists)
                    return NotFound(new { Message = "Сервер не найден" });

                var roles = await _context.UserServerRoles
                    .Where(usr => usr.UserId == userId && usr.ServerId == serverId)
                    .Include(usr => usr.Role)
                    .Select(usr => new
                    {
                        usr.Role.RoleId,
                        usr.Role.RoleName,
                        usr.Role.Color,
                        Permissions = JsonSerializer.Deserialize<Dictionary<string, bool>>(
                            usr.Role.Permissions,
                            (JsonSerializerOptions)null) // Явное указание параметров
                    })
                    .ToListAsync();

                return Ok(new
                {
                    UserId = userId,
                    ServerId = serverId,
                    Roles = roles
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Message = "Ошибка при получении ролей пользователя",
                    Details = ex.Message
                });
            }
        }

        public class RoleCreateRequest
        {
            public string RoleName { get; set; }
            public Dictionary<string, bool> Permissions { get; set; }
            public string Color { get; set; }
        }

        public class RoleUpdateRequest
        {
            public string RoleName { get; set; }
            public Dictionary<string, bool> Permissions { get; set; }
            public string Color { get; set; }
        }

        public class AssignRoleRequest
        {
            public int UserId { get; set; }
        }

    }
}
