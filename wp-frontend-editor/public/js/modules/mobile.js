/**
 * WP Frontend Editor Mobile Module
 * Handles mobile-specific functionality
 */

var WPFE = WPFE || {};

WPFE.mobile = (function($) {
    'use strict';
    
    // Mark this module as loaded
    WPFE.modulesReady.mobile = true;
    if (WPFE.debug && WPFE.debug.modulesLoaded) {
        WPFE.debug.modulesLoaded.push('mobile');
    }

    // Private variables
    var isMobileDevice = false;
    var isMenuOpen = false;
    var touchStartX = 0;
    var touchStartY = 0;
    var touchEndX = 0;
    var touchEndY = 0;
    var dragThreshold = 30;

    // Private functions
    /**
     * Check if the current device is mobile
     * 
     * @return {boolean} Whether the device is mobile
     */
    function detectMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    /**
     * Handle a swipe gesture
     * 
     * @param {number} distanceX Horizontal swipe distance
     * @param {number} distanceY Vertical swipe distance
     */
    function handleSwipe(distanceX, distanceY) {
        // Only handle horizontal swipes that are larger than the threshold
        if (Math.abs(distanceX) < dragThreshold || Math.abs(distanceY) > Math.abs(distanceX)) {
            return;
        }
        
        var sidebar = WPFE.core.getSidebar();
        
        // Check if we're currently editing
        if (WPFE.core.isEditingActive()) {
            // Handle swipe to close sidebar
            if ((distanceX > 0 && sidebar.hasClass('wpfe-sidebar-right')) || 
                (distanceX < 0 && sidebar.hasClass('wpfe-sidebar-left'))) {
                
                WPFE.events.closeEditor();
            }
        }
    }
    
    /**
     * Initialize touch events for better mobile support
     */
    function initTouchEvents() {
        // Track touch start position
        $(document).on('touchstart', function(e) {
            if (e.originalEvent.touches && e.originalEvent.touches.length) {
                touchStartX = e.originalEvent.touches[0].pageX;
                touchStartY = e.originalEvent.touches[0].pageY;
            }
        });
        
        // Track touch end position and handle swipe
        $(document).on('touchend', function(e) {
            if (e.originalEvent.changedTouches && e.originalEvent.changedTouches.length) {
                touchEndX = e.originalEvent.changedTouches[0].pageX;
                touchEndY = e.originalEvent.changedTouches[0].pageY;
                
                // Calculate distance
                var distanceX = touchEndX - touchStartX;
                var distanceY = touchEndY - touchStartY;
                
                // Handle swipe
                handleSwipe(distanceX, distanceY);
            }
        });
    }
    
    /**
     * Toggle the mobile menu
     * 
     * @param {boolean} state Whether to open the menu
     */
    function toggleMobileMenu(state) {
        var $menu = $('#wpfe-mobile-menu');
        
        if (state === undefined) {
            state = !isMenuOpen;
        }
        
        if (state) {
            $menu.addClass('wpfe-mobile-menu-open');
            $('body').addClass('wpfe-mobile-menu-active');
        } else {
            $menu.removeClass('wpfe-mobile-menu-open');
            $('body').removeClass('wpfe-mobile-menu-active');
        }
        
        isMenuOpen = state;
    }
    
    /**
     * Adjust the element sizes for mobile view
     */
    function adjustElementSizes() {
        var sidebar = WPFE.core.getSidebar();
        
        // Only adjust if we're on mobile
        if (!isMobileDevice || !WPFE.core.isEditingActive()) {
            return;
        }
        
        // Check window size
        if ($(window).width() < 768) {
            // Mobile view
            sidebar.css({
                'bottom': '0',
                'right': '0',
                'top': 'auto',
                'height': '80%',
                'width': '100%'
            });
        } else {
            // Reset to default
            sidebar.css({
                'top': '',
                'right': '',
                'bottom': '',
                'height': '',
                'width': ''
            });
        }
    }
    
    // Public API
    return {
        /**
         * Initialize mobile-specific features
         */
        init: function() {
            // Detect mobile device
            isMobileDevice = detectMobileDevice();
            
            if (isMobileDevice) {
                $('body').addClass('wpfe-mobile-device');
                
                // Initialize mobile features
                initTouchEvents();
                
                // Create mobile menu if it doesn't exist
                if ($('#wpfe-mobile-menu').length === 0) {
                    var $menu = $('<div id="wpfe-mobile-menu" class="wpfe-mobile-menu"></div>');
                    var $toggle = $('<button type="button" id="wpfe-mobile-menu-toggle" class="wpfe-mobile-menu-toggle"><span class="dashicons dashicons-edit"></span></button>');
                    
                    $('body').append($menu);
                    $('body').append($toggle);
                    
                    // Add toggle event
                    $toggle.on('click', function(e) {
                        e.preventDefault();
                        toggleMobileMenu();
                    });
                    
                    // Add menu items
                    $menu.html('<ul class="wpfe-mobile-menu-items"></ul>');
                    
                    // Populate menu with editable elements
                    this.updateMobileMenu();
                }
                
                // Listen for window resize
                $(window).on('resize', WPFE.utils.debounce(function() {
                    adjustElementSizes();
                }, 250));
                
                // Listen for orientation change
                $(window).on('orientationchange', function() {
                    adjustElementSizes();
                });
            }
        },
        
        /**
         * Update the mobile menu with editable elements
         */
        updateMobileMenu: function() {
            if (!isMobileDevice) {
                return;
            }
            
            var $menuItems = $('#wpfe-mobile-menu .wpfe-mobile-menu-items');
            
            if ($menuItems.length) {
                $menuItems.empty();
                
                // Find all editable elements
                $('.wpfe-editable').each(function() {
                    var $element = $(this);
                    var fieldName = $element.data('wpfe-field');
                    var postId = $element.data('wpfe-post-id');
                    
                    if (fieldName && postId) {
                        var displayName = fieldName.replace(/_/g, ' ');
                        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
                        
                        // Create menu item
                        var $item = $('<li class="wpfe-mobile-menu-item" data-wpfe-field="' + fieldName + '" data-wpfe-post-id="' + postId + '">' +
                                     '<span class="dashicons dashicons-edit"></span> ' + displayName +
                                     '</li>');
                        
                        // Add click event
                        $item.on('click', function() {
                            WPFE.events.openEditor(fieldName, postId);
                            toggleMobileMenu(false);
                        });
                        
                        $menuItems.append($item);
                    }
                });
            }
        },
        
        /**
         * Toggle the mobile menu
         * 
         * @param {boolean} state Whether to open the menu
         */
        toggleMobileMenu: toggleMobileMenu,
        
        /**
         * Check if the current device is mobile
         * 
         * @return {boolean} Whether the device is mobile
         */
        isMobileDevice: function() {
            return isMobileDevice;
        }
    };
})(jQuery);