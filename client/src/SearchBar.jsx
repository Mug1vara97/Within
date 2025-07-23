import React, { useState } from 'react';
import './styles/Search.css';

const SearchBar = ({ onSearchChange, isLoading = false }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleInputChange = (event) => {
        const value = event.target.value;
        setSearchTerm(value);
        onSearchChange(value);
    };

    return (
        <div className="search-header">
        <div className={`search-bar ${isLoading ? 'loading' : ''}`}>
            <input
                type="text"
                placeholder="Найти или начать беседу"
                value={searchTerm}
                onChange={handleInputChange}
                className="search-bar-input"
                aria-label="Поиск чатов и пользователей"
                disabled={isLoading}
            />
        </div>
        </div>
    );
};

export default SearchBar;