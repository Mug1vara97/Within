class VolumeStorage {
    constructor() {
        this.dbName = 'VoiceChatDB';
        this.dbVersion = 1;
        this.storeName = 'userVolumes';
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB opened successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Создаем хранилище для громкости пользователей
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'userId' });
                    store.createIndex('userId', 'userId', { unique: true });
                    console.log('Volume store created');
                }
            };
        });
    }

    async saveUserVolume(userId, volume) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.put({
                userId: userId,
                volume: volume,
                timestamp: Date.now()
            });

            request.onsuccess = () => {
                console.log(`Volume saved for user ${userId}:`, volume);
                resolve();
            };

            request.onerror = () => {
                console.error('Failed to save volume:', request.error);
                reject(request.error);
            };
        });
    }

    async getUserVolume(userId) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.get(userId);

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    console.log(`Volume loaded for user ${userId}:`, result.volume);
                    resolve(result.volume);
                } else {
                    console.log(`No saved volume found for user ${userId}, using default`);
                    resolve(100); // Значение по умолчанию
                }
            };

            request.onerror = () => {
                console.error('Failed to load volume:', request.error);
                reject(request.error);
            };
        });
    }

    async getAllUserVolumes() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.getAll();

            request.onsuccess = () => {
                const volumes = {};
                request.result.forEach(item => {
                    volumes[item.userId] = item.volume;
                });
                console.log('All user volumes loaded:', volumes);
                resolve(volumes);
            };

            request.onerror = () => {
                console.error('Failed to load all volumes:', request.error);
                reject(request.error);
            };
        });
    }

    async deleteUserVolume(userId) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.delete(userId);

            request.onsuccess = () => {
                console.log(`Volume deleted for user ${userId}`);
                resolve();
            };

            request.onerror = () => {
                console.error('Failed to delete volume:', request.error);
                reject(request.error);
            };
        });
    }

    async clearAllVolumes() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.clear();

            request.onsuccess = () => {
                console.log('All volumes cleared');
                resolve();
            };

            request.onerror = () => {
                console.error('Failed to clear volumes:', request.error);
                reject(request.error);
            };
        });
    }

    async getVolumeStats() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.getAll();

            request.onsuccess = () => {
                const stats = {
                    totalUsers: request.result.length,
                    oldestEntry: null,
                    newestEntry: null,
                    entries: request.result.map(item => ({
                        userId: item.userId,
                        volume: item.volume,
                        timestamp: new Date(item.timestamp),
                        dateString: new Date(item.timestamp).toLocaleString()
                    }))
                };

                if (request.result.length > 0) {
                    const timestamps = request.result.map(item => item.timestamp);
                    stats.oldestEntry = new Date(Math.min(...timestamps));
                    stats.newestEntry = new Date(Math.max(...timestamps));
                }

                resolve(stats);
            };

            request.onerror = () => {
                console.error('Failed to get volume stats:', request.error);
                reject(request.error);
            };
        });
    }
}

// Создаем единственный экземпляр для всего приложения
const volumeStorage = new VolumeStorage();

export default volumeStorage; 