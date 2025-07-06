using System;

namespace Messenger.Models;

public class VoiceChannelUser
{
    public int UserId { get; set; }
    public int ChatId { get; set; }
    public bool IsMuted { get; set; }
    public bool IsSpeaking { get; set; }
    public bool IsAudioEnabled { get; set; }
    public DateTime JoinedAt { get; set; }

    // Навигационные свойства
    public virtual User User { get; set; }
    public virtual Chat Chat { get; set; }
} 