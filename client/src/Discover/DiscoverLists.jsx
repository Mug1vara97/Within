import React, { useState } from 'react';
import ServersList from './ServersList';
import ThemeManager from '../components/ThemeManager';
import './DiscoverLists.css';
import { useNavigate, useLocation } from 'react-router-dom';

const DiscoverLists = ({ onBack, userId }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeSection, setActiveSection] = useState(location.pathname.includes('/servers') ? 'servers' : 'bots');

    const handleSectionChange = (section) => {
        setActiveSection(section);
        if (section === 'servers') {
            navigate('/discover/servers');
        } else {
            navigate('/discover');
        }
    };

    return (
        <div className="discover-container">
            <div className="discover-lists">
                <div className="discover-header">
                    <div className="discover-header-content">
                        <h2 className="discover-name">Discover</h2>
                    </div>
                </div>
                <div className="discover-categories">
                    <div 
                        className={`discover-category ${activeSection === 'servers' ? 'active' : ''}`}
                        onClick={() => handleSectionChange('servers')}
                    >
                        <div className="category-icon">🌐</div>
                        <div className="category-info">
                            <h3>Servers</h3>
                        </div>
                    </div>


                    <div 
    
                    className={`discover-category ${activeSection === 'themes' ? 'active' : ''}`}
                        onClick={() => handleSectionChange('themes')}
                    >
                        <div className="category-icon">🎨</div>
                        <div className="category-info">
                            <h3>Themes</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="servers-section">
                {activeSection === 'servers' && <ServersList userId={userId} />}
                {activeSection === 'themes' && <ThemeManager />}
            </div>
        </div>
    );
};

export default DiscoverLists; 