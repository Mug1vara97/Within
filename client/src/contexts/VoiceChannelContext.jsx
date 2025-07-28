import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';

const VoiceChannelContext = createContext();

export const VoiceChannelProvider = ({ children }) => {
  const [voiceChannels, setVoiceChannels] = useState(new Map());
  const [_socket, setSocket] = useState(null);
  
  // State for voice calls in group chats
  const [activeVoiceCall, setActiveVoiceCall] = useState(() => {
    // Restore state from localStorage
    const saved = localStorage.getItem('activeVoiceCall');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Ошибка при восстановлении состояния голосового звонка:', error);
      return null;
    }
  });

  // Инициализация WebSocket соединения для получения информации о участниках
  useEffect(() => {
    const newSocket = io('https://whithin.ru');

    setSocket(newSocket);

    // Получаем информацию о всех голосовых каналах и их участниках
    newSocket.emit('getVoiceChannelParticipants');

    // Периодически запрашиваем актуальные данные о участниках
    const syncInterval = setInterval(() => {
      newSocket.emit('getVoiceChannelParticipants');
    }, 30000); // Каждые 30 секунд

    // Слушаем обновления участников голосовых каналов
    newSocket.on('voiceChannelParticipantsUpdate', ({ channelId, participants }) => {
      console.log('VoiceChannelContext: Received participants update:', { channelId, participants });
      setVoiceChannels(prev => {
        const newChannels = new Map(prev);
        // Полностью заменяем данные о участниках для этого канала
        if (participants && participants.length > 0) {
          const participantsMap = new Map();
          participants.forEach(participant => {
            participantsMap.set(participant.userId, {
              id: participant.userId,
              name: participant.name,
              isMuted: participant.isMuted || false,
              isSpeaking: participant.isSpeaking || false
            });
          });
          newChannels.set(channelId, { participants: participantsMap });
          console.log('VoiceChannelContext: Updated channel participants:', channelId, participantsMap.size);
        } else {
          // Если участников нет, удаляем канал из списка
          newChannels.delete(channelId);
          console.log('VoiceChannelContext: Removed empty channel:', channelId);
          
          // Дополнительно уведомляем о том, что канал пустой
          console.log('VoiceChannelContext: Channel is now empty, all participants left');
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
            isSpeaking: false
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

    // Слушаем изменения состояния участника (мьют, говорит)
    newSocket.on('voiceChannelParticipantStateChanged', ({ channelId, userId, isMuted, isSpeaking }) => {
      console.log('VoiceChannelContext: Participant state changed:', { channelId, userId, isMuted, isSpeaking });
      setVoiceChannels(prev => {
        const newChannels = new Map(prev);
        const channel = newChannels.get(channelId);
        if (channel && channel.participants.has(userId)) {
          const participant = channel.participants.get(userId);
          participant.isMuted = Boolean(isMuted);
          participant.isSpeaking = Boolean(isSpeaking);
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

  // Functions for managing voice calls
  const saveVoiceCallState = useCallback((voiceCall) => {
    if (voiceCall) {
      localStorage.setItem('activeVoiceCall', JSON.stringify(voiceCall));
    } else {
      localStorage.removeItem('activeVoiceCall');
    }
  }, []);

  const startVoiceCall = useCallback((roomData) => {
    const voiceCall = {
      ...roomData,
      startedAt: new Date().toISOString(),
      isActive: true
    };
    setActiveVoiceCall(voiceCall);
    saveVoiceCallState(voiceCall);
  }, [saveVoiceCallState]);

  const endVoiceCall = useCallback(() => {
    setActiveVoiceCall(null);
    saveVoiceCallState(null);
  }, [saveVoiceCallState]);

  const isVoiceCallActive = useCallback((chatId) => {
    return activeVoiceCall && activeVoiceCall.roomId === chatId;
  }, [activeVoiceCall]);

  const getActiveVoiceCall = useCallback(() => {
    return activeVoiceCall;
  }, [activeVoiceCall]);

  const value = {
    voiceChannels,
    updateVoiceChannelParticipants,
    addVoiceChannelParticipant,
    removeVoiceChannelParticipant,
    updateVoiceChannelParticipant,
    getVoiceChannelParticipants,
    getVoiceChannelParticipantCount,
    // Functions for voice calls
    activeVoiceCall,
    startVoiceCall,
    endVoiceCall,
    isVoiceCallActive,
    getActiveVoiceCall
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