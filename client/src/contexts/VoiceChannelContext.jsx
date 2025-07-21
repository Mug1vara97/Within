import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const VoiceChannelContext = createContext();

export const VoiceChannelProvider = ({ children }) => {
  const [voiceChannels, setVoiceChannels] = useState(new Map());
  const { user } = useAuth();
  const [_socket, setSocket] = useState(null);

  // Инициализация WebSocket соединения для получения информации о участниках
  useEffect(() => {
    if (!user) return;

    const newSocket = io('http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    setSocket(newSocket);

    // Получаем информацию о всех голосовых каналах и их участниках
    newSocket.emit('getVoiceChannelParticipants');

    // Слушаем обновления участников голосовых каналов
    newSocket.on('voiceChannelParticipantsUpdate', ({ channelId, participants }) => {
      console.log('VoiceChannelContext: Received participants update:', { channelId, participants });
      setVoiceChannels(prev => {
        const newChannels = new Map(prev);
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
        } else {
          newChannels.delete(channelId);
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
        channel.participants.set(userId, {
          id: userId,
          name: userName,
          isMuted: Boolean(isMuted),
          isSpeaking: false
        });
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
          channel.participants.delete(userId);
          if (channel.participants.size === 0) {
            newChannels.delete(channelId);
          }
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

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

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
      channel.participants.set(userId, {
        id: userId,
        ...participantData
      });
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
    return Array.from(channel.participants.values());
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
    getVoiceChannelParticipantCount
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