<?php
/**
 * Frontend editor sidebar template.
 *
 * @package WPFrontendEditor
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="wpfe-editor-sidebar" class="wpfe-editor-sidebar" style="display: none;">
    <div class="wpfe-editor-sidebar-header">
        <h2 class="wpfe-editor-sidebar-title"><?php esc_html_e( 'Edit', 'wp-frontend-editor' ); ?> <span class="wpfe-editor-field-name"></span></h2>
        <button type="button" class="wpfe-editor-sidebar-close">
            <span class="dashicons dashicons-no-alt"></span>
            <span class="screen-reader-text"><?php esc_html_e( 'Close', 'wp-frontend-editor' ); ?></span>
        </button>
    </div>
    <div class="wpfe-editor-sidebar-content">
        <div class="wpfe-editor-sidebar-loading">
            <span class="dashicons dashicons-update-alt wpfe-editor-loading-spinner"></span>
            <p><?php esc_html_e( 'Loading...', 'wp-frontend-editor' ); ?></p>
        </div>
        <div class="wpfe-editor-sidebar-fields"></div>
    </div>
    <div class="wpfe-editor-sidebar-footer">
        <div class="wpfe-editor-message"></div>
        <div class="wpfe-editor-sidebar-actions">
            <button type="button" class="button wpfe-editor-sidebar-cancel"><?php esc_html_e( 'Cancel', 'wp-frontend-editor' ); ?></button>
            <button type="button" class="button button-primary wpfe-editor-sidebar-save"><?php esc_html_e( 'Save Changes', 'wp-frontend-editor' ); ?></button>
        </div>
    </div>
</div>
<div id="wpfe-editor-overlay" class="wpfe-editor-overlay" style="display: none;"></div>

<script type="text/template" id="wpfe-editor-field-template">
    <div class="wpfe-editor-field" data-field-name="{field_name}" data-field-type="{field_type}">
        <label for="wpfe-field-{field_name}">{field_label}</label>
        <div class="wpfe-editor-field-input">{field_input}</div>
    </div>
</script>

<script type="text/template" id="wpfe-editor-text-template">
    <input type="text" id="wpfe-field-{field_name}" name="{field_name}" value="{field_value}" class="wpfe-editor-input">
</script>

<script type="text/template" id="wpfe-editor-textarea-template">
    <textarea id="wpfe-field-{field_name}" name="{field_name}" rows="5" class="wpfe-editor-input">{field_value}</textarea>
</script>

<script type="text/template" id="wpfe-editor-wysiwyg-template">
    <div class="wpfe-editor-wysiwyg-container">
        <textarea id="wpfe-field-{field_name}" name="{field_name}" class="wpfe-editor-wysiwyg">{field_value}</textarea>
    </div>
</script>

<script type="text/template" id="wpfe-editor-image-template">
    <div class="wpfe-editor-image-preview">
        <img src="{image_url}" alt="" style="max-width: 100%; height: auto; display: {preview_display};">
    </div>
    <input type="hidden" id="wpfe-field-{field_name}" name="{field_name}" value="{field_value}" class="wpfe-editor-input">
    <div class="wpfe-editor-image-buttons">
        <button type="button" class="button wpfe-editor-image-select"><?php esc_html_e( 'Select Image', 'wp-frontend-editor' ); ?></button>
        <button type="button" class="button wpfe-editor-image-remove" style="display: {remove_display};"><?php esc_html_e( 'Remove Image', 'wp-frontend-editor' ); ?></button>
    </div>
</script>

<script type="text/template" id="wpfe-editor-gallery-template">
    <div class="wpfe-editor-gallery-field">
        <div class="wpfe-gallery-preview wpfe-sortable-gallery">
            {gallery_items}
        </div>
        <input type="hidden" id="wpfe-field-{field_name}" name="{field_name}" value="{field_value}" class="wpfe-editor-input">
        <div class="wpfe-gallery-buttons">
            <button type="button" class="button wpfe-gallery-add"><?php esc_html_e( 'Add Images', 'wp-frontend-editor' ); ?></button>
        </div>
    </div>
</script>

<script type="text/template" id="wpfe-editor-gallery-item-template">
    <div class="wpfe-gallery-item" data-id="{image_id}">
        <img src="{image_url}" alt="">
        <div class="wpfe-gallery-item-actions">
            <button type="button" class="wpfe-gallery-item-remove" aria-label="<?php esc_attr_e( 'Remove image', 'wp-frontend-editor' ); ?>">
                <span class="dashicons dashicons-no-alt"></span>
            </button>
        </div>
    </div>
</script>

<script type="text/template" id="wpfe-editor-taxonomy-template">
    <div class="wpfe-editor-taxonomy-field" data-taxonomy="{taxonomy}" data-hierarchical="{hierarchical}">
        <div class="wpfe-taxonomy-search">
            <input type="text" class="wpfe-taxonomy-search-input" placeholder="<?php esc_attr_e( 'Search...', 'wp-frontend-editor' ); ?>">
        </div>
        <div class="wpfe-taxonomy-items">
            {taxonomy_items}
        </div>
        <input type="hidden" id="wpfe-field-{field_name}" name="{field_name}" value="{field_value}" class="wpfe-editor-input">
    </div>
</script>

<script type="text/template" id="wpfe-editor-taxonomy-item-template">
    <div class="wpfe-taxonomy-item" style="padding-left: {indent}px;">
        <label>
            <input type="{input_type}" class="wpfe-taxonomy-checkbox" name="taxonomy_{taxonomy}[]" value="{term_id}" {checked}>
            {term_name} <span class="wpfe-term-count">({term_count})</span>
        </label>
    </div>
</script>

<script type="text/template" id="wpfe-editor-relationship-template">
    <div class="wpfe-editor-relationship-field" data-max="{max}" data-min="{min}" data-multiple="{multiple}">
        <div class="wpfe-relationship-search">
            <input type="text" class="wpfe-relationship-search-input" placeholder="<?php esc_attr_e( 'Search posts...', 'wp-frontend-editor' ); ?>">
        </div>
        
        <div class="wpfe-relationship-wrapper">
            <div class="wpfe-relationship-available">
                <h3><?php esc_html_e( 'Available items', 'wp-frontend-editor' ); ?></h3>
                <div class="wpfe-relationship-available-items">
                    {available_items}
                </div>
            </div>
            
            <div class="wpfe-relationship-selected">
                <h3><?php esc_html_e( 'Selected items', 'wp-frontend-editor' ); ?></h3>
                <div class="wpfe-relationship-selected-items" id="wpfe-relationship-selected-{field_name}">
                    {selected_items}
                </div>
            </div>
        </div>
        
        <input type="hidden" id="wpfe-field-{field_name}" name="{field_name}" value="{field_value}" class="wpfe-editor-input">
    </div>
</script>

<script type="text/template" id="wpfe-editor-relationship-item-template">
    <div class="wpfe-relationship-item" data-id="{post_id}">
        <div class="wpfe-relationship-item-title">{post_title}</div>
        <div class="wpfe-relationship-item-meta">{post_type} &bull; {post_date}</div>
        <button type="button" class="wpfe-relationship-{button_type}-button" data-id="{post_id}">
            <span class="dashicons dashicons-{button_icon}"></span>
        </button>
    </div>
</script>