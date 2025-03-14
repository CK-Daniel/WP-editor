/**
 * WP Frontend Editor - Element Core Module
 * Handles core functionality for element operations
 */

(function($, WPFE) {
    'use strict';

    // Initialize the elements module in the WPFE namespace
    WPFE.elements = WPFE.elements || {};
    
    // Store discovered elements for reference
    var discoveredElements = [];
    var elementCount = 0;
    
    /**
     * Initialize the elements module
     */
    WPFE.elements.init = function() {
        WPFE.debug.log('Elements core module initialized');
        return true;
    };
    
    /**
     * Store a discovered element for reference
     * 
     * @param {Object} element jQuery element object
     * @param {string} fieldName Field name identifier
     * @param {string} fieldType Field type (acf, native, taxonomy, etc)
     * @param {number} postId Post ID
     * @param {number} confidence Confidence score (0-1) for detection accuracy
     * @return {number} The element index for reference
     */
    WPFE.elements.storeElement = function(element, fieldName, fieldType, postId, confidence) {
        var elementData = {
            element: element,
            fieldName: fieldName,
            fieldType: fieldType || 'unknown',
            postId: postId || wpfe_data.post_id,
            confidence: confidence || 0.5,
            index: elementCount
        };
        
        discoveredElements.push(elementData);
        elementCount++;
        
        return elementCount - 1;
    };
    
    /**
     * Get all discovered elements
     * 
     * @return {Array} Array of discovered elements
     */
    WPFE.elements.getDiscoveredElements = function() {
        return discoveredElements;
    };
    
    /**
     * Get the count of discovered elements
     * 
     * @return {number} Count of elements
     */
    WPFE.elements.getElementCount = function() {
        return elementCount;
    };
    
    /**
     * Reset all discovered elements
     */
    WPFE.elements.resetElements = function() {
        discoveredElements = [];
        elementCount = 0;
    };
    
    /**
     * Add necessary data attributes to an element
     * 
     * @param {Object} $element jQuery element object
     * @param {string} fieldName Field name
     * @param {string} fieldType Field type
     * @param {number} postId Post ID
     */
    WPFE.elements.prepareElement = function($element, fieldName, fieldType, postId) {
        // Add basic class and data attributes
        $element.addClass('wpfe-editable');
        $element.attr('data-wpfe-field', fieldName);
        $element.attr('data-wpfe-post-id', postId || wpfe_data.post_id);
        
        if (fieldType) {
            $element.attr('data-wpfe-field-type', fieldType);
        }
        
        // Label for human-readable display
        var fieldLabel = WPFE.elements.getFieldLabel(fieldName);
        $element.attr('data-wpfe-field-label', fieldLabel);
        
        return $element;
    };
    
    /**
     * Get a human-readable label for a field
     * 
     * @param {string} fieldName Field name
     * @return {string} Human-readable label
     */
    WPFE.elements.getFieldLabel = function(fieldName) {
        // Handle core WordPress fields
        if (fieldName === 'post_title') {
            return 'Title';
        } else if (fieldName === 'post_content') {
            return 'Content';
        } else if (fieldName === 'post_excerpt') {
            return 'Excerpt';
        } else if (fieldName === 'featured_image') {
            return 'Featured Image';
        }
        
        // Handle ACF fields
        if (fieldName.indexOf('acf_') === 0) {
            // Remove acf_ prefix and convert underscores to spaces
            return fieldName.replace('acf_', '').replace(/_/g, ' ');
        }
        
        // For other fields, just make the name more readable
        return fieldName.replace(/_/g, ' ');
    };

    // Register this module as ready
    WPFE.modulesReady['element-core'] = true;
    
})(jQuery, WPFE);