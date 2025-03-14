<?php
/**
 * Native field editor template.
 *
 * @package WPFrontendEditor
 * @since 1.0.3.7
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * This template renders the native WordPress or ACF field editor interface
 * in the sidebar.
 */

// Get field data from the template args
$field_name = isset( $args['field_name'] ) ? $args['field_name'] : '';
$post_id = isset( $args['post_id'] ) ? (int) $args['post_id'] : 0;
$field_type = isset( $args['field_type'] ) ? $args['field_type'] : '';
$field_source = isset( $args['field_source'] ) ? $args['field_source'] : '';

// Make sure the Native Field Loader class is loaded
if (!class_exists('WP_Frontend_Editor_Native_Field_Loader')) {
    require_once WP_FRONTEND_EDITOR_PATH . 'includes/ajax/class-wp-frontend-editor-native-field-loader.php';
}

// Determine what editor to load based on the field source
$field_loader = WP_Frontend_Editor_Native_Field_Loader::get_instance();

// Add necessary scripts and styles for the field type
wp_enqueue_style( 'wp-frontend-editor-native-fields', plugin_dir_url( dirname( __FILE__ ) ) . 'css/native-fields.css', array(), WP_FRONTEND_EDITOR_VERSION );
wp_enqueue_script( 'wp-frontend-editor-native-fields', plugin_dir_url( dirname( __FILE__ ) ) . 'js/native-fields.js', array( 'jquery', 'wp-frontend-editor' ), WP_FRONTEND_EDITOR_VERSION, true );

// For media uploads
wp_enqueue_media();

// Load WordPress common styles for admin form elements
wp_enqueue_style( 'common' );
wp_enqueue_style( 'forms' );

// Add a nonce for security
$nonce = wp_create_nonce( 'wpfe_native_field_' . $field_name . '_' . $post_id );
?>

<div 
    class="wpfe-native-field-editor" 
    data-nonce="<?php echo esc_attr( $nonce ); ?>"
    role="form"
    aria-label="<?php echo esc_attr( sprintf( __( 'Edit %s', 'wp-frontend-editor' ), $field_name ) ); ?>"
>
    <?php if ( empty( $field_name ) || empty( $post_id ) ) : ?>
        <div class="wpfe-error"><?php esc_html_e( 'Error: Missing field information.', 'wp-frontend-editor' ); ?></div>
    <?php else : ?>
        <div class="wpfe-field-editor-wrapper">
            <?php
            // Load the appropriate field interface based on the source
            if ( $field_source === 'acf' ) {
                if ( function_exists( 'acf_get_field' ) && function_exists( 'get_field' ) ) {
                    echo $field_loader->get_acf_field_interface( $field_name, $post_id );
                } else {
                    // ACF is not active or available
                    echo '<div class="wpfe-error">' . 
                         esc_html__( 'Advanced Custom Fields plugin is required but not active. Please activate ACF to edit this field.', 'wp-frontend-editor' ) . 
                         '</div>';
                }
            } else {
                echo $field_loader->get_wp_field_interface( $field_name, $post_id );
            }
            ?>
        </div>
        
        <div class="wpfe-field-info">
            <div class="wpfe-field-meta">
                <?php if ( $field_type ) : ?>
                    <span class="wpfe-field-type-indicator"><?php echo esc_html( $field_type ); ?></span>
                <?php endif; ?>
                
                <?php if ( $field_source ) : ?>
                    <span class="wpfe-field-source-indicator"><?php echo esc_html( $field_source ); ?></span>
                <?php endif; ?>
            </div>
            
            <div class="wpfe-field-support-info">
                <?php if ( $field_source === 'acf' ) : ?>
                    <p class="wpfe-field-support-text">
                        <?php esc_html_e( 'This field is managed by Advanced Custom Fields.', 'wp-frontend-editor' ); ?>
                    </p>
                <?php elseif ( $field_source === 'wordpress' ) : ?>
                    <p class="wpfe-field-support-text">
                        <?php esc_html_e( 'This is a native WordPress field.', 'wp-frontend-editor' ); ?>
                    </p>
                <?php endif; ?>
            </div>
        </div>
    <?php endif; ?>
</div>

<script>
// Initialize any necessary scripts for the field editor
jQuery(document).ready(function($) {
    // The field is ready for editing
    $(document).trigger('wpfe:native_field_ready', [{
        fieldName: '<?php echo esc_js( $field_name ); ?>',
        postId: <?php echo (int) $post_id; ?>,
        fieldType: '<?php echo esc_js( $field_type ); ?>',
        fieldSource: '<?php echo esc_js( $field_source ); ?>'
    }]);
});
</script>