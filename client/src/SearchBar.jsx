import React, { useState } from 'react';
import './login.css';

const SearchBar = ({ onSearchChange }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleInputChange = (event) => {
        const value = event.target.value;
        setSearchTerm(value);
        onSearchChange(value);
    };

    return (
        <div className="seacrh-header">
        <div className="search-bar">
            <input
                type="text"
                placeholder="Найти или начать беседу"
                value={searchTerm}
                onChange={handleInputChange}
                className="search-bar-input"
            />
        </div>
        </div>
    );
};

export default SearchBar;