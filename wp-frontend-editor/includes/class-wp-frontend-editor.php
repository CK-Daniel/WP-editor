<?php
/**
 * The main plugin class.
 *
 * @package WPFrontendEditor
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Main plugin class.
 */
class WP_Frontend_Editor {

    /**
     * Plugin instance.
     *
     * @var WP_Frontend_Editor
     */
    private static $instance = null;

    /**
     * Admin class instance.
     *
     * @var WP_Frontend_Editor_Admin
     */
    public $admin;

    /**
     * AJAX class instance.
     *
     * @var WP_Frontend_Editor_AJAX
     */
    public $ajax;

    /**
     * ACF integration class instance.
     *
     * @var WP_Frontend_Editor_ACF
     */
    public $acf;

    /**
     * Plugin options.
     *
     * @var array
     */
    private $options;

    /**
     * Initialize the plugin.
     *
     * @return void
     */
    public function init() {
        // Load plugin options
        $this->options = $this->get_options();

        // Load required files
        $this->load_dependencies();

        // Initialize components
        $this->init_components();

        // Register hooks
        $this->register_hooks();
    }

    /**
     * Load required dependencies.
     *
     * @return void
     */
    private function load_dependencies() {
        // Core classes
        require_once WPFE_PLUGIN_DIR . 'includes/class-wp-frontend-editor-admin.php';
        require_once WPFE_PLUGIN_DIR . 'includes/class-wp-frontend-editor-acf.php';
        
        // AJAX handler classes
        require_once WPFE_PLUGIN_DIR . 'includes/ajax/class-wp-frontend-editor-ajax-base.php';
        require_once WPFE_PLUGIN_DIR . 'includes/ajax/class-wp-frontend-editor-acf-utils.php';
        require_once WPFE_PLUGIN_DIR . 'includes/ajax/class-wp-frontend-editor-field-renderer.php';
        require_once WPFE_PLUGIN_DIR . 'includes/ajax/class-wp-frontend-editor-native-field-loader.php';
        require_once WPFE_PLUGIN_DIR . 'includes/ajax/class-wp-frontend-editor-fields-handler.php';
        require_once WPFE_PLUGIN_DIR . 'includes/ajax/class-wp-frontend-editor-form-handler.php';
        require_once WPFE_PLUGIN_DIR . 'includes/ajax/class-wp-frontend-editor-media-handler.php';
        require_once WPFE_PLUGIN_DIR . 'includes/ajax/class-wp-frontend-editor-rest-handler.php';
        
        // Main AJAX class (needs to be included after its dependencies)
        require_once WPFE_PLUGIN_DIR . 'includes/class-wp-frontend-editor-ajax.php';
    }

    /**
     * Initialize plugin components.
     *
     * @return void
     */
    private function init_components() {
        $this->admin = new WP_Frontend_Editor_Admin();
        $this->ajax = new WP_Frontend_Editor_AJAX();
        
        // Only load ACF integration if ACF is active
        if ( $this->is_acf_active() ) {
            $this->acf = new WP_Frontend_Editor_ACF();
        }
        
        // Log plugin initialization
        wpfe_log( 'WP Frontend Editor initialized', 'info', array(
            'version' => WPFE_VERSION,
            'acf_active' => $this->is_acf_active(),
        ));
    }

    /**
     * Register hooks.
     *
     * @return void
     */
    private function register_hooks() {
        // Enqueue scripts and styles for the front-end
        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
        
        // Add edit buttons to editable elements
        add_action( 'wp_footer', array( $this, 'add_editor_container' ) );
        
        // Filter content to add edit buttons
        add_filter( 'the_title', array( $this, 'add_edit_button_to_title' ), 10, 2 );
        add_filter( 'the_content', array( $this, 'add_edit_button_to_content' ) );
        add_filter( 'the_excerpt', array( $this, 'add_edit_button_to_excerpt' ) );
    }

    /**
     * Enqueue scripts and styles for the front-end.
     *
     * @return void
     */
    public function enqueue_scripts() {
        // Force debug logging regardless of WP_DEBUG setting
        error_log('WP Frontend Editor: Starting script enqueue process');
        
        // Debug user capabilities
        if (!is_user_logged_in()) {
            error_log('WP Frontend Editor: User is not logged in');
            return;
        }
        
        // Get current user and role info for debugging
        $current_user = wp_get_current_user();
        error_log('WP Frontend Editor: User ID: ' . $current_user->ID . ', Roles: ' . implode(', ', $current_user->roles));
        
        // Debug options
        error_log('WP Frontend Editor: Plugin options: ' . print_r($this->options, true));
        
        // Check user editing capabilities with detailed logging
        if ( ! $this->current_user_can_edit() ) {
            error_log('WP Frontend Editor: User does not have edit capabilities');
            
            // Check specific capability requirements
            $required_caps = isset($this->options['user_caps']) ? $this->options['user_caps'] : array('edit_posts');
            foreach ($required_caps as $cap) {
                error_log('WP Frontend Editor: User ' . ($current_user->ID) . ' has capability ' . $cap . ': ' . 
                    (current_user_can($cap) ? 'Yes' : 'No'));
            }
            
            return;
        }

        // Debug post type check
        $post_type = get_post_type();
        error_log('WP Frontend Editor: Current post type: ' . ($post_type ? $post_type : 'None'));
        
        // Debug post types enabled in settings
        if (!empty($this->options['post_types'])) {
            error_log('WP Frontend Editor: Enabled post types: ' . implode(', ', $this->options['post_types']));
        } else {
            error_log('WP Frontend Editor: No post types enabled in settings or settings not initialized');
        }
        
        // Check if this post type is enabled
        if ( $post_type && !empty($this->options['post_types']) && ! in_array( $post_type, $this->options['post_types'], true ) ) {
            // Debug mode check - in debug mode, load scripts for all post types
            $debug_mode = isset($this->options['debug_mode']) && $this->options['debug_mode'];
            
            if ($debug_mode) {
                error_log('WP Frontend Editor: Post type ' . $post_type . ' is not in enabled settings, but loading scripts anyway (debug mode)');
            } else {
                error_log('WP Frontend Editor: Post type ' . $post_type . ' is not enabled in settings');
                return;
            }
        }
        
        error_log('WP Frontend Editor: All checks passed, proceeding with script enqueuing');
        
        // Force load scripts in debug mode, even on archive pages or when post_type is empty
        if (!$post_type && isset($this->options['debug_mode']) && $this->options['debug_mode']) {
            error_log('WP Frontend Editor: No post type detected but loading scripts due to debug mode');
        }

        // Enqueue the dashicons
        wp_enqueue_style( 'dashicons' );

        // Enqueue the media library scripts
        wp_enqueue_media();

        // Enqueue CSS
        wp_enqueue_style(
            'wp-frontend-editor',
            WPFE_PLUGIN_URL . 'public/css/frontend-editor.css',
            array( 'dashicons' ),
            WPFE_VERSION
        );

        // Enqueue main JavaScript file
        wp_enqueue_script(
            'wp-frontend-editor',
            WPFE_PLUGIN_URL . 'public/js/frontend-editor.js',
            array( 'jquery', 'wp-util' ),
            WPFE_VERSION,
            true
        );
        
        // Enqueue modular JavaScript files in the correct order
        $modules = array(
            'utils',
            'core',
            'elements',
            'events',
            'ajax',
            'fields',
            'ui',
            'mobile',
            'acf',
            'main'
        );
        
        foreach ( $modules as $module ) {
            wp_enqueue_script(
                'wp-frontend-editor-' . $module,
                WPFE_PLUGIN_URL . 'public/js/modules/' . $module . '.js',
                array( 'wp-frontend-editor' ),
                WPFE_VERSION,
                true
            );
        }
        
        // Enqueue our native fields JavaScript
        wp_enqueue_script(
            'wp-frontend-editor-native-fields',
            WPFE_PLUGIN_URL . 'public/js/native-fields.js',
            array( 'wp-frontend-editor', 'jquery', 'wp-util' ),
            WPFE_VERSION,
            true
        );
        
        // Enqueue our native fields CSS
        wp_enqueue_style(
            'wp-frontend-editor-native-fields',
            WPFE_PLUGIN_URL . 'public/css/native-fields.css',
            array( 'wp-frontend-editor' ),
            WPFE_VERSION
        );

        // Apply custom CSS if defined
        if ( ! empty( $this->options['custom_css'] ) ) {
            wp_add_inline_style( 'wp-frontend-editor', $this->options['custom_css'] );
        }

        // Get basic post content for content-based field identification
        $post_id = get_the_ID();
        $page_content = array();
        
        if ($post_id) {
            $post = get_post($post_id);
            if ($post) {
                $page_content = array(
                    'post_title' => $post->post_title,
                    'post_content' => wp_strip_all_tags($post->post_content),
                    'post_excerpt' => $post->post_excerpt,
                );
                
                // Get featured image if available
                if (has_post_thumbnail($post_id)) {
                    $page_content['featured_image'] = get_post_thumbnail_id($post_id);
                }
                
                // Add ACF field values if ACF is active
                if ($this->is_acf_active() && function_exists('get_fields')) {
                    $acf_fields = get_fields($post_id);
                    if (is_array($acf_fields)) {
                        foreach ($acf_fields as $key => $value) {
                            // For text-like fields, store for content matching
                            if (is_string($value) && !is_serialized($value)) {
                                $page_content['acf_' . $key] = $value;
                            }
                        }
                    }
                }
            }
        }
        
        // Pass data to JavaScript with debugging info
        $script_data = array(
            'ajax_url'          => admin_url( 'admin-ajax.php' ),
            'rest_api_url'      => rest_url( 'wp-frontend-editor/v1' ),
            'nonce'             => wp_create_nonce( 'wpfe-editor-nonce' ),
            'rest_nonce'        => wp_create_nonce( 'wp_rest' ),
            'post_id'           => $post_id,
            'plugin_url'        => WPFE_PLUGIN_URL,
            'version'           => WPFE_VERSION,
            'plugin_name'       => 'WP Frontend Editor',
            'is_acf_active'     => $this->is_acf_active(),
            'enable_inline'     => isset( $this->options['enable_inline'] ) ? (bool) $this->options['enable_inline'] : true,
            'button_position'   => isset( $this->options['button_position'] ) ? $this->options['button_position'] : 'top-right',
            'button_style'      => isset( $this->options['button_style'] ) ? $this->options['button_style'] : 'icon-only',
            'sidebar_width'     => isset( $this->options['sidebar_width'] ) ? $this->options['sidebar_width'] : 350,
            'highlight_editable' => isset( $this->options['highlight_editable'] ) ? (bool) $this->options['highlight_editable'] : false,
            // Force debug mode temporarily to troubleshoot script loading issues
            'debug_mode'        => true, // isset( $this->options['debug_mode'] ) ? (bool) $this->options['debug_mode'] : false,
            'auto_save_inline'  => isset( $this->options['auto_save_inline'] ) ? (bool) $this->options['auto_save_inline'] : false,
            'live_preview'      => isset( $this->options['live_preview'] ) ? (bool) $this->options['live_preview'] : true,
            'show_toolbar'      => isset( $this->options['show_toolbar'] ) ? (bool) $this->options['show_toolbar'] : false,
            'discover_fields'   => isset( $this->options['discover_fields'] ) ? (bool) $this->options['discover_fields'] : true,
            'page_content'      => $page_content,
            'current_user_can_edit' => $this->current_user_can_edit($post_id),
            'debugging_info'    => array(
                'wp_version'    => get_bloginfo('version'),
                'php_version'   => phpversion(),
                'theme'         => get_template(),
                'is_singular'   => is_singular(),
                'post_type'     => $post_type,
                'is_admin'      => is_admin(),
                'is_frontend'   => !is_admin(),
                'is_logged_in'  => is_user_logged_in()
            ),
            'i18n'              => array(
                    'edit'            => __( 'Edit', 'wp-frontend-editor' ),
                    'save'            => __( 'Save', 'wp-frontend-editor' ),
                    'saved'           => __( 'Saved!', 'wp-frontend-editor' ),
                    'cancel'          => __( 'Cancel', 'wp-frontend-editor' ),
                    'saving'          => __( 'Saving...', 'wp-frontend-editor' ),
                    'success'         => __( 'Changes saved successfully', 'wp-frontend-editor' ),
                    'error'           => __( 'Error saving changes', 'wp-frontend-editor' ),
                    'select_image'    => __( 'Select Image', 'wp-frontend-editor' ),
                    'select'          => __( 'Select', 'wp-frontend-editor' ),
                    'remove'          => __( 'Remove', 'wp-frontend-editor' ),
                    'unsupported_field' => __( 'This field type is not supported yet.', 'wp-frontend-editor' ),
                    'discovered_field' => __( 'Discovered field', 'wp-frontend-editor' ),
                    'auto_save'       => __( 'Auto-save', 'wp-frontend-editor' ),
                )
        );
        
        // Enhanced script debugging
        error_log('WP Frontend Editor: Script enqueuing completed successfully');
        error_log('WP Frontend Editor: Main script handle: wp-frontend-editor');
        error_log('WP Frontend Editor: Module script handles: ' . implode(', ', array_map(function($module) {
            return 'wp-frontend-editor-' . $module;
        }, $modules)));
        
        // Debug WordPress script queue
        global $wp_scripts;
        if (isset($wp_scripts->registered['wp-frontend-editor'])) {
            error_log('WP Frontend Editor: Main script successfully registered in WordPress');
            error_log('WP Frontend Editor: Main script URL: ' . $wp_scripts->registered['wp-frontend-editor']->src);
            error_log('WP Frontend Editor: Main script dependencies: ' . implode(', ', $wp_scripts->registered['wp-frontend-editor']->deps));
        } else {
            error_log('WP Frontend Editor: ERROR - Main script NOT found in WordPress registered scripts!');
        }
        
        // Check if any of our module scripts are in the queue
        $modules_found = 0;
        foreach ($modules as $module) {
            $handle = 'wp-frontend-editor-' . $module;
            if (isset($wp_scripts->registered[$handle])) {
                $modules_found++;
            }
        }
        error_log('WP Frontend Editor: Module scripts found in WordPress queue: ' . $modules_found . '/' . count($modules));
        
        // Check if we successfully localized the script
        if (isset($wp_scripts->registered['wp-frontend-editor']->extra['data'])) {
            error_log('WP Frontend Editor: Script data successfully localized');
        } else {
            error_log('WP Frontend Editor: ERROR - Script data NOT localized properly!');
        }
    }

    /**
     * Add the editor container to the footer.
     *
     * @return void
     */
    public function add_editor_container() {
        error_log('WP Frontend Editor: add_editor_container() called');
        
        // Only add for users who can edit
        if ( ! $this->current_user_can_edit() ) {
            error_log('WP Frontend Editor: User cannot edit - not adding editor container');
            return;
        }

        // Check if this post type is enabled
        $post_type = get_post_type();
        if ( $post_type && ! empty( $this->options['post_types'] ) && ! in_array( $post_type, $this->options['post_types'], true ) ) {
            // Skip this check in debug mode to ensure the editor loads for testing
            if (!isset($this->options['debug_mode']) || !$this->options['debug_mode']) {
                error_log('WP Frontend Editor: Not adding editor container - Post type ' . $post_type . ' is not enabled in settings.');
                return;
            } else {
                error_log('WP Frontend Editor: Post type is not enabled, but continuing anyway due to debug mode.');
            }
        }
        
        // Debug info for editor container
        error_log('WP Frontend Editor: Adding editor container for post type ' . $post_type);
        error_log('WP Frontend Editor: Template path: ' . WPFE_PLUGIN_DIR . 'public/templates/editor-sidebar.php');
        
        // Include the editor sidebar template
        // Check if file exists first
        $template_path = WPFE_PLUGIN_DIR . 'public/templates/editor-sidebar.php';
        if (file_exists($template_path)) {
            include $template_path;
            error_log('WP Frontend Editor: Sidebar template included successfully');
        } else {
            error_log('WP Frontend Editor: ERROR - Sidebar template not found at: ' . $template_path);
            // Output emergency sidebar HTML directly
            echo '<div id="wpfe-editor-sidebar" class="wpfe-editor-sidebar" style="display: none;">';
            echo '  <div class="wpfe-editor-sidebar-header">';
            echo '    <div class="wpfe-editor-sidebar-header-content">';
            echo '      <h2 class="wpfe-editor-sidebar-title">';
            echo '        <span class="wpfe-editor-field-name"></span>';
            echo '      </h2>';
            echo '    </div>';
            echo '    <div class="wpfe-editor-sidebar-controls">';
            echo '      <button type="button" class="wpfe-editor-sidebar-close">';
            echo '        <span class="dashicons dashicons-no-alt"></span>';
            echo '      </button>';
            echo '    </div>';
            echo '  </div>';
            echo '  <div class="wpfe-editor-sidebar-content">';
            echo '    <div class="wpfe-editor-sidebar-fields"></div>';
            echo '  </div>';
            echo '  <div class="wpfe-editor-sidebar-footer">';
            echo '    <div class="wpfe-editor-sidebar-actions">';
            echo '      <button type="button" class="wpfe-editor-sidebar-cancel">Cancel</button>';
            echo '      <button type="button" class="wpfe-editor-sidebar-save">Save Changes</button>';
            echo '    </div>';
            echo '  </div>';
            echo '</div>';
            echo '<div id="wpfe-editor-overlay" class="wpfe-editor-overlay" style="display: none;"></div>';
            echo '<!-- Emergency sidebar HTML -->';
        }
        
        // Load required WordPress admin styles for the field editor
        wp_enqueue_style( 'common' );
        wp_enqueue_style( 'forms' );
        
        // Prepare for media uploads
        wp_enqueue_media();
    }

    /**
     * Add edit button to post titles.
     *
     * @param string $title The post title.
     * @param int    $post_id The post ID.
     * @return string The filtered title.
     */
    public function add_edit_button_to_title( $title, $post_id ) {
        // Only add for users who can edit and on singular posts
        if ( ! $this->current_user_can_edit( $post_id ) || ! is_singular() ) {
            return $title;
        }

        // Don't add button if in the backend or in the admin bar
        if ( is_admin() || did_action( 'admin_bar_menu' ) ) {
            return $title;
        }

        // Check if post type is enabled
        $post_type = get_post_type( $post_id );
        if ( $post_type && ! in_array( $post_type, $this->options['post_types'], true ) ) {
            return $title;
        }

        // Check if this field is enabled
        if ( ! in_array( 'title', $this->options['core_fields'], true ) ) {
            return $title;
        }

        // Get the edit button HTML
        $edit_button = $this->get_edit_button_html( 'post_title', $post_id );

        // Return the title with an edit button wrapper
        return '<span class="wpfe-editable wpfe-title" data-wpfe-field="post_title" data-wpfe-post-id="' . esc_attr( $post_id ) . '" data-wpfe-field-label="' . esc_attr__( 'Title', 'wp-frontend-editor' ) . '">' 
               . $title . $edit_button . '</span>';
    }

    /**
     * Add edit button to post content.
     *
     * @param string $content The post content.
     * @return string The filtered content.
     */
    public function add_edit_button_to_content( $content ) {
        // Only add for users who can edit and on singular posts
        if ( ! $this->current_user_can_edit() || ! is_singular() ) {
            return $content;
        }

        // Get the post ID
        $post_id = get_the_ID();
        
        // Check if post type is enabled
        $post_type = get_post_type( $post_id );
        if ( $post_type && ! in_array( $post_type, $this->options['post_types'], true ) ) {
            return $content;
        }

        // Check if this field is enabled
        if ( ! in_array( 'content', $this->options['core_fields'], true ) ) {
            return $content;
        }

        // Get the edit button HTML
        $edit_button = $this->get_edit_button_html( 'post_content', $post_id );

        // Return the content with an edit button wrapper
        return '<div class="wpfe-editable wpfe-content" data-wpfe-field="post_content" data-wpfe-post-id="' . esc_attr( $post_id ) . '" data-wpfe-field-label="' . esc_attr__( 'Content', 'wp-frontend-editor' ) . '">' 
               . $content . $edit_button . '</div>';
    }

    /**
     * Add edit button to post excerpt.
     *
     * @param string $excerpt The post excerpt.
     * @return string The filtered excerpt.
     */
    public function add_edit_button_to_excerpt( $excerpt ) {
        // Only add for users who can edit and on singular posts
        if ( ! $this->current_user_can_edit() || ! is_singular() ) {
            return $excerpt;
        }

        // Get the post ID
        $post_id = get_the_ID();
        
        // Check if post type is enabled
        $post_type = get_post_type( $post_id );
        if ( $post_type && ! in_array( $post_type, $this->options['post_types'], true ) ) {
            return $excerpt;
        }

        // Check if this field is enabled
        if ( ! in_array( 'excerpt', $this->options['core_fields'], true ) ) {
            return $excerpt;
        }

        // Get the edit button HTML
        $edit_button = $this->get_edit_button_html( 'post_excerpt', $post_id );

        // Return the excerpt with an edit button wrapper
        return '<div class="wpfe-editable wpfe-excerpt" data-wpfe-field="post_excerpt" data-wpfe-post-id="' . esc_attr( $post_id ) . '" data-wpfe-field-label="' . esc_attr__( 'Excerpt', 'wp-frontend-editor' ) . '">' 
               . $excerpt . $edit_button . '</div>';
    }

    /**
     * Generate the edit button HTML.
     *
     * @param string $field_type The field type (title, content, excerpt, etc.).
     * @param int    $post_id The post ID.
     * @return string The edit button HTML.
     */
    private function get_edit_button_html( $field_type, $post_id ) {
        $button_position = $this->options['button_position'] ?? 'top-right';
        $button_style = $this->options['button_style'] ?? 'icon-only';
        
        // Position class
        $position_class = 'wpfe-button-' . $button_position;
        
        // Button content based on style
        $button_content = '';
        if ( 'icon-only' === $button_style ) {
            $button_content = '<span class="dashicons dashicons-edit"></span>';
        } elseif ( 'text-only' === $button_style ) {
            $button_content = '<span class="wpfe-button-text">' . esc_html__( 'Edit', 'wp-frontend-editor' ) . '</span>';
        } else { // icon-text
            $button_content = '<span class="dashicons dashicons-edit"></span><span class="wpfe-button-text">' . esc_html__( 'Edit', 'wp-frontend-editor' ) . '</span>';
        }

        return '<button class="wpfe-edit-button ' . esc_attr( $position_class ) . '" data-wpfe-field="' . esc_attr( $field_type ) . '" data-wpfe-post-id="' . esc_attr( $post_id ) . '">
            ' . $button_content . '
            <span class="screen-reader-text">' . esc_html__( 'Edit', 'wp-frontend-editor' ) . '</span>
        </button>';
    }

    /**
     * Check if the current user can edit the given post.
     *
     * @param int $post_id The post ID.
     * @return bool True if the user can edit, false otherwise.
     */
    public function current_user_can_edit( $post_id = 0 ) {
        // Debug mode check - if we're actively debugging, be more permissive with capabilities
        $debug_mode = isset($this->options['debug_mode']) && $this->options['debug_mode'];
        
        // Check login status
        if ( ! is_user_logged_in() ) {
            error_log('WP Frontend Editor: User is not logged in');
            return false;
        }

        // Get current user for detailed logging
        $current_user = wp_get_current_user();
        $user_id = $current_user->ID;
        $user_roles = implode(', ', $current_user->roles);
        
        error_log("WP Frontend Editor: Checking edit capabilities for user ID $user_id with roles: $user_roles");
        
        // In debug mode, we'll be more lenient with permissions for testing
        if ($debug_mode) {
            error_log('WP Frontend Editor: Debug mode is active - relaxing permission checks');
            
            // Check if current user has any common editing capability
            $common_caps = array('edit_posts', 'edit_pages', 'edit_published_posts', 'publish_posts');
            foreach ($common_caps as $cap) {
                if (current_user_can($cap)) {
                    error_log("WP Frontend Editor: Debug mode - User has capability '$cap', allowing access");
                    return true;
                }
            }
        }

        // Normal permission checking
        $user_caps = isset( $this->options['user_caps'] ) ? $this->options['user_caps'] : array( 'edit_posts' );
        
        // Log the capabilities we're checking
        error_log('WP Frontend Editor: Required capabilities: ' . implode(', ', $user_caps));
        
        foreach ( $user_caps as $cap ) {
            if ( ! current_user_can( $cap ) ) {
                error_log("WP Frontend Editor: User lacks required capability: $cap");
                return false;
            }
        }

        if ( ! $post_id ) {
            $post_id = get_the_ID();
        }

        if ( ! $post_id ) {
            error_log("WP Frontend Editor: No post ID available, falling back to edit_posts check");
            return current_user_can( 'edit_posts' );
        }

        // Check if user can edit this specific post
        $can_edit_post = current_user_can( 'edit_post', $post_id );
        error_log("WP Frontend Editor: Can user edit post $post_id? " . ($can_edit_post ? 'Yes' : 'No'));
        
        // In debug mode, allow editing even if the specific post check fails
        if (!$can_edit_post && $debug_mode) {
            error_log("WP Frontend Editor: Debug mode - Allowing edit access to post $post_id despite permission check");
            return true;
        }
        
        return $can_edit_post;
    }

    /**
     * Check if ACF is active.
     *
     * @return bool True if ACF is active, false otherwise.
     */
    public function is_acf_active() {
        return class_exists( 'ACF' );
    }

    /**
     * Get plugin options.
     *
     * @return array The plugin options.
     */
    public function get_options() {
        // Enhanced default options with debug settings
        $defaults = array(
            'enable_inline'      => 1,
            'sidebar_width'      => 350,
            'button_position'    => 'top-right',
            'button_style'       => 'icon-only',
            'highlight_editable' => 1, // Enable highlighting by default for easier debugging
            'debug_mode'         => 1, // Enable debug mode by default
            'post_types'         => array( 'post', 'page', 'product', 'any' ), // Include WooCommerce products and 'any' for flexibility
            'core_fields'        => array( 'title', 'content', 'excerpt', 'featured_image' ),
            'acf_fields'         => array(),
            'user_roles'         => array( 'administrator', 'editor', 'author', 'contributor' ),
            'user_caps'          => array( 'edit_posts' ),
            'auto_enable_acf'    => 1,
            'live_preview'       => 1,
            'discover_fields'    => 1,
        );

        // Get stored options
        $options = get_option( 'wpfe_options', array() );
        
        // If options are completely empty, log it and use defaults
        if (empty($options)) {
            error_log('WP Frontend Editor: No options found in database, using defaults');
            return $defaults;
        }
        
        // Merge with defaults and ensure no null values
        $merged_options = wp_parse_args( $options, $defaults );
        
        // Ensure post_types is never empty
        if (empty($merged_options['post_types'])) {
            error_log('WP Frontend Editor: Post types setting was empty, restoring defaults');
            $merged_options['post_types'] = $defaults['post_types']; 
        }
        
        // Ensure user_caps is never empty
        if (empty($merged_options['user_caps'])) {
            error_log('WP Frontend Editor: User capabilities setting was empty, restoring defaults');
            $merged_options['user_caps'] = $defaults['user_caps'];
        }
        
        return $merged_options;
    }

    /**
     * Get the plugin instance.
     *
     * @return WP_Frontend_Editor The plugin instance.
     */
    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }

        return self::$instance;
    }
}