// Storage Manager Module
const StorageManager = {
    load: function() {
        const data = { viewedEvents: new Set(), favorites: new Set() };
        
        const savedViewed = localStorage.getItem('viewedEvents');
        if (savedViewed) {
            data.viewedEvents = new Set(JSON.parse(savedViewed));
        }
        
        const savedFavorites = localStorage.getItem('favorites');
        if (savedFavorites) {
            data.favorites = new Set(JSON.parse(savedFavorites));
        }
        
        return data;
    },

    save: function(viewedEvents, favorites) {
        localStorage.setItem('viewedEvents', JSON.stringify([...viewedEvents]));
        localStorage.setItem('favorites', JSON.stringify([...favorites]));
    }
};