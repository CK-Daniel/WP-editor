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
        text: 'text',
        textarea: 'textarea',
        wysiwyg: 'wysiwyg',
        image: 'image',
        gallery: 'gallery',
        file: 'file',
        select: 'select',
        checkbox: 'checkbox',
        radio: 'radio',
        true_false: 'true_false',
        date_picker: 'date_picker',
        color_picker: 'color_picker',
        link: 'link',
        repeater: 'repeater',
        flexible_content: 'flexible_content'
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
            
            // Update all input names
            $row.find('input, select, textarea').each(function() {
                var $input = $(this);
                var name = $input.attr('name');
                
                if (name) {
                    name = name.replace(/\[\d+\]/, '[' + index + ']');
                    $input.attr('name', name);
                }
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
            
            // Update all input names
            $layout.find('input, select, textarea').each(function() {
                var $input = $(this);
                var name = $input.attr('name');
                
                if (name) {
                    name = name.replace(/\[\d+\]/, '[' + index + ']');
                    $input.attr('name', name);
                }
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
                
            case acfFieldTypes.repeater:
                return renderAcfRepeaterField(fieldData);
                
            case acfFieldTypes.flexible_content:
                return renderAcfFlexibleContentField(fieldData);
                
            default:
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
                var subField = fieldData.sub_fields[i];
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
                    var valueSubField = fieldData.sub_fields[k];
                    valueSubField.name = fieldData.name + '[' + j + '][' + valueSubField.key + ']';
                    
                    // Get value from row values
                    valueSubField.value = rowValues[valueSubField.key] || '';
                    
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
        
        // Store row template for JavaScript use
        html += '<script type="text/template" class="wpfe-acf-repeater-template" data-row-template="' + rowTemplate + '"></script>';
        
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
                            var subField = layout.sub_fields[i];
                            subField.name = fieldData.name + '[{i}][' + layout.key + '][' + subField.key + ']';
                            
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
                    
                    // Add to layout templates
                    layoutTemplates += '<script type="text/template" class="wpfe-acf-fc-layout-template" data-layout-template-' + WPFE.utils.sanitizeString(layoutName) + '="' + layoutTemplate + '"></script>';
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
                            var valueSubField = existingLayout.sub_fields[k];
                            valueSubField.name = fieldData.name + '[' + j + '][' + existingLayout.key + '][' + valueSubField.key + ']';
                            
                            // Get value from layout values
                            valueSubField.value = layoutValues[valueSubField.key] || '';
                            
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
    
    // Public API
    return {
        /**
         * Initialize ACF functionality
         */
        init: function() {
            // Initialize complex fields UI
            initAcfComplexFields();
        },
        
        /**
         * Render an ACF field
         * 
         * @param {Object} fieldData The field data
         * @return {string|null} The rendered HTML or null if not supported
         */
        renderField: renderAcfField,
        
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
        }
    };
})(jQuery);