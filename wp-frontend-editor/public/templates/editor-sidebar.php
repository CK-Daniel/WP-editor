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