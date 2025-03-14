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
        // Only enqueue for logged-in users with edit capabilities
        if ( ! $this->current_user_can_edit() ) {
            if ( defined('WP_DEBUG') && WP_DEBUG ) {
                error_log('WP Frontend Editor: User does not have edit capabilities');
            }
            return;
        }

        // Check if this post type is enabled
        $post_type = get_post_type();
        if ( $post_type && ! empty( $this->options['post_types'] ) && ! in_array( $post_type, $this->options['post_types'], true ) ) {
            if ( defined('WP_DEBUG') && WP_DEBUG ) {
                error_log('WP Frontend Editor: Post type ' . $post_type . ' is not enabled in settings.');
            }
            return;
        }
        
        // Debug info for script loading
        if ( defined('WP_DEBUG') && WP_DEBUG ) {
            error_log('WP Frontend Editor: Loading scripts for post type ' . $post_type);
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
        
        // Log script localization to debug log
        if ( defined('WP_DEBUG') && WP_DEBUG ) {
            error_log('WP Frontend Editor: Localized script data for post ' . $post_id . ' with debug mode enabled');
        }
    }

    /**
     * Add the editor container to the footer.
     *
     * @return void
     */
    public function add_editor_container() {
        // Only add for users who can edit
        if ( ! $this->current_user_can_edit() ) {
            return;
        }

        // Check if this post type is enabled
        $post_type = get_post_type();
        if ( $post_type && ! empty( $this->options['post_types'] ) && ! in_array( $post_type, $this->options['post_types'], true ) ) {
            if ( defined('WP_DEBUG') && WP_DEBUG ) {
                error_log('WP Frontend Editor: Not adding editor container - Post type ' . $post_type . ' is not enabled in settings.');
            }
            return;
        }
        
        // Debug info for editor container
        if ( defined('WP_DEBUG') && WP_DEBUG ) {
            error_log('WP Frontend Editor: Adding editor container for post type ' . $post_type);
        }
        
        // Include the editor sidebar template
        include WPFE_PLUGIN_DIR . 'public/templates/editor-sidebar.php';
        
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
        if ( ! is_user_logged_in() ) {
            return false;
        }

        // Check if user has the required capabilities
        $user_caps = isset( $this->options['user_caps'] ) ? $this->options['user_caps'] : array( 'edit_posts' );
        
        foreach ( $user_caps as $cap ) {
            if ( ! current_user_can( $cap ) ) {
                return false;
            }
        }

        if ( ! $post_id ) {
            $post_id = get_the_ID();
        }

        if ( ! $post_id ) {
            return current_user_can( 'edit_posts' );
        }

        return current_user_can( 'edit_post', $post_id );
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
            'auto_enable_acf'    => 1,
        );

        $options = get_option( 'wpfe_options', $defaults );

        return wp_parse_args( $options, $defaults );
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