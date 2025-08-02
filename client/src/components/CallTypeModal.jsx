import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import PhoneIcon from '@mui/icons-material/Phone';

const CallTypeModal = ({ isOpen, onClose, onCallWithNotification, onCallWithoutNotification, targetUser }) => {
    if (!isOpen) return null;

    return (
        <Box
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
                sx={{
                    backgroundColor: '#36393f',
                    borderRadius: '12px',
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: '350px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                }}
            >
                {/* Иконка звонка */}
                <Box
                    sx={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: '#5865f2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '24px',
                    }}
                >
                    <PhoneIcon sx={{ color: 'white', fontSize: '28px' }} />
                </Box>

                {/* Заголовок */}
                <Typography
                    variant="h6"
                    sx={{
                        color: '#dcddde',
                        marginBottom: '8px',
                        textAlign: 'center',
                    }}
                >
                    Выберите тип звонка
                </Typography>

                <Typography
                    variant="body1"
                    sx={{
                        color: '#8e9297',
                        marginBottom: '32px',
                        textAlign: 'center',
                    }}
                >
                    {targetUser}
                </Typography>

                {/* Кнопки выбора */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    <Button
                        variant="contained"
                        startIcon={<CallIcon />}
                        onClick={onCallWithNotification}
                        sx={{
                            backgroundColor: '#57f287',
                            color: 'white',
                            '&:hover': {
                                backgroundColor: '#3ba55c',
                            },
                            borderRadius: '8px',
                            padding: '12px 24px',
                            textTransform: 'none',
                            fontSize: '16px',
                            width: '100%',
                        }}
                    >
                        Звонить с уведомлением
                    </Button>

                    <Button
                        variant="outlined"
                        startIcon={<CallIcon />}
                        onClick={onCallWithoutNotification}
                        sx={{
                            borderColor: '#5865f2',
                            color: '#5865f2',
                            '&:hover': {
                                borderColor: '#4752c4',
                                backgroundColor: 'rgba(88, 101, 242, 0.1)',
                            },
                            borderRadius: '8px',
                            padding: '12px 24px',
                            textTransform: 'none',
                            fontSize: '16px',
                            width: '100%',
                        }}
                    >
                        Звонить без уведомления
                    </Button>

                    <Button
                        variant="text"
                        onClick={onClose}
                        sx={{
                            color: '#8e9297',
                            '&:hover': {
                                backgroundColor: 'rgba(142, 146, 151, 0.1)',
                            },
                            borderRadius: '8px',
                            padding: '8px 16px',
                            textTransform: 'none',
                            fontSize: '14px',
                            marginTop: '8px',
                        }}
                    >
                        Отмена
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default CallTypeModal; 