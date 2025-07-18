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
    options.HandshakeTimeout = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
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

app.UseRouting();
app.UseAuthorization();

app.MapHub<ServerHub>("/serverhub");
app.MapHub<ChatListHub>("/chatlisthub");
app.MapHub<GroupChatHub>("/groupchathub");
app.MapControllers();

app.Run();