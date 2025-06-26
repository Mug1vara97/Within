import React, { useState, useEffect, useRef } from 'react';

// Создаем контекст для состояния мьюта
const MuteContext = React.createContext({
  isMuted: false,
  setIsMuted: () => {},
  socketRef: { current: null }
});

// MuteProvider component
const MuteProvider = ({ children }) => {
  const [isMuted, setIsMuted] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on('mute_state_changed', (newState) => {
      setIsMuted(newState.isMuted);
    });

    return () => {
      if (socket) {
        socket.off('mute_state_changed');
      }
    };
  }, []);

  return (
    <MuteContext.Provider value={{ isMuted, setIsMuted, socketRef }}>
      {children}
    </MuteContext.Provider>
  );
};

export { MuteContext, MuteProvider }; 