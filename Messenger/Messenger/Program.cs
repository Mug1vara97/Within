using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Messenger;
using Messenger.Models;
using Microsoft.AspNetCore.WebSockets;
using System.Text.Json.Serialization;
using Messenger.Hubs;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 500 * 1024 * 1024; // 500 MB
});

builder.Services.AddDbContext<MessengerContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddControllers();

// Конфигурация SignalR
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.HandshakeTimeout = TimeSpan.FromSeconds(30); // Увеличиваем для Android
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(60); // Увеличиваем для Android
    options.MaximumReceiveMessageSize = 32 * 1024; // 32KB для больших сообщений
})
.AddJsonProtocol(options => {
    options.PayloadSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.PayloadSerializerOptions.PropertyNameCaseInsensitive = true;
});

// Регистрируем IUserIdProvider только для ChatListHub
builder.Services.AddSingleton<IUserIdProvider, CustomUserIdProvider>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAllOrigins",
        builder =>
        {
            builder
                .SetIsOriginAllowed(_ => true) // Разрешаем все origins в режиме разработки
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials()
                .WithExposedHeaders("Content-Disposition");
        });
        
    // Специальная политика для Android приложения
    options.AddPolicy("AndroidPolicy",
        builder =>
        {
            builder
                .SetIsOriginAllowed(_ => true) // Разрешаем любые origins для Android
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials()
                .WithHeaders("User-Agent", "UserId", "Accept", "Content-Type", "Authorization")
                .WithExposedHeaders("Content-Disposition", "Content-Length");
        });
});

var app = builder.Build();

// Apply migrations
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MessengerContext>();
    try
    {
        db.Database.Migrate();
    }
    catch (Exception ex)
    {
        if (ex.Message.Contains("already exists"))
        {
            Console.WriteLine("Some tables already exist, continuing...");
        }
        else
        {
            throw;
        }
    }
}

// Перемещаем CORS в начало конвейера middleware
app.UseCors("AllowAllOrigins");

// Добавляем middleware для обработки Android запросов
app.Use(async (context, next) =>
{
    var userAgent = context.Request.Headers["User-Agent"].ToString();
    
    // Если запрос от Android приложения, применяем специальную CORS политику
    if (userAgent.Contains("Android-SignalR-Client") || userAgent.Contains("okhttp"))
    {
        Console.WriteLine($"Android request detected: {userAgent}");
        
        // Добавляем специальные заголовки для Android
        context.Response.Headers.Add("Access-Control-Allow-Origin", "*");
        context.Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        context.Response.Headers.Add("Access-Control-Allow-Headers", "User-Agent, UserId, Accept, Content-Type, Authorization, X-Requested-With");
        context.Response.Headers.Add("Access-Control-Allow-Credentials", "true");
        
        // Обрабатываем OPTIONS preflight запросы
        if (context.Request.Method == "OPTIONS")
        {
            context.Response.StatusCode = 200;
            return;
        }
    }
    
    await next();
});

// Отключаем HTTPS редирект для разработки
// if (!app.Environment.IsDevelopment())
// {
//     app.UseHttpsRedirection();
// }

app.UseWebSockets();
app.UseMiddleware<WebSocketMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.Combine(Directory.GetCurrentDirectory(), "Uploads")),
    RequestPath = "/Uploads",
    OnPrepareResponse = ctx =>
    {
        // Используем тот же CORS, что и для основного приложения
        var origin = ctx.Context.Request.Headers["Origin"].ToString();
        if (!string.IsNullOrEmpty(origin))
        {
            ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", origin);
            ctx.Context.Response.Headers.Append("Access-Control-Allow-Credentials", "true");
        }
        ctx.Context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    }
});

// Добавляем дополнительный UseStaticFiles для uploads с маленькой буквы
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.Combine(Directory.GetCurrentDirectory(), "Uploads")),
    RequestPath = "/uploads",
    OnPrepareResponse = ctx =>
    {
        // Используем тот же CORS, что и для основного приложения
        var origin = ctx.Context.Request.Headers["Origin"].ToString();
        if (!string.IsNullOrEmpty(origin))
        {
            ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", origin);
            ctx.Context.Response.Headers.Append("Access-Control-Allow-Credentials", "true");
        }
        ctx.Context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    }
});

app.UseRouting();
app.UseAuthorization();

app.MapHub<ServerHub>("/serverhub");
app.MapHub<ChatListHub>("/chatlisthub");
app.MapHub<GroupChatHub>("/groupchathub");
app.MapHub<StatusHub>("/statushub");
app.MapHub<NotificationHub>("/notificationhub");
app.MapControllers();

app.Run();