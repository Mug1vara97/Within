import { useContext } from 'react';
import { VoiceChatContext } from './voiceChatContextDef';

/**
 * Хук для использования контекста голосового чата
 * @returns {Object} Объект с состоянием и методами голосового чата
 */
export const useVoiceChat = () => {
  const context = useContext(VoiceChatContext);
  
  if (!context) {
    throw new Error('useVoiceChat must be used within a VoiceChatProvider');
  }
  
  return context;
};

export default useVoiceChat; 