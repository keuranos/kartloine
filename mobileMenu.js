// Mobile Menu Module
// Handles mobile hamburger menu functionality

const MobileMenu = {
    /**
     * Toggle mobile menu open/closed
     */
    toggle: function() {
        const menu = document.getElementById('mobileMenu');
        const overlay = document.getElementById('mobileMenuOverlay');

        if (menu.classList.contains('active')) {
            this.close();
        } else {
            this.open();
        }
    },

    /**
     * Open mobile menu
     */
    open: function() {
        const menu = document.getElementById('mobileMenu');
        const overlay = document.getElementById('mobileMenuOverlay');

        menu.classList.add('active');
        overlay.classList.add('active');

        // Prevent body scrolling when menu is open
        document.body.style.overflow = 'hidden';

        console.log('📱 Mobile menu opened');
    },

    /**
     * Close mobile menu
     */
    close: function() {
        const menu = document.getElementById('mobileMenu');
        const overlay = document.getElementById('mobileMenuOverlay');

        menu.classList.remove('active');
        overlay.classList.remove('active');

        // Re-enable body scrolling
        document.body.style.overflow = '';

        console.log('📱 Mobile menu closed');
    }
};

// Close menu on escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        MobileMenu.close();
    }
});
