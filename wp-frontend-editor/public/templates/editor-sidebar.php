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
        <div class="wpfe-editor-sidebar-header-content">
            <h2 class="wpfe-editor-sidebar-title">
                <span class="wpfe-editor-field-name"></span>
                <div class="wpfe-editor-field-badges">
                    <span class="wpfe-editor-field-type"></span>
                    <span class="wpfe-editor-field-source"></span>
                </div>
            </h2>
        </div>
        <div class="wpfe-editor-sidebar-controls">
            <button type="button" class="wpfe-editor-sidebar-minimize">
                <span class="dashicons dashicons-minus"></span>
                <span class="screen-reader-text"><?php esc_html_e( 'Minimize', 'wp-frontend-editor' ); ?></span>
            </button>
            <button type="button" class="wpfe-editor-sidebar-close">
                <span class="dashicons dashicons-no-alt"></span>
                <span class="screen-reader-text"><?php esc_html_e( 'Close', 'wp-frontend-editor' ); ?></span>
            </button>
        </div>
    </div>
    
    <div class="wpfe-editor-sidebar-tabs">
        <button type="button" class="wpfe-editor-tab active" data-tab="edit">
            <span class="dashicons dashicons-edit"></span>
            <?php esc_html_e( 'Edit', 'wp-frontend-editor' ); ?>
        </button>
        <button type="button" class="wpfe-editor-tab" data-tab="settings">
            <span class="dashicons dashicons-admin-generic"></span>
            <?php esc_html_e( 'Settings', 'wp-frontend-editor' ); ?>
        </button>
        <button type="button" class="wpfe-editor-tab" data-tab="history">
            <span class="dashicons dashicons-backup"></span>
            <?php esc_html_e( 'History', 'wp-frontend-editor' ); ?>
        </button>
    </div>
    
    <div class="wpfe-editor-sidebar-content">
        <div class="wpfe-editor-sidebar-loading">
            <div class="wpfe-editor-loading-spinner">
                <div class="wpfe-spinner-dot"></div>
                <div class="wpfe-spinner-dot"></div>
                <div class="wpfe-spinner-dot"></div>
            </div>
            <p><?php esc_html_e( 'Loading editor...', 'wp-frontend-editor' ); ?></p>
        </div>
        
        <!-- Edit tab content -->
        <div class="wpfe-editor-tab-content active" data-tab-content="edit">
            <div class="wpfe-editor-sidebar-fields">
                <!-- Field content will be inserted here -->
            </div>
        </div>
        
        <!-- Settings tab content -->
        <div class="wpfe-editor-tab-content" data-tab-content="settings">
            <div class="wpfe-editor-settings">
                <div class="wpfe-editor-setting">
                    <label>
                        <input type="checkbox" name="wpfe-live-preview" checked>
                        <?php esc_html_e( 'Live preview changes', 'wp-frontend-editor' ); ?>
                    </label>
                </div>
                <div class="wpfe-editor-setting">
                    <label>
                        <input type="checkbox" name="wpfe-expand-interface">
                        <?php esc_html_e( 'Full-width editor', 'wp-frontend-editor' ); ?>
                    </label>
                </div>
                <div class="wpfe-editor-setting">
                    <label>
                        <input type="checkbox" name="wpfe-wider-sidebar">
                        <?php esc_html_e( 'Wide sidebar for complex fields', 'wp-frontend-editor' ); ?>
                    </label>
                </div>
                <div class="wpfe-editor-setting wpfe-editor-setting-select">
                    <label for="wpfe-sidebar-position"><?php esc_html_e( 'Editor position', 'wp-frontend-editor' ); ?></label>
                    <select id="wpfe-sidebar-position" name="wpfe-sidebar-position">
                        <option value="right"><?php esc_html_e( 'Right', 'wp-frontend-editor' ); ?></option>
                        <option value="left"><?php esc_html_e( 'Left', 'wp-frontend-editor' ); ?></option>
                        <option value="bottom"><?php esc_html_e( 'Bottom', 'wp-frontend-editor' ); ?></option>
                    </select>
                </div>
            </div>
        </div>
        
        <!-- History tab content -->
        <div class="wpfe-editor-tab-content" data-tab-content="history">
            <div class="wpfe-editor-history">
                <p class="wpfe-editor-history-notice"><?php esc_html_e( 'Recent changes for this field will appear here', 'wp-frontend-editor' ); ?></p>
                <ul class="wpfe-editor-history-list">
                    <!-- History items will be added here -->
                </ul>
            </div>
        </div>
    </div>
    
    <div class="wpfe-editor-sidebar-footer">
        <div class="wpfe-editor-message"></div>
        <div class="wpfe-editor-sidebar-actions">
            <div class="wpfe-editor-secondary-actions">
                <a href="#" class="wpfe-editor-edit-backend">
                    <span class="dashicons dashicons-admin-site"></span>
                    <?php esc_html_e( 'Edit in Admin', 'wp-frontend-editor' ); ?>
                </a>
                <a href="#" class="wpfe-editor-keyboard-shortcuts">
                    <span class="dashicons dashicons-keyboard"></span>
                    <?php esc_html_e( 'Shortcuts', 'wp-frontend-editor' ); ?>
                </a>
            </div>
            <div class="wpfe-editor-main-actions">
                <button type="button" class="wpfe-editor-sidebar-cancel"><?php esc_html_e( 'Cancel', 'wp-frontend-editor' ); ?></button>
                <button type="button" class="wpfe-editor-sidebar-save"><?php esc_html_e( 'Save Changes', 'wp-frontend-editor' ); ?></button>
            </div>
        </div>
    </div>
</div>

<div id="wpfe-editor-overlay" class="wpfe-editor-overlay" style="display: none;"></div>
<div id="wpfe-editor-minimized" class="wpfe-editor-minimized" style="display: none;">
    <button type="button" class="wpfe-editor-restore">
        <span class="dashicons dashicons-editor-expand"></span>
        <span class="wpfe-editor-minimized-title"></span>
    </button>
</div>

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