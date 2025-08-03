import React, { useState, useEffect } from 'react';
import { MicOff, HeadsetOff } from '@mui/icons-material';

const CallParticipantsDisplay = ({ participants, currentUserId }) => {
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
            width: '48px',
            height: '48px',
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
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: avatarColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize: '18px',
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
      gap: '12px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#8e9297',
        fontSize: '14px'
      }}>
        <span>В звонке:</span>
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
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
                 width: '48px',
                 height: '48px',
                 borderRadius: '50%',
                 backgroundColor: userProfiles.get(participant.id)?.avatarColor || participant.avatarColor || '#5865f2',
                 display: 'none',
                 alignItems: 'center',
                 justifyContent: 'center',
                 color: '#ffffff',
                 fontSize: '18px',
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
               gap: '3px',
               position: 'absolute',
               bottom: '-3px',
               right: '-3px'
             }}>
               {participant.isMuted && (
                 <div style={{
                   width: '16px',
                   height: '16px',
                   borderRadius: '50%',
                   backgroundColor: '#ed4245',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center'
                 }}>
                   <MicOff style={{ fontSize: '10px', color: '#ffffff' }} />
                 </div>
               )}
               {participant.isAudioDisabled && (
                 <div style={{
                   width: '16px',
                   height: '16px',
                   borderRadius: '50%',
                   backgroundColor: '#ed4245',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center'
                 }}>
                   <HeadsetOff style={{ fontSize: '10px', color: '#ffffff' }} />
                 </div>
               )}
             </div>
             
             {/* Имя пользователя */}
             <span style={{
               fontSize: '13px',
               color: '#8e9297',
               textAlign: 'center',
               maxWidth: '60px',
               overflow: 'hidden',
               textOverflow: 'ellipsis',
               whiteSpace: 'nowrap',
               marginTop: '4px'
             }}>
               {participant.name || 'Пользователь'}
             </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CallParticipantsDisplay; 