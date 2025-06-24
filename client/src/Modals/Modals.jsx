// Modals.jsx
import React from 'react';
import AddMemberModal from './AddMemberModal';
import CreateChatModal from './CreateChatModal';
import ChatSettingsModal from './ChatSettingsModal';
import CreateCategoryModal from './CreateCategoryModal';
import DeleteCategoryModal from './DeleteCategoryModal';
import ContextMenu from './ContextMenu';
import ServerSettingsModal from './ServerSettingsModal';
import DeleteChatModal from './DeleteChatModal';

const Modals = ({
    modalsState,
    setModalsState,
    contextMenu,
    contextMenuCategory,
    contextMenuChat,
    setContextMenu,
    setContextMenuCategory,
    setContextMenuChat,
    newChatName,
    setNewChatName,
    newCategoryName,
    setNewCategoryName,
    handleAddMember,
    serverId,
    userId,
    users,
    serverMembers,
    fetchServerData,
    connection,
    setUserPermissions,
    aggregatePermissions,
    handleKickMember,
    roles,
    ...props
}) => {
    return (
        <>
            <AddMemberModal
                isOpen={modalsState.showAddMemberModal}
                onClose={() => setModalsState({...modalsState, showAddMemberModal: false})}
                serverId={serverId}
                userId={userId}
                users={users}
                handleAddMember={handleAddMember}
                fetchServerData={fetchServerData}
            />

            <DeleteChatModal
                isOpen={modalsState.showDeleteChatModal}
                onClose={() => setModalsState(prev => ({
                    ...prev, 
                    showDeleteChatModal: false
                }))}
                serverId={serverId}
                chatId={modalsState.chatToDelete?.chatId}
                chatName={modalsState.chatToDelete?.chatName}
                connection={connection}
                fetchServerData={fetchServerData}
            />
            
            <CreateChatModal
                isOpen={modalsState.showCreateChatModal.isOpen}
                onClose={() => setModalsState({...modalsState, showCreateChatModal: {isOpen: false}})}
                serverId={serverId}
                categoryId={modalsState.showCreateChatModal.categoryId}
                newChatName={newChatName}
                setNewChatName={setNewChatName}
                fetchServerData={fetchServerData}
                connection={connection}
            />
            
            <ChatSettingsModal
                isOpen={modalsState.showChatSettingsModal.isOpen}
                onClose={() => setModalsState({...modalsState, showChatSettingsModal: {isOpen: false}})}
                serverId={serverId}
                chatId={modalsState.showChatSettingsModal.chatId}
                chatName={modalsState.showChatSettingsModal.chatName}
                fetchServerData={fetchServerData}
                connection={connection}
            />
            
            <CreateCategoryModal
                isOpen={modalsState.showCreateCategoryModal}
                onClose={() => setModalsState(prev => ({ ...prev, showCreateCategoryModal: false }))}
                serverId={serverId}
                fetchServerData={fetchServerData}
                connection={connection}
                newCategoryName={newCategoryName}
                setNewCategoryName={setNewCategoryName}
                roles={roles}
            />
            
            <DeleteCategoryModal
                isOpen={modalsState.showDeleteCategoryModal}
                onClose={() => setModalsState(prev => ({
                    ...prev, 
                    showDeleteCategoryModal: false,
                    contextMenuCategory: {} // Очищаем при закрытии
                }))}
                serverId={serverId}
                categoryId={modalsState.contextMenuCategory?.categoryId}
                categoryName={modalsState.contextMenuCategory?.categoryName}
                connection={connection}
                fetchServerData={fetchServerData}
            />
            
            <ContextMenu 
                contextMenu={contextMenu}
                contextMenuCategory={contextMenuCategory}
                contextMenuChat={contextMenuChat}
                setModalsState={setModalsState}
                setContextMenu={setContextMenu}
                setContextMenuCategory={setContextMenuCategory}
                setContextMenuChat={setContextMenuChat}
                serverId={serverId}
                fetchServerData={fetchServerData}
            />
            
            {modalsState.showServerSettings && (
                <ServerSettingsModal
                    isOpen={modalsState.showServerSettings}
                    onClose={() => setModalsState(prev => ({ ...prev, showServerSettings: false }))}
                    serverId={serverId}
                    userId={userId}
                    fetchServerData={fetchServerData}
                    userPermissions={props.userPermissions}
                    isServerOwner={props.isServerOwner}
                    serverMembers={serverMembers}
                    connection={connection}
                    setUserPermissions={setUserPermissions}
                    aggregatePermissions={aggregatePermissions}
                    handleKickMember={handleKickMember}
                />
            )}
        </>
    );
};

export default Modals;