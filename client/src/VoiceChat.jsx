// import React, { useEffect, useRef, useState } from 'react';
// import { io } from 'socket.io-client';
// import SimplePeer from 'simple-peer';
// import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash } from 'react-icons/fa';

// if (typeof window !== 'undefined') {
//   window.process = window.process || { nextTick: (fn) => setTimeout(fn, 0) };
//   window.Buffer = window.Buffer || require('buffer').Buffer;
// }

// const VoiceChat = ({ chatId, username, chatName, onDisconnect }) => {
//   const [otherUsers, setOtherUsers] = useState([]);
//   const [isMuted, setIsMuted] = useState(false);
//   const [isVideoOff, setIsVideoOff] = useState(false);
//   const connectionRef = useRef(null);
//   const localVideoRef = useRef(null);
//   const remoteVideoRefs = useRef({});
//   const localStreamRef = useRef(null);
//   const peersRef = useRef({});
//   const [isLoading, setIsLoading] = useState(true);

//   const toggleMute = () => {
//     if (localStreamRef.current) {
//       const audioTracks = localStreamRef.current.getAudioTracks();
//       audioTracks.forEach(track => {
//         track.enabled = !track.enabled;
//       });
//       setIsMuted(!isMuted);
//     }
//   };

//   const toggleVideo = () => {
//     if (localStreamRef.current) {
//       const videoTracks = localStreamRef.current.getVideoTracks();
//       videoTracks.forEach(track => {
//         track.enabled = !track.enabled;
//       });
//       setIsVideoOff(!isVideoOff);
//     }
//   };

//   const handleDisconnect = () => {
//     // Очищаем все соединения
//     Object.keys(peersRef.current).forEach(userId => {
//       safeCleanupPeer(userId);
//     });
    
//     // Отключаем медиапоток
//     if (localStreamRef.current) {
//       localStreamRef.current.getTracks().forEach(track => track.stop());
//       localStreamRef.current = null;
//     }
    
//     // Отключаемся от сокета
//     if (connectionRef.current) {
//       connectionRef.current.disconnect();
//       connectionRef.current = null;
//     }
    
//     // Вызываем callback для закрытия голосового чата
//     if (onDisconnect) {
//       onDisconnect();
//     }
//   };

//   useEffect(() => {
//     const socket = io('https://localhost:8080', {
//       transports: ['websocket'],
//       reconnection: true,
//       reconnectionAttempts: Infinity,
//       reconnectionDelay: 1000,
//       reconnectionDelayMax: 5000,
//       timeout: 20000,
//       forceNew: true,
//       withCredentials: true,
//       extraHeaders: {
//         'X-Requested-With': 'XMLHttpRequest'
//       },
//       query: {
//         username: username,
//         chatId: chatId
//       }
//     });
  
//     socket.on('connect_error', (err) => {
//       console.error('Connection error:', err);
//       setIsLoading(false);
//     });
  
//     socket.on('connect', () => {
//       console.log('Socket.IO connected');
//       socket.emit('joinRoom', { roomId: `voice_${chatId}`, username });
//       setIsLoading(false);
//     });
  
  
//     socket.on('usersInRoom', (users) => {
//       const filteredUsers = users.filter(user => user !== username);
//       setOtherUsers(filteredUsers);
      
//       if (localStreamRef.current) {
//         filteredUsers.forEach(userId => {
//           if (!peersRef.current[userId]) {
//             createPeer(userId, true);
//           }
//         });
//       }
//     });
  
//     socket.on('userJoined', (newUserId) => {
//       if (newUserId !== username && !otherUsers.includes(newUserId)) {
//         setOtherUsers(prev => [...prev, newUserId]);
        
//         if (localStreamRef.current && !peersRef.current[newUserId]) {
//           createPeer(newUserId, true);
//         }
//       }
//     });
  
//     socket.on('userLeft', (leftUserId) => {
//       setOtherUsers(prev => prev.filter(id => id !== leftUserId));
//       safeCleanupPeer(leftUserId);
//     });
  
//     socket.on('receiveSignal', ({ senderId, signal }) => {
//       if (!peersRef.current[senderId] && localStreamRef.current) {
//         createPeer(senderId, false, signal);
//       } else if (peersRef.current[senderId]) {
//         peersRef.current[senderId].signal(signal);
//       }
//     });
  
//     connectionRef.current = socket;

//     return () => {
//       handleDisconnect();
//     };
//   }, [chatId, username]);

//   useEffect(() => {
//     const getMediaStream = async () => {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: true,
//           audio: true
//         });
//         localStreamRef.current = stream;
//         if (localVideoRef.current) {
//           localVideoRef.current.srcObject = stream;
//         }
  
//         if (connectionRef.current && otherUsers.length > 0) {
//           otherUsers.forEach(userId => {
//             if (!peersRef.current[userId]) {
//               createPeer(userId, true);
//             }
//           });
//         }
//       } catch (err) {
//         console.error("Failed to get media stream:", err);
//         setIsLoading(false);
//       }
//     };
  
//     getMediaStream();
//   }, []);

//   const createPeer = (userId, initiator, signal = null) => {
//     if (peersRef.current[userId] || !localStreamRef.current) return;
  
//     const peer = new SimplePeer({
//       initiator,
//       stream: localStreamRef.current,
//       config: {
//         iceServers: [
//           {
//             urls: 'stun:109.73.198.135:3478',
//             username: 'test',
//             credential: 'test123'
//           },
//           {
//             urls: 'turn:109.73.198.135:3478',
//             username: 'test',
//             credential: 'test123'
//           }
//         ]
//       },
//       trickle: true
//     });
  
//     peer.on('signal', data => {
//       if (connectionRef.current) {
//         connectionRef.current.emit('sendSignal', {
//           targetUsername: userId,
//           signal: JSON.stringify(data)
//         });
//       }
//     });
  
//     peer.on('stream', stream => {
//       if (!remoteVideoRefs.current[userId]) {
//         const videoElement = document.createElement('video');
//         videoElement.autoplay = true;
//         videoElement.playsInline = true;
//         videoElement.style.width = '300px';
//         remoteVideoRefs.current[userId] = videoElement;
//         const container = document.getElementById('remoteVideosContainer');
//         if (container) {
//           container.appendChild(videoElement);
//         }
//       }
//       if (remoteVideoRefs.current[userId]) {
//         remoteVideoRefs.current[userId].srcObject = stream;
//       }
//     });

//     peer.on('error', err => {
//       console.error('Peer error:', err);
//       safeCleanupPeer(userId);
//     });

//     if (signal) {
//       try {
//         peer.signal(JSON.parse(signal));
//       } catch (err) {
//         console.error('Error parsing signal:', err);
//         safeCleanupPeer(userId);
//       }
//     }
  
//     peersRef.current[userId] = peer;
//   };

//   const safeCleanupPeer = (userId) => {
//     try {
//       if (peersRef.current[userId]) {
//         setTimeout(() => {
//           try {
//             if (peersRef.current[userId]) {
//               peersRef.current[userId].destroy();
//               delete peersRef.current[userId];
//             }
//           } catch (err) {
//             console.error('Error destroying peer:', err);
//           }
//         }, 100);
//       }
      
//       if (remoteVideoRefs.current[userId]) {
//         try {
//           if (remoteVideoRefs.current[userId].srcObject) {
//             remoteVideoRefs.current[userId].srcObject = null;
//           }
//           remoteVideoRefs.current[userId].remove();
//           delete remoteVideoRefs.current[userId];
//         } catch (err) {
//           console.error('Error cleaning up video element:', err);
//         }
//       }
//     } catch (err) {
//       console.error('Error in safeCleanupPeer:', err);
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="voice-chat-loading">
//         <div>Подключение к голосовому чату "{chatName}"...</div>
//         <button onClick={handleDisconnect} className="disconnect-button">
//           Отмена
//         </button>
//       </div>
//     );
//   }

//   return (
//     <div className="voice-chat-container">
//       <div className="voice-chat-header">
//         <h2>Голосовой чат: {chatName}</h2>
//         <button onClick={handleDisconnect} className="disconnect-button">
//           <FaPhoneSlash /> Покинуть канал
//         </button>
//       </div>
      
//       <div className="voice-chat-info">
//         <p>Вы: <span className="username">{username}</span></p>
//         <p>Участники: {otherUsers.length ? otherUsers.join(', ') : 'нет других участников'}</p>
//       </div>
      
//       <div className="voice-controls">
//         <button
//           onClick={toggleMute}
//           className={`control-button ${isMuted ? 'muted' : ''}`}
//         >
//           {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
//           {isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
//         </button>
//         <button
//           onClick={toggleVideo}
//           className={`control-button ${isVideoOff ? 'video-off' : ''}`}
//         >
//           {isVideoOff ? <FaVideoSlash /> : <FaVideo />}
//           {isVideoOff ? 'Включить камеру' : 'Выключить камеру'}
//         </button>
//       </div>
      
//       <div className="video-container">
//         <div className="local-video">
//           <h3>Ваша камера</h3>
//           <video 
//             ref={localVideoRef} 
//             autoPlay 
//             muted 
//             playsInline 
//             className={`video-element ${isVideoOff ? 'hidden' : ''}`}
//           />
//           {isVideoOff && (
//             <div className="video-placeholder">
//               Камера выключена
//             </div>
//           )}
//         </div>
        
//         <div className="remote-videos">
//           <h3>Участники ({otherUsers.length})</h3>
//           <div id="remoteVideosContainer" className="remote-videos-grid" />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default VoiceChat;