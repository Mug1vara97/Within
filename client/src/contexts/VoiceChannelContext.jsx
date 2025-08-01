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
    }, 30000); // Каждые 30 секунд (редко, так как основное обновление через события)

    // Слушаем обновления участников голосовых каналов
    newSocket.on('voiceChannelParticipantsUpdate', ({ channelId, participants }) => {
      console.log('VoiceChannelContext: Received participants update:', channelId, participants?.length);
      setVoiceChannels(prev => {
        const newChannels = new Map(prev);
        const existingChannel = newChannels.get(channelId);
        
        if (participants && participants.length > 0) {
          const participantsMap = new Map();
          participants.forEach(participant => {
            // Используем данные с сервера, так как он теперь управляет состоянием
            participantsMap.set(participant.userId, {
              id: participant.userId,
              name: participant.name,
              // Приоритет у данных с сервера
              isMuted: participant.isMuted !== undefined ? participant.isMuted : false,
              isSpeaking: participant.isSpeaking !== undefined ? participant.isSpeaking : false,
              isAudioDisabled: participant.isAudioDisabled !== undefined ? participant.isAudioDisabled : false,
              isActive: participant.isActive !== undefined ? participant.isActive : true // Новое поле
            });
          });
          newChannels.set(channelId, { participants: participantsMap });
          // console.log('VoiceChannelContext: Updated channel participants:', channelId, participantsMap.size);
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

    // Теперь все состояние управляется через voiceChannelParticipantsUpdate с сервера
    // Оставляем только для совместимости с WebRTC событиями говорения
    newSocket.on('voiceChannelParticipantStateChanged', ({ channelId, userId, isSpeaking }) => {
      if (isSpeaking !== undefined) {
        console.log('VoiceChannelContext: Participant speaking state changed:', { channelId, userId, isSpeaking });
        setVoiceChannels(prev => {
          const newChannels = new Map(prev);
          const channel = newChannels.get(channelId);
          if (channel && channel.participants.has(userId)) {
            const participant = channel.participants.get(userId);
            participant.isSpeaking = Boolean(isSpeaking);
            console.log('VoiceChannelContext: Updated speaking state:', { userId, isSpeaking });
          }
          return newChannels;
        });
      }
    });

    // Оставляем только локальные события для мгновенного обновления UI
    // Основное состояние теперь управляется через voiceChannelParticipantsUpdate

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

    // Слушаем локальные события изменения состояния мьюта (для самого пользователя)
    const handleLocalMuteChange = (event) => {
      const { peerId, isMuted } = event.detail;
      console.log('VoiceChannelContext: [LOCAL] Peer mute state changed:', { peerId, isMuted });
      
      setVoiceChannels(prev => {
        const newChannels = new Map(prev);
        let updated = false;
        
        // Ищем по всем каналам и всем участникам
        for (const [channelId, channel] of newChannels.entries()) {
          if (channel.participants.has(peerId)) {
            const participant = channel.participants.get(peerId);
            participant.isMuted = Boolean(isMuted);
            if (isMuted) {
              participant.isSpeaking = false; // Если замьючен, то не говорит
            }
            console.log('VoiceChannelContext: [LOCAL] Updated mute state for peer:', { channelId, peerId, isMuted });
            updated = true;
            break;
          }
        }
        
        return updated ? newChannels : prev;
      });
    };

    window.addEventListener('peerMuteStateChanged', handleLocalMuteChange);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('peerMuteStateChanged', handleLocalMuteChange);
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

  // Новые функции для работы с серверным состоянием пользователей
  const updateUserVoiceState = useCallback((userId, userName, channelId, isMuted, isAudioDisabled) => {
    if (_socket) {
      console.log('VoiceChannelContext: Updating user voice state on server:', { userId, userName, channelId, isMuted, isAudioDisabled });
      _socket.emit('updateUserVoiceState', { 
        userId, 
        userName, 
        channelId, 
        isMuted, 
        isAudioDisabled 
      });
    }
  }, [_socket]);

  const getUserVoiceState = useCallback((userId, callback) => {
    if (_socket) {
      console.log('VoiceChannelContext: Getting user voice state from server:', userId);
      _socket.emit('getUserVoiceState', { userId }, callback);
    }
  }, [_socket]);

  const joinVoiceChannel = useCallback((channelId, userId, userName) => {
    console.log('VoiceChannelContext: User joining voice channel:', { channelId, userId, userName });
    updateUserVoiceState(userId, userName, channelId, undefined, undefined);
  }, [updateUserVoiceState]);

  const leaveVoiceChannel = useCallback((userId) => {
    console.log('VoiceChannelContext: User leaving voice channel:', userId);
    updateUserVoiceState(userId, undefined, null, undefined, undefined);
  }, [updateUserVoiceState]);

  const updateUserMuteState = useCallback((userId, isMuted) => {
    console.log('VoiceChannelContext: Updating user mute state:', { userId, isMuted });
    updateUserVoiceState(userId, undefined, undefined, isMuted, undefined);
  }, [updateUserVoiceState]);

  const updateUserAudioState = useCallback((userId, isAudioDisabled) => {
    console.log('VoiceChannelContext: Updating user audio state:', { userId, isAudioDisabled });
    updateUserVoiceState(userId, undefined, undefined, undefined, isAudioDisabled);
  }, [updateUserVoiceState]);

  const value = {
    voiceChannels,
    updateVoiceChannelParticipants,
    addVoiceChannelParticipant,
    removeVoiceChannelParticipant,
    updateVoiceChannelParticipant,
    getVoiceChannelParticipants,
    getVoiceChannelParticipantCount,
    // Новые функции для работы с серверным состоянием
    updateUserVoiceState,
    getUserVoiceState,
    joinVoiceChannel,
    leaveVoiceChannel,
    updateUserMuteState,
    updateUserAudioState,

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