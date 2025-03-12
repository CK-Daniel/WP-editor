/**
 * WP Frontend Editor AJAX Module
 * Handles all communication with the server
 */

var WPFE = WPFE || {};

WPFE.ajax = (function($) {
    'use strict';

    // Private variables
    var pendingRequests = {};
    var requestQueue = [];
    var maxConcurrentRequests = 2;
    var processingQueue = false;

    // Private functions
    /**
     * Process the request queue
     */
    function processQueue() {
        if (processingQueue || requestQueue.length === 0) {
            return;
        }
        
        processingQueue = true;
        
        // Count active requests
        var activeRequests = 0;
        for (var key in pendingRequests) {
            if (pendingRequests.hasOwnProperty(key) && pendingRequests[key]) {
                activeRequests++;
            }
        }
        
        // Process as many requests as we can
        var requestsToProcess = Math.min(maxConcurrentRequests - activeRequests, requestQueue.length);
        
        if (requestsToProcess > 0) {
            for (var i = 0; i < requestsToProcess; i++) {
                var request = requestQueue.shift();
                executeRequest(request.requestKey, request.data, request.callback);
            }
        }
        
        processingQueue = false;
        
        // If there are more requests, continue processing
        if (requestQueue.length > 0) {
            processQueue();
        }
    }

    /**
     * Execute an AJAX request
     * 
     * @param {string} requestKey Unique key for this request
     * @param {Object} data The data to send
     * @param {Function} callback The callback function
     */
    function executeRequest(requestKey, data, callback) {
        pendingRequests[requestKey] = true;
        
        $.ajax({
            url: wpfe_data.ajax_url,
            type: 'POST',
            data: data,
            dataType: 'json',
            success: function(response) {
                delete pendingRequests[requestKey];
                
                if (typeof callback === 'function') {
                    callback(response);
                }
                
                // Check if we can process more items in the queue
                processQueue();
            },
            error: function(xhr, status, error) {
                delete pendingRequests[requestKey];
                
                var response = {
                    success: false,
                    message: error || wpfe_data.i18n.ajax_error || 'Unknown error'
                };
                
                // Try to parse error response if available
                if (xhr.responseText) {
                    try {
                        var errorResponse = JSON.parse(xhr.responseText);
                        if (errorResponse) {
                            response = errorResponse;
                        }
                    } catch (e) {
                        // If parsing fails, use the raw response
                        response.message = xhr.responseText;
                    }
                }
                
                if (typeof callback === 'function') {
                    callback(response);
                }
                
                if (wpfe_data.debug_mode) {
                    console.error('AJAX Error:', error, xhr);
                }
                
                // Check if we can process more items in the queue
                processQueue();
            }
        });
    }

    /**
     * Queue or execute an AJAX request
     * 
     * @param {string} action The AJAX action
     * @param {Object} additionalData Additional data to send
     * @param {Function} callback The callback function
     * @param {boolean} priority Whether to prioritize this request
     */
    function queueRequest(action, additionalData, callback, priority) {
        var data = {
            action: action,
            security: wpfe_data.nonce,
            _wpnonce: wpfe_data.nonce
        };
        
        // Merge additional data
        if (additionalData) {
            data = $.extend(data, additionalData);
        }
        
        var requestKey = action + '_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 9);
        
        var request = {
            requestKey: requestKey,
            data: data,
            callback: callback
        };
        
        // Either add to queue or execute immediately
        var activeRequests = 0;
        for (var key in pendingRequests) {
            if (pendingRequests.hasOwnProperty(key) && pendingRequests[key]) {
                activeRequests++;
            }
        }
        
        if (activeRequests < maxConcurrentRequests) {
            // Execute immediately
            executeRequest(requestKey, data, callback);
        } else {
            // Add to queue
            if (priority) {
                requestQueue.unshift(request);
            } else {
                requestQueue.push(request);
            }
            
            // Try to process queue
            processQueue();
        }
    }

    // Public API
    return {
        /**
         * Fetch field data from the server
         * 
         * @param {string} fieldName The field name
         * @param {number} postId The post ID
         * @param {Function} callback The callback function
         */
        fetchField: function(fieldName, postId, callback) {
            queueRequest('wpfe_get_fields', {
                field_names: fieldName,
                post_id: postId
            }, callback, true);
        },
        
        /**
         * Save changes to the active field
         */
        saveChanges: function() {
            var sidebar = WPFE.core.getSidebar();
            var activeField = WPFE.core.getActiveField();
            var activePostId = WPFE.core.getActivePostId();
            
            if (!activeField || !activePostId) {
                return;
            }
            
            // Show saving indicator
            sidebar.find('.wpfe-save-button').addClass('wpfe-saving')
                .html('<span class="dashicons dashicons-update-alt"></span> ' + (wpfe_data.i18n.saving || 'Saving...'));
            
            // Get field value (special handling for different field types)
            var value = WPFE.fields.getFieldValue(activeField);
            
            // Save field value
            this.saveFieldChange(activeField, activePostId, value, function(response) {
                // Reset the save button
                sidebar.find('.wpfe-save-button').removeClass('wpfe-saving')
                    .html('<span class="dashicons dashicons-saved"></span> ' + (wpfe_data.i18n.save || 'Save'));
                
                if (response.success) {
                    WPFE.events.setChangeMade(false);
                    WPFE.events.closeEditor(true);
                    
                    // Show success notification
                    WPFE.ui.showNotification((wpfe_data.i18n.save_success || 'Changes saved successfully.'), 'success');
                    
                    // Update the page content if needed
                    if (response.data && response.data.updated_content) {
                        WPFE.fields.updatePageContent(response.data.updated_content);
                    }
                } else {
                    // Show error notification
                    WPFE.ui.showNotification(response.message || (wpfe_data.i18n.save_error || 'Error saving changes.'), 'error');
                }
            });
        },
        
        /**
         * Save a field change to the server
         * 
         * @param {string} fieldName The field name
         * @param {number} postId The post ID
         * @param {*} value The new field value
         * @param {Function} callback The callback function
         */
        saveFieldChange: function(fieldName, postId, value, callback) {
            queueRequest('wpfe_save_fields', {
                post_id: postId,
                fields: {
                    [fieldName]: value
                }
            }, callback, true);
        },
        
        /**
         * Upload a media file
         * 
         * @param {File} file The file to upload
         * @param {Function} progressCallback Called with progress updates
         * @param {Function} completeCallback Called when upload completes
         */
        uploadMedia: function(file, progressCallback, completeCallback) {
            var formData = new FormData();
            formData.append('action', 'wpfe_upload_media');
            formData.append('security', wpfe_data.nonce);
            formData.append('_wpnonce', wpfe_data.nonce);
            formData.append('file', file);
            
            $.ajax({
                url: wpfe_data.ajax_url,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                xhr: function() {
                    var xhr = new window.XMLHttpRequest();
                    
                    if (xhr.upload && typeof progressCallback === 'function') {
                        xhr.upload.addEventListener('progress', function(evt) {
                            if (evt.lengthComputable) {
                                var percentComplete = (evt.loaded / evt.total) * 100;
                                progressCallback(percentComplete);
                            }
                        }, false);
                    }
                    
                    return xhr;
                },
                success: function(response) {
                    if (typeof completeCallback === 'function') {
                        completeCallback(response);
                    }
                },
                error: function(xhr, status, error) {
                    var response = {
                        success: false,
                        message: error || wpfe_data.i18n.upload_error || 'Upload failed'
                    };
                    
                    if (typeof completeCallback === 'function') {
                        completeCallback(response);
                    }
                    
                    if (wpfe_data.debug_mode) {
                        console.error('Upload Error:', error, xhr);
                    }
                }
            });
        }
    };
})(jQuery);