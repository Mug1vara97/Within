import { useState, useEffect } from 'react';
import { BASE_URL } from '../config/apiConfig';

export const useUserProfile = (userId) => {
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const fetchUserProfile = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const response = await fetch(`${BASE_URL}/api/profile/${userId}/profile`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.avatar && !data.avatar.startsWith('http')) {
                        data.avatar = `${BASE_URL}${data.avatar}`;
                    }
                    setUserProfile(data);
                } else {
                    setError('Failed to fetch user profile');
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [userId]);

    return { userProfile, loading, error };
}; 