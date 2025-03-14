/**
 * WP Frontend Editor - ACF Element Detection Module
 * Handles finding ACF fields in the DOM
 */

(function($, WPFE) {
    'use strict';

    // Initialize the ACF detection functionality in the elements namespace
    WPFE.elements = WPFE.elements || {};
    
    /**
     * Find Advanced Custom Fields in the document
     * 
     * @return {number} Number of ACF fields found
     */
    WPFE.elements.findAcfFields = function() {
        // Skip if ACF is not active
        if (!wpfe_data.is_acf_active) {
            return 0;
        }
        
        var count = 0;
        
        // Common ACF field selectors
        var acfSelectors = [
            '.acf-field',
            '.acf-block-fields',
            '[class*="acf-field-"]',
            '[data-field_name]',
            '[data-name]',
            '[data-key*="field_"]'
        ];
        
        // Try to find ACF fields
        $(acfSelectors.join(',')).each(function() {
            var $element = $(this);
            
            // Skip if already processed
            if ($element.hasClass('wpfe-editable') || $element.find('.wpfe-edit-button').length > 0) {
                return;
            }
            
            // Try to determine the field name
            var fieldName = WPFE.elements.getAcfFieldName($element);
            
            if (fieldName) {
                // Use 'acf_' prefix to indicate an ACF field
                var fullFieldName = 'acf_' + fieldName;
                
                WPFE.elements.storeElement($element, fullFieldName, 'acf', wpfe_data.post_id, 0.9);
                WPFE.elements.addEditButton($element, fullFieldName, wpfe_data.post_id);
                count++;
                
                if (wpfe_data.debug_mode) {
                    console.log('[WPFE] Found ACF field: ' + fieldName);
                }
            }
        });
        
        // Look for ACF fields that don't have the standard markers
        // This uses content matching against known ACF values
        if (wpfe_data.page_content) {
            for (var field in wpfe_data.page_content) {
                if (wpfe_data.page_content.hasOwnProperty(field) && field.indexOf('acf_') === 0) {
                    var content = wpfe_data.page_content[field];
                    
                    // Skip empty content
                    if (!content || content.length < 3) {
                        continue;
                    }
                    
                    // Normalize content for comparison
                    var normalizedContent = WPFE.elements.normalizeText(content);
                    
                    // Try to find matching elements
                    $('div, p, h1, h2, h3, h4, h5, h6, span').not('.wpfe-editable').each(function() {
                        var $element = $(this);
                        var elementText = $element.text();
                        
                        // Skip elements that already have edit buttons or are too short
                        if ($element.find('.wpfe-edit-button').length > 0 || elementText.length < 3) {
                            return;
                        }
                        
                        // Normalize element text
                        var normalizedElementText = WPFE.elements.normalizeText(elementText);
                        
                        // Calculate similarity
                        var similarity = WPFE.elements.calculateTextSimilarity(normalizedContent, normalizedElementText);
                        
                        // If match is close enough, add the element
                        // Use a lower threshold for ACF fields
                        if (similarity >= 0.25) {
                            WPFE.elements.storeElement($element, field, 'acf_content_match', wpfe_data.post_id, similarity);
                            WPFE.elements.addEditButton($element, field, wpfe_data.post_id);
                            count++;
                            
                            if (wpfe_data.debug_mode) {
                                console.log('[WPFE] ACF content match found for ' + field + ' with similarity ' + similarity);
                            }
                        }
                    });
                }
            }
        }
        
        return count;
    };
    
    /**
     * Get ACF field name from element
     * 
     * @param {Object} $element jQuery element
     * @return {string|null} ACF field name or null
     */
    WPFE.elements.getAcfFieldName = function($element) {
        // Check for data-field_name attribute (most common in ACF)
        var fieldName = $element.attr('data-field_name');
        if (fieldName) {
            return fieldName;
        }
        
        // Check for data-name attribute (used in ACF blocks)
        fieldName = $element.attr('data-name');
        if (fieldName) {
            return fieldName;
        }
        
        // Check for data-key attribute (field key in format field_xxxx)
        var fieldKey = $element.attr('data-key');
        if (fieldKey && fieldKey.indexOf('field_') === 0) {
            // Extract field name from classes if possible
            var classes = $element.attr('class') || '';
            var nameMatch = classes.match(/acf-field-([a-zA-Z0-9_-]+)/);
            if (nameMatch && nameMatch[1]) {
                return nameMatch[1];
            }
            
            // Use field key as fallback (not ideal but better than nothing)
            return fieldKey;
        }
        
        // Try to extract from classes
        var classes = $element.attr('class') || '';
        
        // Pattern: acf-field-{name}
        var nameMatch = classes.match(/acf-field-([a-zA-Z0-9_-]+)/);
        if (nameMatch && nameMatch[1]) {
            return nameMatch[1];
        }
        
        // Last resort: check for field name in ID
        var id = $element.attr('id') || '';
        if (id.indexOf('acf-') === 0) {
            return id.replace('acf-', '');
        }
        
        return null;
    };
    
    // Register this module as ready
    WPFE.modulesReady['element-acf'] = true;
    
})(jQuery, WPFE);