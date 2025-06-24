import React, { useState, useEffect, useRef } from 'react';
import { BASE_URL } from '../config/apiConfig';
import './server-settings-modal.css';
import UserProfileModal from '../UserProfileModal';
import { useNavigate } from 'react-router-dom';
import AuditLogModal from './AuditLogModal';
import { FaImage, FaTrash, FaTimes, FaUpload } from 'react-icons/fa';

const ServerSettingsModal = ({ 
  serverId,
  userId,
  isOpen,
  onClose,
  userPermissions,
  isServerOwner,
  connection,
  setUserPermissions,
  aggregatePermissions,
  handleKickMember
}) => {
  const [activeTab, setActiveTab] = useState('roles');
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [serverMembers, setServerMembers] = useState([]);
  const [roleName, setRoleName] = useState('');
  const [permissions, setPermissions] = useState({});
  const [roleColor, setRoleColor] = useState('#99AAB5');
  const [hoist, setHoist] = useState(false);
  const hoverTimer = useRef(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const navigate = useNavigate();
  const [serverName, setServerName] = useState('');
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [isEditingBanner, setIsEditingBanner] = useState(false);
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerColor, setBannerColor] = useState('');
  const [server, setServer] = useState(null);
  
  /////
  useEffect(() => {
    if (isOpen && connection) {
      connection.invoke("GetRoles", parseInt(serverId));
      connection.invoke("GetServerMembers", parseInt(serverId));
      connection.invoke("GetServerInfo", parseInt(serverId, 10))
        .then(serverInfo => {
          setServerName(serverInfo.name);
          setServer({
            ...serverInfo,
            avatar: serverInfo.avatar
          });
          setBannerColor(serverInfo.bannerColor || '#3f3f3f');
        })
        .catch(console.error);

      // Добавляем обработчики событий
      connection.on("RolesLoaded", (loadedRoles) => {
        setRoles(loadedRoles);
      });

      connection.on("ServerMembersLoaded", (loadedMembers) => {
        setServerMembers(loadedMembers);
      });

      connection.on("RoleCreated", (newRole) => {
        setRoles(prev => [...prev, newRole]);
      });

      connection.on("RoleUpdated", (updatedRole) => {
        setRoles(prev => prev.map(role => 
          role.roleId === updatedRole.roleId ? updatedRole : role
        ));
      });

      connection.on("RoleDeleted", (deletedRoleId) => {
        setRoles(prev => prev.filter(role => role.roleId !== deletedRoleId));
      });

      connection.on("RoleRemoved", async (userId, roleId) => {
        // Обновляем список участников после удаления роли
        await connection.invoke("GetServerMembers", parseInt(serverId, 10));
      });

      connection.on("UserRolesLoaded", (roles) => {
        // Обновляем роли для конкретного пользователя
        setServerMembers(prev => prev.map(member => {
          if (member.userId === parseInt(userId)) {
            return {
              ...member,
              roles: roles
            };
          }
          return member;
        }));
      });

      // Очищаем обработчики при размонтировании
      return () => {
        connection.off("RolesLoaded");
        connection.off("ServerMembersLoaded");
        connection.off("RoleCreated");
        connection.off("RoleUpdated");
        connection.off("RoleDeleted");
        connection.off("RoleRemoved");
        connection.off("UserRolesLoaded");
      };
    }
  }, [isOpen, connection, serverId, userId]);

  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    memberId: null
  });
  const [showKickModal, setShowKickModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showRoleManagementModal, setShowRoleManagementModal] = useState({
    visible: false,
    x: 0,
    y: 0
  });
  const [selectedMemberForRoles, setSelectedMemberForRoles] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);

  // Refs для отслеживания состояния наведения
  const contextMenuRef = useRef(null);
  const roleModalRef = useRef(null);

  useEffect(() => {
    if (selectedMemberForRoles) {
      const memberRoles = serverMembers.find(m => m.userId === selectedMemberForRoles.userId)?.roles || [];
      setSelectedRoles(memberRoles.map(role => role.roleId));
    }
  }, [selectedMemberForRoles, serverMembers]);


  const handlePrivateMessage = async (memberId) => {
    try {
        const response = await fetch(`${BASE_URL}/api/server/openChat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                currentUserId: parseInt(userId, 10),
                targetUserId: parseInt(memberId, 10)
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Закрываем модальное окно настроек сервера
            onClose();
            // Закрываем контекстное меню
            setContextMenu({ ...contextMenu, visible: false });
            // Переходим к чату
            navigate(`/channels/@me/${data.chatId}`);
            // Принудительно обновляем список чатов через ChatListHub
            if (connection) {
                try {
                    await connection.invoke("GetUserChats", parseInt(userId, 10));
                } catch (error) {
                    console.warn('Error updating chat list:', error);
                    // Продолжаем выполнение даже если обновление списка чатов не удалось
                }
            }
        } else {
            throw new Error(data.message || 'Ошибка открытия чата');
        }
    } catch (error) {
        console.error('Ошибка при открытии/создании чата:', error);
        // Не показываем alert, так как чат все равно откроется через URL
    }
};


  const ContextMenu = () => {
    if (!contextMenu.visible) return null;
  
    const member = serverMembers.find(m => m.userId === contextMenu.memberId);
  
    const calculatePosition = (x, y) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuWidth = 200;
      const menuHeight = 100;
      
      return {
        x: x + menuWidth > viewportWidth ? x - menuWidth : x,
        y: y + menuHeight > viewportHeight ? y - menuHeight : y
      };
    };
  
    const { x, y } = calculatePosition(contextMenu.x, contextMenu.y);
  
    const handleRoleEnter = () => {
      clearTimeout(hoverTimer.current);
      setSelectedMemberForRoles(member);
      setShowRoleManagementModal({
        visible: true,
        x: x - 230,
        y: y
      });
    };
  
    const handleRoleLeave = () => {
      hoverTimer.current = setTimeout(() => {
        if (!roleModalRef.current?.contains(document.activeElement)) {
          setShowRoleManagementModal({ visible: false, x: 0, y: 0 });
        }
      }, 100);
    };
  
    return (
      <div 
        ref={contextMenuRef}
        className="context-menu"
        style={{
          position: 'fixed',
          left: x,
          top: y,
          zIndex: 1000
        }}
      >
        <div className="context-menu-content">
        <button
            className="context-menu-item profile"
            onClick={() => {
              handlePrivateMessage(member.userId);
              setContextMenu({ ...contextMenu, visible: false });
            }}
          >
            Написать
          </button>
        <button
            className="context-menu-item profile"
            onClick={() => {
              setSelectedUserProfile(member);
              setContextMenu({ ...contextMenu, visible: false });
            }}
          >
            Профиль
          </button>
          {(isServerOwner || userPermissions?.kickMembers) && (
          <div 
            className="context-menu-item hoverable"
            onMouseEnter={handleRoleEnter}
            onMouseLeave={handleRoleLeave}
          >
            <span>Роли</span>
          
          </div>
          )}
          {(isServerOwner || userPermissions?.manageRoles) && (
            <div 
              className="context-menu-item danger"
              onClick={() => {
                setSelectedMember(member);
                setShowKickModal(true);
                setContextMenu({ ...contextMenu, visible: false });
              }}>
              Удалить с сервера
            </div>
          )}
        </div>
      </div>
    );
  };

  // В компонент RoleManagementModal внести изменения:
  const RoleManagementModal = () => {
    const [localSelectedRoles, setLocalSelectedRoles] = useState([]);
  
    useEffect(() => {
        if (selectedMemberForRoles) {
            const memberRoles = serverMembers.find(m => m.userId === selectedMemberForRoles.userId)?.roles || [];
            setLocalSelectedRoles(memberRoles.map(role => role.roleId));
        }
    }, [selectedMemberForRoles, serverMembers]);
  
    const handleRoleToggle = async (roleId, checked) => {
        try {
            // Преобразуем ID в числа
            const targetUserIdNum = parseInt(selectedMemberForRoles.userId, 10);
            const roleIdNum = parseInt(roleId, 10);
            const currentUserId = parseInt(userId, 10);

            if (isNaN(targetUserIdNum) || isNaN(roleIdNum) || isNaN(currentUserId)) {
                throw new Error('Некорректные идентификаторы пользователя или роли');
            }

            console.log(`Role toggle: userId=${targetUserIdNum}, roleId=${roleIdNum}, currentUserId=${currentUserId}`);

            if (checked) {
                await connection.invoke("AssignRole", targetUserIdNum, roleIdNum, currentUserId);
            } else {
                await connection.invoke("RemoveRole", targetUserIdNum, roleIdNum, currentUserId);
            }
    
            // Обновляем данные участников
            await connection.invoke("GetServerMembers", parseInt(serverId, 10));
            
            // Обновляем права только для целевого пользователя
            if (targetUserIdNum === parseInt(userId)) {
                const newRoles = checked 
                    ? [...selectedMemberForRoles.roles, roles.find(r => r.roleId === roleId)]
                    : selectedMemberForRoles.roles.filter(r => r.roleId !== roleId);
                
                const merged = aggregatePermissions(newRoles);
                setUserPermissions(merged);
            }
        } catch (error) {
            console.error('Role update error:', error);
            alert(`Ошибка обновления роли: ${error.message}`);
        }
    };
  
    const handleMouseEnter = () => {
      clearTimeout(hoverTimer.current);
    };
  
    const handleMouseLeave = () => {
      hoverTimer.current = setTimeout(() => {
        setShowRoleManagementModal({ visible: false, x: 0, y: 0 });
      }, 100);
    };
  
    useEffect(() => {
      return () => clearTimeout(hoverTimer.current);
    }, []);
  
    useEffect(() => {
        if (!connection) return;
    
        const handlePermissionsUpdate = (updatedUserId, updatedPermissions) => {
            // Обновляем права только для конкретного пользователя в списке участников
            setServerMembers(prev => {
                if (!prev) return prev;
                return prev.map(m => 
                    m.userId === updatedUserId
                        ? { ...m, permissions: updatedPermissions }
                        : m
                );
            });

            // Обновляем права текущего пользователя только если это он
            if (updatedUserId === parseInt(userId)) {
                setUserPermissions(updatedPermissions);
            }
        };
    
        const handleRoleRemoved = async (removedUserId, removedRoleId) => {
            // Обновляем список участников
            await connection.invoke("GetServerMembers", parseInt(serverId, 10));
            
            // Если это текущий пользователь, обновляем его права
            if (removedUserId === parseInt(userId)) {
                const roles = await connection.invoke("GetUserRoles", parseInt(userId, 10), parseInt(serverId, 10));
                const mergedPermissions = aggregatePermissions(roles);
                setUserPermissions(mergedPermissions);
            }
        };
    
        connection.on("UserPermissionsUpdated", handlePermissionsUpdate);
        connection.on("RoleRemoved", handleRoleRemoved);
        
        return () => {
            connection.off("UserPermissionsUpdated", handlePermissionsUpdate);
            connection.off("RoleRemoved", handleRoleRemoved);
        };
    }, [connection, userId, serverId]);
  
    if (!showRoleManagementModal.visible) return null;
  
    return (
      <div 
        ref={roleModalRef}
        className="role-management-modal"
        style={{
          position: 'fixed',
          left: showRoleManagementModal.x,
          top: showRoleManagementModal.y,
          zIndex: 1001
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="modal-content">
          <div className="roles-list">
          {roles.map(role => (
              <label key={role.roleId} className="role-item">
                  <div className="checkbox-container">
                      <input
                          type="checkbox"
                          className="custom-checkbox"
                          checked={localSelectedRoles.includes(role.roleId)}
                          onChange={(e) => handleRoleToggle(role.roleId, e.target.checked)}
                      />
                      <span className="checkmark" />
                  </div>
                  <div 
                      className="role-color-indicator" 
                      style={{ backgroundColor: role.color }}
                  />
                  <span className="role-name">{role.roleName}</span>
              </label>
          ))}
          </div>
        </div>
      </div>
    );
  };
  
  const permissionCategories = {
    general: {
      title: 'Основные разрешения',
      permissions: [
        'viewChannels',
        'manageChannels',
        'manageRoles',
        'manageServer',
        'createInvites'
      ]
    },
    members: {
      title: 'Управление участниками',
      permissions: [
        'changeOwnNickname',
        'manageNicknames',
        'kickMembers',
        'banMembers'
      ]
    },
    messages: {
      title: 'Управление сообщениями',
      permissions: [
        'sendMessages',
        'attachFiles',
        'mentionEveryone',
        'manageMessages',
        'sendVoiceMessages'
      ]
    }
  };
  
  const permissionLabels = {
    viewChannels: 'Просмотр каналов',
    manageChannels: 'Управлять каналами',
    manageRoles: 'Управлять ролями',
    manageServer: 'Управлять сервером',
    createInvites: 'Создание приглашений',
    changeOwnNickname: 'Изменить никнейм - свой ник',
    manageNicknames: 'Управлять никнеймами - всех',
    kickMembers: 'Удаление участников',
    banMembers: 'Бан участников',
    sendMessages: 'Отправлять сообщения',
    attachFiles: 'Прикреплять файлы',
    mentionEveryone: 'Упоминание @everyone',
    manageMessages: 'Управление сообщениями',
    sendVoiceMessages: 'Отправлять голосовые сообщения'
  };
  useEffect(() => {
    if (isOpen) {
      fetchRoles();
      fetchServerMembers();
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const isContextMenu = e.target.closest('.context-menu');
      const isRoleModal = e.target.closest('.role-management-modal');
      const isKickModal = e.target.closest('.kick-confirmation-modal');
  
      if (!isContextMenu && !isRoleModal && !isKickModal) {
        setContextMenu(prev => ({ ...prev, visible: false }));
        setShowRoleManagementModal({ visible: false, x: 0, y: 0 });
        setShowKickModal(false);
      }
    };
  
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setContextMenu(prev => ({ ...prev, visible: false }));
        setShowRoleManagementModal({ visible: false, x: 0, y: 0 });
        setShowKickModal(false);
      }
    };
  
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
  
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const fetchRoles = async () => {
    try {
      await connection.invoke("GetRoles", parseInt(serverId, 10)); // Преобразуем в число
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchServerMembers = async () => {
    try {
      await connection.invoke("GetServerMembers", parseInt(serverId, 10)); // Преобразуем в число
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const resetForm = () => {
    setRoleName('');
    setPermissions({});
    setRoleColor('#99AAB5');
    setHoist(false);
    setIsEditing(false);
    setSelectedRole(null);
  };

  const handleEditRole = (role) => {
    setSelectedRole(role);
    setIsEditing(true);
    setRoleName(role.roleName);
    setPermissions(JSON.parse(role.permissions));
    setRoleColor(role.color);
    setHoist(role.hoist);
  };

  const handleSubmit = async () => {
    if (!roleName.trim()) {
      alert('Введите название роли');
      return;
    }
    
    try {
      const roleData = {
        roleName: roleName.trim(),
        color: roleColor,
        permissions: JSON.stringify(permissions)
      };

      console.log('Creating role with data:', roleData);

      if (isEditing) {
        await connection.invoke("UpdateRole", selectedRole.roleId, roleData, parseInt(userId, 10));
      } else {
        await connection.invoke("CreateRole", parseInt(serverId, 10), roleData, parseInt(userId, 10));
      }
      resetForm();
    } catch (error) {
      console.error('Error creating/updating role:', error);
      const errorMessage = error.message.includes('уже существует') 
        ? error.message 
        : 'Произошла ошибка при создании роли. Пожалуйста, попробуйте еще раз.';
      alert(errorMessage);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Удалить эту роль?')) return;
    try {
      await connection.invoke("DeleteRole", roleId, parseInt(userId, 10));
    } catch (error) {
      alert(error.message);
    }
  };

  const handleAssignRole = async (targetUserId, roleId) => {
    try {
      // Преобразуем ID в числа
      const targetUserIdNum = parseInt(targetUserId, 10);
      const roleIdNum = parseInt(roleId, 10);
      const currentUserId = parseInt(userId, 10);

      if (isNaN(targetUserIdNum) || isNaN(roleIdNum) || isNaN(currentUserId)) {
        throw new Error('Некорректные идентификаторы пользователя или роли');
      }

      await connection.invoke("AssignRole", targetUserIdNum, roleIdNum, currentUserId);
        
        // Обновляем права для пользователя, которому назначили роль
      const targetMember = serverMembers.find(m => m.userId === targetUserIdNum);
        if (targetMember) {
        const newRoles = [...targetMember.roles, roles.find(r => r.roleId === roleIdNum)];
            const merged = aggregatePermissions(newRoles);
            
        // Преобразуем merged в строку JSON
        const permissionsJson = JSON.stringify(merged);
        
        try {
            await connection.invoke("NotifyPermissionsUpdate", 
            targetUserIdNum,
                parseInt(serverId, 10),
            permissionsJson
            );
        } catch (updateError) {
          console.warn('Failed to update permissions:', updateError);
        }
        }
    } catch (error) {
      console.error('Error assigning role:', error);
      alert(`Ошибка назначения роли: ${error.message}`);
    }
  };

  const handleRemoveRole = async (targetUserId, roleId) => {
    try {
        // Преобразуем ID в числа
        const targetUserIdNum = parseInt(targetUserId, 10);
        const roleIdNum = parseInt(roleId, 10);
        const currentUserId = parseInt(userId, 10);

        if (isNaN(targetUserIdNum) || isNaN(roleIdNum) || isNaN(currentUserId)) {
            throw new Error('Некорректные идентификаторы пользователя или роли');
        }

        console.log(`Removing role: userId=${targetUserIdNum}, roleId=${roleIdNum}, currentUserId=${currentUserId}`);

        await connection.invoke("RemoveRole", targetUserIdNum, roleIdNum, currentUserId);
        
        // Обновляем список участников
        await connection.invoke("GetServerMembers", parseInt(serverId, 10));
        
        // Если это текущий пользователь, обновляем его права
        if (targetUserIdNum === parseInt(userId, 10)) {
            const roles = await connection.invoke("GetUserRoles", targetUserIdNum, parseInt(serverId, 10));
            // Проверяем, что roles существует и не пустой
            if (roles && roles.length > 0) {
                const mergedPermissions = aggregatePermissions(roles);
                setUserPermissions(mergedPermissions);
            } else {
                // Если ролей нет, устанавливаем базовые права
                setUserPermissions({
                    viewChannels: true,
                    sendMessages: true,
                    attachFiles: true,
                    changeOwnNickname: true
                });
            }
        }
    } catch (error) {
        console.error('Error removing role:', error);
        // Не показываем alert, если роль успешно удалена
        if (!error.message.includes("Cannot read properties of null")) {
            alert(`Ошибка удаления роли: ${error.message}`);
        }
    }
  };

  const handleKickMemberConfirm = async () => {
    try {
      const serverIdNum = parseInt(serverId, 10);
      const memberIdNum = parseInt(selectedMember.userId, 10);
      const currentUserIdNum = parseInt(userId, 10);

      if (isNaN(serverIdNum) || isNaN(memberIdNum) || isNaN(currentUserIdNum)) {
        throw new Error('Invalid ID values');
      }

      await connection.invoke("KickMember", serverIdNum, memberIdNum, currentUserIdNum);
      setShowKickModal(false);
      
      // Обновляем список участников после исключения
      await connection.invoke("GetServerMembers", serverIdNum);
    } catch (error) {
      console.error('Error kicking member:', error);
      alert(`Ошибка при исключении участника: ${error.message}`);
    }
  };

  const KickConfirmationModal = () => (
    <div className="kick-confirmation-modal">
      <div className="modal-content">
        <h3>Вы уверены, что хотите удалить {selectedMember?.username} с сервера?</h3>
        <div className="modal-actions">
          <button onClick={() => setShowKickModal(false)}>Отмена</button>
          <button className="confirm-button" onClick={handleKickMemberConfirm}>
            Удалить
          </button>
        </div>
      </div>
    </div>
  );

  const handleServerNameUpdate = async () => {
    if (!serverName.trim()) {
        alert('Название сервера не может быть пустым');
        return;
    }
    
    try {
        await connection.invoke("UpdateServerName", 
            parseInt(serverId, 10),
            serverName
        );
        alert('Название сервера успешно обновлено');
    } catch (error) {
        alert(`Ошибка обновления названия сервера: ${error.message}`);
    }
  };

  const handleMemberAction = async (action, memberId) => {
    switch (action) {
      case 'kick':
        if (window.confirm('Вы уверены, что хотите исключить этого участника?')) {
          await handleKickMember(memberId);
        }
        break;
      // ... other cases ...
    }
    setContextMenu({ visible: false });
  };

  const handleBannerUpdate = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/messages/servers/${serverId}/banner?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          banner: bannerUrl,
          bannerColor: bannerColor
        })
      });

      if (response.ok) {
        const updatedServer = await response.json();
        setServer(updatedServer);
        setServerName(updatedServer.name);
        setIsEditingBanner(false);
      }
    } catch (error) {
      console.error('Ошибка при обновлении баннера:', error);
    }
  };

  const handleBannerRemove = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/messages/servers/${serverId}/banner?userId=${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const updatedServer = await response.json();
        setServer(updatedServer);
        setServerName(updatedServer.name);
      }
    } catch (error) {
      console.error('Ошибка при удалении баннера:', error);
    }
  };

  const handleBannerFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    // Создаем FormData
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Загружаем файл на сервер
      const response = await fetch(`${BASE_URL}/api/server/${serverId}/banner`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Ошибка при загрузке баннера');
      }

      const data = await response.json();
      
      // Обновляем информацию о сервере через SignalR
      await connection.invoke("GetServerInfo", parseInt(serverId, 10))
        .then(serverInfo => {
          setServer(serverInfo);
          setBannerColor(serverInfo.bannerColor || '#3f3f3f');
        });
    } catch (error) {
      console.error('Ошибка при загрузке баннера:', error);
      alert('Не удалось загрузить баннер. Пожалуйста, попробуйте еще раз.');
    }
  };

  const handleBannerColorUpdate = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/messages/servers/${serverId}/banner?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bannerColor: bannerColor
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка при обновлении цвета баннера');
      }

      // Обновляем информацию о сервере через SignalR
      await connection.invoke("GetServerInfo", parseInt(serverId, 10))
        .then(serverInfo => {
          setServer(serverInfo);
          setBannerColor(serverInfo.bannerColor || '#3f3f3f');
        });
    } catch (error) {
      console.error('Ошибка при обновлении цвета баннера:', error);
      alert('Не удалось обновить цвет баннера. Пожалуйста, попробуйте еще раз.');
    }
  };

  return (
    isOpen && (
      <div className="server-settings-modal-overlay">
        <div className="server-settings-main-modal">
          <div className="server-settings-header">
            <div className="server-settings-tabs">
            {(isServerOwner || userPermissions?.manageRoles) && (
              <button
                className={`server-settings-tab ${activeTab === 'roles' ? 'active' : ''}`}
                onClick={() => setActiveTab('roles')}
              >
                Роли
              </button>
            )}
              <button
                className={`server-settings-tab ${activeTab === 'members' ? 'active' : ''}`}
                onClick={() => setActiveTab('members')}
              >
                Участники
              </button>
              <button 
                className={`server-settings-tab ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                  Настройки
              </button>
                        {(isServerOwner || userPermissions?.manageServer) && (
                            <button 
                                className={`server-settings-tab ${activeTab === 'audit' ? 'active' : ''}`}
                                onClick={() => setActiveTab('audit')}
                            >
                                Журнал аудита
                            </button>
                        )}
            </div>
            <button className="server-settings-close-button" onClick={onClose}>✕</button>
          </div>

          <div className="server-settings-content">
            {activeTab === 'roles' ? (
              <>
                <div className="server-settings-sidebar">
                  <button 
                    className="server-settings-create-button"
                    onClick={resetForm}
                  >
                    + Создать роль
                  </button>
                  <div className="server-settings-roles-list">
                    {roles.map(role => (
                      <div 
                        key={role.roleId} 
                        className="server-settings-role-item"
                        onClick={() => handleEditRole(role)}
                      >
                        <div 
                          className="server-settings-color-indicator" 
                          style={{ backgroundColor: role.color }} 
                        />
                        <span style={{ color: role.color }}>{role.roleName}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="server-settings-form-section">
                  <h4 className="server-settings-section-title">
                    {isEditing ? 'Редактирование роли' : 'Создание новой роли'}
                  </h4>
                  
                  <div className="server-settings-form-group">
                    <label>Название роли</label>
                    <input
                      type="text"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      className="server-settings-text-input"
                    />
                  </div>

                  <div className="server-settings-form-group">
                    <label>Цвет роли</label>
                    <input
                      type="color"
                      value={roleColor}
                      onChange={(e) => setRoleColor(e.target.value)}
                      className="server-settings-color-input"
                    />
                  </div>

                  <div className="server-settings-permissions-section">
                    {Object.entries(permissionCategories).map(([key, category]) => (
                      <div key={key} className="server-settings-permission-category">
                        <h5 className="server-settings-category-title">{category.title}</h5>
                        {category.permissions.map(perm => (
                          <label key={perm} className="server-settings-permission-item">
                            <input
                              type="checkbox"
                              checked={permissions[perm] || false}
                              onChange={() => setPermissions(prev => ({
                                ...prev,
                                [perm]: !prev[perm]
                              }))}
                            />
                            {permissionLabels[perm]}
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="server-settings-form-actions">
                    {isEditing && (
                      <button 
                        className="server-settings-delete-button"
                        onClick={() => handleDeleteRole(selectedRole.roleId)}
                      >
                        Удалить роль
                      </button>
                    )}
                    <div style={{ flex: 1 }} />
                    <button 
                      className="server-settings-cancel-button"
                      onClick={resetForm}
                    >
                      Отмена
                    </button>
                    <button className="server-settings-save-button" onClick={handleSubmit}>
                      {isEditing ? 'Сохранить' : 'Создать'}
                    </button>
                  </div>
                </div>
              </>
            ) : activeTab === 'members' ? (
              <div className="server-settings-members-section">
                <div className="server-settings-members-list">
                  {serverMembers.map(member => (
                    <div key={member.userId} className="server-settings-member-item">
                      <div className="server-settings-member-info">
                      <div className="server-settings-member-avatar" 
                          style={{ backgroundColor: member.avatarColor }}>
                          {member.avatar ? (
                              <img 
                                  src={`${BASE_URL}${member.avatar}`}
                                  alt={member.username}
                                  className="server-settings-avatar-image"
                                  onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'block';
                                  }}
                              />
                          ) : null}
                          <span 
                              className="server-settings-avatar-fallback"
                              style={{ display: member.avatar ? 'none' : 'block' }}>
                              {member.username[0].toUpperCase()}
                          </span>
                      </div>
                        <span>{member.username}</span>
                        <div className="server-settings-member-roles">
                                                {member.roles?.map(role => (
                                <div 
                                    key={role.roleId}
                                    className="server-settings-member-role"
                                    style={{ backgroundColor: role.color }}
                                >
                                    {role.roleName}
                                    {(isServerOwner || userPermissions?.manageRoles) && (
                                        <button 
                                            className="server-settings-remove-role"
                                            onClick={() => handleRemoveRole(member.userId, role.roleId)}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="member-actions">
                          <button 
                            className="member-menu-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setContextMenu({
                                visible: true,
                                x: e.clientX,
                                y: e.clientY,
                                memberId: member.userId
                              });
                            }}
                          >
                            ⋮
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
                    ) : activeTab === 'settings' ? (
              <div className="server-settings-form-section">
                <h4>Основные настройки сервера</h4>
                
                <div className="server-settings-header-group">
                  <div className="server-settings-form-group avatar-group">
                    <label>Аватар сервера</label>
                    <div className="server-avatar-preview">
                      <label 
                        className="avatar-preview-area clickable"
                        style={{
                          backgroundColor: '#5865f2',
                          backgroundImage: server?.avatar ? `url(${BASE_URL}${server.avatar})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (event) => {
                            const file = event.target.files[0];
                            if (!file) return;

                            try {
                              const formData = new FormData();
                              formData.append('file', file);
                              
                              const response = await fetch(`${BASE_URL}/api/messages/servers/${serverId}/avatar`, {
                                method: 'PUT',
                                body: formData
                              });

                              if (response.ok) {
                                const data = await response.json();
                                setServer(prev => ({
                                  ...prev,
                                  avatar: data.avatar
                                }));
                              } else {
                                throw new Error('Ошибка при обновлении аватара');
                              }
                            } catch (error) {
                              console.error('Ошибка при загрузке аватара:', error);
                              alert(error.message);
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        {!server?.avatar && (serverName || 'Сервер').charAt(0).toUpperCase()}
                        <div className="hover-overlay">
                          <FaUpload /> Изменить аватар
                        </div>
                      </label>
                      {server?.avatar && (
                        <button 
                          className="remove-avatar-button"
                          onClick={async () => {
                            if (!window.confirm('Вы уверены, что хотите удалить аватар сервера?')) {
                              return;
                            }

                            try {
                              const response = await fetch(`${BASE_URL}/api/messages/servers/${serverId}/avatar?userId=${userId}`, {
                                method: 'DELETE'
                              });

                              if (response.ok) {
                                setServer(prev => ({
                                  ...prev,
                                  avatar: null
                                }));
                              } else {
                                const data = await response.json();
                                throw new Error(data.error || 'Ошибка при удалении аватара');
                              }
                            } catch (error) {
                              console.error('Ошибка при удалении аватара:', error);
                              alert(error.message);
                            }
                          }}
                        >
                          <FaTrash /> Удалить аватар
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="server-settings-form-group name-group">
                    <label>Название сервера</label>
                    <input
                      type="text"
                      value={serverName}
                      onChange={(e) => setServerName(e.target.value)}
                      className="server-settings-text-input"
                    />
                  </div>
                </div>

                <div className="server-settings-form-group">
                  <label>Баннер сервера</label>
                  <div className="server-banner-preview">
                    <label 
                      className="banner-preview-area clickable"
                      style={{
                        backgroundColor: bannerColor || '#3f3f3f',
                        backgroundImage: server?.banner ? `url(${BASE_URL}${server.banner})` : 'none'
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerFileUpload}
                        style={{ display: 'none' }}
                      />
                      {!server?.banner && (
                        <div className="banner-placeholder-text">
                          {serverName || 'Баннер сервера'}
                        </div>
                      )}
                      <div className="hover-overlay banner-overlay">
                        <FaUpload /> Изменить баннер
                      </div>
                    </label>
                    <div className="banner-controls">
                      <div className="banner-actions">
                        <div className="banner-color-picker">
                          <label>
                            <span>Цвет фона:</span>
                            <input
                              type="color"
                              value={bannerColor || '#3f3f3f'}
                              onChange={(e) => setBannerColor(e.target.value)}
                            />
                          </label>
                          <button 
                            className="save-color-button"
                            onClick={handleBannerColorUpdate}
                          >
                            Сохранить цвет
                          </button>
                        </div>
                        {server?.banner && (
                          <button 
                            className="remove-banner-button"
                            onClick={handleBannerRemove}
                          >
                            <FaTrash /> Удалить баннер
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  className="server-settings-save-button"
                  onClick={handleServerNameUpdate}
                >
                  Сохранить изменения
                </button>
              </div>
                    ) : activeTab === 'audit' && (
                        <AuditLogModal
                            isOpen={true}
                            onClose={() => {}}
                            serverId={serverId}
                            connection={connection}
                        />
            )}
          </div>
        </div>
        <ContextMenu />
        {showKickModal && <KickConfirmationModal />}
        {showRoleManagementModal.visible && <RoleManagementModal />}
        {selectedUserProfile && (
            <UserProfileModal
                isOpen={true}
                onClose={() => setSelectedUserProfile(null)}
                userId={selectedUserProfile.userId}
                username={selectedUserProfile.username}
                currentUserId={userId}
            />
        )}
      </div>
    )
  );
};

export default ServerSettingsModal;