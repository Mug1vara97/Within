import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';

const VoiceChannelContext = createContext();

export const VoiceChannelProvider = ({ children }) => {
  const [voiceChannels, setVoiceChannels] = useState(new Map());
  const [_socket, setSocket] = useState(null);

  // Инициализация WebSocket соединения для получения информации о участниках
  useEffect(() => {
    const newSocket = io('https://whithin.ru');

    setSocket(newSocket);

    // Получаем информацию о всех голосовых каналах и их участниках
    newSocket.emit('getVoiceChannelParticipants');

    // Периодически запрашиваем актуальные данные о участниках
    const syncInterval = setInterval(() => {
      newSocket.emit('getVoiceChannelParticipants');
    }, 10000); // Каждые 10 секунд (уменьшили частоту, чтобы не перезаписывать актуальные состояния)

    // Слушаем обновления участников голосовых каналов
    newSocket.on('voiceChannelParticipantsUpdate', ({ channelId, participants }) => {
      console.log('VoiceChannelContext: Received participants update:', { channelId, participants });
      setVoiceChannels(prev => {
        const newChannels = new Map(prev);
        const existingChannel = newChannels.get(channelId);
        
        if (participants && participants.length > 0) {
          const participantsMap = new Map();
          participants.forEach(participant => {
            const existingParticipant = existingChannel?.participants.get(participant.userId);
            
            // Сохраняем актуальные состояния, если участник уже существует
            participantsMap.set(participant.userId, {
              id: participant.userId,
              name: participant.name,
              // Приоритет у существующих состояний (более свежие данные)
              isMuted: existingParticipant?.isMuted !== undefined ? existingParticipant.isMuted : (participant.isMuted || false),
              isSpeaking: existingParticipant?.isSpeaking !== undefined ? existingParticipant.isSpeaking : (participant.isSpeaking || false),
              isAudioDisabled: existingParticipant?.isAudioDisabled !== undefined ? existingParticipant.isAudioDisabled : (participant.isAudioDisabled || false)
            });
          });
          newChannels.set(channelId, { participants: participantsMap });
          console.log('VoiceChannelContext: Updated channel participants (preserving states):', channelId, participantsMap.size);
        } else {
          // Если участников нет, удаляем канал из списка
          newChannels.delete(channelId);
          console.log('VoiceChannelContext: Removed empty channel:', channelId);
        }
        return newChannels;
      });
    });

    // Слушаем когда пользователь присоединяется к голосовому каналу
    newSocket.on('userJoinedVoiceChannel', ({ channelId, userId, userName, isMuted }) => {
      console.log('VoiceChannelContext: User joined voice channel:', { channelId, userId, userName, isMuted });
      setVoiceChannels(prev => {
        const newChannels = new Map(prev);
        if (!newChannels.has(channelId)) {
          newChannels.set(channelId, { participants: new Map() });
        }
        const channel = newChannels.get(channelId);
        
        // Проверяем, не существует ли уже участник с таким ID
        if (!channel.participants.has(userId)) {
          channel.participants.set(userId, {
            id: userId,
            name: userName,
            isMuted: Boolean(isMuted),
            isSpeaking: false,
            isAudioDisabled: false
          });
          console.log('VoiceChannelContext: Added new participant:', userId);
        } else {
          console.log('VoiceChannelContext: Participant already exists:', userId);
        }
        
        return newChannels;
      });
    });

    // Слушаем когда пользователь покидает голосовой канал
    newSocket.on('userLeftVoiceChannel', ({ channelId, userId }) => {
      console.log('VoiceChannelContext: User left voice channel:', { channelId, userId });
      setVoiceChannels(prev => {
        const newChannels = new Map(prev);
        const channel = newChannels.get(channelId);
        if (channel) {
          const wasRemoved = channel.participants.delete(userId);
          console.log('VoiceChannelContext: Participant removal result:', { userId, wasRemoved, remainingParticipants: channel.participants.size });
          if (channel.participants.size === 0) {
            newChannels.delete(channelId);
            console.log('VoiceChannelContext: Removed empty channel after last participant left:', channelId);
          }
        } else {
          console.log('VoiceChannelContext: Channel not found for user removal:', channelId);
          // Если канал не найден, но пользователь вышел, возможно канал уже пустой
          // Удаляем канал на всякий случай
          newChannels.delete(channelId);
          console.log('VoiceChannelContext: Removed channel that was not found:', channelId);
        }
        return newChannels;
      });
    });

    // Слушаем изменения состояния участника (мьют, говорит, звук)
    newSocket.on('voiceChannelParticipantStateChanged', ({ channelId, userId, isMuted, isSpeaking, isAudioDisabled }) => {
      console.log('VoiceChannelContext: Participant state changed:', { channelId, userId, isMuted, isSpeaking, isAudioDisabled });
      setVoiceChannels(prev => {
        const newChannels = new Map(prev);
        const channel = newChannels.get(channelId);
        if (channel && channel.participants.has(userId)) {
          const participant = channel.participants.get(userId);
          if (isMuted !== undefined) {
            participant.isMuted = Boolean(isMuted);
          }
          if (isSpeaking !== undefined) {
            participant.isSpeaking = Boolean(isSpeaking);
          }
          if (isAudioDisabled !== undefined) {
            participant.isAudioDisabled = Boolean(isAudioDisabled);
          }
          console.log('VoiceChannelContext: Updated participant state:', { userId, participant });
        } else {
          console.log('VoiceChannelContext: Participant not found for state update:', { channelId, userId });
        }
        return newChannels;
      });
    });

    // Дополнительные обработчики для отслеживания состояний в реальном времени
    newSocket.on('peerMuteStateChanged', ({ peerId, isMuted }) => {
      console.log('VoiceChannelContext: [REALTIME] Peer mute state changed:', { peerId, isMuted, type: typeof isMuted });
      // Находим канал, в котором находится этот участник
      setVoiceChannels(prev => {
        const newChannels = new Map(prev);
        let updated = false;
        
        // Ищем по всем каналам и всем участникам
        for (const [channelId, channel] of newChannels.entries()) {
          console.log(`VoiceChannelContext: Checking channel ${channelId}, participants:`, Array.from(channel.participants.keys()));
          
          // Проверяем как по peerId, так и по возможным вариантам ID
          if (channel.participants.has(peerId)) {
            const participant = channel.participants.get(peerId);
            participant.isMuted = Boolean(isMuted);
            if (isMuted) {
              participant.isSpeaking = false; // Если замьючен, то не говорит
            }
            console.log('VoiceChannelContext: [REALTIME] Updated mute state for peer (by peerId):', { channelId, peerId, isMuted, participant });
            updated = true;
            break;
          }
          
          // Дополнительно ищем по имени или другим полям, если ID не совпадает
          for (const [participantId, participant] of channel.participants.entries()) {
            if (participantId.toString() === peerId.toString()) {
              participant.isMuted = Boolean(isMuted);
              if (isMuted) {
                participant.isSpeaking = false;
              }
              console.log('VoiceChannelContext: [REALTIME] Updated mute state for peer (by string comparison):', { channelId, participantId, peerId, isMuted, participant });
              updated = true;
              break;
            }
          }
          
          if (updated) break;
        }
        
        if (!updated) {
          console.log('VoiceChannelContext: [REALTIME] Peer not found for mute update:', { 
            peerId, 
            allChannels: Array.from(newChannels.keys()),
            allParticipants: Array.from(newChannels.entries()).map(([chId, ch]) => ({ 
              channelId: chId, 
              participants: Array.from(ch.participants.keys()) 
            }))
          });
        }
        return newChannels;
      });
    });

    newSocket.on('speakingStateChanged', ({ peerId, speaking }) => {
      console.log('VoiceChannelContext: Speaking state changed:', { peerId, speaking });
      // Находим канал, в котором находится этот участник
      setVoiceChannels(prev => {
        const newChannels = new Map(prev);
        for (const [channelId, channel] of newChannels.entries()) {
          if (channel.participants.has(peerId)) {
            const participant = channel.participants.get(peerId);
            // Обновляем состояние говорения только если участник не замьючен
            if (!participant.isMuted) {
              participant.isSpeaking = Boolean(speaking);
              console.log('VoiceChannelContext: Updated speaking state for peer:', { channelId, peerId, speaking });
            }
            break;
          }
        }
        return newChannels;
      });
    });

    newSocket.on('peerAudioStateChanged', ({ peerId, isEnabled }) => {
      console.log('VoiceChannelContext: [REALTIME] Peer audio state changed:', { peerId, isEnabled });
      // Находим канал, в котором находится этот участник
      setVoiceChannels(prev => {
        const newChannels = new Map(prev);
        let updated = false;
        for (const [channelId, channel] of newChannels.entries()) {
          if (channel.participants.has(peerId)) {
            const participant = channel.participants.get(peerId);
            participant.isAudioDisabled = !isEnabled;
            console.log('VoiceChannelContext: [REALTIME] Updated audio state for peer:', { channelId, peerId, isEnabled, isAudioDisabled: !isEnabled, participant });
            updated = true;
            break;
          }
        }
        if (!updated) {
          console.log('VoiceChannelContext: [REALTIME] Peer not found for audio update:', peerId);
        }
        return newChannels;
      });
    });

    // Слушаем когда пир покидает комнату (дополнительная обработка)
    newSocket.on('peerLeft', ({ peerId }) => {
      console.log('VoiceChannelContext: Peer left:', { peerId });
      // Находим канал, в котором был этот пир
      setVoiceChannels(prev => {
        const newChannels = new Map(prev);
        for (const [channelId, channel] of newChannels.entries()) {
          if (channel.participants.has(peerId)) {
            channel.participants.delete(peerId);
            console.log('VoiceChannelContext: Removed peer from channel:', { channelId, peerId });
            
            // Если канал стал пустым, удаляем его
            if (channel.participants.size === 0) {
              newChannels.delete(channelId);
              console.log('VoiceChannelContext: Removed empty channel after peer left:', channelId);
            }
            break;
          }
        }
        return newChannels;
      });
    });

    return () => {
      clearInterval(syncInterval);
      newSocket.disconnect();
    };
  }, []);

  const updateVoiceChannelParticipants = useCallback((channelId, participants) => {
    console.log('VoiceChannelContext: Updating participants for channel:', channelId, participants);
    setVoiceChannels(prev => {
      const newChannels = new Map(prev);
      if (participants && participants.length > 0) {
        const participantsMap = new Map();
        participants.forEach(participant => {
          participantsMap.set(participant.id, participant);
        });
        newChannels.set(channelId, { participants: participantsMap });
      } else {
        newChannels.delete(channelId);
      }
      return newChannels;
    });
  }, []);

  const addVoiceChannelParticipant = useCallback((channelId, userId, participantData) => {
    console.log('VoiceChannelContext: Adding participant:', { channelId, userId, participantData });
    setVoiceChannels(prev => {
      const newChannels = new Map(prev);
      if (!newChannels.has(channelId)) {
        newChannels.set(channelId, { participants: new Map() });
      }
      const channel = newChannels.get(channelId);
      
      // Проверяем, не существует ли уже участник с таким ID
      if (!channel.participants.has(userId)) {
        channel.participants.set(userId, {
          id: userId,
          ...participantData
        });
        console.log('VoiceChannelContext: Added new participant via addVoiceChannelParticipant:', userId);
      } else {
        console.log('VoiceChannelContext: Participant already exists via addVoiceChannelParticipant:', userId);
      }
      
      return newChannels;
    });
  }, []);

  const removeVoiceChannelParticipant = useCallback((channelId, userId) => {
    console.log('VoiceChannelContext: Removing participant:', { channelId, userId });
    setVoiceChannels(prev => {
      const newChannels = new Map(prev);
      const channel = newChannels.get(channelId);
      if (channel) {
        channel.participants.delete(userId);
        if (channel.participants.size === 0) {
          newChannels.delete(channelId);
        }
      }
      return newChannels;
    });
  }, []);

  const updateVoiceChannelParticipant = useCallback((channelId, userId, updates) => {
    console.log('VoiceChannelContext: Updating participant:', { channelId, userId, updates });
    setVoiceChannels(prev => {
      const newChannels = new Map(prev);
      const channel = newChannels.get(channelId);
      if (channel && channel.participants.has(userId)) {
        const participant = channel.participants.get(userId);
        Object.assign(participant, updates);
      }
      return newChannels;
    });
  }, []);

  const getVoiceChannelParticipants = useCallback((channelId) => {
    const channel = voiceChannels.get(channelId);
    if (!channel) return [];
    const participants = Array.from(channel.participants.values());
    console.log(`VoiceChannelContext: Getting participants for channel ${channelId}:`, participants.length, participants);
    return participants;
  }, [voiceChannels]);

  const getVoiceChannelParticipantCount = useCallback((channelId) => {
    const channel = voiceChannels.get(channelId);
    return channel ? channel.participants.size : 0;
  }, [voiceChannels]);

  const value = {
    voiceChannels,
    updateVoiceChannelParticipants,
    addVoiceChannelParticipant,
    removeVoiceChannelParticipant,
    updateVoiceChannelParticipant,
    getVoiceChannelParticipants,
    getVoiceChannelParticipantCount,

  };

  return (
    <VoiceChannelContext.Provider value={value}>
      {children}
    </VoiceChannelContext.Provider>
  );
};

export const useVoiceChannel = () => {
  const context = useContext(VoiceChannelContext);
  if (!context) {
    throw new Error('useVoiceChannel must be used within a VoiceChannelProvider');
  }
  return context;
}; 