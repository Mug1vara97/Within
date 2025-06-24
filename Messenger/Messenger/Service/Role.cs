using Microsoft.EntityFrameworkCore;
using Messenger.Models;
using Messenger.Controllers;

namespace Messenger.Service
{
    public class RoleService
    {
        private readonly MessengerContext _context;

        public RoleService(MessengerContext context)
        {
            _context = context;
        }

        public async Task AssignRole(int roleId, string userId)
        {
            // Добавляем связь через промежуточную таблицу
            var userRole = new UserServerRole
            {
                UserId = int.Parse(userId),
                RoleId = roleId,
                ServerId = (await _context.ServerRoles.FindAsync(roleId))?.ServerId ?? 0
            };

            _context.UserServerRoles.Add(userRole);
            await _context.SaveChangesAsync();

            // Отправка обновления через WebSocket
            var roles = await GetUserRoles(userId);
            await WebSocketController.SendRoleUpdate(
                userRole.ServerId.ToString(),
                userId,
                roles
            );
        }

        public async Task RemoveRole(int roleId, string userId)
        {
            var userRole = await _context.UserServerRoles
                .FirstOrDefaultAsync(ur =>
                    ur.UserId == int.Parse(userId) &&
                    ur.RoleId == roleId);

            if (userRole != null)
            {
                _context.UserServerRoles.Remove(userRole);
                await _context.SaveChangesAsync();

                // Отправка обновления через WebSocket
                var roles = await GetUserRoles(userId);
                await WebSocketController.SendRoleUpdate(
                    userRole.ServerId.ToString(),
                    userId,
                    roles
                );
            }
        }

        private async Task<List<ServerRole>> GetUserRoles(string userId)
        {
            return await _context.UserServerRoles
                .Where(ur => ur.UserId == int.Parse(userId))
                .Include(ur => ur.Role)
                .Select(ur => ur.Role)
                .ToListAsync();
        }
    }
}