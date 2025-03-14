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
define( 'WPFE_PLUGIN_FILE', __FILE__ );

// Log plugin paths for debugging
if ( defined('WP_DEBUG') && WP_DEBUG ) {
    error_log('WP Frontend Editor: Plugin Directory Path: ' . WPFE_PLUGIN_DIR);
    error_log('WP Frontend Editor: Plugin URL: ' . WPFE_PLUGIN_URL);
    error_log('WP Frontend Editor: Plugin File: ' . __FILE__);
    
    // Check if critical files exist
    $files_to_check = array(
        'includes/class-wp-frontend-editor.php',
        'public/js/frontend-editor.js',
        'public/js/modules/core.js',
        'public/css/frontend-editor.css',
        'public/templates/editor-sidebar.php'
    );
    
    foreach ($files_to_check as $file) {
        $full_path = WPFE_PLUGIN_DIR . $file;
        error_log('WP Frontend Editor: File check - ' . $file . ': ' . (file_exists($full_path) ? 'EXISTS' : 'MISSING'));
    }
}

/**
 * The code that runs during plugin activation.
 */
function wpfe_activate() {
    // Activation code here
    
    // Create log table
    if ( class_exists( 'WP_Frontend_Editor_Logger' ) ) {
        $logger = new WP_Frontend_Editor_Logger();
        $logger->create_log_table();
        
        // Log plugin activation
        wpfe_log( 'Plugin activated', 'info', array(
            'version' => WPFE_VERSION,
            'user_id' => get_current_user_id()
        ));
    }
}
register_activation_hook( __FILE__, 'wpfe_activate' );

/**
 * The code that runs during plugin deactivation.
 */
function wpfe_deactivate() {
    // Deactivation code here
    
    // Clear scheduled events
    $timestamp = wp_next_scheduled( 'wpfe_cleanup_logs' );
    if ( $timestamp ) {
        wp_unschedule_event( $timestamp, 'wpfe_cleanup_logs' );
    }
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
require_once WPFE_PLUGIN_DIR . 'includes/class-wp-frontend-editor-logger.php';
require_once WPFE_PLUGIN_DIR . 'includes/class-wp-frontend-editor-logs.php';

/**
 * Initialize the plugin.
 */
function wpfe_init() {
    // Initialize main plugin
    $wpfe = new WP_Frontend_Editor();
    $wpfe->init();
    
    // Initialize logs
    if ( is_admin() ) {
        new WP_Frontend_Editor_Logs();
    }
    
    // Make logger globally available
    global $wpfe_logger;
    $wpfe_logger = new WP_Frontend_Editor_Logger();
}
add_action( 'plugins_loaded', 'wpfe_init', 11 );

/**
 * Helper function to log messages.
 * 
 * @param string $message The log message.
 * @param string $level   The log level (info, warning, error, success, debug).
 * @param array  $context Additional context data.
 */
function wpfe_log( $message, $level = 'info', $context = array() ) {
    global $wpfe_logger;
    
    if ( ! $wpfe_logger ) {
        return;
    }
    
    $wpfe_logger->log( $level, $message, $context );
}