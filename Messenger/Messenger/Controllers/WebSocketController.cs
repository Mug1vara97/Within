using Messenger.Models;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;
using System.Data;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace Messenger.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WebSocketController : ControllerBase
    {
        private static readonly ConcurrentDictionary<string, List<WebSocket>> _sockets =
            new ConcurrentDictionary<string, List<WebSocket>>();

        [HttpGet("/ws")]
        public async Task GetWebSocket(string serverId)
        {
            if (HttpContext.WebSockets.IsWebSocketRequest)
            {
                var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();
                var sockets = _sockets.GetOrAdd(serverId, id => new List<WebSocket>());
                sockets.Add(webSocket);

                await HandleWebSocket(webSocket, serverId);
            }
            else
            {
                HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            }
        }

        private async Task HandleWebSocket(WebSocket webSocket, string serverId)
        {
            var buffer = new byte[1024 * 4];
            while (webSocket.State == WebSocketState.Open)
            {
                await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            }

            _sockets[serverId].Remove(webSocket);
            await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closed", CancellationToken.None);
        }

        public static async Task SendRoleUpdate(string serverId, string userId, List<ServerRole> roles)
        {
            if (_sockets.TryGetValue(serverId, out var sockets))
            {
                var message = new
                {
                    type = "ROLE_UPDATE",
                    userId,
                    roles = roles.Select(r => new {
                        roleId = r.RoleId,
                        roleName = r.RoleName,
                        color = r.Color
                    })
                };

                var json = JsonSerializer.Serialize(message);
                var buffer = Encoding.UTF8.GetBytes(json);
                var segment = new ArraySegment<byte>(buffer);

                foreach (var socket in sockets.Where(s => s.State == WebSocketState.Open))
                {
                    await socket.SendAsync(segment, WebSocketMessageType.Text, true, CancellationToken.None);
                }
            }
        }
    }
}
