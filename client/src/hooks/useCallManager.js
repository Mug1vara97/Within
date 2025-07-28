import { useState, useEffect, useCallback, useRef } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { BASE_URL } from '../config/apiConfig';

const useCallManager = (userId, username) => {
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callConnection, setCallConnection] = useState(null);
  const connectionRef = useRef(null);

  // Инициализация SignalR соединения для звонков
  useEffect(() => {
    if (!userId) return;

    const createCallConnection = async () => {
      try {
        const connection = new HubConnectionBuilder()
          .withUrl(`${BASE_URL}/callhub?userId=${userId}`)
          .withAutomaticReconnect()
          .build();

        // Обработчики событий звонков
        connection.on('IncomingCall', (callData) => {
          console.log('Incoming call received:', callData);
          setIncomingCall(callData);
        });

        connection.on('CallAccepted', (callData) => {
          console.log('Call accepted:', callData);
          setActiveCall(callData);
          setIsInCall(true);
          setIncomingCall(null);
        });

        connection.on('CallRejected', (callData) => {
          console.log('Call rejected:', callData);
          setIncomingCall(null);
        });

        connection.on('CallEnded', (callData) => {
          console.log('Call ended:', callData);
          setActiveCall(null);
          setIsInCall(false);
          setIncomingCall(null);
        });

        connection.on('CallStarted', (callData) => {
          console.log('Call started:', callData);
          setActiveCall(callData);
          setIsInCall(true);
        });

        connection.on('UserJoinedCall', (callData) => {
          console.log('User joined call:', callData);
        });

        connection.on('UserLeftCall', (callData) => {
          console.log('User left call:', callData);
        });

        await connection.start();
        connectionRef.current = connection;
        setCallConnection(connection);

        console.log('Call connection established');
      } catch (error) {
        console.error('Failed to establish call connection:', error);
      }
    };

    createCallConnection();

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, [userId]);

  // Функция для начала звонка
  const startCall = useCallback(async (callData) => {
    if (!callConnection) {
      console.error('Call connection not available');
      return false;
    }

    try {
      const { chatId, partnerId, partnerName, callType = 'audio' } = callData;
      
      const callRequest = {
        chatId,
        callerId: userId,
        callerName: username,
        receiverId: partnerId,
        receiverName: partnerName,
        callType,
        timestamp: new Date().toISOString()
      };

      console.log('Starting call:', callRequest);
      
      await callConnection.invoke('StartCall', callRequest);
      
      // Устанавливаем локальное состояние звонка
      setActiveCall({
        ...callRequest,
        status: 'ringing'
      });
      
      return true;
    } catch (error) {
      console.error('Failed to start call:', error);
      return false;
    }
  }, [callConnection, userId, username]);

  // Функция для принятия входящего звонка
  const acceptCall = useCallback(async (callData) => {
    if (!callConnection) {
      console.error('Call connection not available');
      return false;
    }

    try {
      console.log('Accepting call:', callData);
      
      await callConnection.invoke('AcceptCall', callData.callId);
      
      setActiveCall({
        ...callData,
        status: 'active'
      });
      setIsInCall(true);
      setIncomingCall(null);
      
      return true;
    } catch (error) {
      console.error('Failed to accept call:', error);
      return false;
    }
  }, [callConnection]);

  // Функция для отклонения входящего звонка
  const rejectCall = useCallback(async (callData) => {
    if (!callConnection) {
      console.error('Call connection not available');
      return false;
    }

    try {
      console.log('Rejecting call:', callData);
      
      await callConnection.invoke('RejectCall', callData.callId);
      
      setIncomingCall(null);
      
      return true;
    } catch (error) {
      console.error('Failed to reject call:', error);
      return false;
    }
  }, [callConnection]);

  // Функция для завершения звонка
  const endCall = useCallback(async () => {
    if (!callConnection || !activeCall) {
      console.error('Call connection or active call not available');
      return false;
    }

    try {
      console.log('Ending call:', activeCall);
      
      await callConnection.invoke('EndCall', activeCall.callId);
      
      setActiveCall(null);
      setIsInCall(false);
      
      return true;
    } catch (error) {
      console.error('Failed to end call:', error);
      return false;
    }
  }, [callConnection, activeCall]);

  // Функция для отправки сигнала о состоянии звонка
  const updateCallState = useCallback(async (state) => {
    if (!callConnection || !activeCall) {
      return false;
    }

    try {
      await callConnection.invoke('UpdateCallState', {
        callId: activeCall.callId,
        state
      });
      
      return true;
    } catch (error) {
      console.error('Failed to update call state:', error);
      return false;
    }
  }, [callConnection, activeCall]);

  // Функция для проверки доступности пользователя для звонка
  const checkUserAvailability = useCallback(async (userId) => {
    if (!callConnection) {
      return false;
    }

    try {
      const result = await callConnection.invoke('CheckUserAvailability', userId);
      return result;
    } catch (error) {
      console.error('Failed to check user availability:', error);
      return false;
    }
  }, [callConnection]);

  // Функция для получения истории звонков
  const getCallHistory = useCallback(async (chatId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/calls/history/${chatId}`);
      if (response.ok) {
        const history = await response.json();
        return history;
      }
      return [];
    } catch (error) {
      console.error('Failed to get call history:', error);
      return [];
    }
  }, []);

  // Функция для отправки уведомления о пропущенном звонке
  const sendMissedCallNotification = useCallback(async (callData) => {
    try {
      const response = await fetch(`${BASE_URL}/api/calls/missed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(callData)
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send missed call notification:', error);
      return false;
    }
  }, []);

  return {
    activeCall,
    incomingCall,
    isInCall,
    callConnection,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    updateCallState,
    checkUserAvailability,
    getCallHistory,
    sendMissedCallNotification
  };
};

export default useCallManager; 