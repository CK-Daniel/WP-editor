/**
 * WP Frontend Editor UI Module
 * Handles UI components and notifications
 */

var WPFE = WPFE || {};

WPFE.ui = (function($) {
    'use strict';

    // Private variables
    var notificationTimeout = null;
    var sidebarPositions = ['left', 'right'];
    var currentSidebarPosition = 'right';
    var isFullscreen = false;
    
    // Private functions
    /**
     * Create a notification element
     * 
     * @param {string} message The message to display
     * @param {string} type The notification type (success, error, warning, info)
     * @return {jQuery} The notification element
     */
    function createNotification(message, type) {
        type = type || 'info';
        
        // Create notification element
        var $notification = $('<div class="wpfe-notification wpfe-notification-' + type + '"></div>');
        
        // Add icon based on type
        var icon = '';
        switch (type) {
            case 'success':
                icon = 'dashicons-yes';
                break;
            case 'error':
                icon = 'dashicons-no-alt';
                break;
            case 'warning':
                icon = 'dashicons-warning';
                break;
            case 'info':
            default:
                icon = 'dashicons-info';
                break;
        }
        
        // Set notification content
        $notification.html('<span class="dashicons ' + icon + '"></span><span class="wpfe-notification-message">' + message + '</span>');
        
        // Add close button
        var $closeButton = $('<button type="button" class="wpfe-notification-close"><span class="dashicons dashicons-no-alt"></span></button>');
        $notification.append($closeButton);
        
        // Add close button event
        $closeButton.on('click', function() {
            hideNotification($notification);
        });
        
        return $notification;
    }
    
    /**
     * Hide a notification element
     * 
     * @param {jQuery} $notification The notification element
     */
    function hideNotification($notification) {
        $notification.addClass('wpfe-notification-hiding');
        
        // Remove after animation
        setTimeout(function() {
            $notification.remove();
        }, 300);
    }
    
    /**
     * Change the sidebar position
     * 
     * @param {string} position The new position (left, right)
     */
    function changeSidebarPosition(position) {
        if (sidebarPositions.indexOf(position) === -1) {
            return;
        }
        
        var sidebar = WPFE.core.getSidebar();
        
        // Remove current position class
        sidebar.removeClass('wpfe-sidebar-left wpfe-sidebar-right');
        
        // Add new position class
        sidebar.addClass('wpfe-sidebar-' + position);
        
        // Update current position
        currentSidebarPosition = position;
        
        // Store preference if possible
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('wpfe_sidebar_position', position);
            } catch (e) {
                // Ignore storage errors
            }
        }
    }
    
    /**
     * Toggle fullscreen mode for the editor sidebar
     * 
     * @param {boolean} state Whether to enable fullscreen
     */
    function toggleFullscreen(state) {
        var sidebar = WPFE.core.getSidebar();
        
        if (state === undefined) {
            state = !isFullscreen;
        }
        
        if (state) {
            sidebar.addClass('wpfe-sidebar-fullscreen');
            $('body').addClass('wpfe-fullscreen-active');
        } else {
            sidebar.removeClass('wpfe-sidebar-fullscreen');
            $('body').removeClass('wpfe-fullscreen-active');
        }
        
        isFullscreen = state;
    }
    
    // Public API
    return {
        /**
         * Initialize UI components
         */
        init: function() {
            // Create notification container if it doesn't exist
            if (!$('#wpfe-notifications').length) {
                $('body').append('<div id="wpfe-notifications"></div>');
            }
            
            // Initialize sidebar position from stored preference
            if (typeof localStorage !== 'undefined') {
                try {
                    var storedPosition = localStorage.getItem('wpfe_sidebar_position');
                    if (storedPosition && sidebarPositions.indexOf(storedPosition) !== -1) {
                        changeSidebarPosition(storedPosition);
                    }
                } catch (e) {
                    // Ignore storage errors
                }
            }
            
            // Initialize position toggle button
            var sidebar = WPFE.core.getSidebar();
            
            sidebar.on('click', '.wpfe-toggle-position', function(e) {
                e.preventDefault();
                
                // Toggle between positions
                var newPosition = currentSidebarPosition === 'right' ? 'left' : 'right';
                changeSidebarPosition(newPosition);
            });
            
            // Initialize fullscreen toggle button
            sidebar.on('click', '.wpfe-toggle-fullscreen', function(e) {
                e.preventDefault();
                toggleFullscreen();
            });
        },
        
        /**
         * Show a notification
         * 
         * @param {string} message The message to display
         * @param {string} type The notification type (success, error, warning, info)
         * @param {number} duration How long to show the notification (ms)
         */
        showNotification: function(message, type, duration) {
            // Create notification
            var $notification = createNotification(message, type);
            
            // Add to container
            $('#wpfe-notifications').append($notification);
            
            // Add visible class after a small delay (for animation)
            setTimeout(function() {
                $notification.addClass('wpfe-notification-visible');
            }, 10);
            
            // Set timeout to hide notification
            if (duration !== 0) {
                duration = duration || 5000;
                
                // Clear previous timeout
                if (notificationTimeout) {
                    clearTimeout(notificationTimeout);
                }
                
                notificationTimeout = setTimeout(function() {
                    hideNotification($notification);
                    notificationTimeout = null;
                }, duration);
            }
            
            return $notification;
        },
        
        /**
         * Change the sidebar position
         * 
         * @param {string} position The new position (left, right)
         */
        changeSidebarPosition: changeSidebarPosition,
        
        /**
         * Toggle fullscreen mode for the editor sidebar
         * 
         * @param {boolean} state Whether to enable fullscreen
         */
        toggleFullscreen: toggleFullscreen
    };
})(jQuery);