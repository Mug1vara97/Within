import { useState, useCallback } from 'react';

const useCallManager = (userId, username) => {
  const [isInCall, setIsInCall] = useState(false);

  // Упрощенная функция для начала звонка
  const startCall = useCallback(async (callData) => {
    console.log('Starting call:', callData);
    setIsInCall(true);
    return true;
  }, []);

  // Упрощенная функция для завершения звонка
  const endCall = useCallback(async () => {
    console.log('Ending call');
    setIsInCall(false);
    return true;
  }, []);

  return {
    isInCall,
    startCall,
    endCall
  };
};

export default useCallManager; 