/**
 * WP Frontend Editor ACF Module
 * Handles Advanced Custom Fields integration
 */

var WPFE = WPFE || {};

WPFE.acf = (function($) {
    'use strict';
    
    // Mark this module as loaded
    WPFE.modulesReady.acf = true;
    if (WPFE.debug && WPFE.debug.modulesLoaded) {
        WPFE.debug.modulesLoaded.push('acf');
    }

    // Private variables
    var acfFieldTypes = {
        // Basic field types
        text: 'text',
        textarea: 'textarea',
        wysiwyg: 'wysiwyg',
        number: 'number',
        email: 'email',
        url: 'url',
        password: 'password',
        
        // Content field types
        image: 'image',
        gallery: 'gallery',
        file: 'file',
        
        // Choice field types
        select: 'select',
        checkbox: 'checkbox',
        radio: 'radio',
        button_group: 'button_group',
        true_false: 'true_false',
        
        // jQuery field types
        date_picker: 'date_picker',
        date_time_picker: 'date_time_picker',
        time_picker: 'time_picker',
        color_picker: 'color_picker',
        
        // Relational field types
        link: 'link',
        post_object: 'post_object',
        page_link: 'page_link',
        relationship: 'relationship',
        taxonomy: 'taxonomy',
        user: 'user',
        
        // Layout field types (special handling needed)
        message: 'message',
        tab: 'tab',
        group: 'group',
        repeater: 'repeater',
        flexible_content: 'flexible_content',
        clone: 'clone'
    };
    
    // Private functions
    /**
     * Initialize ACF complex fields UI
     */
    function initAcfComplexFields() {
        // Handle repeater fields
        $(document).on('click', '.wpfe-acf-repeater-add', function(e) {
            e.preventDefault();
            
            var $repeater = $(this).closest('.wpfe-acf-repeater');
            var $rows = $repeater.find('.wpfe-acf-repeater-rows');
            var rowTemplate = $repeater.data('row-template');
            
            if (rowTemplate) {
                // Add new row using template
                var index = $rows.children().length;
                var newRow = rowTemplate.replace(/\{i\}/g, index);
                
                $rows.append(newRow);
                
                // Mark as changed
                WPFE.events.setChangeMade(true);
                
                // Setup new sub-fields
                initAcfSubfields($rows.find('.wpfe-acf-repeater-row').last());
            }
        });
        
        // Handle repeater row removal
        $(document).on('click', '.wpfe-acf-repeater-remove', function(e) {
            e.preventDefault();
            
            var $row = $(this).closest('.wpfe-acf-repeater-row');
            
            $row.slideUp(200, function() {
                $row.remove();
                
                // Mark as changed
                WPFE.events.setChangeMade(true);
                
                // Reindex remaining rows
                reindexRepeaterRows($(this).closest('.wpfe-acf-repeater-rows'));
            });
        });
        
        // Handle flexible content layout selection
        $(document).on('click', '.wpfe-acf-fc-add-layout', function(e) {
            e.preventDefault();
            
            var $flexible = $(this).closest('.wpfe-acf-flexible-content');
            var $layouts = $flexible.find('.wpfe-acf-fc-layouts');
            var $select = $(this).prev('.wpfe-acf-fc-layout-select');
            
            var layoutName = $select.val();
            if (!layoutName) {
                return;
            }
            
            // Get layout template
            var layoutTemplate = $flexible.data('layout-template-' + layoutName);
            
            if (layoutTemplate) {
                // Add new layout
                var index = $layouts.children().length;
                var newLayout = layoutTemplate.replace(/\{i\}/g, index);
                
                $layouts.append(newLayout);
                
                // Mark as changed
                WPFE.events.setChangeMade(true);
                
                // Setup new sub-fields
                initAcfSubfields($layouts.find('.wpfe-acf-fc-layout').last());
            }
        });
        
        // Handle flexible content layout removal
        $(document).on('click', '.wpfe-acf-fc-remove', function(e) {
            e.preventDefault();
            
            var $layout = $(this).closest('.wpfe-acf-fc-layout');
            
            $layout.slideUp(200, function() {
                $layout.remove();
                
                // Mark as changed
                WPFE.events.setChangeMade(true);
                
                // Reindex remaining layouts
                reindexFlexibleLayouts($(this).closest('.wpfe-acf-fc-layouts'));
            });
        });
    }
    
    /**
     * Initialize ACF subfields within a container
     * 
     * @param {jQuery} $container The container with subfields
     */
    function initAcfSubfields($container) {
        // Initialize datepickers
        $container.find('.wpfe-acf-date-picker').each(function() {
            var $datepicker = $(this);
            
            if ($.fn.datepicker) {
                $datepicker.datepicker({
                    dateFormat: 'yy-mm-dd',
                    changeMonth: true,
                    changeYear: true,
                    showAnim: 'slideDown'
                });
            }
        });
        
        // Initialize color pickers
        $container.find('.wpfe-acf-color-picker').each(function() {
            var $colorpicker = $(this);
            
            if ($.fn.wpColorPicker) {
                $colorpicker.wpColorPicker({
                    change: function() {
                        WPFE.events.setChangeMade(true);
                    }
                });
            }
        });
        
        // Initialize select2 if available
        $container.find('.wpfe-acf-select').each(function() {
            var $select = $(this);
            
            if ($.fn.select2) {
                $select.select2({
                    allowClear: true,
                    placeholder: $select.data('placeholder') || ''
                });
            }
        });
    }
    
    /**
     * Reindex repeater row inputs
     * 
     * @param {jQuery} $rows The repeater rows container
     */
    function reindexRepeaterRows($rows) {
        $rows.children().each(function(index) {
            var $row = $(this);
            
            // Update data attribute
            $row.attr('data-index', index);
            
            // Update all input names with proper nested handling
            $row.find('input, select, textarea').each(function() {
                var $input = $(this);
                var name = $input.attr('name');
                
                if (name) {
                    // Get the direct parent repeater name path
                    var parentRepeaterPath = '';
                    var $parentRepeater = $row.closest('.wpfe-acf-repeater');
                    
                    if ($parentRepeater.length) {
                        // Extract current row pattern from name - looking for the one we need to update
                        var rowPatterns = name.match(/\[\d+\]/g);
                        
                        // If we have row indices, we need to track which one needs updating
                        if (rowPatterns && rowPatterns.length) {
                            // The row pattern we need to update is the one at the depth that matches our $row
                            // Start by getting all parent repeaters
                            var $allParentRepeaters = $input.parents('.wpfe-acf-repeater');
                            var targetDepth = $allParentRepeaters.length - $allParentRepeaters.index($parentRepeater) - 1;
                            
                            // We know which depth we need to update, so we need to replace that specific pattern
                            if (targetDepth >= 0 && targetDepth < rowPatterns.length) {
                                // Create a regex that matches the exact pattern at the right position
                                var parts = name.split(rowPatterns[targetDepth]);
                                
                                // Replace the pattern
                                name = parts[0] + '[' + index + ']' + (parts[1] || '');
                            } else {
                                // Fallback to simple replace (first occurrence only) if depth calculation fails
                                name = name.replace(/\[\d+\]/, '[' + index + ']');
                            }
                        } else {
                            // Simple case - no nested repeaters
                            name = name.replace(/\[\d+\]/, '[' + index + ']');
                        }
                    } else {
                        // Simple case - no parent repeater
                        name = name.replace(/\[\d+\]/, '[' + index + ']');
                    }
                    
                    $input.attr('name', name);
                }
            });
            
            // Also update row order display
            $row.find('.wpfe-acf-repeater-row-order').text(index);
            
            // Handle nested repeaters - recursively reindex child repeaters
            $row.find('.wpfe-acf-repeater-rows').each(function() {
                reindexRepeaterRows($(this));
            });
        });
    }
    
    /**
     * Reindex flexible content layout inputs
     * 
     * @param {jQuery} $layouts The flexible content layouts container
     */
    function reindexFlexibleLayouts($layouts) {
        $layouts.children().each(function(index) {
            var $layout = $(this);
            
            // Update data attribute
            $layout.attr('data-index', index);
            
            // Update all input names with proper nested handling
            $layout.find('input, select, textarea').each(function() {
                var $input = $(this);
                var name = $input.attr('name');
                
                if (name) {
                    // Get the direct parent flexible content
                    var $parentFC = $layout.closest('.wpfe-acf-flexible-content');
                    
                    if ($parentFC.length) {
                        // Extract current layout pattern from name - looking for the one we need to update
                        var layoutPatterns = name.match(/\[\d+\]/g);
                        
                        // If we have layout indices, we need to track which one needs updating
                        if (layoutPatterns && layoutPatterns.length) {
                            // The layout pattern we need to update is the one at the depth that matches our $layout
                            // Start by getting all parent flexible content fields
                            var $allParentFCs = $input.parents('.wpfe-acf-flexible-content');
                            var targetDepth = $allParentFCs.length - $allParentFCs.index($parentFC) - 1;
                            
                            // We know which depth we need to update, so we need to replace that specific pattern
                            if (targetDepth >= 0 && targetDepth < layoutPatterns.length) {
                                // Create a regex that matches the exact pattern at the right position
                                var parts = name.split(layoutPatterns[targetDepth]);
                                
                                // Replace the pattern
                                name = parts[0] + '[' + index + ']' + (parts[1] || '');
                            } else {
                                // Fallback to simple replace (first occurrence only) if depth calculation fails
                                name = name.replace(/\[\d+\]/, '[' + index + ']');
                            }
                        } else {
                            // Simple case - no nested flexible content
                            name = name.replace(/\[\d+\]/, '[' + index + ']');
                        }
                    } else {
                        // Simple case - no parent flexible content
                        name = name.replace(/\[\d+\]/, '[' + index + ']');
                    }
                    
                    $input.attr('name', name);
                }
            });
            
            // Also update layout order display
            $layout.find('.wpfe-acf-fc-layout-order').text(index);
            
            // Handle nested flexible content - recursively reindex child layouts
            $layout.find('.wpfe-acf-fc-layouts').each(function() {
                reindexFlexibleLayouts($(this));
            });
            
            // Also handle repeaters inside flexible content
            $layout.find('.wpfe-acf-repeater-rows').each(function() {
                reindexRepeaterRows($(this));
            });
        });
    }
    
    /**
     * Render an ACF field
     * 
     * @param {Object} fieldData The field data
     * @return {string|null} The rendered HTML or null if not supported
     */
    function renderAcfField(fieldData) {
        if (!fieldData || !fieldData.type) {
            return null;
        }
        
        // Route to specific renderer based on field type
        switch (fieldData.type) {
            case acfFieldTypes.text:
            case acfFieldTypes.textarea:
            case acfFieldTypes.wysiwyg:
            case acfFieldTypes.image:
            case acfFieldTypes.gallery:
                // Use the standard field renderers
                return null;
                
            case acfFieldTypes.select:
                return renderAcfSelectField(fieldData);
                
            case acfFieldTypes.checkbox:
                return renderAcfCheckboxField(fieldData);
                
            case acfFieldTypes.radio:
                return renderAcfRadioField(fieldData);
                
            case acfFieldTypes.true_false:
                return renderAcfTrueFalseField(fieldData);
                
            case acfFieldTypes.date_picker:
                return renderAcfDatePickerField(fieldData);
                
            case acfFieldTypes.color_picker:
                return renderAcfColorPickerField(fieldData);
                
            case acfFieldTypes.link:
                return renderAcfLinkField(fieldData);
                
            case acfFieldTypes.group:
                return renderAcfGroupField(fieldData);
                
            case acfFieldTypes.repeater:
                return renderAcfRepeaterField(fieldData);
                
            case acfFieldTypes.flexible_content:
                return renderAcfFlexibleContentField(fieldData);
                
            case acfFieldTypes.clone:
                return renderAcfCloneField(fieldData);
                
            default:
                // For unknown field types, log but still return null
                if (wpfe_data.debug_mode) {
                    console.debug('Unknown or unsupported ACF field type:', fieldData.type, fieldData);
                }
                return null;
        }
    }
    
    /**
     * Render an ACF select field
     * 
     * @param {Object} fieldData The field data
     * @return {string} The rendered HTML
     */
    function renderAcfSelectField(fieldData) {
        var html = '<div class="wpfe-acf-field wpfe-acf-select-field" data-field-type="select">';
        
        // Add label
        if (fieldData.label) {
            html += '<label class="wpfe-field-label">' + WPFE.utils.sanitizeString(fieldData.label) + '</label>';
        }
        
        // Add select element
        html += '<select class="wpfe-acf-select" name="' + WPFE.utils.sanitizeString(fieldData.name) + '" id="' + WPFE.utils.sanitizeString(fieldData.name) + '"';
        
        // Multiple select
        if (fieldData.multiple) {
            html += ' multiple="multiple"';
        }
        
        // Add placeholder
        if (fieldData.placeholder) {
            html += ' data-placeholder="' + WPFE.utils.sanitizeString(fieldData.placeholder) + '"';
        }
        
        html += '>';
        
        // Add empty option for non-multiple selects
        if (!fieldData.multiple && fieldData.allow_null) {
            html += '<option value="">' + (fieldData.placeholder || '') + '</option>';
        }
        
        // Add options
        if (fieldData.choices && typeof fieldData.choices === 'object') {
            for (var value in fieldData.choices) {
                if (fieldData.choices.hasOwnProperty(value)) {
                    var label = fieldData.choices[value];
                    var selected = '';
                    
                    // Check if this option is selected
                    if (fieldData.value) {
                        if (fieldData.multiple && Array.isArray(fieldData.value) && fieldData.value.indexOf(value) !== -1) {
                            selected = ' selected="selected"';
                        } else if (!fieldData.multiple && fieldData.value === value) {
                            selected = ' selected="selected"';
                        }
                    }
                    
                    html += '<option value="' + WPFE.utils.sanitizeString(value) + '"' + selected + '>' + WPFE.utils.sanitizeString(label) + '</option>';
                }
            }
        }
        
        html += '</select>';
        
        // Add description
        if (fieldData.description) {
            html += '<p class="wpfe-field-description">' + WPFE.utils.sanitizeString(fieldData.description) + '</p>';
        }
        
        html += '</div>';
        
        return html;
    }
    
    /**
     * Render an ACF checkbox field
     * 
     * @param {Object} fieldData The field data
     * @return {string} The rendered HTML
     */
    function renderAcfCheckboxField(fieldData) {
        var html = '<div class="wpfe-acf-field wpfe-acf-checkbox-field" data-field-type="checkbox">';
        
        // Add label
        if (fieldData.label) {
            html += '<label class="wpfe-field-label">' + WPFE.utils.sanitizeString(fieldData.label) + '</label>';
        }
        
        // Add checkbox options
        if (fieldData.choices && typeof fieldData.choices === 'object') {
            html += '<div class="wpfe-acf-checkbox-options">';
            
            for (var value in fieldData.choices) {
                if (fieldData.choices.hasOwnProperty(value)) {
                    var label = fieldData.choices[value];
                    var checked = '';
                    var inputId = 'acf-' + fieldData.name + '-' + value.replace(/[^a-z0-9]/gi, '_');
                    
                    // Check if this option is checked
                    if (fieldData.value && Array.isArray(fieldData.value) && fieldData.value.indexOf(value) !== -1) {
                        checked = ' checked="checked"';
                    }
                    
                    html += '<div class="wpfe-acf-checkbox-option">';
                    html += '<input type="checkbox" id="' + inputId + '" name="' + WPFE.utils.sanitizeString(fieldData.name) + '[]" value="' + WPFE.utils.sanitizeString(value) + '"' + checked + '>';
                    html += '<label for="' + inputId + '">' + WPFE.utils.sanitizeString(label) + '</label>';
                    html += '</div>';
                }
            }
            
            html += '</div>';
        }
        
        // Add description
        if (fieldData.description) {
            html += '<p class="wpfe-field-description">' + WPFE.utils.sanitizeString(fieldData.description) + '</p>';
        }
        
        html += '</div>';
        
        return html;
    }
    
    /**
     * Render an ACF radio field
     * 
     * @param {Object} fieldData The field data
     * @return {string} The rendered HTML
     */
    function renderAcfRadioField(fieldData) {
        var html = '<div class="wpfe-acf-field wpfe-acf-radio-field" data-field-type="radio">';
        
        // Add label
        if (fieldData.label) {
            html += '<label class="wpfe-field-label">' + WPFE.utils.sanitizeString(fieldData.label) + '</label>';
        }
        
        // Add radio options
        if (fieldData.choices && typeof fieldData.choices === 'object') {
            html += '<div class="wpfe-acf-radio-options">';
            
            for (var value in fieldData.choices) {
                if (fieldData.choices.hasOwnProperty(value)) {
                    var label = fieldData.choices[value];
                    var checked = '';
                    var inputId = 'acf-' + fieldData.name + '-' + value.replace(/[^a-z0-9]/gi, '_');
                    
                    // Check if this option is checked
                    if (fieldData.value === value) {
                        checked = ' checked="checked"';
                    }
                    
                    html += '<div class="wpfe-acf-radio-option">';
                    html += '<input type="radio" id="' + inputId + '" name="' + WPFE.utils.sanitizeString(fieldData.name) + '" value="' + WPFE.utils.sanitizeString(value) + '"' + checked + '>';
                    html += '<label for="' + inputId + '">' + WPFE.utils.sanitizeString(label) + '</label>';
                    html += '</div>';
                }
            }
            
            html += '</div>';
        }
        
        // Add description
        if (fieldData.description) {
            html += '<p class="wpfe-field-description">' + WPFE.utils.sanitizeString(fieldData.description) + '</p>';
        }
        
        html += '</div>';
        
        return html;
    }
    
    /**
     * Render an ACF true/false field
     * 
     * @param {Object} fieldData The field data
     * @return {string} The rendered HTML
     */
    function renderAcfTrueFalseField(fieldData) {
        var html = '<div class="wpfe-acf-field wpfe-acf-true-false-field" data-field-type="true_false">';
        
        var inputId = 'acf-' + fieldData.name;
        var checked = fieldData.value ? ' checked="checked"' : '';
        
        html += '<div class="wpfe-acf-true-false-option">';
        html += '<input type="checkbox" id="' + inputId + '" name="' + WPFE.utils.sanitizeString(fieldData.name) + '" value="1"' + checked + '>';
        html += '<label for="' + inputId + '">' + WPFE.utils.sanitizeString(fieldData.label || fieldData.name) + '</label>';
        html += '</div>';
        
        // Add description
        if (fieldData.description) {
            html += '<p class="wpfe-field-description">' + WPFE.utils.sanitizeString(fieldData.description) + '</p>';
        }
        
        html += '</div>';
        
        return html;
    }
    
    /**
     * Render an ACF date picker field
     * 
     * @param {Object} fieldData The field data
     * @return {string} The rendered HTML
     */
    function renderAcfDatePickerField(fieldData) {
        var html = '<div class="wpfe-acf-field wpfe-acf-date-picker-field" data-field-type="date_picker">';
        
        // Add label
        if (fieldData.label) {
            html += '<label class="wpfe-field-label">' + WPFE.utils.sanitizeString(fieldData.label) + '</label>';
        }
        
        // Add date picker input
        html += '<input type="text" class="wpfe-acf-date-picker" name="' + WPFE.utils.sanitizeString(fieldData.name) + '" value="' + WPFE.utils.sanitizeString(fieldData.value || '') + '">';
        
        // Add description
        if (fieldData.description) {
            html += '<p class="wpfe-field-description">' + WPFE.utils.sanitizeString(fieldData.description) + '</p>';
        }
        
        html += '</div>';
        
        return html;
    }
    
    /**
     * Render an ACF color picker field
     * 
     * @param {Object} fieldData The field data
     * @return {string} The rendered HTML
     */
    function renderAcfColorPickerField(fieldData) {
        var html = '<div class="wpfe-acf-field wpfe-acf-color-picker-field" data-field-type="color_picker">';
        
        // Add label
        if (fieldData.label) {
            html += '<label class="wpfe-field-label">' + WPFE.utils.sanitizeString(fieldData.label) + '</label>';
        }
        
        // Add color picker input
        html += '<input type="text" class="wpfe-acf-color-picker" name="' + WPFE.utils.sanitizeString(fieldData.name) + '" value="' + WPFE.utils.sanitizeString(fieldData.value || '') + '">';
        
        // Add description
        if (fieldData.description) {
            html += '<p class="wpfe-field-description">' + WPFE.utils.sanitizeString(fieldData.description) + '</p>';
        }
        
        html += '</div>';
        
        return html;
    }
    
    /**
     * Render an ACF link field
     * 
     * @param {Object} fieldData The field data
     * @return {string} The rendered HTML
     */
    function renderAcfLinkField(fieldData) {
        var value = fieldData.value || {};
        var url = value.url || '';
        var title = value.title || '';
        var target = value.target || '';
        
        var html = '<div class="wpfe-acf-field wpfe-acf-link-field" data-field-type="link">';
        
        // Add label
        if (fieldData.label) {
            html += '<label class="wpfe-field-label">' + WPFE.utils.sanitizeString(fieldData.label) + '</label>';
        }
        
        // Add link fields
        html += '<div class="wpfe-acf-link-fields">';
        
        // URL field
        html += '<div class="wpfe-acf-link-url">';
        html += '<label>URL</label>';
        html += '<input type="text" name="' + WPFE.utils.sanitizeString(fieldData.name) + '[url]" value="' + WPFE.utils.sanitizeString(url) + '">';
        html += '</div>';
        
        // Title field
        html += '<div class="wpfe-acf-link-title">';
        html += '<label>Title</label>';
        html += '<input type="text" name="' + WPFE.utils.sanitizeString(fieldData.name) + '[title]" value="' + WPFE.utils.sanitizeString(title) + '">';
        html += '</div>';
        
        // Target field
        html += '<div class="wpfe-acf-link-target">';
        html += '<label>';
        html += '<input type="checkbox" name="' + WPFE.utils.sanitizeString(fieldData.name) + '[target]" value="_blank"' + (target === '_blank' ? ' checked="checked"' : '') + '>';
        html += ' Open in new tab';
        html += '</label>';
        html += '</div>';
        
        html += '</div>';
        
        // Add description
        if (fieldData.description) {
            html += '<p class="wpfe-field-description">' + WPFE.utils.sanitizeString(fieldData.description) + '</p>';
        }
        
        html += '</div>';
        
        return html;
    }
    
    /**
     * Render an ACF repeater field
     * 
     * @param {Object} fieldData The field data
     * @return {string} The rendered HTML
     */
    function renderAcfRepeaterField(fieldData) {
        var html = '<div class="wpfe-acf-field wpfe-acf-repeater" data-field-type="repeater">';
        
        // Add label
        if (fieldData.label) {
            html += '<label class="wpfe-field-label">' + WPFE.utils.sanitizeString(fieldData.label) + '</label>';
        }
        
        // Row template for adding new rows
        var rowTemplate = '';
        if (fieldData.sub_fields) {
            rowTemplate += '<div class="wpfe-acf-repeater-row" data-index="{i}">';
            rowTemplate += '<div class="wpfe-acf-repeater-row-handle">';
            rowTemplate += '<span class="wpfe-acf-repeater-row-order">{i}</span>';
            rowTemplate += '<span class="wpfe-acf-repeater-row-remove"><button type="button" class="wpfe-acf-repeater-remove"><span class="dashicons dashicons-no-alt"></span></button></span>';
            rowTemplate += '</div>';
            rowTemplate += '<div class="wpfe-acf-repeater-row-fields">';
            
            // Add subfields
            for (var i = 0; i < fieldData.sub_fields.length; i++) {
                var subField = JSON.parse(JSON.stringify(fieldData.sub_fields[i])); // Deep clone
                subField.name = fieldData.name + '[{i}][' + subField.key + ']';
                
                // Empty value for the template
                subField.value = '';
                
                // Render subfield
                var subFieldHtml = renderAcfField(subField);
                if (subFieldHtml) {
                    rowTemplate += subFieldHtml;
                }
            }
            
            rowTemplate += '</div>';
            rowTemplate += '</div>';
        }
        
        // Add repeater rows
        html += '<div class="wpfe-acf-repeater-rows" data-max="' + (fieldData.max || '') + '" data-min="' + (fieldData.min || '') + '">';
        
        // Add existing rows
        if (fieldData.value && Array.isArray(fieldData.value)) {
            for (var j = 0; j < fieldData.value.length; j++) {
                var rowValues = fieldData.value[j];
                
                html += '<div class="wpfe-acf-repeater-row" data-index="' + j + '">';
                html += '<div class="wpfe-acf-repeater-row-handle">';
                html += '<span class="wpfe-acf-repeater-row-order">' + j + '</span>';
                html += '<span class="wpfe-acf-repeater-row-remove"><button type="button" class="wpfe-acf-repeater-remove"><span class="dashicons dashicons-no-alt"></span></button></span>';
                html += '</div>';
                html += '<div class="wpfe-acf-repeater-row-fields">';
                
                // Add subfields with values
                for (var k = 0; k < fieldData.sub_fields.length; k++) {
                    var valueSubField = JSON.parse(JSON.stringify(fieldData.sub_fields[k])); // Deep clone
                    valueSubField.name = fieldData.name + '[' + j + '][' + valueSubField.key + ']';
                    
                    // Get value from row values with enhanced robust fallbacks
                    if (rowValues && typeof rowValues === 'object') {
                        valueSubField.parent_type = 'repeater';
                        valueSubField.parent_field = fieldData.name;
                        valueSubField.row_index = j;
                        
                        // Enhanced key matching for better field detection
                        var possibleKeys = [
                            valueSubField.key,                              // Direct field key (field_xxx)
                            valueSubField.name,                             // Full field name path
                            valueSubField.key.replace('field_', ''),        // ACF sometimes strips field_ prefix
                            valueSubField.name.split('[').pop().split(']')[0], // Last segment of name
                            valueSubField.name.split('_').pop(),            // Last part after underscore
                            valueSubField.name.replace(/[\[\]']+/g, ''),    // Name with brackets removed
                            valueSubField.name.split(/[\[\]]+/).pop(),      // Last segment after bracket notation
                            'field_' + valueSubField.name,                  // Some fields add field_ prefix
                            'acf_' + valueSubField.name,                    // Some fields add acf_ prefix
                            '_' + valueSubField.name                        // Some fields add _ prefix
                        ];
                        
                        // For nested field names, try the last segment
                        if (valueSubField.name.includes('[')) {
                            var lastSegmentMatch = valueSubField.name.match(/\[([^\]]+)\]$/);
                            if (lastSegmentMatch && lastSegmentMatch[1]) {
                                possibleKeys.push(lastSegmentMatch[1]);
                            }
                        }
                        
                        // For field names with dashes or underscores, try both with and without
                        if (valueSubField.name.includes('-')) {
                            possibleKeys.push(valueSubField.name.replace(/-/g, '_'));
                        }
                        if (valueSubField.name.includes('_')) {
                            possibleKeys.push(valueSubField.name.replace(/_/g, '-'));
                        }
                        
                        // For fields inside repeaters, also try with row index patterns
                        possibleKeys.push(
                            valueSubField.name + '_' + j,                 // name_0 pattern
                            valueSubField.name + ':' + j,                 // name:0 pattern
                            j + '_' + valueSubField.name,                 // 0_name pattern
                            valueSubField.name.replace(/\[\d+\]/, '[' + j + ']'), // Replace row index
                            'row_' + j + '_' + valueSubField.name        // row_0_name pattern
                        );
                        
                        // Remove any duplicate or empty keys
                        possibleKeys = possibleKeys.filter(function(key, index, self) {
                            return key && self.indexOf(key) === index;
                        });
                        
                        // Try different paths to find the value
                        var valueFound = false;
                        var checkPaths = [
                            rowValues,                      // Direct value
                            rowValues.value,                // Nested in value property
                            rowValues.fields,               // Nested in fields property
                            rowValues.data,                 // Nested in data property
                            valueSubField.key && rowValues[valueSubField.key.replace('field_', '')], // Without field_ prefix
                            rowValues.acf                   // Nested in acf property
                        ];
                        
                        // Loop through all possible paths
                        for (var pi = 0; pi < checkPaths.length; pi++) {
                            var path = checkPaths[pi];
                            if (!path || typeof path !== 'object') continue;
                            
                            // Try all possible keys in each path
                            for (var ki = 0; ki < possibleKeys.length; ki++) {
                                var testKey = possibleKeys[ki];
                                if (testKey && path[testKey] !== undefined) {
                                    valueSubField.value = path[testKey];
                                    valueFound = true;
                                    
                                    if (wpfe_data.debug_mode) {
                                        console.debug('Found value for field', valueSubField.name, 'with key', testKey, 'in path', pi);
                                    }
                                    break;
                                }
                            }
                            
                            if (valueFound) break;
                        }
                        
                        // Special handling for gallery fields which might be nested
                        if (!valueFound && valueSubField.type === 'gallery') {
                            // Check if there's a gallery array stored at the row level
                            var galleryKeys = ['gallery', 'images', 'photos', valueSubField.name + '_gallery'];
                            for (var gi = 0; gi < galleryKeys.length; gi++) {
                                if (rowValues[galleryKeys[gi]] && Array.isArray(rowValues[galleryKeys[gi]])) {
                                    valueSubField.value = rowValues[galleryKeys[gi]];
                                    valueFound = true;
                                    break;
                                }
                            }
                        }
                        
                        // Special handling for file/image fields
                        if (!valueFound && (valueSubField.type === 'image' || valueSubField.type === 'file')) {
                            // Check for special formats for file/image fields
                            for (var ki = 0; ki < possibleKeys.length; ki++) {
                                var fileKey = possibleKeys[ki];
                                
                                // Try with ID suffix
                                if (rowValues[fileKey + '_id'] !== undefined) {
                                    valueSubField.value = rowValues[fileKey + '_id'];
                                    valueFound = true;
                                    break;
                                }
                                
                                // Try with URL suffix
                                if (rowValues[fileKey + '_url'] !== undefined) {
                                    valueSubField.value = {
                                        'url': rowValues[fileKey + '_url'],
                                        'id': rowValues[fileKey + '_id'] || 0
                                    };
                                    valueFound = true;
                                    break;
                                }
                            }
                        }
                        
                        // Final fallback - set to empty
                        if (!valueFound) {
                            valueSubField.value = '';
                            if (wpfe_data.debug_mode) {
                                console.debug('No value found for field', valueSubField.key, 'in repeater row', j, 'tried keys:', possibleKeys);
                            }
                        }
                    } else {
                        valueSubField.value = '';
                    }
                    
                    // Render subfield
                    var valueSubFieldHtml = renderAcfField(valueSubField);
                    if (valueSubFieldHtml) {
                        html += valueSubFieldHtml;
                    }
                }
                
                html += '</div>';
                html += '</div>';
            }
        }
        
        html += '</div>';
        
        // Add controls
        html += '<div class="wpfe-acf-repeater-controls">';
        html += '<button type="button" class="wpfe-acf-repeater-add"><span class="dashicons dashicons-plus"></span> Add Row</button>';
        html += '</div>';
        
        // Safely encode the row template to avoid JS errors
        var safeRowTemplate = rowTemplate.replace(/"/g, '&quot;');
        html += '<script type="text/template" class="wpfe-acf-repeater-template" data-row-template="' + safeRowTemplate + '"></script>';
        
        // Add description
        if (fieldData.description) {
            html += '<p class="wpfe-field-description">' + WPFE.utils.sanitizeString(fieldData.description) + '</p>';
        }
        
        html += '</div>';
        
        return html;
    }
    
    /**
     * Render an ACF flexible content field
     * 
     * @param {Object} fieldData The field data
     * @return {string} The rendered HTML
     */
    function renderAcfFlexibleContentField(fieldData) {
        var html = '<div class="wpfe-acf-field wpfe-acf-flexible-content" data-field-type="flexible_content">';
        
        // Add label
        if (fieldData.label) {
            html += '<label class="wpfe-field-label">' + WPFE.utils.sanitizeString(fieldData.label) + '</label>';
        }
        
        // Layout templates for adding new layouts
        var layoutTemplates = '';
        var layoutOptions = '';
        
        if (fieldData.layouts) {
            for (var layoutName in fieldData.layouts) {
                if (fieldData.layouts.hasOwnProperty(layoutName)) {
                    var layout = fieldData.layouts[layoutName];
                    
                    // Add layout option
                    layoutOptions += '<option value="' + WPFE.utils.sanitizeString(layoutName) + '">' + WPFE.utils.sanitizeString(layout.label) + '</option>';
                    
                    // Create layout template
                    var layoutTemplate = '<div class="wpfe-acf-fc-layout" data-layout="' + WPFE.utils.sanitizeString(layoutName) + '" data-index="{i}">';
                    layoutTemplate += '<div class="wpfe-acf-fc-layout-handle">';
                    layoutTemplate += '<span class="wpfe-acf-fc-layout-order">{i}</span>';
                    layoutTemplate += '<span class="wpfe-acf-fc-layout-label">' + WPFE.utils.sanitizeString(layout.label) + '</span>';
                    layoutTemplate += '<span class="wpfe-acf-fc-layout-remove"><button type="button" class="wpfe-acf-fc-remove"><span class="dashicons dashicons-no-alt"></span></button></span>';
                    layoutTemplate += '</div>';
                    layoutTemplate += '<div class="wpfe-acf-fc-layout-fields">';
                    
                    // Add subfields
                    if (layout.sub_fields) {
                        for (var i = 0; i < layout.sub_fields.length; i++) {
                            var subField = JSON.parse(JSON.stringify(layout.sub_fields[i])); // Deep clone
                            subField.name = fieldData.name + '[{i}][' + layoutName + '][' + subField.key + ']';
                            
                            // Empty value for the template
                            subField.value = '';
                            
                            // Render subfield
                            var subFieldHtml = renderAcfField(subField);
                            if (subFieldHtml) {
                                layoutTemplate += subFieldHtml;
                            }
                        }
                    }
                    
                    layoutTemplate += '</div>';
                    layoutTemplate += '</div>';
                    
                    // Add to layout templates (encoding template to prevent JS errors)
                    var safeLayoutTemplate = layoutTemplate.replace(/"/g, '&quot;');
                    layoutTemplates += '<script type="text/template" class="wpfe-acf-fc-layout-template" data-layout-template-' + WPFE.utils.sanitizeString(layoutName) + '="' + safeLayoutTemplate + '"></script>';
                }
            }
        }
        
        // Add flexible content layouts
        html += '<div class="wpfe-acf-fc-layouts" data-max="' + (fieldData.max || '') + '" data-min="' + (fieldData.min || '') + '">';
        
        // Add existing layouts
        if (fieldData.value && Array.isArray(fieldData.value)) {
            for (var j = 0; j < fieldData.value.length; j++) {
                var layoutValues = fieldData.value[j];
                var layoutType = layoutValues.acf_fc_layout;
                
                if (layoutType && fieldData.layouts[layoutType]) {
                    var existingLayout = fieldData.layouts[layoutType];
                    
                    html += '<div class="wpfe-acf-fc-layout" data-layout="' + WPFE.utils.sanitizeString(layoutType) + '" data-index="' + j + '">';
                    html += '<div class="wpfe-acf-fc-layout-handle">';
                    html += '<span class="wpfe-acf-fc-layout-order">' + j + '</span>';
                    html += '<span class="wpfe-acf-fc-layout-label">' + WPFE.utils.sanitizeString(existingLayout.label) + '</span>';
                    html += '<span class="wpfe-acf-fc-layout-remove"><button type="button" class="wpfe-acf-fc-remove"><span class="dashicons dashicons-no-alt"></span></button></span>';
                    html += '</div>';
                    html += '<div class="wpfe-acf-fc-layout-fields">';
                    
                    // Add subfields with values
                    if (existingLayout.sub_fields) {
                        for (var k = 0; k < existingLayout.sub_fields.length; k++) {
                            var valueSubField = JSON.parse(JSON.stringify(existingLayout.sub_fields[k])); // Deep clone
                            valueSubField.name = fieldData.name + '[' + j + '][' + layoutType + '][' + valueSubField.key + ']';
                            
                            // Get value from layout values with enhanced robust fallbacks
                            if (layoutValues && typeof layoutValues === 'object') {
                                valueSubField.parent_type = 'flexible_content';
                                valueSubField.parent_layout = layoutType;
                                valueSubField.layout_index = j;
                                
                                // Enhanced key matching for better field detection
                                var possibleKeys = [
                                    valueSubField.key,                              // Direct field key (field_xxx)
                                    valueSubField.name,                             // Full field name path
                                    valueSubField.key.replace('field_', ''),        // ACF sometimes strips field_ prefix
                                    valueSubField.name.split('[').pop().split(']')[0], // Last segment of name
                                    valueSubField.name.split('_').pop(),            // Last part after underscore
                                    valueSubField.name.replace(/[\[\]']+/g, ''),    // Name with brackets removed
                                    valueSubField.name.split(/[\[\]]+/).pop(),      // Last segment after bracket notation
                                    'field_' + valueSubField.name,                  // Some fields add field_ prefix
                                    'acf_' + valueSubField.name,                    // Some fields add acf_ prefix
                                    '_' + valueSubField.name                        // Some fields add _ prefix
                                ];
                                
                                // For nested field names, try the last segment
                                if (valueSubField.name.includes('[')) {
                                    var lastSegmentMatch = valueSubField.name.match(/\[([^\]]+)\]$/);
                                    if (lastSegmentMatch && lastSegmentMatch[1]) {
                                        possibleKeys.push(lastSegmentMatch[1]);
                                    }
                                }
                                
                                // For field names with dashes or underscores, try both with and without
                                if (valueSubField.name.includes('-')) {
                                    possibleKeys.push(valueSubField.name.replace(/-/g, '_'));
                                }
                                if (valueSubField.name.includes('_')) {
                                    possibleKeys.push(valueSubField.name.replace(/_/g, '-'));
                                }
                                
                                // For fields inside flexible content, also try with layout specific patterns
                                possibleKeys.push(
                                    layoutType + '_' + valueSubField.name,         // layout_fieldname pattern
                                    layoutType + ':' + valueSubField.name,         // layout:fieldname pattern
                                    j + '_' + valueSubField.name,                  // index_fieldname pattern
                                    valueSubField.name + '_' + j,                  // fieldname_index pattern
                                    valueSubField.name + '_' + layoutType,         // fieldname_layout pattern
                                    'layout_' + layoutType + '_' + valueSubField.name // layout_layouttype_fieldname
                                );
                                
                                // Remove any duplicate or empty keys
                                possibleKeys = possibleKeys.filter(function(key, index, self) {
                                    return key && self.indexOf(key) === index;
                                });
                                
                                // Try different paths to find the value
                                var valueFound = false;
                                var checkPaths = [
                                    layoutValues,                      // Direct value
                                    layoutValues.value,                // Nested in value property
                                    layoutValues.fields,               // Nested in fields property
                                    layoutValues.data,                 // Nested in data property
                                    layoutValues[layoutType],          // Nested in layout type property
                                    valueSubField.key && layoutValues[valueSubField.key.replace('field_', '')], // Without field_ prefix
                                    layoutValues.acf                   // Nested in acf property
                                ];
                                
                                // Loop through all possible paths
                                for (var pi = 0; pi < checkPaths.length; pi++) {
                                    var path = checkPaths[pi];
                                    if (!path || typeof path !== 'object') continue;
                                    
                                    // Try all possible keys in each path
                                    for (var ki = 0; ki < possibleKeys.length; ki++) {
                                        var testKey = possibleKeys[ki];
                                        if (testKey && path[testKey] !== undefined) {
                                            valueSubField.value = path[testKey];
                                            valueFound = true;
                                            
                                            if (wpfe_data.debug_mode) {
                                                console.debug('Found value for field', valueSubField.name, 'with key', testKey, 'in path', pi);
                                            }
                                            break;
                                        }
                                    }
                                    
                                    if (valueFound) break;
                                }
                                
                                // Special handling for gallery fields which might be nested
                                if (!valueFound && valueSubField.type === 'gallery') {
                                    // Check if there's a gallery array stored in the layout
                                    var galleryKeys = ['gallery', 'images', 'photos', valueSubField.name + '_gallery', layoutType + '_gallery'];
                                    for (var gi = 0; gi < galleryKeys.length; gi++) {
                                        if (layoutValues[galleryKeys[gi]] && Array.isArray(layoutValues[galleryKeys[gi]])) {
                                            valueSubField.value = layoutValues[galleryKeys[gi]];
                                            valueFound = true;
                                            break;
                                        }
                                    }
                                }
                                
                                // Special handling for file/image fields
                                if (!valueFound && (valueSubField.type === 'image' || valueSubField.type === 'file')) {
                                    // Check for special formats for file/image fields
                                    for (var ki = 0; ki < possibleKeys.length; ki++) {
                                        var fileKey = possibleKeys[ki];
                                        
                                        // Try with ID suffix
                                        if (layoutValues[fileKey + '_id'] !== undefined) {
                                            valueSubField.value = layoutValues[fileKey + '_id'];
                                            valueFound = true;
                                            break;
                                        }
                                        
                                        // Try with URL suffix
                                        if (layoutValues[fileKey + '_url'] !== undefined) {
                                            valueSubField.value = {
                                                'url': layoutValues[fileKey + '_url'],
                                                'id': layoutValues[fileKey + '_id'] || 0
                                            };
                                            valueFound = true;
                                            break;
                                        }
                                    }
                                }
                                
                                // Final fallback - set to empty
                                if (!valueFound) {
                                    valueSubField.value = '';
                                    if (wpfe_data.debug_mode) {
                                        console.debug('No value found for field', valueSubField.key, 'in layout', layoutType, 'tried keys:', possibleKeys);
                                    }
                                }
                            } else {
                                valueSubField.value = '';
                            }
                            
                            // Render subfield
                            var valueSubFieldHtml = renderAcfField(valueSubField);
                            if (valueSubFieldHtml) {
                                html += valueSubFieldHtml;
                            }
                        }
                    }
                    
                    html += '</div>';
                    html += '</div>';
                }
            }
        }
        
        html += '</div>';
        
        // Add controls
        html += '<div class="wpfe-acf-fc-controls">';
        html += '<select class="wpfe-acf-fc-layout-select">';
        html += '<option value="">Select a layout</option>';
        html += layoutOptions;
        html += '</select>';
        html += '<button type="button" class="wpfe-acf-fc-add-layout"><span class="dashicons dashicons-plus"></span> Add Layout</button>';
        html += '</div>';
        
        // Store layout templates for JavaScript use
        html += layoutTemplates;
        
        // Add description
        if (fieldData.description) {
            html += '<p class="wpfe-field-description">' + WPFE.utils.sanitizeString(fieldData.description) + '</p>';
        }
        
        html += '</div>';
        
        return html;
    }
    
    /**
     * Render an ACF group field
     * 
     * @param {Object} fieldData The field data
     * @return {string} The rendered HTML
     */
    function renderAcfGroupField(fieldData) {
        var html = '<div class="wpfe-acf-field wpfe-acf-group-field" data-field-type="group">';
        
        // Add label
        if (fieldData.label) {
            html += '<label class="wpfe-field-label">' + WPFE.utils.sanitizeString(fieldData.label) + '</label>';
        }
        
        // Group fields container
        html += '<div class="wpfe-acf-group-fields">';
        
        // Process sub-fields
        if (fieldData.sub_fields && Array.isArray(fieldData.sub_fields)) {
            for (var i = 0; i < fieldData.sub_fields.length; i++) {
                var subField = JSON.parse(JSON.stringify(fieldData.sub_fields[i])); // Deep clone
                subField.name = fieldData.name + '[' + subField.key + ']';
                
                // Get value from group values with robust fallbacks
                if (fieldData.value && typeof fieldData.value === 'object') {
                    // Enhanced key matching for better field detection
                    var possibleKeys = [
                        subField.key,                              // Direct field key (field_xxx)
                        subField.name,                             // Full field name path
                        subField.key.replace('field_', ''),        // ACF sometimes strips field_ prefix
                        subField.name.split('[').pop().split(']')[0], // Last segment of name
                        subField.name.split('_').pop(),            // Last part after underscore
                        subField.name.replace(/[\[\]']+/g, ''),    // Name with brackets removed
                        subField.name.split(/[\[\]]+/).pop(),      // Last segment after bracket notation
                        'field_' + subField.name,                  // Some fields add field_ prefix
                        'acf_' + subField.name,                    // Some fields add acf_ prefix
                        '_' + subField.name                        // Some fields add _ prefix
                    ];
                    
                    // For nested field names, try the last segment
                    if (subField.name.includes('[')) {
                        var lastSegmentMatch = subField.name.match(/\[([^\]]+)\]$/);
                        if (lastSegmentMatch && lastSegmentMatch[1]) {
                            possibleKeys.push(lastSegmentMatch[1]);
                        }
                    }
                    
                    // For group fields, try specific group formats
                    if (fieldData.name && subField.name) {
                        possibleKeys.push(
                            fieldData.name + '_' + subField.name,     // group_field pattern
                            fieldData.name + ':' + subField.name,     // group:field pattern
                            subField.name.replace(fieldData.name + '_', ''), // Remove group prefix if present
                            subField.name.split(fieldData.name + '_').pop() // Get part after group prefix
                        );
                    }
                    
                    // Remove any duplicate or empty keys
                    possibleKeys = possibleKeys.filter(function(key, index, self) {
                        return key && self.indexOf(key) === index;
                    });
                    
                    // Try different paths to find the value
                    var valueFound = false;
                    var checkPaths = [
                        fieldData.value,                      // Direct value
                        fieldData.value && fieldData.value.value,  // Nested in value property
                        fieldData.value && fieldData.value.fields, // Nested in fields property
                        fieldData.value && fieldData.value.data,   // Nested in data property
                        fieldData.data,                       // Group data property
                        fieldData.fields                      // Group fields property
                    ];
                    
                    // Loop through all possible paths
                    for (var pi = 0; pi < checkPaths.length; pi++) {
                        var path = checkPaths[pi];
                        if (!path || typeof path !== 'object') continue;
                        
                        // Try all possible keys in each path
                        for (var ki = 0; ki < possibleKeys.length; ki++) {
                            var testKey = possibleKeys[ki];
                            if (testKey && path[testKey] !== undefined) {
                                subField.value = path[testKey];
                                valueFound = true;
                                
                                if (wpfe_data.debug_mode) {
                                    console.debug('Found value for group field', subField.name, 'with key', testKey, 'in path', pi);
                                }
                                break;
                            }
                        }
                        
                        if (valueFound) break;
                    }
                    
                    // Special handling for gallery fields 
                    if (!valueFound && subField.type === 'gallery') {
                        // Check if there's a gallery array stored in the group
                        var galleryKeys = ['gallery', 'images', 'photos', subField.name + '_gallery'];
                        for (var gi = 0; gi < galleryKeys.length; gi++) {
                            if (fieldData.value[galleryKeys[gi]] && Array.isArray(fieldData.value[galleryKeys[gi]])) {
                                subField.value = fieldData.value[galleryKeys[gi]];
                                valueFound = true;
                                break;
                            }
                        }
                    }
                    
                    // Special handling for file/image fields
                    if (!valueFound && (subField.type === 'image' || subField.type === 'file')) {
                        for (var ki = 0; ki < possibleKeys.length; ki++) {
                            var fileKey = possibleKeys[ki];
                            
                            // Try with ID suffix
                            if (fieldData.value[fileKey + '_id'] !== undefined) {
                                subField.value = fieldData.value[fileKey + '_id'];
                                valueFound = true;
                                break;
                            }
                            
                            // Try with URL suffix
                            if (fieldData.value[fileKey + '_url'] !== undefined) {
                                subField.value = {
                                    'url': fieldData.value[fileKey + '_url'],
                                    'id': fieldData.value[fileKey + '_id'] || 0
                                };
                                valueFound = true;
                                break;
                            }
                        }
                    }
                    
                    if (!valueFound) {
                        subField.value = '';
                        if (wpfe_data.debug_mode) {
                            console.debug('No value found for group field', subField.name, 'tried keys:', possibleKeys);
                        }
                    }
                } else {
                    subField.value = '';
                }
                
                // Render subfield
                var subFieldHtml = renderAcfField(subField);
                if (subFieldHtml) {
                    html += subFieldHtml;
                }
            }
        }
        
        html += '</div>'; // Close group fields container
        
        // Add description
        if (fieldData.description) {
            html += '<p class="wpfe-field-description">' + WPFE.utils.sanitizeString(fieldData.description) + '</p>';
        }
        
        html += '</div>'; // Close group field container
        
        return html;
    }
    
    /**
     * Render an ACF clone field
     * 
     * @param {Object} fieldData The field data
     * @return {string} The rendered HTML
     */
    function renderAcfCloneField(fieldData) {
        var html = '<div class="wpfe-acf-field wpfe-acf-clone-field" data-field-type="clone">';
        
        // Add label if display mode is set to show
        if (fieldData.label && (!fieldData.display || fieldData.display === 'group')) {
            html += '<label class="wpfe-field-label">' + WPFE.utils.sanitizeString(fieldData.label) + '</label>';
        }
        
        // Clone fields container
        html += '<div class="wpfe-acf-clone-fields">';
        
        // Process cloned fields (sub_fields property should contain the expanded cloned fields)
        if (fieldData.sub_fields && Array.isArray(fieldData.sub_fields)) {
            for (var i = 0; i < fieldData.sub_fields.length; i++) {
                var clonedField = JSON.parse(JSON.stringify(fieldData.sub_fields[i])); // Deep clone
                
                // Set proper name based on display mode (seamless or group)
                if (fieldData.display === 'seamless') {
                    clonedField.name = clonedField.name; // Keep original name for seamless display
                } else {
                    clonedField.name = fieldData.name + '[' + clonedField.key + ']'; // Group prefix
                }
                
                // Get value from clone values with robust fallbacks
                if (fieldData.value && typeof fieldData.value === 'object') {
                    // Try all possible key formats ACF might use
                    var possibleKeys = [
                        clonedField.key,                              // Direct field key (field_xxx)
                        clonedField.name,                             // Full field name path
                        clonedField.key.replace('field_', ''),        // ACF sometimes strips field_ prefix
                        clonedField.name.split('[').pop().split(']')[0], // Last segment of name
                        clonedField.name.split('_').pop(),            // Last part after underscore
                        clonedField.name.replace(/[\[\]']+/g, '')     // Name with brackets removed
                    ];
                    
                    // Try each possible key
                    var valueFound = false;
                    for (var ki = 0; ki < possibleKeys.length; ki++) {
                        var testKey = possibleKeys[ki];
                        if (testKey && fieldData.value[testKey] !== undefined) {
                            clonedField.value = fieldData.value[testKey];
                            valueFound = true;
                            break;
                        }
                    }
                    
                    if (!valueFound) {
                        clonedField.value = '';
                    }
                } else {
                    clonedField.value = '';
                }
                
                // Render cloned field
                var clonedFieldHtml = renderAcfField(clonedField);
                if (clonedFieldHtml) {
                    html += clonedFieldHtml;
                }
            }
        } else {
            // Fallback if no sub_fields are provided
            html += '<div class="wpfe-acf-clone-message">This clone field could not be rendered properly.</div>';
        }
        
        html += '</div>'; // Close clone fields container
        
        // Add description
        if (fieldData.description) {
            html += '<p class="wpfe-field-description">' + WPFE.utils.sanitizeString(fieldData.description) + '</p>';
        }
        
        html += '</div>'; // Close clone field container
        
        return html;
    }
    
    // Public API
    return {
        /**
         * Initialize ACF functionality
         */
        init: function() {
            // Initialize complex fields UI
            initAcfComplexFields();
            
            // Log supported field types for debugging
            if (wpfe_data && wpfe_data.debug_mode) {
                console.log('ACF Module initialized with field types:', Object.keys(acfFieldTypes));
            }
        },
        
        /**
         * Render an ACF field
         * 
         * @param {Object} fieldData The field data
         * @return {string|null} The rendered HTML or null if not supported
         */
        renderField: function(fieldData) {
            // Add debugging
            if (wpfe_data && wpfe_data.debug_mode) {
                console.log('Rendering ACF field:', fieldData.type, fieldData.name || fieldData.key);
            }
            
            // Special error handling for missing field type
            if (!fieldData || !fieldData.type) {
                console.error('Missing or invalid ACF field data:', fieldData);
                return '<div class="wpfe-acf-error">Invalid field data</div>';
            }
            
            // Call the internal renderer
            try {
                var result = renderAcfField(fieldData);
                return result;
            } catch (err) {
                console.error('Error rendering ACF field:', err, fieldData);
                return '<div class="wpfe-acf-error">Error rendering field: ' + fieldData.type + '</div>';
            }
        },
        
        /**
         * Check if a field type is an ACF field
         * 
         * @param {string} fieldType The field type to check
         * @return {boolean} Whether it's an ACF field
         */
        isAcfFieldType: function(fieldType) {
            return acfFieldTypes.hasOwnProperty(fieldType);
        },
        
        /**
         * Add event handlers for ACF fields
         * 
         * @param {jQuery} $container The container with ACF fields
         */
        addAcfFieldEventHandlers: function($container) {
            // Initialize various field types
            initAcfSubfields($container);
            
            // Debug info for initialized subfields
            if (wpfe_data && wpfe_data.debug_mode) {
                console.log('Initialized ACF subfields:', {
                    'datepickers': $container.find('.wpfe-acf-date-picker').length,
                    'colorpickers': $container.find('.wpfe-acf-color-picker').length,
                    'selects': $container.find('.wpfe-acf-select').length,
                    'repeaters': $container.find('.wpfe-acf-repeater').length,
                    'flexible_content': $container.find('.wpfe-acf-flexible-content').length,
                    'groups': $container.find('.wpfe-acf-group-field').length,
                    'clones': $container.find('.wpfe-acf-clone-field').length
                });
            }
        },
        
        /**
         * Get a list of all supported ACF field types
         * 
         * @return {string[]} Array of supported field types
         */
        getSupportedFieldTypes: function() {
            return Object.keys(acfFieldTypes);
        }
    };
})(jQuery);