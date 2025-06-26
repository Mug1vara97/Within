import React from 'react';

const VoiceRender = () => (
  <div 
    id="voicechat-root"
    style={{
      width: '100vw',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 2000,
      pointerEvents: 'none', // чтобы не блокировать клики по интерфейсу
    }}
  />
);

export default VoiceRender; 