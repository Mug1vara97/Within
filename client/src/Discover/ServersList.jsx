import React, { useEffect, useState } from 'react';
import { BASE_URL } from '../config/apiConfig';
import './ServersList.css';
import { useNavigate } from 'react-router-dom';

const ServersList = ({ userId }) => {
    const [servers, setServers] = useState([]);
    const [userServers, setUserServers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Загружаем публичные серверы
                const serversResponse = await fetch(`${BASE_URL}/api/server/public`);
                if (!serversResponse.ok) {
                    throw new Error('Failed to fetch servers');
                }
                const serversData = await serversResponse.json();
                setServers(serversData);

                // Загружаем серверы пользователя, если он авторизован
                if (userId) {
                    const userServersResponse = await fetch(`${BASE_URL}/api/messages/servers?userId=${userId}`);
                    if (userServersResponse.ok) {
                        const userServersData = await userServersResponse.json();
                        setUserServers(userServersData);
                    }
                }

                setLoading(false);
            } catch (error) {
                setError(error.message);
                setLoading(false);
            }
        };

        fetchData();
    }, [userId]);

    const isUserMember = (serverId) => {
        return userServers.some(server => server.serverId === serverId);
    };

    const handleJoinServer = async (serverId) => {
        if (!userId) {
            alert('Необходимо авторизоваться для присоединения к серверу');
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/api/messages/servers/${serverId}/add-member`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userIdToAdd: parseInt(userId),
                    requestingUserId: parseInt(userId)
                })
            });

            const data = await response.json();

            if (response.ok) {
                navigate(`/channels/${serverId}`);
            } else {
                throw new Error(data.error || data.message || 'Ошибка при присоединении к серверу');
            }
        } catch (error) {
            console.error('Ошибка при присоединении к серверу:', error);
            alert(error.message);
        }
    };

    if (loading) {
        return <div className="servers-loading">Loading servers...</div>;
    }

    if (error) {
        return <div className="servers-error">Error: {error}</div>;
    }

    if (servers.length === 0) {
        return <div className="no-servers">No public servers available.</div>;
    }

    return (
        <div className="servers-list-container">
            <div className="servers-header">
                <h1>Discover Servers</h1>
                <p>From one community to another, there's a place for everyone.</p>
                
                <div className="search-container">
                    <input 
                        type="text" 
                        placeholder="Search servers..." 
                        className="search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="servers-grid">
                {servers
                    .filter(server => {
                        const matchesSearch = searchQuery === '' || 
                            server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (server.description && server.description.toLowerCase().includes(searchQuery.toLowerCase()));
                        return matchesSearch;
                    })
                    .map((server) => (
                        <div key={server.serverId} className="server-card">
                            <div 
                                className="open-server-banner"
                                style={{
                                    backgroundImage: server.banner ? `url(${BASE_URL}${server.banner})` : 'none',
                                    backgroundColor: server.bannerColor || '#3f3f3f'
                                }}
                            >
                                {!server.banner && (
                                    <div className="server-name-placeholder">
                                        {server.avatar ? (
                                            <img 
                                                src={`${BASE_URL}${server.avatar}`}
                                                alt={server.name}
                                                className="server-avatar"
                                            />
                                        ) : (
                                            <span>{server.name.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="server-info">
                                <div className="server-header-info">
                                    {server.avatar && (
                                        <img 
                                            src={`${BASE_URL}${server.avatar}`}
                                            alt={server.name}
                                            className="server-avatar-small"
                                        />
                                    )}
                                    <h3 className="server-name">{server.name}</h3>
                                </div>
                                {server.description && (
                                    <p className="server-description">{server.description}</p>
                                )}
                                <div className="server-owner">
                                    Создатель: {server.ownerName}
                                </div>
                                {!isUserMember(server.serverId) && (
                                    <button 
                                        className="join-server-button"
                                        onClick={() => handleJoinServer(server.serverId)}
                                    >
                                        Присоединиться
                                    </button>
                                )}
                                {isUserMember(server.serverId) && (
                                    <button 
                                        className="joined-server-button"
                                        onClick={() => navigate(`/channels/${server.serverId}`)}
                                    >
                                        Открыть
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
};

export default ServersList; 