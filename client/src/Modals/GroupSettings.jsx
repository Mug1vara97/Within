import { useState, useEffect } from 'react';
import { BASE_URL } from '../config/apiConfig';

export const useGroupSettings = (chatId, userId) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);
  const [members, setMembers] = useState([]);

  const fetchMembers = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/settings/${chatId}/members`);
      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/settings/${chatId}/leave/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        alert('Вы успешно покинули группу');
        window.location.href = '/';
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Ошибка при попытке покинуть группу:', error);
      alert('Не удалось покинуть группу');
    }
  };

  const handleAddMember = async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/settings/${chatId}/add-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ UserId: userId }),
      });

      if (response.ok) {
        alert('Участники успешно добавлены');
        await fetchMembers();
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Ошибка при добавлении участников:', error);
      alert('Не удалось добавить участников');
    }
  };

  return {
    isSettingsOpen,
    setIsSettingsOpen,
    isAddMembersModalOpen,
    setIsAddMembersModalOpen,
    members,
    fetchMembers,
    handleLeaveGroup,
    handleAddMember
  };
};

export const AddMembersModal = ({ onClose, onAddMembers, userId, chatId }) => {
    const [availableUsers, setAvailableUsers] = useState([]); 
    const [isLoading, setIsLoading] = useState(false); 
    const [selectedUsers, setSelectedUsers] = useState([]); 

    const fetchAvailableUsers = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${BASE_URL}/api/settings/${chatId}/available-users/${userId}`);
        const data = await response.json();
        setAvailableUsers(data);
      } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Обработчик выбора пользователя
    const handleSelectUser = (userId) => {
      setSelectedUsers((prevSelected) =>
        prevSelected.includes(userId)
          ? prevSelected.filter((id) => id !== userId) // Убираем пользователя, если он уже выбран
          : [...prevSelected, userId] // Добавляем пользователя, если он не выбран
      );
    };

    // Обработчик добавления выбранных пользователей
    const handleAddSelectedUsers = async () => {
      if (selectedUsers.length === 0) {
        alert('Выберите хотя бы одного пользователя');
        return;
      }

      try {
        await onAddMembers(selectedUsers); // Добавляем выбранных пользователей
        setSelectedUsers([]); // Очищаем список выбранных пользователей
        onClose(); // Закрываем модальное окно
      } catch (error) {
        console.error('Ошибка при добавлении пользователей:', error);
      }
    };

    // Загружаем список пользователей при открытии модального окна
    useEffect(() => {
      fetchAvailableUsers();
    }, []);

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>Добавить участников</h3>
          {isLoading ? (
            <p>Загрузка...</p>
          ) : (
            <ul className="available-users-list">
              {availableUsers.map((user) => (
                <li key={user.userId} className="available-user-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.userId)}
                      onChange={() => handleSelectUser(user.userId)}
                    />
                    <span>{user.username}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="modal-actions">
            <button onClick={handleAddSelectedUsers} className="add-selected-users-button">
              Добавить выбранных
            </button>
            <button onClick={onClose} className="close-button">
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  };


export const GroupChatSettings = ({ 
  onClose,
  members,
  onLeaveGroup,
  groupName
}) => {
    return (
        <div className="settings-modal">
          <div className="settings-content">
            <h3>Настройки группового чата</h3>
            <h2>{groupName}</h2>
            <div>
              <p>{members.length} участника</p>
              <ul className="members-list">
                {members.map((member, index) => (
                  <li key={index} className="member-item">
                    {member.username}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <button onClick={onLeaveGroup} className="leave-button">
                Покинуть группу
              </button>
              <button onClick={onClose} className="close-button">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      );
    };