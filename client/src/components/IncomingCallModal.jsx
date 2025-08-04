import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import CallEndIcon from '@mui/icons-material/CallEnd';
import CallIcon from '@mui/icons-material/Call';
import PhoneIcon from '@mui/icons-material/Phone';

const IncomingCallModal = ({ incomingCall, onAcceptCall, onRejectCall }) => {
    const [callDuration, setCallDuration] = useState(0);

    // Таймер для отображения длительности входящего звонка
    useEffect(() => {
        const interval = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Звук теперь управляется централизованно через NotificationContext
    // Убираем дублирование звука в этом компоненте
    const handleAcceptCall = () => {
        onAcceptCall();
    };

    const handleRejectCall = () => {
        onRejectCall();
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Box
            className="incoming-call-modal"
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
            }}
        >
            <Box
                className="incoming-call-content"
                sx={{
                    backgroundColor: 'var(--surface)',
                    borderRadius: '12px',
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: '300px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                    border: '1px solid var(--border)',
                }}
            >
                {/* Анимация входящего звонка */}
                <Box
                    className="call-animation"
                    sx={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--success)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '24px',
                        animation: 'pulse 1.5s ease-in-out infinite',
                        '@keyframes pulse': {
                            '0%': {
                                transform: 'scale(1)',
                                boxShadow: '0 0 0 0 var(--success)',
                            },
                            '70%': {
                                transform: 'scale(1.05)',
                                boxShadow: '0 0 0 10px transparent',
                            },
                            '100%': {
                                transform: 'scale(1)',
                                boxShadow: '0 0 0 0 transparent',
                            },
                        },
                    }}
                >
                    <PhoneIcon sx={{ color: 'white', fontSize: '32px' }} />
                </Box>

                {/* Информация о звонке */}
                <Typography
                    variant="h6"
                    sx={{
                        color: 'var(--text)',
                        marginBottom: '8px',
                        textAlign: 'center',
                    }}
                >
                    Входящий звонок
                </Typography>

                <Typography
                    variant="body1"
                    sx={{
                        color: 'var(--textSecondary)',
                        marginBottom: '24px',
                        textAlign: 'center',
                    }}
                >
                    {incomingCall?.caller}
                </Typography>

                {/* Длительность звонка */}
                <Typography
                    variant="body2"
                    sx={{
                        color: 'var(--textSecondary)',
                        marginBottom: '32px',
                        fontFamily: 'monospace',
                        fontSize: '18px',
                    }}
                >
                    {formatDuration(callDuration)}
                </Typography>

                {/* Кнопки ответа и отклонения */}
                <Box sx={{ display: 'flex', gap: '16px' }}>
                    <Button
                        variant="contained"
                        startIcon={<CallIcon />}
                        onClick={handleAcceptCall}
                        sx={{
                            backgroundColor: 'var(--success)',
                            color: 'white',
                            '&:hover': {
                                backgroundColor: 'var(--successHover)',
                            },
                            borderRadius: '8px',
                            padding: '12px 24px',
                            textTransform: 'none',
                            fontSize: '16px',
                        }}
                    >
                        Ответить
                    </Button>

                    <Button
                        variant="contained"
                        startIcon={<CallEndIcon />}
                        onClick={handleRejectCall}
                        sx={{
                            backgroundColor: 'var(--danger)',
                            color: 'white',
                            '&:hover': {
                                backgroundColor: 'var(--dangerHover)',
                            },
                            borderRadius: '8px',
                            padding: '12px 24px',
                            textTransform: 'none',
                            fontSize: '16px',
                        }}
                    >
                        Отклонить
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default IncomingCallModal; 