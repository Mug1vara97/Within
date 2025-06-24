import React, { useState } from 'react';
import Modal from './Modal';
import { FaTimes } from 'react-icons/fa';
import './CreateRoleModal.css';

const CreateRoleModal = ({ isOpen, onClose, connection, serverId }) => {
  const [roleName, setRoleName] = useState('');
  const [color, setColor] = useState('#5865F2');
  const [permissions, setPermissions] = useState({
    manageChannels: false,
    manageRoles: false,
    kickMembers: false,
    banMembers: false,
    manageMessages: false,
    manageServer: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    try {
      const roleData = {
        roleName: roleName.trim(),
        color: color,
        permissions: JSON.stringify(permissions)
      };

      console.log('Creating role with data:', roleData);
      await connection.invoke("CreateRole", parseInt(serverId, 10), roleData);
      onClose();
    } catch (error) {
      console.error('Error creating role:', error);
      alert(`Ошибка создания роли: ${error.message}`);
    }
  };

  const handlePermissionChange = (permission) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: !prev[permission]
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="create-role-modal">
        <div className="modal-header">
          <h2>Создать роль</h2>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="roleName">Название роли</label>
            <input
              type="text"
              id="roleName"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="Введите название роли"
              maxLength={32}
            />
          </div>
          <div className="form-group">
            <label htmlFor="color">Цвет роли</label>
            <input
              type="color"
              id="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
          <div className="permissions-section">
            <h3>Разрешения</h3>
            <div className="permissions-grid">
              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={permissions.manageChannels}
                  onChange={() => handlePermissionChange('manageChannels')}
                />
                Управление каналами
              </label>
              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={permissions.manageRoles}
                  onChange={() => handlePermissionChange('manageRoles')}
                />
                Управление ролями
              </label>
              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={permissions.kickMembers}
                  onChange={() => handlePermissionChange('kickMembers')}
                />
                Выгонять участников
              </label>
              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={permissions.banMembers}
                  onChange={() => handlePermissionChange('banMembers')}
                />
                Банить участников
              </label>
              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={permissions.manageMessages}
                  onChange={() => handlePermissionChange('manageMessages')}
                />
                Управление сообщениями
              </label>
              <label className="permission-item">
                <input
                  type="checkbox"
                  checked={permissions.manageServer}
                  onChange={() => handlePermissionChange('manageServer')}
                />
                Управление сервером
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="cancel-button" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="create-button">
              Создать
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateRoleModal; 