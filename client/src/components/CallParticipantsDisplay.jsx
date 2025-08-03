import React, { useState, useEffect } from 'react';
import { MicOff, HeadsetOff, Call as CallIcon } from '@mui/icons-material';

const CallParticipantsDisplay = ({ participants, currentUserId, onJoinCall }) => {
  const [userProfiles, setUserProfiles] = useState(new Map());

  // Фильтруем участников, исключая текущего пользователя
  const otherParticipants = participants.filter(participant => participant.id !== currentUserId);

  // Функция для загрузки профиля пользователя
  const fetchUserProfile = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://whithin.ru/api/profile/${userId}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const profile = await response.json();
        console.log('CallParticipantsDisplay: Loaded user profile:', { userId, profile });
        const avatarData = {
          avatarUrl: profile.avatar ? `https://whithin.ru${profile.avatar}` : null,
          avatarColor: profile.avatarColor || '#5865F2'
        };
        console.log('CallParticipantsDisplay: Setting avatar data:', avatarData);
        setUserProfiles(prev => new Map(prev).set(userId, avatarData));
        return profile;
      }
    } catch (error) {
      console.error('CallParticipantsDisplay: Error fetching user profile:', error);
    }
    return null;
  };

  // Загружаем профили всех участников
  useEffect(() => {
    otherParticipants.forEach(participant => {
      if (!userProfiles.has(participant.id)) {
        fetchUserProfile(participant.id);
      }
    });
  }, [otherParticipants, userProfiles]);

  if (otherParticipants.length === 0) {
    return null;
  }

  // Функция для отображения аватара пользователя
  const renderUserAvatar = (participant) => {
    const userProfile = userProfiles.get(participant.id);
    const avatarUrl = userProfile?.avatarUrl;
    const avatarColor = userProfile?.avatarColor || participant.avatarColor || '#5865f2';
    
         if (avatarUrl) {
       return (
         <img
           src={avatarUrl}
           alt={participant.name || 'Пользователь'}
           style={{
             width: '80px',
             height: '80px',
             borderRadius: '50%',
             border: '2px solid #36393f',
             objectFit: 'cover'
           }}
           onError={(e) => {
             // Если загрузка аватара не удалась, показываем букву
             e.target.style.display = 'none';
             e.target.nextSibling.style.display = 'flex';
           }}
         />
       );
     }
     
     return (
       <div style={{
         width: '80px',
         height: '80px',
         borderRadius: '50%',
         backgroundColor: avatarColor,
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         color: '#ffffff',
         fontSize: '25px',
         fontWeight: 'bold',
         border: '2px solid #36393f'
       }}>
         {participant.name ? participant.name[0].toUpperCase() : 'U'}
       </div>
     );
  };

           return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '20px',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
                 {otherParticipants.map((participant) => (
           <div
             key={participant.id}
             style={{
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               gap: '4px',
               position: 'relative'
             }}
           >
             {/* Аватар пользователя */}
             <div style={{ position: 'relative' }}>
               {renderUserAvatar(participant)}
               {/* Fallback аватар (скрыт по умолчанию) */}
               <div style={{
                 width: '80px',
                 height: '80px',
                 borderRadius: '50%',
                 backgroundColor: userProfiles.get(participant.id)?.avatarColor || participant.avatarColor || '#5865f2',
                 display: 'none',
                 alignItems: 'center',
                 justifyContent: 'center',
                 color: '#ffffff',
                 fontSize: '25px',
                 fontWeight: 'bold',
                 border: '2px solid #36393f',
                 position: 'absolute',
                 top: 0,
                 left: 0
               }}>
                 {participant.name ? participant.name[0].toUpperCase() : 'U'}
               </div>
             </div>
            
                         {/* Индикаторы состояния */}
             <div style={{
               display: 'flex',
               gap: '2px',
               position: 'absolute',
               bottom: '-8px',
               left: '50%',
               transform: 'translateX(-50%)'
             }}>
               {participant.isMuted && (
                 <div style={{
                   width: '20px',
                   height: '20px',
                   borderRadius: '50%',
                   backgroundColor: '#ed4245',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   border: '2px solid #36393f'
                 }}>
                   <MicOff style={{ fontSize: '10px', color: '#ffffff' }} />
                 </div>
               )}
               {participant.isAudioDisabled && (
                 <div style={{
                   width: '20px',
                   height: '20px',
                   borderRadius: '50%',
                   backgroundColor: '#ed4245',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   border: '2px solid #36393f'
                 }}>
                   <HeadsetOff style={{ fontSize: '10px', color: '#ffffff' }} />
                 </div>
               )}
             </div>
             
             {/* Имя пользователя */}
             <span style={{
               fontSize: '15px',
               color: '#8e9297',
               textAlign: 'center',
               maxWidth: '80px',
               overflow: 'hidden',
               textOverflow: 'ellipsis',
               whiteSpace: 'nowrap',
               marginTop: '6px'
             }}>
               {participant.name || 'Пользователь'}
             </span>
                     </div>
         ))}
       </div>
       
               {/* Кнопка присоединения к звонку */}
        {onJoinCall && (
          <button
            onClick={onJoinCall}
            style={{
              background: 'linear-gradient(135deg, #5865f2, #4752c4)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #4752c4, #3c45a5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #5865f2, #4752c4)';
            }}
          >
            <CallIcon style={{ fontSize: '18px' }} />
            ПРИСОЕДИНИТЬСЯ К ЗВОНКУ
          </button>
        )}
     </div>
   );
 };

export default CallParticipantsDisplay; 