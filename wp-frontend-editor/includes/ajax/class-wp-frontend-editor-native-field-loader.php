<?php
/**
 * Native Field Loader class.
 * 
 * Handles loading and rendering of native WordPress field interfaces in the frontend editor.
 *
 * @package WPFrontendEditor
 * @since 1.0.3.7
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Native Field Loader class.
 * 
 * @since 1.0.3.7
 */
class WP_Frontend_Editor_Native_Field_Loader {

    /**
     * The instance of the class.
     *
     * @var WP_Frontend_Editor_Native_Field_Loader
     */
    protected static $instance = null;

    /**
     * Constructor.
     */
    private function __construct() {
        // Private constructor to prevent direct instantiation
    }

    /**
     * Get the instance of the class.
     *
     * @return WP_Frontend_Editor_Native_Field_Loader
     */
    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Get the original WordPress field interface HTML
     *
     * @param string $field_name The field name
     * @param int    $post_id    The post ID
     * @return string The field interface HTML
     */
    public function get_wp_field_interface( $field_name, $post_id ) {
        // Check if post exists
        $post = get_post( $post_id );
        if ( ! $post ) {
            return '<div class="wpfe-error">' . esc_html__( 'Post not found', 'wp-frontend-editor' ) . '</div>';
        }

        // Based on field name, render the appropriate editor
        switch ( $field_name ) {
            case 'post_title':
                return $this->render_title_field( $post );
                
            case 'post_content':
                return $this->render_content_field( $post );
                
            case 'post_excerpt':
                return $this->render_excerpt_field( $post );

            case 'post_thumbnail':
                return $this->render_featured_image_field( $post );
                
            default:
                // Check if this is a post meta field
                if ( strpos( $field_name, 'meta_' ) === 0 ) {
                    $meta_key = substr( $field_name, 5 );
                    return $this->render_meta_field( $post, $meta_key );
                }
                
                return '<div class="wpfe-error">' . esc_html__( 'Unknown field type', 'wp-frontend-editor' ) . '</div>';
        }
    }

    /**
     * Get ACF field interface HTML
     *
     * @param string $field_name The field name
     * @param int    $post_id    The post ID
     * @return string The field interface HTML
     */
    public function get_acf_field_interface( $field_name, $post_id ) {
        // This function will load the actual ACF field interface
        
        // Check if ACF is active
        if ( ! function_exists( 'acf_get_field' ) ) {
            return '<div class="wpfe-error">' . esc_html__( 'Advanced Custom Fields plugin is not active', 'wp-frontend-editor' ) . '</div>';
        }
        
        // Get the ACF field object
        $field = acf_get_field( $field_name );
        
        // If field not found by key, try to find by name
        if ( ! $field ) {
            // Use our ACF utils class to find the field by name
            $acf_utils = new WP_Frontend_Editor_ACF_Utils();
            $field = $acf_utils->find_acf_field_by_name( $field_name );
        }
        
        if ( ! $field ) {
            return '<div class="wpfe-error">' . esc_html__( 'ACF field not found', 'wp-frontend-editor' ) . '</div>';
        }
        
        // Get the current field value
        $value = get_field( $field_name, $post_id );
        
        ob_start();
        
        // Include ACF form head to load necessary scripts and styles
        acf_form_head();
        
        // Ensure field has valid wrapper, type, and key to prevent errors
        $field_type = isset($field['type']) ? sanitize_key($field['type']) : 'text';
        $field_key = isset($field['key']) ? sanitize_key($field['key']) : '';
        $field_name = isset($field['name']) ? sanitize_key($field['name']) : '';
        
        // Set up the field wrapper attributes with proper escaping
        $wrapper_attrs = array(
            'id'             => acf_maybe_get( $field, 'wrapper', array() ),
            'class'          => 'acf-field acf-field-' . esc_attr($field_type) . ' acf-field-' . esc_attr($field_key),
            'data-name'      => esc_attr($field_name),
            'data-type'      => esc_attr($field_type),
            'data-key'       => esc_attr($field_key),
            'data-required'  => (int) acf_maybe_get( $field, 'required', 0 ),
        );
        
        ?>
        <div <?php echo acf_esc_attrs( $wrapper_attrs ); ?>>
            <div class="acf-label">
                <label for="acf-<?php echo esc_attr( $field_key ); ?>"><?php echo esc_html( isset($field['label']) ? $field['label'] : $field_name ); ?></label>
                <?php if ( !empty( $field['instructions'] ) ) : ?>
                    <p class="description"><?php echo wp_kses_post( $field['instructions'] ); ?></p>
                <?php endif; ?>
            </div>
            <div class="acf-input">
                <?php 
                // Prepare field data for rendering
                try {
                    // Validate key fields are present
                    if (!$field_key || !$field_type) {
                        throw new Exception(__('Invalid field configuration', 'wp-frontend-editor'));
                    }
                    
                    // Render the field input using ACF's built-in renderer
                    acf_render_field( array_merge( 
                        $field, 
                        array(
                            'value' => $value,
                            'prefix' => 'acf[' . esc_attr($field_key) . ']',
                            'id' => 'acf-' . esc_attr($field_key),
                            'name' => esc_attr($field_name),
                        )
                    ));
                } catch (Exception $e) {
                    echo '<div class="wpfe-error">' . esc_html($e->getMessage()) . '</div>';
                }
                ?>
            </div>
        </div>
        <?php
        
        // Get the output and clean the buffer
        $output = ob_get_clean();
        
        return $output;
    }

    /**
     * Render the title field
     *
     * @param WP_Post $post The post object
     * @return string The HTML
     */
    private function render_title_field( $post ) {
        ob_start();
        ?>
        <div class="wpfe-native-field wpfe-title-field">
            <label for="wpfe-post-title"><?php esc_html_e( 'Title', 'wp-frontend-editor' ); ?></label>
            <input type="text" id="wpfe-post-title" name="post_title" value="<?php echo esc_attr( $post->post_title ); ?>" class="wpfe-field-input wpfe-title-input" placeholder="<?php esc_attr_e( 'Enter title here', 'wp-frontend-editor' ); ?>">
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Render the content field (WYSIWYG editor)
     *
     * @param WP_Post $post The post object
     * @return string The HTML
     */
    private function render_content_field( $post ) {
        ob_start();
        
        // Set up TinyMCE settings similar to WordPress post editor
        $editor_id = 'wpfe-post-content';
        $settings = array(
            'textarea_name' => 'post_content',
            'media_buttons' => true,
            'tinymce'       => array(
                'toolbar1'      => 'formatselect,bold,italic,bullist,numlist,blockquote,alignleft,aligncenter,alignright,link,unlink,wp_more,spellchecker,fullscreen,wp_adv',
                'toolbar2'      => 'strikethrough,hr,forecolor,pastetext,removeformat,charmap,outdent,indent,undo,redo,wp_help',
                'height'        => 400,
                'autoresize_min_height' => 300,
                'wp_autoresize_on' => true,
            ),
            'quicktags'     => true,
            'editor_height' => 400,
            'editor_class'  => 'wpfe-field-input wpfe-wysiwyg-input',
        );
        
        ?>
        <div class="wpfe-native-field wpfe-content-field">
            <label for="<?php echo esc_attr( $editor_id ); ?>"><?php esc_html_e( 'Content', 'wp-frontend-editor' ); ?></label>
            <div class="wpfe-wysiwyg-wrapper">
                <?php wp_editor( $post->post_content, $editor_id, $settings ); ?>
            </div>
        </div>
        <?php
        
        return ob_get_clean();
    }

    /**
     * Render the excerpt field
     *
     * @param WP_Post $post The post object
     * @return string The HTML
     */
    private function render_excerpt_field( $post ) {
        ob_start();
        ?>
        <div class="wpfe-native-field wpfe-excerpt-field">
            <label for="wpfe-post-excerpt"><?php esc_html_e( 'Excerpt', 'wp-frontend-editor' ); ?></label>
            <textarea id="wpfe-post-excerpt" name="post_excerpt" class="wpfe-field-input wpfe-excerpt-input" rows="5" placeholder="<?php esc_attr_e( 'Write an excerpt (optional)', 'wp-frontend-editor' ); ?>"><?php echo esc_textarea( $post->post_excerpt ); ?></textarea>
            <p class="description"><?php esc_html_e( 'Excerpts are optional hand-crafted summaries of your content.', 'wp-frontend-editor' ); ?></p>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Render the featured image field
     *
     * @param WP_Post $post The post object
     * @return string The HTML
     */
    private function render_featured_image_field( $post ) {
        ob_start();
        
        $thumbnail_id = get_post_thumbnail_id( $post->ID );
        $thumbnail_url = $thumbnail_id ? wp_get_attachment_image_url( $thumbnail_id, 'medium' ) : '';
        
        ?>
        <div class="wpfe-native-field wpfe-thumbnail-field">
            <label><?php esc_html_e( 'Featured Image', 'wp-frontend-editor' ); ?></label>
            
            <div class="wpfe-thumbnail-container">
                <div class="wpfe-thumbnail-preview" style="<?php echo $thumbnail_url ? '' : 'display: none;'; ?>">
                    <img src="<?php echo esc_url( $thumbnail_url ); ?>" alt="" class="wpfe-thumbnail-img">
                </div>
                
                <input type="hidden" id="wpfe-thumbnail-id" name="post_thumbnail" value="<?php echo esc_attr( $thumbnail_id ); ?>">
                
                <div class="wpfe-thumbnail-actions">
                    <button type="button" class="button wpfe-set-thumbnail"><?php echo $thumbnail_id ? esc_html__( 'Replace Image', 'wp-frontend-editor' ) : esc_html__( 'Set Featured Image', 'wp-frontend-editor' ); ?></button>
                    
                    <?php if ( $thumbnail_id ) : ?>
                        <button type="button" class="button wpfe-remove-thumbnail"><?php esc_html_e( 'Remove Image', 'wp-frontend-editor' ); ?></button>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <?php
        
        return ob_get_clean();
    }

    /**
     * Render a post meta field
     *
     * @param WP_Post $post     The post object
     * @param string  $meta_key The meta key
     * @return string The HTML
     */
    private function render_meta_field( $post, $meta_key ) {
        $meta_value = get_post_meta( $post->ID, $meta_key, true );
        
        ob_start();
        ?>
        <div class="wpfe-native-field wpfe-meta-field">
            <label for="wpfe-meta-<?php echo esc_attr( $meta_key ); ?>"><?php echo esc_html( ucwords( str_replace( '_', ' ', $meta_key ) ) ); ?></label>
            
            <?php if ( is_array( $meta_value ) ) : ?>
                <textarea id="wpfe-meta-<?php echo esc_attr( $meta_key ); ?>" name="meta_<?php echo esc_attr( $meta_key ); ?>" class="wpfe-field-input wpfe-meta-input" rows="8"><?php echo esc_textarea( json_encode( $meta_value, JSON_PRETTY_PRINT ) ); ?></textarea>
                <p class="description"><?php esc_html_e( 'This is a complex value stored as JSON. Edit with caution.', 'wp-frontend-editor' ); ?></p>
            <?php else : ?>
                <input type="text" id="wpfe-meta-<?php echo esc_attr( $meta_key ); ?>" name="meta_<?php echo esc_attr( $meta_key ); ?>" value="<?php echo esc_attr( $meta_value ); ?>" class="wpfe-field-input wpfe-meta-input">
            <?php endif; ?>
        </div>
        <?php
        
        return ob_get_clean();
    }
}