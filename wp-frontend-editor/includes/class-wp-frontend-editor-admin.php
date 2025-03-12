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
        add_options_page(
            __( 'WP Frontend Editor', 'wp-frontend-editor' ),
            __( 'Frontend Editor', 'wp-frontend-editor' ),
            'manage_options',
            'wp-frontend-editor',
            array( $this, 'render_settings_page' )
        );
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

        // Add sections
        add_settings_section(
            'wpfe_general_section',
            __( 'General Settings', 'wp-frontend-editor' ),
            array( $this, 'render_general_section' ),
            'wp-frontend-editor'
        );

        add_settings_section(
            'wpfe_post_types_section',
            __( 'Post Types', 'wp-frontend-editor' ),
            array( $this, 'render_post_types_section' ),
            'wp-frontend-editor'
        );

        add_settings_section(
            'wpfe_fields_section',
            __( 'Editable Fields', 'wp-frontend-editor' ),
            array( $this, 'render_fields_section' ),
            'wp-frontend-editor'
        );

        // Add fields
        add_settings_field(
            'wpfe_enable_inline',
            __( 'Inline Editing', 'wp-frontend-editor' ),
            array( $this, 'render_enable_inline_field' ),
            'wp-frontend-editor',
            'wpfe_general_section'
        );

        add_settings_field(
            'wpfe_sidebar_width',
            __( 'Sidebar Width', 'wp-frontend-editor' ),
            array( $this, 'render_sidebar_width_field' ),
            'wp-frontend-editor',
            'wpfe_general_section'
        );

        add_settings_field(
            'wpfe_post_types',
            __( 'Enabled Post Types', 'wp-frontend-editor' ),
            array( $this, 'render_post_types_field' ),
            'wp-frontend-editor',
            'wpfe_post_types_section'
        );

        add_settings_field(
            'wpfe_core_fields',
            __( 'Core Fields', 'wp-frontend-editor' ),
            array( $this, 'render_core_fields_field' ),
            'wp-frontend-editor',
            'wpfe_fields_section'
        );

        // Add ACF fields setting if ACF is active
        if ( class_exists( 'ACF' ) ) {
            add_settings_field(
                'wpfe_acf_fields',
                __( 'ACF Fields', 'wp-frontend-editor' ),
                array( $this, 'render_acf_fields_field' ),
                'wp-frontend-editor',
                'wpfe_fields_section'
            );
        }
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

        return $sanitized;
    }

    /**
     * Render the settings page.
     */
    public function render_settings_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }
        ?>
        <div class="wrap">
            <h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
            <form action="options.php" method="post">
                <?php
                settings_fields( 'wpfe_settings' );
                do_settings_sections( 'wp-frontend-editor' );
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }

    /**
     * Render the general section.
     */
    public function render_general_section() {
        echo '<p>' . esc_html__( 'Configure general settings for the frontend editor.', 'wp-frontend-editor' ) . '</p>';
    }

    /**
     * Render the post types section.
     */
    public function render_post_types_section() {
        echo '<p>' . esc_html__( 'Select which post types should support frontend editing.', 'wp-frontend-editor' ) . '</p>';
    }

    /**
     * Render the fields section.
     */
    public function render_fields_section() {
        echo '<p>' . esc_html__( 'Select which fields should be editable in the frontend.', 'wp-frontend-editor' ) . '</p>';
    }

    /**
     * Render the enable inline field.
     */
    public function render_enable_inline_field() {
        $options = $this->get_options();
        $checked = isset( $options['enable_inline'] ) && $options['enable_inline'] ? 'checked' : '';
        ?>
        <label>
            <input type="checkbox" name="wpfe_options[enable_inline]" value="1" <?php echo $checked; ?>>
            <?php esc_html_e( 'Enable inline editing for text fields', 'wp-frontend-editor' ); ?>
        </label>
        <p class="description"><?php esc_html_e( 'Allow editing text directly on the page in addition to the sidebar.', 'wp-frontend-editor' ); ?></p>
        <?php
    }

    /**
     * Render the sidebar width field.
     */
    public function render_sidebar_width_field() {
        $options = $this->get_options();
        $width = isset( $options['sidebar_width'] ) ? $options['sidebar_width'] : 350;
        ?>
        <input type="number" name="wpfe_options[sidebar_width]" value="<?php echo esc_attr( $width ); ?>" min="250" max="800" step="10">
        <p class="description"><?php esc_html_e( 'Width of the editor sidebar in pixels (between 250 and 800).', 'wp-frontend-editor' ); ?></p>
        <?php
    }

    /**
     * Render the post types field.
     */
    public function render_post_types_field() {
        $options = $this->get_options();
        $selected_post_types = isset( $options['post_types'] ) ? $options['post_types'] : array( 'post', 'page' );
        
        // Get all public post types
        $post_types = get_post_types( array( 'public' => true ), 'objects' );
        
        foreach ( $post_types as $post_type ) {
            $checked = in_array( $post_type->name, $selected_post_types, true ) ? 'checked' : '';
            ?>
            <label style="display: block; margin-bottom: 5px;">
                <input type="checkbox" name="wpfe_options[post_types][]" value="<?php echo esc_attr( $post_type->name ); ?>" <?php echo $checked; ?>>
                <?php echo esc_html( $post_type->label ); ?>
            </label>
            <?php
        }
    }

    /**
     * Render the core fields field.
     */
    public function render_core_fields_field() {
        $options = $this->get_options();
        $selected_fields = isset( $options['core_fields'] ) ? $options['core_fields'] : array( 'title', 'content', 'excerpt' );
        
        $core_fields = array(
            'title'         => __( 'Title', 'wp-frontend-editor' ),
            'content'       => __( 'Content', 'wp-frontend-editor' ),
            'excerpt'       => __( 'Excerpt', 'wp-frontend-editor' ),
            'featured_image' => __( 'Featured Image', 'wp-frontend-editor' ),
        );
        
        foreach ( $core_fields as $field => $label ) {
            $checked = in_array( $field, $selected_fields, true ) ? 'checked' : '';
            ?>
            <label style="display: block; margin-bottom: 5px;">
                <input type="checkbox" name="wpfe_options[core_fields][]" value="<?php echo esc_attr( $field ); ?>" <?php echo $checked; ?>>
                <?php echo esc_html( $label ); ?>
            </label>
            <?php
        }
    }

    /**
     * Render the ACF fields field.
     */
    public function render_acf_fields_field() {
        if ( ! class_exists( 'ACF' ) ) {
            echo '<p>' . esc_html__( 'Advanced Custom Fields is not active.', 'wp-frontend-editor' ) . '</p>';
            return;
        }

        $options = $this->get_options();
        $selected_fields = isset( $options['acf_fields'] ) ? $options['acf_fields'] : array();
        
        // Get all ACF field groups
        $field_groups = acf_get_field_groups();
        
        if ( empty( $field_groups ) ) {
            echo '<p>' . esc_html__( 'No ACF field groups found.', 'wp-frontend-editor' ) . '</p>';
            return;
        }

        foreach ( $field_groups as $field_group ) {
            echo '<h4>' . esc_html( $field_group['title'] ) . '</h4>';
            
            // Get fields in this group
            $fields = acf_get_fields( $field_group );
            
            if ( empty( $fields ) ) {
                echo '<p>' . esc_html__( 'No fields in this group.', 'wp-frontend-editor' ) . '</p>';
                continue;
            }
            
            foreach ( $fields as $field ) {
                $checked = in_array( $field['key'], $selected_fields, true ) ? 'checked' : '';
                ?>
                <label style="display: block; margin-bottom: 5px;">
                    <input type="checkbox" name="wpfe_options[acf_fields][]" value="<?php echo esc_attr( $field['key'] ); ?>" <?php echo $checked; ?>>
                    <?php echo esc_html( $field['label'] ); ?> (<?php echo esc_html( $field['type'] ); ?>)
                </label>
                <?php
            }
        }
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
            admin_url( 'options-general.php?page=wp-frontend-editor' ),
            __( 'Settings', 'wp-frontend-editor' )
        );
        
        array_unshift( $links, $settings_link );
        
        return $links;
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

        wp_enqueue_style(
            'wp-frontend-editor-admin',
            WPFE_PLUGIN_URL . 'admin/css/admin.css',
            array(),
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
     * Get plugin options.
     *
     * @return array The plugin options.
     */
    public function get_options() {
        $defaults = array(
            'enable_inline' => 1,
            'sidebar_width' => 350,
            'post_types'    => array( 'post', 'page' ),
            'core_fields'   => array( 'title', 'content', 'excerpt', 'featured_image' ),
            'acf_fields'    => array(),
        );

        $options = get_option( 'wpfe_options', $defaults );

        return wp_parse_args( $options, $defaults );
    }
}