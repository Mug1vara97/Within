import React, { useState, useEffect } from 'react';
import ChatList from './ChatList';
import ServerList from './ServerList';
import ServerPage from './ServerPage';
import DiscoverLists from './Discover/DiscoverLists';
import { Routes, Route, useParams, useLocation, useNavigate } from 'react-router-dom';

const Home = ({ user, onJoinVoiceChannel, onLeaveVoiceChannel }) => {
    const [isDiscoverMode, setIsDiscoverMode] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // Синхронизируем состояние с текущим маршрутом
    useEffect(() => {
        if ((location.pathname === '/discover' || location.pathname === '/discover/servers') && !isDiscoverMode) {
            setIsDiscoverMode(true);
        } else if (!location.pathname.startsWith('/discover') && isDiscoverMode) {
            setIsDiscoverMode(false);
        }
    }, [location.pathname]);

    const handleDiscoverModeChange = (mode) => {
        setIsDiscoverMode(mode);
        if (!mode) {
            navigate('/channels/@me');
        }
    };

    return (
        <div className="home-container">
            <ServerList 
                userId={user?.userId} 
                onDiscoverClick={handleDiscoverModeChange}
            />
            
            <div className="main-content">
                {isDiscoverMode ? (
                    <Routes>
                        <Route path="/discover" element={<DiscoverLists userId={user?.userId} onBack={() => handleDiscoverModeChange(false)} />} />
                        <Route path="/discover/servers" element={<DiscoverLists userId={user?.userId} onBack={() => handleDiscoverModeChange(false)} />} />
                    </Routes>
                ) : (
                    <Routes>
                        <Route path="/channels/@me/:chatId?" element={<ChatListWrapper user={user} />} />
                        <Route path="/channels/:serverId/:chatId?" element={<ServerPageWrapper user={user} onJoinVoiceChannel={onJoinVoiceChannel} onLeaveVoiceChannel={onLeaveVoiceChannel} />} />
                    </Routes>
                )}
            </div>
        </div>
    );
};

const ChatListWrapper = ({ user }) => {
    const { chatId } = useParams();
    return <ChatList 
        userId={user?.userId} 
        username={user?.username} 
        initialChatId={chatId} 
    />;
};

const ServerPageWrapper = ({ user, onJoinVoiceChannel, onLeaveVoiceChannel }) => {
    const { serverId, chatId } = useParams();
    return <ServerPage 
        serverId={serverId} 
        initialChatId={chatId}
        username={user?.username} 
        userId={user?.userId} 
        onJoinVoiceChannel={onJoinVoiceChannel}
        onLeaveVoiceChannel={onLeaveVoiceChannel}
    />;
};

export default Home;