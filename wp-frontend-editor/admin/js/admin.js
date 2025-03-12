/**
 * Admin JavaScript for WP Frontend Editor
 * Modern, interactive settings UI
 */

(function($) {
    'use strict';

    // Main admin object
    var wpfeAdmin = {
        
        /**
         * Initialize the admin functionality.
         */
        init: function() {
            this.initTabs();
            this.initSections();
            this.initToggles();
            this.initCheckboxes();
            this.initAcfFieldCards();
            this.initFieldSearch();
            this.initSave();
        },
        
        /**
         * Initialize tabbed interface.
         */
        initTabs: function() {
            $('.wpfe-admin-tab').on('click', function() {
                var tabId = $(this).data('tab');
                
                // Update active tab
                $('.wpfe-admin-tab').removeClass('active');
                $(this).addClass('active');
                
                // Show selected tab content
                $('.wpfe-admin-tab-content').removeClass('active');
                $('#' + tabId).addClass('active');
                
                // Save current tab in localStorage
                if (window.localStorage) {
                    localStorage.setItem('wpfe_active_tab', tabId);
                }
            });
            
            // Check for saved tab
            if (window.localStorage && localStorage.getItem('wpfe_active_tab')) {
                var savedTab = localStorage.getItem('wpfe_active_tab');
                $('.wpfe-admin-tab[data-tab="' + savedTab + '"]').click();
            } else {
                // Default to first tab
                $('.wpfe-admin-tab').first().click();
            }
        },
        
        /**
         * Initialize collapsible sections.
         */
        initSections: function() {
            $('.wpfe-admin-section-header').on('click', function() {
                var $section = $(this).closest('.wpfe-admin-section');
                var $content = $section.find('.wpfe-admin-section-content');
                var $toggle = $(this).find('.wpfe-admin-section-toggle');
                
                $content.slideToggle(200);
                $toggle.toggleClass('open');
                
                // Save section state
                var sectionId = $section.attr('id');
                if (window.localStorage && sectionId) {
                    var openSections = JSON.parse(localStorage.getItem('wpfe_open_sections') || '{}');
                    openSections[sectionId] = $toggle.hasClass('open');
                    localStorage.setItem('wpfe_open_sections', JSON.stringify(openSections));
                }
            });
            
            // Check for saved section states
            if (window.localStorage) {
                var openSections = JSON.parse(localStorage.getItem('wpfe_open_sections') || '{}');
                
                $.each(openSections, function(sectionId, isOpen) {
                    var $section = $('#' + sectionId);
                    
                    if ($section.length) {
                        var $content = $section.find('.wpfe-admin-section-content');
                        var $toggle = $section.find('.wpfe-admin-section-toggle');
                        
                        if (isOpen) {
                            $content.show();
                            $toggle.addClass('open');
                        } else {
                            $content.hide();
                            $toggle.removeClass('open');
                        }
                    }
                });
            }
            
            // Initially open the first section
            if ($('.wpfe-admin-section').length && !localStorage.getItem('wpfe_open_sections')) {
                $('.wpfe-admin-section').first().find('.wpfe-admin-section-content').show();
                $('.wpfe-admin-section').first().find('.wpfe-admin-section-toggle').addClass('open');
            }
        },
        
        /**
         * Initialize toggle switches.
         */
        initToggles: function() {
            // Toggle all related controls when a main toggle changes
            $('.wpfe-toggle-main').on('change', function() {
                var $related = $(this).closest('.wpfe-admin-field').next('.wpfe-toggles-group');
                
                if ($(this).is(':checked')) {
                    $related.removeClass('hidden').addClass('wpfe-fade-in');
                } else {
                    $related.addClass('hidden');
                }
            });
            
            // Initial state
            $('.wpfe-toggle-main').each(function() {
                var $related = $(this).closest('.wpfe-admin-field').next('.wpfe-toggles-group');
                
                if ($(this).is(':checked')) {
                    $related.removeClass('hidden');
                } else {
                    $related.addClass('hidden');
                }
            });
        },
        
        /**
         * Initialize checkbox behavior.
         */
        initCheckboxes: function() {
            // Initialize select all checkboxes
            $('.wpfe-select-all').on('change', function() {
                var $container = $(this).closest('.wpfe-admin-field-group');
                var $checkboxes = $container.find('.wpfe-checkbox-wrap input[type="checkbox"]');
                
                $checkboxes.prop('checked', $(this).is(':checked'));
                
                // Also select all ACF field cards
                if ($container.find('.wpfe-acf-field-card').length) {
                    if ($(this).is(':checked')) {
                        $container.find('.wpfe-acf-field-card').addClass('selected');
                    } else {
                        $container.find('.wpfe-acf-field-card').removeClass('selected');
                    }
                }
            });
            
            // Update select all state when individual checkbox changes
            $('.wpfe-checkbox-wrap input[type="checkbox"]').on('change', function() {
                var $container = $(this).closest('.wpfe-admin-field-group');
                var $selectAll = $container.find('.wpfe-select-all');
                var totalCheckboxes = $container.find('.wpfe-checkbox-wrap input[type="checkbox"]').length;
                var checkedCheckboxes = $container.find('.wpfe-checkbox-wrap input[type="checkbox"]:checked').length;
                
                $selectAll.prop('checked', totalCheckboxes === checkedCheckboxes);
                $selectAll.prop('indeterminate', checkedCheckboxes > 0 && checkedCheckboxes < totalCheckboxes);
            });
            
            // Initialize state
            $('.wpfe-admin-field-group').each(function() {
                var $selectAll = $(this).find('.wpfe-select-all');
                var totalCheckboxes = $(this).find('.wpfe-checkbox-wrap input[type="checkbox"]').length;
                var checkedCheckboxes = $(this).find('.wpfe-checkbox-wrap input[type="checkbox"]:checked').length;
                
                $selectAll.prop('checked', totalCheckboxes === checkedCheckboxes && totalCheckboxes > 0);
                $selectAll.prop('indeterminate', checkedCheckboxes > 0 && checkedCheckboxes < totalCheckboxes);
            });
        },
        
        /**
         * Initialize ACF field cards.
         */
        initAcfFieldCards: function() {
            // Toggle card selection when clicked
            $('.wpfe-acf-field-card').on('click', function(e) {
                // Don't trigger if clicking on the checkbox directly
                if ($(e.target).is('input[type="checkbox"]')) {
                    return;
                }
                
                var $checkbox = $(this).find('input[type="checkbox"]');
                $checkbox.prop('checked', !$checkbox.prop('checked'));
                $checkbox.trigger('change');
                
                $(this).toggleClass('selected');
                
                // Update select all state
                var $container = $(this).closest('.wpfe-admin-field-group');
                var $selectAll = $container.find('.wpfe-select-all');
                var totalCards = $container.find('.wpfe-acf-field-card').length;
                var selectedCards = $container.find('.wpfe-acf-field-card.selected').length;
                
                $selectAll.prop('checked', totalCards === selectedCards);
                $selectAll.prop('indeterminate', selectedCards > 0 && selectedCards < totalCards);
            });
            
            // Initialize card states
            $('.wpfe-acf-field-card').each(function() {
                var $checkbox = $(this).find('input[type="checkbox"]');
                
                if ($checkbox.prop('checked')) {
                    $(this).addClass('selected');
                } else {
                    $(this).removeClass('selected');
                }
            });
        },
        
        /**
         * Initialize field search functionality.
         */
        initFieldSearch: function() {
            $('.wpfe-search-input').on('keyup', function() {
                var searchTerm = $(this).val().toLowerCase();
                var $container = $(this).closest('.wpfe-admin-section-content');
                
                // Search ACF field cards
                $container.find('.wpfe-acf-field-card').each(function() {
                    var fieldName = $(this).find('.wpfe-field-name').text().toLowerCase();
                    var fieldType = $(this).find('.wpfe-field-type').text().toLowerCase();
                    var fieldKey = $(this).find('.wpfe-field-key').text().toLowerCase();
                    
                    if (fieldName.indexOf(searchTerm) > -1 || fieldType.indexOf(searchTerm) > -1 || fieldKey.indexOf(searchTerm) > -1) {
                        $(this).show();
                    } else {
                        $(this).hide();
                    }
                });
                
                // Search regular checkboxes
                $container.find('.wpfe-checkbox-wrap').each(function() {
                    var label = $(this).text().toLowerCase();
                    
                    if (label.indexOf(searchTerm) > -1) {
                        $(this).show();
                    } else {
                        $(this).hide();
                    }
                });
                
                // Update no results message
                var $noResults = $container.find('.wpfe-no-results');
                var hasVisibleFields = $container.find('.wpfe-acf-field-card:visible').length > 0 || 
                                      $container.find('.wpfe-checkbox-wrap:visible').length > 0;
                
                if (!hasVisibleFields && searchTerm) {
                    if (!$noResults.length) {
                        $container.append('<p class="wpfe-no-results">' + wpfe_admin.i18n.no_results + '</p>');
                    } else {
                        $noResults.show();
                    }
                } else {
                    $noResults.hide();
                }
            });
            
            // Clear search button
            $('.wpfe-search-clear').on('click', function() {
                $(this).prev('.wpfe-search-input').val('').trigger('keyup');
            });
        },
        
        /**
         * Initialize save functionality with visual feedback.
         */
        initSave: function() {
            $('.wpfe-settings-form').on('submit', function() {
                var $submitButton = $(this).find('.button-primary');
                var originalText = $submitButton.text();
                
                // Show loading state
                $submitButton.prop('disabled', true)
                    .html('<span class="wpfe-loading"></span>' + wpfe_admin.i18n.saving);
                
                // Add loading state to form
                $(this).addClass('is-saving');
                
                // Restore button after submission (in case page doesn't reload)
                setTimeout(function() {
                    $submitButton.prop('disabled', false).text(originalText);
                }, 3000);
                
                // Store scroll position for after reload
                if (window.localStorage) {
                    localStorage.setItem('wpfe_scroll_position', $(window).scrollTop());
                }
            });
            
            // Restore scroll position after page load
            if (window.localStorage && localStorage.getItem('wpfe_scroll_position')) {
                var scrollPosition = parseInt(localStorage.getItem('wpfe_scroll_position'), 10);
                
                if (!isNaN(scrollPosition)) {
                    setTimeout(function() {
                        $(window).scrollTop(scrollPosition);
                        localStorage.removeItem('wpfe_scroll_position');
                    }, 100);
                }
            }
            
            // Handle success message fadeout
            if ($('.wpfe-admin-notice').length) {
                setTimeout(function() {
                    $('.wpfe-admin-notice').fadeOut();
                }, 3000);
            }
        }
    };

    // Initialize when the DOM is ready
    $(document).ready(function() {
        wpfeAdmin.init();
    });

    // Expose to window for external access if needed
    window.wpfeAdmin = wpfeAdmin;

})(jQuery);