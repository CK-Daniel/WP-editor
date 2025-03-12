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
     * Initialize the plugin.
     *
     * @return void
     */
    public function init() {
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
        require_once WPFE_PLUGIN_DIR . 'includes/class-wp-frontend-editor-ajax.php';
        require_once WPFE_PLUGIN_DIR . 'includes/class-wp-frontend-editor-acf.php';
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
            return;
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

        // Enqueue JavaScript
        wp_enqueue_script(
            'wp-frontend-editor',
            WPFE_PLUGIN_URL . 'public/js/frontend-editor.js',
            array( 'jquery', 'wp-util' ),
            WPFE_VERSION,
            true
        );

        // Pass data to JavaScript
        wp_localize_script(
            'wp-frontend-editor',
            'wpfe_data',
            array(
                'ajax_url'   => admin_url( 'admin-ajax.php' ),
                'nonce'      => wp_create_nonce( 'wpfe-editor-nonce' ),
                'post_id'    => get_the_ID(),
                'is_acf_active' => $this->is_acf_active(),
                'edit_icon'  => '<span class="dashicons dashicons-edit"></span>',
                'i18n'       => array(
                    'edit'       => __( 'Edit', 'wp-frontend-editor' ),
                    'save'       => __( 'Save', 'wp-frontend-editor' ),
                    'cancel'     => __( 'Cancel', 'wp-frontend-editor' ),
                    'saving'     => __( 'Saving...', 'wp-frontend-editor' ),
                    'success'    => __( 'Changes saved successfully', 'wp-frontend-editor' ),
                    'error'      => __( 'Error saving changes', 'wp-frontend-editor' ),
                ),
            )
        );
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
        
        // Include the editor sidebar template
        include WPFE_PLUGIN_DIR . 'public/templates/editor-sidebar.php';
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

        // Get the edit button HTML
        $edit_button = $this->get_edit_button_html( 'title', $post_id );

        // Return the title with an edit button wrapper
        return '<span class="wpfe-editable wpfe-title" data-wpfe-field="post_title" data-wpfe-post-id="' . esc_attr( $post_id ) . '">' 
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

        // Get the edit button HTML
        $edit_button = $this->get_edit_button_html( 'content', $post_id );

        // Return the content with an edit button wrapper
        return '<div class="wpfe-editable wpfe-content" data-wpfe-field="post_content" data-wpfe-post-id="' . esc_attr( $post_id ) . '">' 
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

        // Get the edit button HTML
        $edit_button = $this->get_edit_button_html( 'excerpt', $post_id );

        // Return the excerpt with an edit button wrapper
        return '<div class="wpfe-editable wpfe-excerpt" data-wpfe-field="post_excerpt" data-wpfe-post-id="' . esc_attr( $post_id ) . '">' 
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
        return '<button class="wpfe-edit-button" data-wpfe-field="' . esc_attr( $field_type ) . '" data-wpfe-post-id="' . esc_attr( $post_id ) . '">
            <span class="dashicons dashicons-edit"></span>
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