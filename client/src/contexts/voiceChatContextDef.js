import { createContext } from 'react';

// Создаем контекст для голосового чата
export const VoiceChatContext = createContext({
  voiceRoom: null,
  isVoiceChatActive: false,
  joinVoiceRoom: () => {},
  leaveVoiceRoom: () => {},
}); 