import { useContext } from 'react';
import { VoiceChatContext } from './VoiceChatContext';

/**
 * Хук для доступа к контексту голосового чата
 * @returns {Object} Объект с состоянием и методами для работы с голосовым чатом
 */
export const useVoiceChat = () => {
  const context = useContext(VoiceChatContext);
  
  if (!context) {
    throw new Error('useVoiceChat должен использоваться внутри VoiceChatProvider');
  }
  
  return context;
};

export default useVoiceChat; 