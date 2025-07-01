import React, { useEffect, useState, useMemo } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import CategoryItem from './CategoryItem';
import ChatItem from './ChatItem';
import { BASE_URL } from './config/apiConfig';

// Вспомогательные функции для работы с DnD
const reorderCategories = (list, startIndex, endIndex) => {
  // Работаем только с категориями, у которых есть categoryId
  const regularCategories = list.filter(cat => cat.categoryId !== null);
  const nullCategory = list.find(cat => cat.categoryId === null);

  const result = Array.from(regularCategories);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  // Обновляем порядок только для обычных категорий
  const orderedCategories = result.map((cat, index) => ({
    ...cat,
    categoryOrder: index
  }));

  // Возвращаем полный список с сохранением null категории
  return nullCategory ? [nullCategory, ...orderedCategories] : orderedCategories;
};

const moveChatBetweenCategories = (
    categories,
    source,
    destination
  ) => {
    const sourceCategoryId = source.droppableId.replace('category-', '');
    const destCategoryId = destination.droppableId.replace('category-', '');
    
    // Создаем глубокую копию категорий
    const newCategories = categories.map(cat => ({
      ...cat,
      chats: [...(cat.chats || [])]
    }));

    // Находим индексы категорий
    const sourceCategoryIndex = categories.findIndex(
      cat => (cat.categoryId === null ? 'null' : cat.categoryId.toString()) === sourceCategoryId
    );

    const destCategoryIndex = categories.findIndex(
      cat => (cat.categoryId === null ? 'null' : cat.categoryId.toString()) === destCategoryId
    );

    // Получаем категории
    const sourceCategory = newCategories[sourceCategoryIndex];
    const destCategory = newCategories[destCategoryIndex];

    // Если это перемещение внутри одной категории
    if (sourceCategoryId === destCategoryId && sourceCategory) {
        const chats = [...sourceCategory.chats];
        const [movedChat] = chats.splice(source.index, 1);
        chats.splice(destination.index, 0, {
            ...movedChat,
            chatOrder: destination.index
        });

        // Обновляем порядок всех чатов
        sourceCategory.chats = chats.map((chat, index) => ({
            ...chat,
            chatOrder: index
        }));

        return newCategories;
    }

    // Если это перемещение между разными категориями
    const sourceChats = [...(sourceCategory?.chats || [])];
    const destChats = [...(destCategory?.chats || [])];

    // Удаляем чат из исходной категории
    const [movedChat] = sourceChats.splice(source.index, 1);

    // Обновляем порядок в исходной категории
    if (sourceCategory) {
        sourceCategory.chats = sourceChats.map((chat, index) => ({
            ...chat,
            chatOrder: index
        }));
    }

    // Обновляем чат и добавляем его в целевую категорию
    const updatedMovedChat = {
        ...movedChat,
        categoryId: destCategoryId === 'null' ? null : parseInt(destCategoryId, 10),
        chatOrder: destination.index
    };

    destChats.splice(destination.index, 0, updatedMovedChat);

    // Обновляем порядок в целевой категории
    if (destCategory) {
        destCategory.chats = destChats.map((chat, index) => ({
            ...chat,
            chatOrder: index
        }));
    } else {
        // Если целевой категории нет (перемещение в null), создаем её
        newCategories.push({
            categoryId: null,
            categoryName: null,
            chats: destChats.map((chat, index) => ({
                ...chat,
                chatOrder: index
            }))
        });
    }

    return newCategories;
};

const CategoriesList = ({ 
  categories: initialCategories = [],
  handleCategoryContextMenu,
  handleChatContextMenu,
  setModalsState,
  serverId,
  userPermissions,
  connection,
  isServerOwner,
  userRoles,
  userId,
  voiceChannelUsers = {},
  ...props 
}) => {
  const [localCategories, setLocalCategories] = useState(initialCategories || []);

  useEffect(() => {
    if (initialCategories && JSON.stringify(initialCategories) !== JSON.stringify(localCategories)) {
      setLocalCategories(initialCategories);
    }
  }, [initialCategories]);

  // Фильтрация категорий и чатов на основе ролей пользователя и прямого доступа
  const filteredCategories = useMemo(() => {
    console.log('CategoriesList filtering with:', {
      categories: localCategories,
      userRoles,
      isServerOwner,
      userId
    });

    return localCategories
      .filter(category => {
        console.log('Checking category:', {
          categoryId: category.categoryId,
          categoryName: category.categoryName,
          isPrivate: category.isPrivate,
          allowedRoleIds: category.allowedRoleIds,
          allowedUserIds: category.allowedUserIds,
          userId: userId,
          isServerOwner: isServerOwner,
          userRoles: userRoles
        });

        if (!category.isPrivate) {
          console.log('Category is not private, allowing access');
          return true;
        }
        if (isServerOwner) {
          console.log('User is server owner, allowing access');
          return true;
        }

        if (category.allowedRoleIds) {
          try {
            // Удаляем кавычки, если они есть
            const cleanRoleIds = category.allowedRoleIds.replace(/"/g, '');
            console.log('Clean roleIds:', cleanRoleIds);
            const allowedRoles = JSON.parse(cleanRoleIds);
            console.log('Parsed allowedRoles:', allowedRoles);
            
            // Проверяем, является ли allowedRoles массивом
            const roleArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
            console.log('Role array:', roleArray);
            console.log('User roles:', userRoles);
            
            if (roleArray.some(roleId => userRoles?.includes(roleId))) {
              console.log('User has required role, allowing access');
              return true;
            }
          } catch (error) {
            console.error('Error parsing category allowedRoleIds:', error, category.allowedRoleIds);
          }
        }

        if (category.allowedUserIds) {
          try {
            // Удаляем кавычки, если они есть
            const cleanUserIds = category.allowedUserIds.replace(/"/g, '');
            console.log('Clean userIds:', cleanUserIds);
            const allowedUsers = JSON.parse(cleanUserIds);
            console.log('Parsed allowedUsers:', allowedUsers);
            
            // Проверяем, является ли allowedUsers массивом
            const userArray = Array.isArray(allowedUsers) ? allowedUsers : [allowedUsers];
            console.log('User array:', userArray);
            console.log('Current userId:', userId);
            console.log('Includes check:', userArray.includes(userId));
            
            if (userArray.includes(userId)) {
              console.log('User has direct access, allowing access');
              return true;
            }
          } catch (error) {
            console.error('Error parsing category allowedUserIds:', error, category.allowedUserIds);
          }
        }

        console.log('No access granted to category');
        return false;
      })
      .map(category => ({
        ...category,
        chats: (category.chats || [])
          .filter(chat => {
            // Показываем чат если:
            // 1. Он не приватный
            // 2. Пользователь - владелец сервера
            // 3. У пользователя есть роль с доступом к этому чату
            // 4. Пользователь является участником чата
            if (!chat.isPrivate) return true;
            if (isServerOwner) return true;

            if (chat.allowedRoleIds) {
              try {
                // Удаляем кавычки, если они есть
                const cleanRoleIds = chat.allowedRoleIds.replace(/"/g, '');
                const allowedRoles = JSON.parse(cleanRoleIds);
                
                // Проверяем, является ли allowedRoles массивом
                const roleArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
                
                if (roleArray.some(roleId => userRoles?.includes(roleId))) {
                  return true;
                }
              } catch (error) {
                console.error('Error parsing chat allowedRoleIds:', error, chat.allowedRoleIds);
              }
            }

            // Проверяем, является ли пользователь участником чата
            return chat.members?.some(member => member.userId === userId);
          })
          .sort((a, b) => a.chatOrder - b.chatOrder)
      }));
  }, [localCategories, isServerOwner, userRoles, userId]);

  // Сортировка категорий
  const sortedCategories = useMemo(
    () => [...filteredCategories].sort((a, b) => {
      // Чаты без категории всегда в начале
      if (a.categoryId === null) return -1;
      if (b.categoryId === null) return 1;
      return a.categoryOrder - b.categoryOrder;
    }),
    [filteredCategories]
  );

  // Получаем чаты без категории
  const uncategorizedChats = useMemo(() => {
    const nullCategory = filteredCategories.find(c => c.categoryId === null);
    return nullCategory ? nullCategory.chats : [];
  }, [filteredCategories]);

  useEffect(() => {
    if (!connection) return;

    const chatCreatedHandler = (newChat, categoryId) => {
        setLocalCategories(prev => prev.map(cat => {
            if (cat.categoryId === categoryId) {
                return {
                    ...cat,
                    chats: [...cat.chats, newChat].sort((a, b) => a.chatOrder - b.chatOrder)
                };
            }
            return cat;
        }));
    };

    connection.on("ChatCreated", chatCreatedHandler);
    return () => connection.off("ChatCreated", chatCreatedHandler);
}, [connection]);

  const handleDragEnd = async (result) => {
    if (!isServerOwner && !userPermissions?.manageChannels) {
      console.log('У пользователя нет прав на управление каналами');
      return;
    }

    if (!result.destination || !connection) {
      return;
    }

    const { source, destination, type } = result;

    try {
      if (type === 'CATEGORY') {
        const originalCategories = [...localCategories];
        const regularCategories = originalCategories.filter(cat => cat.categoryId !== null);

        // Проверяем, что индексы находятся в пределах обычных категорий
        if (source.index >= regularCategories.length || destination.index >= regularCategories.length) {
          return;
        }

        const newCategories = reorderCategories(
          originalCategories,
          source.index,
          destination.index
        );

        // Оптимистичное обновление
        setLocalCategories(newCategories);

        try {
          const movedCategory = regularCategories[source.index];
          await connection.invoke("MoveCategory", 
            parseInt(serverId, 10),
            movedCategory.categoryId,
            destination.index
          );
        } catch (err) {
          console.error('Category move error:', err);
          setLocalCategories(originalCategories);
          throw err;
        }
      }
      else if (type === 'CHAT') {
        const originalCategories = [...localCategories];
        
        // Обработка перетаскивания из/в категорию null
        const sourceId = source.droppableId === 'category-null' ? 0 : 
          parseInt(source.droppableId.replace('category-', ''), 10);
        const targetId = destination.droppableId === 'category-null' ? 0 :
          parseInt(destination.droppableId.replace('category-', ''), 10);

        const updatedCategories = moveChatBetweenCategories(
          originalCategories,
          source,
          destination
        );

        // Оптимистичное обновление
        setLocalCategories(updatedCategories);

        try {
          const chatId = parseInt(result.draggableId.replace('chat-', ''), 10);

          await connection.invoke("MoveChat",
            parseInt(serverId, 10),
            chatId,
            sourceId, // Всегда отправляем число (0 для null)
            targetId, // Всегда отправляем число (0 для null)
            destination.index
          );
        } catch (err) {
          console.error('Chat move error:', err);
          setLocalCategories(originalCategories);
          throw err;
        }
      }
    } catch (error) {
      console.error('Move operation failed:', error);
      alert(`Ошибка перемещения: ${error.message}`);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable 
        droppableId="categories"
        direction="vertical"
        type="CATEGORY"
        isDropDisabled={!isServerOwner && !userPermissions?.manageChannels}
      >
        {(provided, snapshot) => (
          <div 
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`categories-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
          >
            {/* Область для чатов без категории */}
            <Droppable
              droppableId="category-null"
              type="CHAT"
            >
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`uncategorized-chats ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                >
                  {uncategorizedChats.map((chat, index) => (
                    <ChatItem
                      key={chat.chatId}
                      chat={chat}
                      index={index}
                      onContextMenu={handleChatContextMenu}
                      setModalsState={setModalsState}
                      userPermissions={userPermissions}
                      isServerOwner={isServerOwner}
                      handleGroupChatClick={props.handleGroupChatClick}
                      selectedChat={props.selectedChat}
                      voiceChannelUsers={voiceChannelUsers[chat.chatId] || []}
                      currentUserId={userId}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* Отображаем категории */}
            {sortedCategories
              .filter(category => category.categoryId !== null)
              .map((category, index) => (
                <CategoryItem
                  key={category.categoryId}
                  category={category}
                  index={index}
                  onContextMenu={handleCategoryContextMenu}
                  handleChatContextMenu={handleChatContextMenu}
                  setModalsState={setModalsState}
                  userPermissions={userPermissions}
                  isServerOwner={isServerOwner}
                  handleGroupChatClick={props.handleGroupChatClick}
                  selectedChat={props.selectedChat}
                  voiceChannelUsers={voiceChannelUsers}
                  currentUserId={userId}
                />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default CategoriesList;