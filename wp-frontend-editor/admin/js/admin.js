/**
 * Admin JavaScript for WP Frontend Editor
 */

(function($) {
    'use strict';

    // Admin functions
    var wpfeAdmin = {
        
        /**
         * Initialize the admin functionality.
         */
        init: function() {
            this.initEvents();
            this.initToggleAll();
        },
        
        /**
         * Initialize event listeners.
         */
        initEvents: function() {
            // Toggle sections
            $('.wpfe-admin-section-toggle').on('click', function(e) {
                e.preventDefault();
                var $section = $(this).closest('.wpfe-admin-section').find('.wpfe-admin-section-content');
                $section.slideToggle();
                $(this).find('.dashicons').toggleClass('dashicons-arrow-down dashicons-arrow-up');
            });
            
            // Toggle all checkbox behavior
            $('.wpfe-toggle-all').on('change', function() {
                var $checkboxes = $(this).closest('.wpfe-admin-field').find('.wpfe-admin-checkbox-group input[type="checkbox"]');
                $checkboxes.prop('checked', $(this).prop('checked'));
            });
            
            // Individual checkbox behavior
            $('.wpfe-admin-checkbox-group input[type="checkbox"]').on('change', function() {
                var $group = $(this).closest('.wpfe-admin-checkbox-group');
                var $all = $group.prev().find('.wpfe-toggle-all');
                var allChecked = $group.find('input[type="checkbox"]:not(:checked)').length === 0;
                
                $all.prop('checked', allChecked);
            });
        },
        
        /**
         * Initialize toggle all checkboxes state.
         */
        initToggleAll: function() {
            $('.wpfe-toggle-all').each(function() {
                var $group = $(this).closest('.wpfe-admin-field').find('.wpfe-admin-checkbox-group');
                var allChecked = $group.find('input[type="checkbox"]:not(:checked)').length === 0;
                
                $(this).prop('checked', allChecked);
            });
        }
    };

    // Initialize when the DOM is ready
    $(document).ready(function() {
        wpfeAdmin.init();
    });

})(jQuery);