<?php
/**
 * WP Frontend Editor
 *
 * @package     WPFrontendEditor
 * @author      Your Name
 * @copyright   2025 Your Name or Company
 * @license     GPL-2.0-or-later
 *
 * @wordpress-plugin
 * Plugin Name: WP Frontend Editor
 * Plugin URI:  https://example.com/wp-frontend-editor
 * Description: A fully native WordPress plugin that allows front-end editing of static content, native WordPress fields, and Advanced Custom Fields (ACF), including repeater and nested fields.
 * Version:     1.0.3
 * Author:      Your Name
 * Author URI:  https://example.com
 * Text Domain: wp-frontend-editor
 * License:     GPL v2 or later
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 * Requires at least: 5.6
 * Requires PHP: 7.0
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Define plugin constants
define( 'WPFE_VERSION', '1.0.0' );
define( 'WPFE_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'WPFE_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'WPFE_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

/**
 * The code that runs during plugin activation.
 */
function wpfe_activate() {
    // Activation code here
}
register_activation_hook( __FILE__, 'wpfe_activate' );

/**
 * The code that runs during plugin deactivation.
 */
function wpfe_deactivate() {
    // Deactivation code here
}
register_deactivation_hook( __FILE__, 'wpfe_deactivate' );

/**
 * Load plugin textdomain for translations.
 */
function wpfe_load_textdomain() {
    // First, look for translations in the WP_LANG_DIR/plugins/ folder
    $locale = apply_filters( 'plugin_locale', determine_locale(), 'wp-frontend-editor' );
    $mofile = WP_LANG_DIR . '/plugins/wp-frontend-editor-' . $locale . '.mo';
    
    if ( file_exists( $mofile ) ) {
        load_textdomain( 'wp-frontend-editor', $mofile );
    } else {
        // Fall back to the plugin's languages folder
        load_plugin_textdomain( 'wp-frontend-editor', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
    }
}
add_action( 'plugins_loaded', 'wpfe_load_textdomain' );

/**
 * Require necessary files.
 */
require_once WPFE_PLUGIN_DIR . 'includes/class-wp-frontend-editor.php';

/**
 * Initialize the plugin.
 */
function wpfe_init() {
    $wpfe = new WP_Frontend_Editor();
    $wpfe->init();
}
add_action( 'plugins_loaded', 'wpfe_init', 11 );