import React, { useState, useEffect, useRef } from 'react';

// MuteProvider component
const MuteProvider = ({ children }) => {
  const [isMuted, setIsMuted] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on('mute_state_changed', (newState) => {
      setIsMuted(newState.isMuted);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('mute_state_changed');
      }
    };
  }, [socketRef.current]);

  return (
    <MuteContext.Provider value={{ isMuted, setIsMuted, socketRef }}>
      {children}
    </MuteContext.Provider>
  );
};

// Создаем контекст для состояния мьюта
const MuteContext = React.createContext({
  isMuted: false,
  setIsMuted: () => {},
  socketRef: { current: null }
});

export { MuteContext, MuteProvider }; 