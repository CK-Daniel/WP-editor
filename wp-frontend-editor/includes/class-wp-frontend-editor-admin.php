<?php
/**
 * The admin class.
 *
 * @package WPFrontendEditor
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Admin class.
 */
class WP_Frontend_Editor_Admin {

    /**
     * Constructor.
     */
    public function __construct() {
        // Add admin menu
        add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
        
        // Register settings
        add_action( 'admin_init', array( $this, 'register_settings' ) );
        
        // Add settings link to plugins page
        add_filter( 'plugin_action_links_' . WPFE_PLUGIN_BASENAME, array( $this, 'add_settings_link' ) );
        
        // Enqueue admin scripts and styles
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_scripts' ) );
    }

    /**
     * Add admin menu.
     */
    public function add_admin_menu() {
        // Create main menu item
        $main_page = add_menu_page(
            __( 'Frontend Editor', 'wp-frontend-editor' ),
            __( 'Frontend Editor', 'wp-frontend-editor' ),
            'manage_options',
            'wp-frontend-editor',
            array( $this, 'render_settings_page' ),
            'dashicons-edit', // Use edit icon
            30 // Position after Comments
        );
        
        // Add settings submenu page (which is the same as the main page)
        $settings_page = add_submenu_page(
            'wp-frontend-editor',
            __( 'Settings', 'wp-frontend-editor' ),
            __( 'Settings', 'wp-frontend-editor' ),
            'manage_options',
            'wp-frontend-editor',
            array( $this, 'render_settings_page' )
        );
        
        // Add documentation page
        $docs_page = add_submenu_page(
            'wp-frontend-editor',
            __( 'Documentation', 'wp-frontend-editor' ),
            __( 'Documentation', 'wp-frontend-editor' ),
            'manage_options',
            'wp-frontend-editor-docs',
            array( $this, 'render_docs_page' )
        );
        
        // Log when settings page is accessed
        add_action( 'load-' . $settings_page, function() {
            wpfe_log( 'Settings page accessed', 'info', array(
                'user_id' => get_current_user_id(),
                'user_name' => wp_get_current_user()->display_name
            ));
        });
        
        // Log when docs page is accessed
        add_action( 'load-' . $docs_page, function() {
            wpfe_log( 'Documentation page accessed', 'info', array(
                'user_id' => get_current_user_id(),
                'user_name' => wp_get_current_user()->display_name
            ));
        });
    }
    
    /**
     * Render the documentation page.
     */
    public function render_docs_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }
        ?>
        <div class="wrap">
            <h1><?php esc_html_e( 'Frontend Editor Documentation', 'wp-frontend-editor' ); ?></h1>
            
            <div class="wpfe-admin-section">
                <div class="wpfe-admin-section-header">
                    <h2 class="wpfe-admin-section-title">
                        <span class="dashicons dashicons-welcome-learn-more"></span>
                        <?php esc_html_e( 'Getting Started', 'wp-frontend-editor' ); ?>
                    </h2>
                </div>
                <div class="wpfe-admin-section-content">
                    <p>
                        <?php esc_html_e( 'The Frontend Editor plugin allows your users to edit content directly from the frontend of your website. Here\'s how to get started:', 'wp-frontend-editor' ); ?>
                    </p>
                    
                    <ol>
                        <li><?php esc_html_e( 'Configure which post types should be editable in the Settings page', 'wp-frontend-editor' ); ?></li>
                        <li><?php esc_html_e( 'Choose which fields should be available for editing', 'wp-frontend-editor' ); ?></li>
                        <li><?php esc_html_e( 'Set up user permissions to control who can edit content', 'wp-frontend-editor' ); ?></li>
                        <li><?php esc_html_e( 'Visit your site while logged in to see and use the frontend editor', 'wp-frontend-editor' ); ?></li>
                    </ol>
                </div>
            </div>
            
            <div class="wpfe-admin-section">
                <div class="wpfe-admin-section-header">
                    <h2 class="wpfe-admin-section-title">
                        <span class="dashicons dashicons-admin-customizer"></span>
                        <?php esc_html_e( 'Advanced Custom Fields Support', 'wp-frontend-editor' ); ?>
                    </h2>
                </div>
                <div class="wpfe-admin-section-content">
                    <p>
                        <?php esc_html_e( 'The Frontend Editor includes full support for Advanced Custom Fields, including complex field types:', 'wp-frontend-editor' ); ?>
                    </p>
                    
                    <ul>
                        <li><?php esc_html_e( 'Repeater Fields', 'wp-frontend-editor' ); ?></li>
                        <li><?php esc_html_e( 'Flexible Content', 'wp-frontend-editor' ); ?></li>
                        <li><?php esc_html_e( 'Group Fields', 'wp-frontend-editor' ); ?></li>
                        <li><?php esc_html_e( 'Gallery Fields', 'wp-frontend-editor' ); ?></li>
                        <li><?php esc_html_e( 'Image Fields', 'wp-frontend-editor' ); ?></li>
                        <li><?php esc_html_e( 'WYSIWYG Editors', 'wp-frontend-editor' ); ?></li>
                        <li><?php esc_html_e( 'And more...', 'wp-frontend-editor' ); ?></li>
                    </ul>
                    
                    <p>
                        <?php esc_html_e( 'To use ACF fields, simply make sure they are enabled in the Content tab of the settings.', 'wp-frontend-editor' ); ?>
                    </p>
                </div>
            </div>
            
            <div class="wpfe-admin-section">
                <div class="wpfe-admin-section-header">
                    <h2 class="wpfe-admin-section-title">
                        <span class="dashicons dashicons-editor-help"></span>
                        <?php esc_html_e( 'Troubleshooting', 'wp-frontend-editor' ); ?>
                    </h2>
                </div>
                <div class="wpfe-admin-section-content">
                    <p>
                        <?php esc_html_e( 'If you encounter any issues with the Frontend Editor, try these steps:', 'wp-frontend-editor' ); ?>
                    </p>
                    
                    <ol>
                        <li><?php esc_html_e( 'Check the Logs page for any error messages', 'wp-frontend-editor' ); ?></li>
                        <li><?php esc_html_e( 'Ensure your theme is compatible by checking for any JavaScript errors in the browser console', 'wp-frontend-editor' ); ?></li>
                        <li><?php esc_html_e( 'Verify that users have the correct permissions to edit content', 'wp-frontend-editor' ); ?></li>
                        <li><?php esc_html_e( 'Try disabling other plugins to check for conflicts', 'wp-frontend-editor' ); ?></li>
                    </ol>
                    
                    <p>
                        <?php esc_html_e( 'For additional help, visit our support forum or contact us directly.', 'wp-frontend-editor' ); ?>
                    </p>
                </div>
            </div>
        </div>
        <?php
    }

    /**
     * Register settings.
     */
    public function register_settings() {
        // Register a setting group
        register_setting(
            'wpfe_settings',
            'wpfe_options',
            array( $this, 'sanitize_settings' )
        );

        // We don't need to add settings sections and fields here
        // as we'll handle them manually in the custom UI
    }

    /**
     * Sanitize settings.
     *
     * @param array $input The input settings.
     * @return array The sanitized settings.
     */
    public function sanitize_settings( $input ) {
        $sanitized = array();

        // Sanitize general settings
        $sanitized['enable_inline'] = isset( $input['enable_inline'] ) ? 1 : 0;
        $sanitized['sidebar_width'] = isset( $input['sidebar_width'] ) ? absint( $input['sidebar_width'] ) : 350;
        $sanitized['button_position'] = isset( $input['button_position'] ) ? sanitize_text_field( $input['button_position'] ) : 'top-right';
        $sanitized['button_style'] = isset( $input['button_style'] ) ? sanitize_text_field( $input['button_style'] ) : 'icon-only';
        $sanitized['highlight_editable'] = isset( $input['highlight_editable'] ) ? 1 : 0;

        // Sanitize post types
        $sanitized['post_types'] = isset( $input['post_types'] ) && is_array( $input['post_types'] ) 
            ? array_map( 'sanitize_text_field', $input['post_types'] ) 
            : array( 'post', 'page' );

        // Sanitize core fields
        $sanitized['core_fields'] = isset( $input['core_fields'] ) && is_array( $input['core_fields'] ) 
            ? array_map( 'sanitize_text_field', $input['core_fields'] ) 
            : array( 'title', 'content', 'excerpt' );

        // Sanitize ACF fields if ACF is active
        if ( class_exists( 'ACF' ) && isset( $input['acf_fields'] ) && is_array( $input['acf_fields'] ) ) {
            $sanitized['acf_fields'] = array_map( 'sanitize_text_field', $input['acf_fields'] );
        }

        // Sanitize user capabilities
        $sanitized['user_caps'] = isset( $input['user_caps'] ) && is_array( $input['user_caps'] ) 
            ? array_map( 'sanitize_text_field', $input['user_caps'] ) 
            : array( 'edit_posts' );

        return $sanitized;
    }

    /**
     * Render the settings page.
     */
    public function render_settings_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        $options = $this->get_options();
        ?>
        <div class="wrap wpfe-admin-wrap">
            <?php if ( isset( $_GET['settings-updated'] ) && $_GET['settings-updated'] ) : ?>
                <div class="notice notice-success wpfe-admin-notice is-dismissible">
                    <p><?php esc_html_e( 'Settings saved successfully.', 'wp-frontend-editor' ); ?></p>
                </div>
            <?php endif; ?>

            <div class="wpfe-admin-header">
                <div>
                    <h1 class="wpfe-admin-header-title">
                        <?php esc_html_e( 'Frontend Editor Settings', 'wp-frontend-editor' ); ?>
                        <span class="wpfe-admin-header-version"><?php echo esc_html( WPFE_VERSION ); ?></span>
                    </h1>
                    <p class="wpfe-admin-header-description">
                        <?php esc_html_e( 'Configure how the frontend editor works and which content can be edited.', 'wp-frontend-editor' ); ?>
                    </p>
                </div>
                <div>
                    <img src="<?php echo esc_url( WPFE_PLUGIN_URL . 'admin/images/frontend-editor-icon.svg' ); ?>" alt="Frontend Editor" width="64" height="64">
                </div>
            </div>

            <div class="wpfe-admin-tabs">
                <button class="wpfe-admin-tab active" data-tab="wpfe-tab-general">
                    <span class="dashicons dashicons-admin-settings"></span>
                    <?php esc_html_e( 'General', 'wp-frontend-editor' ); ?>
                </button>
                <button class="wpfe-admin-tab" data-tab="wpfe-tab-content">
                    <span class="dashicons dashicons-edit"></span>
                    <?php esc_html_e( 'Content', 'wp-frontend-editor' ); ?>
                </button>
                <button class="wpfe-admin-tab" data-tab="wpfe-tab-permissions">
                    <span class="dashicons dashicons-lock"></span>
                    <?php esc_html_e( 'Permissions', 'wp-frontend-editor' ); ?>
                </button>
                <button class="wpfe-admin-tab" data-tab="wpfe-tab-advanced">
                    <span class="dashicons dashicons-admin-tools"></span>
                    <?php esc_html_e( 'Advanced', 'wp-frontend-editor' ); ?>
                </button>
            </div>

            <form method="post" action="options.php" class="wpfe-settings-form">
                <?php settings_fields( 'wpfe_settings' ); ?>

                <!-- General Tab -->
                <div id="wpfe-tab-general" class="wpfe-admin-tab-content active">
                    <div class="wpfe-info-card info">
                        <h3><?php esc_html_e( 'Editor Configuration', 'wp-frontend-editor' ); ?></h3>
                        <p><?php esc_html_e( 'Configure the appearance and behavior of the frontend editor interface.', 'wp-frontend-editor' ); ?></p>
                    </div>

                    <div id="wpfe-appearance-section" class="wpfe-admin-section">
                        <div class="wpfe-admin-section-header">
                            <h2 class="wpfe-admin-section-title">
                                <span class="dashicons dashicons-admin-appearance"></span>
                                <?php esc_html_e( 'Appearance', 'wp-frontend-editor' ); ?>
                            </h2>
                            <button type="button" class="wpfe-admin-section-toggle dashicons dashicons-arrow-up open"></button>
                        </div>
                        
                        <div class="wpfe-admin-section-content">
                            <div class="wpfe-admin-field-row">
                                <div class="wpfe-admin-field-col">
                                    <div class="wpfe-admin-field">
                                        <label for="wpfe-sidebar-width"><?php esc_html_e( 'Sidebar Width', 'wp-frontend-editor' ); ?></label>
                                        <input type="number" id="wpfe-sidebar-width" name="wpfe_options[sidebar_width]" 
                                               value="<?php echo esc_attr( $options['sidebar_width'] ); ?>" 
                                               min="250" max="800" step="10" class="wpfe-input">
                                        <span class="description">
                                            <?php esc_html_e( 'Width of the editor sidebar in pixels (between 250 and 800).', 'wp-frontend-editor' ); ?>
                                        </span>
                                    </div>
                                </div>
                                
                                <div class="wpfe-admin-field-col">
                                    <div class="wpfe-admin-field">
                                        <label for="wpfe-button-position"><?php esc_html_e( 'Edit Button Position', 'wp-frontend-editor' ); ?></label>
                                        <select id="wpfe-button-position" name="wpfe_options[button_position]" class="wpfe-input wpfe-select">
                                            <option value="top-right" <?php selected( $options['button_position'] ?? 'top-right', 'top-right' ); ?>>
                                                <?php esc_html_e( 'Top Right', 'wp-frontend-editor' ); ?>
                                            </option>
                                            <option value="top-left" <?php selected( $options['button_position'] ?? 'top-right', 'top-left' ); ?>>
                                                <?php esc_html_e( 'Top Left', 'wp-frontend-editor' ); ?>
                                            </option>
                                            <option value="bottom-right" <?php selected( $options['button_position'] ?? 'top-right', 'bottom-right' ); ?>>
                                                <?php esc_html_e( 'Bottom Right', 'wp-frontend-editor' ); ?>
                                            </option>
                                            <option value="bottom-left" <?php selected( $options['button_position'] ?? 'top-right', 'bottom-left' ); ?>>
                                                <?php esc_html_e( 'Bottom Left', 'wp-frontend-editor' ); ?>
                                            </option>
                                        </select>
                                        <span class="description">
                                            <?php esc_html_e( 'Position of the edit button on hover.', 'wp-frontend-editor' ); ?>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div class="wpfe-admin-field-row">
                                <div class="wpfe-admin-field-col">
                                    <div class="wpfe-admin-field">
                                        <label for="wpfe-button-style"><?php esc_html_e( 'Edit Button Style', 'wp-frontend-editor' ); ?></label>
                                        <select id="wpfe-button-style" name="wpfe_options[button_style]" class="wpfe-input wpfe-select">
                                            <option value="icon-only" <?php selected( $options['button_style'] ?? 'icon-only', 'icon-only' ); ?>>
                                                <?php esc_html_e( 'Icon Only', 'wp-frontend-editor' ); ?>
                                            </option>
                                            <option value="icon-text" <?php selected( $options['button_style'] ?? 'icon-only', 'icon-text' ); ?>>
                                                <?php esc_html_e( 'Icon + Text', 'wp-frontend-editor' ); ?>
                                            </option>
                                            <option value="text-only" <?php selected( $options['button_style'] ?? 'icon-only', 'text-only' ); ?>>
                                                <?php esc_html_e( 'Text Only', 'wp-frontend-editor' ); ?>
                                            </option>
                                        </select>
                                        <span class="description">
                                            <?php esc_html_e( 'Style of the edit button that appears on hover.', 'wp-frontend-editor' ); ?>
                                        </span>
                                    </div>
                                </div>
                                
                                <div class="wpfe-admin-field-col">
                                    <div class="wpfe-toggle-row">
                                        <label class="wpfe-toggle-switch">
                                            <input type="checkbox" name="wpfe_options[highlight_editable]" value="1" 
                                                  <?php checked( isset( $options['highlight_editable'] ) && $options['highlight_editable'] ); ?>>
                                            <span class="wpfe-toggle-slider"></span>
                                        </label>
                                        <label for="wpfe-highlight-editable">
                                            <?php esc_html_e( 'Highlight Editable Elements', 'wp-frontend-editor' ); ?>
                                            <span class="description">
                                                <?php esc_html_e( 'Show a subtle highlight on editable elements for logged-in editors.', 'wp-frontend-editor' ); ?>
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="wpfe-behavior-section" class="wpfe-admin-section">
                        <div class="wpfe-admin-section-header">
                            <h2 class="wpfe-admin-section-title">
                                <span class="dashicons dashicons-admin-generic"></span>
                                <?php esc_html_e( 'Behavior', 'wp-frontend-editor' ); ?>
                            </h2>
                            <button type="button" class="wpfe-admin-section-toggle dashicons dashicons-arrow-down"></button>
                        </div>
                        
                        <div class="wpfe-admin-section-content" style="display: none;">
                            <div class="wpfe-toggle-row">
                                <label class="wpfe-toggle-switch">
                                    <input type="checkbox" name="wpfe_options[enable_inline]" value="1" class="wpfe-toggle-main"
                                          <?php checked( isset( $options['enable_inline'] ) && $options['enable_inline'] ); ?>>
                                    <span class="wpfe-toggle-slider"></span>
                                </label>
                                <label>
                                    <?php esc_html_e( 'Enable Inline Editing', 'wp-frontend-editor' ); ?>
                                    <span class="description">
                                        <?php esc_html_e( 'Allow editing text directly on the page in addition to the sidebar.', 'wp-frontend-editor' ); ?>
                                    </span>
                                </label>
                            </div>

                            <div class="wpfe-toggles-group <?php echo isset( $options['enable_inline'] ) && $options['enable_inline'] ? '' : 'hidden'; ?>">
                                <div class="wpfe-admin-field-row">
                                    <div class="wpfe-admin-field-col">
                                        <div class="wpfe-toggle-row">
                                            <label class="wpfe-toggle-switch">
                                                <input type="checkbox" name="wpfe_options[auto_save_inline]" value="1"
                                                      <?php checked( isset( $options['auto_save_inline'] ) && $options['auto_save_inline'] ); ?>>
                                                <span class="wpfe-toggle-slider"></span>
                                            </label>
                                            <label>
                                                <?php esc_html_e( 'Auto-save Inline Edits', 'wp-frontend-editor' ); ?>
                                                <span class="description">
                                                    <?php esc_html_e( 'Automatically save changes when finishing an inline edit.', 'wp-frontend-editor' ); ?>
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="wpfe-toggle-row">
                                <label class="wpfe-toggle-switch">
                                    <input type="checkbox" name="wpfe_options[show_toolbar]" value="1"
                                          <?php checked( isset( $options['show_toolbar'] ) && $options['show_toolbar'] ); ?>>
                                    <span class="wpfe-toggle-slider"></span>
                                </label>
                                <label>
                                    <?php esc_html_e( 'Show Editing Toolbar', 'wp-frontend-editor' ); ?>
                                    <span class="description">
                                        <?php esc_html_e( 'Show a small toolbar at the top of the page when in editing mode.', 'wp-frontend-editor' ); ?>
                                    </span>
                                </label>
                            </div>

                            <div class="wpfe-toggle-row">
                                <label class="wpfe-toggle-switch">
                                    <input type="checkbox" name="wpfe_options[live_preview]" value="1"
                                          <?php checked( isset( $options['live_preview'] ) && $options['live_preview'] ); ?>>
                                    <span class="wpfe-toggle-slider"></span>
                                </label>
                                <label>
                                    <?php esc_html_e( 'Live Preview', 'wp-frontend-editor' ); ?>
                                    <span class="description">
                                        <?php esc_html_e( 'Update the page content in real-time as you type in the sidebar.', 'wp-frontend-editor' ); ?>
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Content Tab -->
                <div id="wpfe-tab-content" class="wpfe-admin-tab-content">
                    <div class="wpfe-info-card info">
                        <h3><?php esc_html_e( 'Content Settings', 'wp-frontend-editor' ); ?></h3>
                        <p><?php esc_html_e( 'Choose which content types and fields can be edited from the frontend.', 'wp-frontend-editor' ); ?></p>
                    </div>

                    <div id="wpfe-post-types-section" class="wpfe-admin-section">
                        <div class="wpfe-admin-section-header">
                            <h2 class="wpfe-admin-section-title">
                                <span class="dashicons dashicons-admin-post"></span>
                                <?php esc_html_e( 'Post Types', 'wp-frontend-editor' ); ?>
                            </h2>
                            <button type="button" class="wpfe-admin-section-toggle dashicons dashicons-arrow-up open"></button>
                        </div>
                        
                        <div class="wpfe-admin-section-content">
                            <div class="wpfe-admin-field">
                                <label><?php esc_html_e( 'Enabled Post Types', 'wp-frontend-editor' ); ?></label>
                                <p class="description">
                                    <?php esc_html_e( 'Select which post types should support frontend editing.', 'wp-frontend-editor' ); ?>
                                </p>
                                
                                <div class="wpfe-admin-field-group">
                                    <div class="wpfe-checkbox-wrap">
                                        <input type="checkbox" id="wpfe-select-all-post-types" class="wpfe-select-all">
                                        <label for="wpfe-select-all-post-types"><?php esc_html_e( 'Select All', 'wp-frontend-editor' ); ?></label>
                                    </div>
                                    
                                    <div class="wpfe-admin-checkboxes-grid">
                                        <?php 
                                        $selected_post_types = isset( $options['post_types'] ) ? $options['post_types'] : array( 'post', 'page' );
                                        $post_types = get_post_types( array( 'public' => true ), 'objects' );
                                        
                                        foreach ( $post_types as $post_type ) :
                                            $checked = in_array( $post_type->name, $selected_post_types, true ) ? 'checked' : '';
                                        ?>
                                            <label class="wpfe-checkbox-wrap">
                                                <input type="checkbox" name="wpfe_options[post_types][]" value="<?php echo esc_attr( $post_type->name ); ?>" <?php echo $checked; ?>>
                                                <span class="wpfe-checkmark"></span>
                                                <?php echo esc_html( $post_type->label ); ?>
                                            </label>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="wpfe-fields-section" class="wpfe-admin-section">
                        <div class="wpfe-admin-section-header">
                            <h2 class="wpfe-admin-section-title">
                                <span class="dashicons dashicons-admin-generic"></span>
                                <?php esc_html_e( 'WordPress Fields', 'wp-frontend-editor' ); ?>
                            </h2>
                            <button type="button" class="wpfe-admin-section-toggle dashicons dashicons-arrow-up open"></button>
                        </div>
                        
                        <div class="wpfe-admin-section-content">
                            <div class="wpfe-admin-field">
                                <label><?php esc_html_e( 'Editable WordPress Fields', 'wp-frontend-editor' ); ?></label>
                                <p class="description">
                                    <?php esc_html_e( 'Select which fields should be editable from the frontend.', 'wp-frontend-editor' ); ?>
                                </p>
                                
                                <div class="wpfe-admin-field-group">
                                    <div class="wpfe-checkbox-wrap">
                                        <input type="checkbox" id="wpfe-select-all-wp-fields" class="wpfe-select-all">
                                        <label for="wpfe-select-all-wp-fields"><?php esc_html_e( 'Select All', 'wp-frontend-editor' ); ?></label>
                                    </div>
                                    
                                    <div class="wpfe-admin-checkboxes-grid">
                                        <?php 
                                        $selected_fields = isset( $options['core_fields'] ) ? $options['core_fields'] : array( 'title', 'content', 'excerpt', 'featured_image' );
                                        
                                        $core_fields = array(
                                            'title'          => __( 'Title', 'wp-frontend-editor' ),
                                            'content'        => __( 'Content', 'wp-frontend-editor' ),
                                            'excerpt'        => __( 'Excerpt', 'wp-frontend-editor' ),
                                            'featured_image' => __( 'Featured Image', 'wp-frontend-editor' ),
                                            'date'           => __( 'Date', 'wp-frontend-editor' ),
                                            'categories'     => __( 'Categories', 'wp-frontend-editor' ),
                                            'tags'           => __( 'Tags', 'wp-frontend-editor' ),
                                            'status'         => __( 'Status', 'wp-frontend-editor' ),
                                        );
                                        
                                        foreach ( $core_fields as $field => $label ) :
                                            $checked = in_array( $field, $selected_fields, true ) ? 'checked' : '';
                                        ?>
                                            <label class="wpfe-checkbox-wrap">
                                                <input type="checkbox" name="wpfe_options[core_fields][]" value="<?php echo esc_attr( $field ); ?>" <?php echo $checked; ?>>
                                                <span class="wpfe-checkmark"></span>
                                                <?php echo esc_html( $label ); ?>
                                            </label>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <?php if ( class_exists( 'ACF' ) ) : ?>
                    <div id="wpfe-acf-section" class="wpfe-admin-section">
                        <div class="wpfe-admin-section-header">
                            <h2 class="wpfe-admin-section-title">
                                <span class="dashicons dashicons-editor-table"></span>
                                <?php esc_html_e( 'Advanced Custom Fields', 'wp-frontend-editor' ); ?>
                            </h2>
                            <button type="button" class="wpfe-admin-section-toggle dashicons dashicons-arrow-up open"></button>
                        </div>
                        
                        <div class="wpfe-admin-section-content">
                            <div class="wpfe-admin-field">
                                <div class="wpfe-search-field">
                                    <div class="wpfe-search-input-wrap">
                                        <span class="dashicons dashicons-search wpfe-search-icon"></span>
                                        <input type="text" class="wpfe-search-input" placeholder="<?php esc_attr_e( 'Search fields...', 'wp-frontend-editor' ); ?>">
                                        <button type="button" class="wpfe-search-clear dashicons dashicons-no-alt"></button>
                                    </div>
                                </div>
                                
                                <div class="wpfe-admin-field-group">
                                    <div class="wpfe-checkbox-wrap">
                                        <input type="checkbox" id="wpfe-select-all-acf-fields" class="wpfe-select-all">
                                        <label for="wpfe-select-all-acf-fields"><?php esc_html_e( 'Select All Fields', 'wp-frontend-editor' ); ?></label>
                                    </div>
                                    
                                    <?php 
                                    $selected_acf_fields = isset( $options['acf_fields'] ) ? $options['acf_fields'] : array();
                                    $field_groups = acf_get_field_groups();
                                    
                                    if ( empty( $field_groups ) ) :
                                        echo '<p>' . esc_html__( 'No ACF field groups found.', 'wp-frontend-editor' ) . '</p>';
                                    else :
                                        foreach ( $field_groups as $field_group ) :
                                            $fields = acf_get_fields( $field_group );
                                            
                                            if ( empty( $fields ) ) {
                                                continue;
                                            }
                                    ?>
                                            <h4 class="wpfe-admin-field-group-title"><?php echo esc_html( $field_group['title'] ); ?></h4>
                                            
                                            <div class="wpfe-acf-fields-container">
                                                <?php foreach ( $fields as $field ) : 
                                                    $checked = in_array( $field['key'], $selected_acf_fields, true ) ? 'checked' : '';
                                                    $selected_class = $checked ? 'selected' : '';
                                                ?>
                                                    <div class="wpfe-acf-field-card <?php echo esc_attr( $selected_class ); ?>">
                                                        <input type="checkbox" name="wpfe_options[acf_fields][]" value="<?php echo esc_attr( $field['key'] ); ?>" <?php echo $checked; ?>>
                                                        <p class="wpfe-field-name"><?php echo esc_html( $field['label'] ); ?></p>
                                                        <div class="wpfe-field-key"><?php echo esc_html( $field['name'] ); ?></div>
                                                        <span class="wpfe-field-type"><?php echo esc_html( $field['type'] ); ?></span>
                                                    </div>
                                                <?php endforeach; ?>
                                            </div>
                                    <?php
                                        endforeach;
                                    endif;
                                    ?>
                                </div>
                            </div>
                        </div>
                    </div>
                    <?php endif; ?>
                </div>

                <!-- Permissions Tab -->
                <div id="wpfe-tab-permissions" class="wpfe-admin-tab-content">
                    <div class="wpfe-info-card warning">
                        <h3><?php esc_html_e( 'User Permissions', 'wp-frontend-editor' ); ?></h3>
                        <p><?php esc_html_e( 'Choose which user roles can access the frontend editor functionality.', 'wp-frontend-editor' ); ?></p>
                    </div>

                    <div id="wpfe-permissions-section" class="wpfe-admin-section">
                        <div class="wpfe-admin-section-header">
                            <h2 class="wpfe-admin-section-title">
                                <span class="dashicons dashicons-groups"></span>
                                <?php esc_html_e( 'User Roles', 'wp-frontend-editor' ); ?>
                            </h2>
                            <button type="button" class="wpfe-admin-section-toggle dashicons dashicons-arrow-up open"></button>
                        </div>
                        
                        <div class="wpfe-admin-section-content">
                            <div class="wpfe-admin-field">
                                <label><?php esc_html_e( 'Who Can Edit Content?', 'wp-frontend-editor' ); ?></label>
                                <p class="description">
                                    <?php esc_html_e( 'Select which user roles can edit content from the frontend.', 'wp-frontend-editor' ); ?>
                                </p>
                                
                                <div class="wpfe-admin-field-group">
                                    <?php 
                                    $selected_roles = isset( $options['user_roles'] ) ? $options['user_roles'] : array( 'administrator', 'editor' );
                                    $roles = wp_roles()->roles;
                                    
                                    foreach ( $roles as $role_key => $role ) :
                                        $checked = in_array( $role_key, $selected_roles, true ) ? 'checked' : '';
                                    ?>
                                        <div class="wpfe-toggle-row">
                                            <label class="wpfe-toggle-switch">
                                                <input type="checkbox" name="wpfe_options[user_roles][]" value="<?php echo esc_attr( $role_key ); ?>" <?php echo $checked; ?>>
                                                <span class="wpfe-toggle-slider"></span>
                                            </label>
                                            <label>
                                                <?php echo esc_html( translate_user_role( $role['name'] ) ); ?>
                                            </label>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>

                            <div class="wpfe-admin-field">
                                <label><?php esc_html_e( 'Required Capabilities', 'wp-frontend-editor' ); ?></label>
                                <p class="description">
                                    <?php esc_html_e( 'Select which WordPress capabilities are required to use the frontend editor.', 'wp-frontend-editor' ); ?>
                                </p>
                                
                                <div class="wpfe-admin-field-group">
                                    <?php 
                                    $selected_caps = isset( $options['user_caps'] ) ? $options['user_caps'] : array( 'edit_posts' );
                                    $capabilities = array(
                                        'edit_posts'         => __( 'Edit Posts', 'wp-frontend-editor' ),
                                        'edit_others_posts'  => __( 'Edit Others\' Posts', 'wp-frontend-editor' ),
                                        'edit_published_posts' => __( 'Edit Published Posts', 'wp-frontend-editor' ),
                                        'edit_pages'         => __( 'Edit Pages', 'wp-frontend-editor' ),
                                        'edit_others_pages'  => __( 'Edit Others\' Pages', 'wp-frontend-editor' ),
                                        'edit_published_pages' => __( 'Edit Published Pages', 'wp-frontend-editor' ),
                                        'edit_theme_options' => __( 'Edit Theme Options', 'wp-frontend-editor' ),
                                    );
                                    
                                    foreach ( $capabilities as $cap => $label ) :
                                        $checked = in_array( $cap, $selected_caps, true ) ? 'checked' : '';
                                    ?>
                                        <label class="wpfe-checkbox-wrap">
                                            <input type="checkbox" name="wpfe_options[user_caps][]" value="<?php echo esc_attr( $cap ); ?>" <?php echo $checked; ?>>
                                            <span class="wpfe-checkmark"></span>
                                            <?php echo esc_html( $label ); ?>
                                        </label>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Advanced Tab -->
                <div id="wpfe-tab-advanced" class="wpfe-admin-tab-content">
                    <div class="wpfe-info-card warning">
                        <h3><?php esc_html_e( 'Advanced Settings', 'wp-frontend-editor' ); ?></h3>
                        <p><?php esc_html_e( 'These settings are for advanced users. Be careful when changing these options as they may affect the functionality of the editor.', 'wp-frontend-editor' ); ?></p>
                    </div>

                    <div id="wpfe-css-section" class="wpfe-admin-section">
                        <div class="wpfe-admin-section-header">
                            <h2 class="wpfe-admin-section-title">
                                <span class="dashicons dashicons-editor-code"></span>
                                <?php esc_html_e( 'Custom CSS', 'wp-frontend-editor' ); ?>
                            </h2>
                            <button type="button" class="wpfe-admin-section-toggle dashicons dashicons-arrow-up open"></button>
                        </div>
                        
                        <div class="wpfe-admin-section-content">
                            <div class="wpfe-admin-field">
                                <label for="wpfe-custom-css"><?php esc_html_e( 'Custom CSS', 'wp-frontend-editor' ); ?></label>
                                <p class="description">
                                    <?php esc_html_e( 'Add custom CSS to customize the appearance of the frontend editor.', 'wp-frontend-editor' ); ?>
                                </p>
                                <textarea id="wpfe-custom-css" name="wpfe_options[custom_css]" class="wpfe-input" rows="10"><?php echo esc_textarea( $options['custom_css'] ?? '' ); ?></textarea>
                            </div>
                        </div>
                    </div>

                    <div id="wpfe-selectors-section" class="wpfe-admin-section">
                        <div class="wpfe-admin-section-header">
                            <h2 class="wpfe-admin-section-title">
                                <span class="dashicons dashicons-editor-code"></span>
                                <?php esc_html_e( 'Custom Selectors', 'wp-frontend-editor' ); ?>
                            </h2>
                            <button type="button" class="wpfe-admin-section-toggle dashicons dashicons-arrow-down"></button>
                        </div>
                        
                        <div class="wpfe-admin-section-content" style="display: none;">
                            <div class="wpfe-admin-field">
                                <label for="wpfe-custom-selectors"><?php esc_html_e( 'CSS Selectors Mapping', 'wp-frontend-editor' ); ?></label>
                                <p class="description">
                                    <?php esc_html_e( 'Map WordPress fields to specific CSS selectors in your theme. One per line in format: field_name|css_selector', 'wp-frontend-editor' ); ?>
                                </p>
                                <textarea id="wpfe-custom-selectors" name="wpfe_options[custom_selectors]" class="wpfe-input" rows="6"><?php echo esc_textarea( $options['custom_selectors'] ?? '' ); ?></textarea>
                                <p class="description">
                                    <?php esc_html_e( 'Example: title|.entry-title', 'wp-frontend-editor' ); ?>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div id="wpfe-debug-section" class="wpfe-admin-section">
                        <div class="wpfe-admin-section-header">
                            <h2 class="wpfe-admin-section-title">
                                <span class="dashicons dashicons-warning"></span>
                                <?php esc_html_e( 'Debug', 'wp-frontend-editor' ); ?>
                            </h2>
                            <button type="button" class="wpfe-admin-section-toggle dashicons dashicons-arrow-down"></button>
                        </div>
                        
                        <div class="wpfe-admin-section-content" style="display: none;">
                            <div class="wpfe-toggle-row">
                                <label class="wpfe-toggle-switch">
                                    <input type="checkbox" name="wpfe_options[debug_mode]" value="1"
                                          <?php checked( isset( $options['debug_mode'] ) && $options['debug_mode'] ); ?>>
                                    <span class="wpfe-toggle-slider"></span>
                                </label>
                                <label>
                                    <?php esc_html_e( 'Enable Debug Mode', 'wp-frontend-editor' ); ?>
                                    <span class="description">
                                        <?php esc_html_e( 'Enable debug mode to log editor actions to the console.', 'wp-frontend-editor' ); ?>
                                    </span>
                                </label>
                            </div>

                            <div class="wpfe-admin-field">
                                <button type="button" class="button" id="wpfe-reset-settings">
                                    <?php esc_html_e( 'Reset Settings', 'wp-frontend-editor' ); ?>
                                </button>
                                <span class="description">
                                    <?php esc_html_e( 'Reset all settings to default values.', 'wp-frontend-editor' ); ?>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="wpfe-admin-actions">
                    <?php submit_button( __( 'Save Settings', 'wp-frontend-editor' ), 'primary', 'submit', false ); ?>
                </div>
            </form>
        </div>

        <script>
            // Add translation strings for JavaScript
            var wpfe_admin = {
                i18n: {
                    saving: '<?php esc_html_e( 'Saving...', 'wp-frontend-editor' ); ?>',
                    no_results: '<?php esc_html_e( 'No fields found matching your search.', 'wp-frontend-editor' ); ?>'
                }
            };
        </script>
        <?php
    }

    /**
     * Enqueue admin scripts and styles.
     *
     * @param string $hook The current admin page.
     */
    public function enqueue_admin_scripts( $hook ) {
        if ( 'settings_page_wp-frontend-editor' !== $hook ) {
            return;
        }

        // Create images directory if it doesn't exist
        $images_dir = WPFE_PLUGIN_DIR . 'admin/images';
        if ( ! file_exists( $images_dir ) ) {
            wp_mkdir_p( $images_dir );
        }

        // Create SVG icon if it doesn't exist
        $icon_path = $images_dir . '/frontend-editor-icon.svg';
        if ( ! file_exists( $icon_path ) ) {
            $svg_content = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64"><path fill="#3858e9" d="M20.8 10.7l-4.3-4.3-1.1 1.1 4.3 4.3c.1.1.1.3 0 .4l-4.3 4.3 1.1 1.1 4.3-4.3c.7-.8.7-1.9 0-2.6zM4.2 11.8l4.3-4.3-1.1-1.1-4.3 4.3c-.7.7-.7 1.9 0 2.6l4.3 4.3 1.1-1.1-4.3-4.3c-.1-.1-.1-.3 0-.4z"/><path fill="#3858e9" d="M7 8h2v8H7zm4 0h2v8h-2zm4 0h2v8h-2z"/></svg>';
            file_put_contents( $icon_path, $svg_content );
        }

        wp_enqueue_style(
            'wp-frontend-editor-admin',
            WPFE_PLUGIN_URL . 'admin/css/admin.css',
            array( 'dashicons' ),
            WPFE_VERSION
        );

        wp_enqueue_script(
            'wp-frontend-editor-admin',
            WPFE_PLUGIN_URL . 'admin/js/admin.js',
            array( 'jquery' ),
            WPFE_VERSION,
            true
        );
    }

    /**
     * Add settings link to plugins page.
     *
     * @param array $links The plugin action links.
     * @return array Modified plugin action links.
     */
    public function add_settings_link( $links ) {
        $settings_link = sprintf(
            '<a href="%s">%s</a>',
            admin_url( 'admin.php?page=wp-frontend-editor' ),
            __( 'Settings', 'wp-frontend-editor' )
        );
        
        array_unshift( $links, $settings_link );
        
        return $links;
    }

    /**
     * Get plugin options.
     *
     * @return array The plugin options.
     */
    public function get_options() {
        $defaults = array(
            'enable_inline'      => 1,
            'sidebar_width'      => 350,
            'button_position'    => 'top-right',
            'button_style'       => 'icon-only',
            'highlight_editable' => 0,
            'post_types'         => array( 'post', 'page' ),
            'core_fields'        => array( 'title', 'content', 'excerpt', 'featured_image' ),
            'acf_fields'         => array(),
            'user_roles'         => array( 'administrator', 'editor' ),
            'user_caps'          => array( 'edit_posts' ),
        );

        $options = get_option( 'wpfe_options', $defaults );

        return wp_parse_args( $options, $defaults );
    }
}