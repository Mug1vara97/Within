using Microsoft.AspNetCore.SignalR;

namespace Messenger
{
    public class CustomUserIdProvider : IUserIdProvider
    {
        public string GetUserId(HubConnectionContext connection)
        {
            // Получаем UserId из HTTP-контекста
            var userId = connection.GetHttpContext()?.Request.Query["userId"].FirstOrDefault();
            
            // Для отладки
            Console.WriteLine($"CustomUserIdProvider: Получен userId = {userId}");
            
            if (string.IsNullOrEmpty(userId))
            {
                Console.WriteLine("CustomUserIdProvider: userId не найден в запросе");
                // Возвращаем уникальный идентификатор подключения как запасной вариант
                return connection.ConnectionId;
            }

            return userId;
        }
    }
} 