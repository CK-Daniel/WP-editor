/**
 * WP Frontend Editor Events Module
 * Handles all event bindings and interactions
 */

var WPFE = WPFE || {};

WPFE.events = (function($) {
    'use strict';
    
    // Mark this module as loaded
    WPFE.modulesReady.events = true;
    if (WPFE.debug && WPFE.debug.modulesLoaded) {
        WPFE.debug.modulesLoaded.push('events');
    }

    // Private variables
    var activeField = null;
    var activePostId = null;
    var fieldEditing = false;
    var changeMade = false;
    var userIsActive = true;
    var mouseX = 0;
    var mouseY = 0;
    var touchStartX = 0;
    var touchStartY = 0;
    var touchEndX = 0;
    var touchEndY = 0;
    var touchTimeout = null;
    var overlayActive = false;
    var historyStack = [];

    // Private functions
    /**
     * Helper function to show error in sidebar consistently
     * 
     * @param {jQuery} sidebar The sidebar element
     * @param {string} errorMessage The main error message
     * @param {string} detailsMessage Optional details message
     */
    function showSidebarError(sidebar, errorMessage, detailsMessage) {
        // Make sure we update the correct element
        var $sidebarContent = sidebar.find('.wpfe-editor-sidebar-content');
        if (!$sidebarContent.length) {
            $sidebarContent = sidebar;
        }
        
        // Prepare error HTML
        var errorHtml = 
            '<div class="wpfe-error">' +
            '<p>' + (errorMessage || 'Unknown error') + '</p>';
            
        if (detailsMessage) {
            errorHtml += '<p class="wpfe-error-details">' + detailsMessage + '</p>';
        }
        
        errorHtml += 
            '<div class="wpfe-error-actions">' +
            '<button type="button" class="wpfe-close-button button">' + 
            (wpfe_data.i18n.close || 'Close') + '</button>' +
            '</div></div>';
            
        $sidebarContent.html(errorHtml);
        
        // Ensure error button is visible
        sidebar.find('.wpfe-close-button').show();
        
        // Log error to console for debugging
        console.error('Sidebar error:', errorMessage);
    }
    
    /**
     * Open the editor sidebar for a specific field.
     * 
     * @param {string} fieldName The field name to edit.
     * @param {number} postId The post ID.
     */
    function openEditor(fieldName, postId) {
        try {
            // Input validation
            if (!fieldName) {
                console.error('Cannot open editor: No field name provided');
                return false;
            }
            
            if (!postId && !(postId = wpfe_data.post_id)) {
                console.error('Cannot open editor: No post ID provided or found in wpfe_data');
                return false;
            }
            
            // Check if editor is already open
            if (WPFE.core.isEditingActive()) {
                if (wpfe_data.debug_mode) {
                    console.log('Editor is already active, not opening another instance');
                }
                return false;
            }
            
            // Get sidebar and overlay elements
            var sidebar, overlay;
            try {
                sidebar = WPFE.core.getSidebar();
                overlay = WPFE.core.getOverlay();
            } catch (e) {
                console.error('Cannot open editor: Error getting UI elements:', e);
                
                // Last-resort emergency element creation
                if (!$('#wpfe-editor-sidebar').length) {
                    console.warn('Creating emergency sidebar elements in openEditor');
                    $('body').append('<div id="wpfe-editor-sidebar" class="wpfe-editor-sidebar" style="display:none;"></div>');
                    $('body').append('<div id="wpfe-editor-overlay" class="wpfe-editor-overlay" style="display:none;"></div>');
                    
                    // Try again
                    try {
                        sidebar = WPFE.core.getSidebar();
                        overlay = WPFE.core.getOverlay();
                    } catch (e2) {
                        console.error('Fatal error: Cannot create UI elements:', e2);
                        return false;
                    }
                }
            }
            
            // Verify required elements exist
            if (!sidebar || !sidebar.length) {
                console.error('Cannot open editor: Sidebar element not found');
                // Create emergency sidebar
                $('body').append('<div id="wpfe-editor-sidebar" class="wpfe-editor-sidebar" style="display:none;position:fixed;right:0;top:0;width:400px;height:100%;background:#fff;z-index:999999;"></div>');
                sidebar = $('#wpfe-editor-sidebar');
                if (!sidebar.length) {
                    return false;
                }
            }
            
            if (!overlay || !overlay.length) {
                console.error('Cannot open editor: Overlay element not found');
                // Create emergency overlay
                $('body').append('<div id="wpfe-editor-overlay" class="wpfe-editor-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:999998;"></div>');
                overlay = $('#wpfe-editor-overlay');
                if (!overlay.length) {
                    return false;
                }
            }
            
            // Update state
            WPFE.core.setEditingState(true);
            WPFE.core.setActiveField(fieldName);
            WPFE.core.setActivePostId(postId);
            
            // Show overlay with graceful fallback if animation fails
            try {
                overlay.fadeIn(200, function() {
                    overlayActive = true;
                });
            } catch (e) {
                overlay.show();
                overlayActive = true;
                console.warn('Overlay animation failed, using direct show() method');
            }
            
            // Add active class to body
            $('body').addClass('wpfe-editor-active');
            
            // Adjust sidebar position responsively
            adjustSidebarForScreenSize(sidebar);
            
            // Show the sidebar with animation and fallback
            try {
                // Force reset of all critical CSS properties to ensure visibility
                sidebar.addClass('wpfe-sidebar-active')
                      .addClass('is-active')
                      .css({
                          'display': 'flex',
                          'transform': 'translateX(0) !important',
                          'opacity': '1',
                          'visibility': 'visible',
                          'right': '0',
                          'position': 'fixed',
                          'z-index': '999999'
                      })
                      .show();
                
                // More aggressive transform reset with timeout
                setTimeout(function() {
                    sidebar.css('transform', 'none !important');
                }, 10);
                
                // Debug sidebar visibility
                console.log('Sidebar visibility state:', {
                    'is-visible': sidebar.is(':visible'),
                    'display': sidebar.css('display'),
                    'width': sidebar.css('width'),
                    'height': sidebar.css('height'),
                    'right': sidebar.css('right'),
                    'transform': sidebar.css('transform'),
                    'z-index': sidebar.css('z-index'),
                    'classes': sidebar.attr('class')
                });
            } catch (e) {
                // If animation approach fails, use direct CSS manipulation
                sidebar.addClass('wpfe-sidebar-active').addClass('is-active')
                       .attr('style', 'display: flex !important; transform: none !important; right: 0 !important; opacity: 1 !important; visibility: visible !important; position: fixed !important; z-index: 999999 !important;')
                       .show();
                console.warn('Sidebar animation failed, using direct style attribute method');
            }
            
            // Set sidebar title with safe text handling
            var safeFieldName = WPFE.utils.escapeHTML(fieldName);
            sidebar.find('.wpfe-sidebar-title').text(
                WPFE.utils.formatString(wpfe_data.i18n.editing_field || 'Editing: {0}', safeFieldName)
            );
            
            // Show loading state - make sure we update the correct element
            var $sidebarContent = sidebar.find('.wpfe-editor-sidebar-content');
            if (!$sidebarContent.length) {
                console.error('Could not find sidebar content container');
                $sidebarContent = sidebar;
            }
            
            // Clear any previous content and show loading indicator
            // Make sure we use the correct loading class name matching the CSS
            $sidebarContent.html(
                '<div class="wpfe-editor-sidebar-loading">' +
                '<div class="wpfe-editor-loading-spinner">' +
                '<div class="wpfe-spinner-dot"></div>' +
                '<div class="wpfe-spinner-dot"></div>' +
                '<div class="wpfe-spinner-dot"></div>' +
                '</div>' +
                '<p>' + (wpfe_data.i18n.loading || 'Loading...') + '</p>' +
                '<div class="wpfe-loading-details">Fetching field data...</div>' +
                '</div>'
            );
            
            WPFE.ajax.fetchField(fieldName, postId, function(response) {
                try {
                    // Handle unsuccessful response
                    if (!response || !response.success) {
                        var errorMessage = response && response.data && response.data.message ? 
                            response.data.message : 'Unknown error loading field';
                        
                        // Use our helper function for showing errors in sidebar
                        showSidebarError(sidebar, errorMessage, 'Please try again or contact the site administrator if this problem persists.');
                        console.error('Error loading field:', errorMessage, response);
                        return;
                    }
                    
                    // Store original values for tracking changes
                    if (response.data) {
                        WPFE.core.setOriginalValue(fieldName, response.data.value);
                    } else {
                        console.warn('No data in successful response for field:', fieldName);
                    }
                    
                    // Render field in the sidebar
                    WPFE.fields.renderField(fieldName, response);
                    
                    // Initialize field-specific handlers
                    WPFE.fields.initFieldHandlers(fieldName, response);
                    
                    // Focus the first input
                    setTimeout(function() {
                        sidebar.find('input:visible, textarea:visible').first().focus();
                    }, 100);
                    
                    // Add active class to the element being edited
                    var $editableElement = $('[data-wpfe-field="' + fieldName + '"][data-wpfe-post-id="' + postId + '"]');
                    if ($editableElement.length) {
                        $editableElement.addClass('wpfe-currently-editing');
                    }
                    
                    // Track this edit in history
                    trackFieldEdit(fieldName, postId);
                } catch (err) {
                    console.error('Error processing field data:', err);
                    
                    // Use our helper function for showing errors in sidebar
                    showSidebarError(sidebar, 'Error rendering field editor', 'Technical details: ' + err.message);
                }
            });
            
            return true;
        } catch (err) {
            console.error('Critical error opening editor:', err);
            // Try to clean up state
            WPFE.core.setEditingState(false);
            $('body').removeClass('wpfe-editor-active');
            $('.wpfe-currently-editing').removeClass('wpfe-currently-editing');
            return false;
        }
    }
    
    /**
     * Adjust sidebar position based on screen size
     * @param {jQuery} sidebar The sidebar element
     */
    function adjustSidebarForScreenSize(sidebar) {
        if ($(window).width() < 768) {
            sidebar.css({
                'bottom': '0',
                'right': '0',
                'top': 'auto',
                'height': '80%',
                'width': '100%'
            });
        } else {
            // For larger screens, use default positioning or adjust based on screen size
            var screenWidth = $(window).width();
            var sidebarWidth = parseInt(wpfe_data.sidebar_width) || 400;
            
            // For medium screens, make sidebar narrower
            if (screenWidth < 1200 && screenWidth >= 768) {
                sidebarWidth = Math.min(sidebarWidth, Math.floor(screenWidth * 0.4));
            }
            
            sidebar.css({
                'top': '',
                'right': '',
                'bottom': '',
                'height': '',
                'width': sidebarWidth + 'px'
            });
        }
    }

    /**
     * Close the editor sidebar and cleanup.
     * 
     * @param {boolean} saveChanges Whether to save changes before closing.
     */
    function closeEditor(saveChanges) {
        if (!WPFE.core.isEditingActive()) {
            return;
        }
        
        var sidebar = WPFE.core.getSidebar();
        var overlay = WPFE.core.getOverlay();
        var activeField = WPFE.core.getActiveField();
        var activePostId = WPFE.core.getActivePostId();
        
        // Prompt user if there are unsaved changes
        if (saveChanges === undefined && changeMade) {
            if (confirm(wpfe_data.i18n.unsaved_changes || 'You have unsaved changes. Do you want to save them?')) {
                saveChanges = true;
            } else {
                saveChanges = false;
            }
        }
        
        // Save changes if requested
        if (saveChanges) {
            WPFE.ajax.saveChanges();
        } else {
            // Revert any changes to original values
            var $editableElement = $('[data-wpfe-field="' + activeField + '"][data-wpfe-post-id="' + activePostId + '"]');
            
            // If field type has a preview update, call the reverter function
            var fieldType = $editableElement.attr('data-wpfe-field-type') || '';
            
            // Restore original content if available
            var originalValues = WPFE.core.getOriginalValues();
            if (originalValues[activeField]) {
                WPFE.fields.updatePreview($editableElement, activeField, originalValues[activeField], fieldType);
            }
        }
        
        // Reset active classes
        $('body').removeClass('wpfe-editor-active');
        $('.wpfe-currently-editing').removeClass('wpfe-currently-editing');
        
        // Hide sidebar with animation
        sidebar.removeClass('wpfe-sidebar-active');
        setTimeout(function() {
            sidebar.hide();
        }, 300);
        
        // Hide overlay
        overlay.fadeOut(200);
        overlayActive = false;
        
        // Reset state
        WPFE.core.setEditingState(false);
        WPFE.core.setActiveField(null);
        WPFE.core.setActivePostId(null);
        changeMade = false;
        
        // Clear Tiny MCE editor instances if present
        if (typeof tinymce !== 'undefined') {
            var editorId = 'wpfe-editor-wysiwyg';
            if (tinymce.get(editorId)) {
                tinymce.get(editorId).remove();
            }
        }
        
        // Trigger event
        $(document).trigger('wpfe:editor_closed');
    }

    /**
     * Track field edits in history stack
     * 
     * @param {string} fieldName The field being edited
     * @param {number} postId The post ID
     */
    function trackFieldEdit(fieldName, postId) {
        var now = new Date();
        historyStack.push({
            field: fieldName,
            post: postId,
            time: now.getTime()
        });
        
        // Limit history size
        if (historyStack.length > 20) {
            historyStack.shift();
        }
    }

    /**
     * Initialize keyboard shortcuts
     */
    function initKeyboardShortcuts() {
        $(document).on('keydown', function(e) {
            // Only process if user is editing
            if (!WPFE.core.isEditingActive()) {
                return;
            }
            
            // Escape key to close editor
            if (e.keyCode === 27) { // ESC key
                closeEditor(false);
                e.preventDefault();
            }
            
            // Ctrl+S / Cmd+S to save
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 83) { // Ctrl/Cmd + S
                WPFE.ajax.saveChanges();
                closeEditor(true);
                e.preventDefault();
            }
        });
    }

    // Public API
    return {
        /**
         * Initialize the events handling.
         */
        init: function() {
            var self = this;
            
            // Initialize event tracking variables
            var sidebar = WPFE.core.getSidebar();
            var overlay = WPFE.core.getOverlay();
            var editButtons = WPFE.core.getEditButtons();
            
            // Track mouse position for positioning
            $(document).on('mousemove', function(e) {
                mouseX = e.pageX;
                mouseY = e.pageY;
            });
            
            // Debug log for events initialization
            console.log('WPFE Events initializing... Found ' + $('.wpfe-edit-button').length + ' edit buttons.');
            
            // Add click handlers with improved error handling and user feedback
            $(document).off('click', '.wpfe-edit-button').on('click', '.wpfe-edit-button', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    var $button = $(this);
                    var fieldName = $button.data('wpfe-field');
                    var postId = $button.data('wpfe-post-id');
                    
                    if (!fieldName) {
                        if (wpfe_data.debug_mode) {
                            console.error('Edit button clicked but no field name found');
                        }
                        return;
                    }
                    
                    if (wpfe_data.debug_mode) {
                        console.log('Edit button clicked: ', fieldName, postId);
                    }
                    
                    // Highlight the editable element
                    $('.wpfe-editable').removeClass('wpfe-currently-editing');
                    var $editableElement = $('[data-wpfe-field="' + fieldName + '"][data-wpfe-post-id="' + postId + '"]');
                    
                    if ($editableElement.length) {
                        $editableElement.addClass('wpfe-currently-editing');
                        
                        // Add visual feedback that the button was clicked
                        $button.addClass('wpfe-button-clicked');
                        setTimeout(function() {
                            $button.removeClass('wpfe-button-clicked');
                        }, 300);
                        
                        if (wpfe_data.debug_mode) {
                            console.log('Found editable element for: ', fieldName);
                        }
                    } else {
                        console.warn('No editable element found for: ', fieldName);
                        return; // Don't proceed if element not found
                    }
                    
                    // Open the editor with error handling
                    var result = openEditor(fieldName, postId);
                    
                    if (wpfe_data.debug_mode) {
                        console.log('Editor opened: ', result);
                    }
                } catch (err) {
                    console.error('Error handling edit button click:', err);
                }
            });
            
            // Also add a direct handler to editable elements with improved interaction
            $(document).off('click', '.wpfe-editable').on('click', '.wpfe-editable', function(e) {
                try {
                    // Skip if we clicked on the button itself or any interactive element
                    if ($(e.target).closest('.wpfe-edit-button, a, button, input, select, textarea').length) {
                        return;
                    }
                    
                    // Skip if we're in a content editable area
                    if ($(e.target).closest('[contenteditable="true"]').length) {
                        return;
                    }
                    
                    // Open editor for this element
                    var $editable = $(this);
                    var fieldName = $editable.data('wpfe-field');
                    var postId = $editable.data('wpfe-post-id');
                    
                    if (fieldName && postId) {
                        // Add visual feedback
                        $editable.addClass('wpfe-element-clicked');
                        setTimeout(function() {
                            $editable.removeClass('wpfe-element-clicked');
                        }, 300);
                        
                        if (wpfe_data.debug_mode) {
                            console.log('Editable element clicked: ', fieldName, postId);
                        }
                        
                        openEditor(fieldName, postId);
                    }
                } catch (err) {
                    console.error('Error handling editable element click:', err);
                }
            });
            
            // Close button click
            sidebar.on('click', '.wpfe-close-button', function(e) {
                e.preventDefault();
                closeEditor();
            });
            
            // Save button click
            sidebar.on('click', '.wpfe-save-button', function(e) {
                e.preventDefault();
                WPFE.ajax.saveChanges();
                closeEditor(true);
            });
            
            // Overlay click to close
            overlay.on('click', function(e) {
                // Only close if clicked directly on the overlay, not on its children
                if (e.target === overlay[0]) {
                    closeEditor();
                }
            });
            
            // Field change events
            sidebar.on('change input', 'input, textarea, select', function() {
                changeMade = true;
                
                // Update the preview if this is a simple field
                var $input = $(this);
                var fieldName = WPFE.core.getActiveField();
                var fieldType = $input.closest('[data-wpfe-field-type]').data('wpfe-field-type') || '';
                
                // Only update preview for simple inputs that aren't part of complex fields
                if ($input.attr('id') === 'wpfe-field-value' && 
                    !$input.closest('.wpfe-complex-field').length) {
                    
                    var value = $input.val();
                    var $editableElement = $('[data-wpfe-field="' + fieldName + '"][data-wpfe-post-id="' + WPFE.core.getActivePostId() + '"]');
                    
                    // Update the preview with the new value
                    WPFE.fields.updatePreview($editableElement, fieldName, value, fieldType);
                }
            });
            
            // Track TinyMCE changes
            $(document).on('tinymce-editor-init', function(event, editor) {
                if (editor.id.indexOf('wpfe-editor') === 0) {
                    editor.on('change', function() {
                        changeMade = true;
                    });
                }
            });
            
            // Initialize keyboard shortcuts
            initKeyboardShortcuts();
            
            // Track user activity
            $(document).on('mousemove keydown click', function() {
                userIsActive = true;
            });
            
            // Handle touch events for better mobile support
            $(document).on('touchstart', function(e) {
                if (e.originalEvent.touches && e.originalEvent.touches.length) {
                    touchStartX = e.originalEvent.touches[0].pageX;
                    touchStartY = e.originalEvent.touches[0].pageY;
                    
                    // Clear any existing timeout
                    if (touchTimeout) {
                        clearTimeout(touchTimeout);
                    }
                    
                    // Set a timeout to detect long press
                    touchTimeout = setTimeout(function() {
                        // Check if touch hasn't moved significantly (long press)
                        var target = $(e.target).closest('.wpfe-editable');
                        if (target.length && !overlayActive) {
                            var fieldName = target.data('wpfe-field');
                            var postId = target.data('wpfe-post-id');
                            
                            if (fieldName && postId) {
                                openEditor(fieldName, postId);
                            }
                        }
                    }, 800);
                }
            });
            
            $(document).on('touchend', function(e) {
                if (touchTimeout) {
                    clearTimeout(touchTimeout);
                }
                
                if (e.originalEvent.changedTouches && e.originalEvent.changedTouches.length) {
                    touchEndX = e.originalEvent.changedTouches[0].pageX;
                    touchEndY = e.originalEvent.changedTouches[0].pageY;
                }
            });
            
            $(document).on('touchmove', function() {
                // Cancel long press detection on move
                if (touchTimeout) {
                    clearTimeout(touchTimeout);
                }
            });
            
            // Trigger event when events are initialized
            $(document).trigger('wpfe:events_initialized');
        },
        
        // Expose private functions that need to be accessible
        openEditor: openEditor,
        closeEditor: closeEditor,
        setChangeMade: function(state) {
            changeMade = state;
        },
        hasChanges: function() {
            return changeMade;
        }
    };
})(jQuery);