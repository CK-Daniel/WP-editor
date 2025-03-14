<?php
/**
 * The logs page class for WP Frontend Editor.
 *
 * @package WPFrontendEditor
 */

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Logs page class to handle the logs admin page.
 */
class WP_Frontend_Editor_Logs {

    /**
     * Logger instance
     *
     * @var WP_Frontend_Editor_Logger
     */
    private $logger;

    /**
     * Constructor.
     */
    public function __construct() {
        // Get logger instance
        $this->logger = new WP_Frontend_Editor_Logger();
        
        // Add admin menu page
        add_action( 'admin_menu', array( $this, 'add_logs_page' ) );
        
        // Register AJAX handlers
        add_action( 'wp_ajax_wpfe_get_logs', array( $this, 'ajax_get_logs' ) );
        
        // Register settings
        add_action( 'admin_init', array( $this, 'register_settings' ) );
        
        // Add scheduled cleanup task
        add_action( 'wpfe_cleanup_logs', array( $this, 'cleanup_old_logs' ) );
        
        // Schedule the task if not already scheduled
        if ( ! wp_next_scheduled( 'wpfe_cleanup_logs' ) ) {
            wp_schedule_event( time(), 'daily', 'wpfe_cleanup_logs' );
        }
        
        // Add settings link to plugin page
        add_filter( 'plugin_action_links_' . WPFE_PLUGIN_BASENAME, array( $this, 'add_logs_link' ) );
        
        // Enqueue admin scripts and styles
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
    }

    /**
     * Add logs page to admin menu.
     */
    public function add_logs_page() {
        $logs_page = add_submenu_page(
            'wp-frontend-editor', // Parent menu slug (main menu)
            __( 'Logs', 'wp-frontend-editor' ),
            __( 'Logs', 'wp-frontend-editor' ),
            'manage_options',
            'wp-frontend-editor-logs',
            array( $this, 'render_logs_page' )
        );
        
        // Log when logs page is accessed
        add_action( 'load-' . $logs_page, function() {
            wpfe_log( 'Logs page accessed', 'info', array(
                'user_id' => get_current_user_id(),
                'user_name' => wp_get_current_user()->display_name
            ));
        });
    }

    /**
     * Register settings.
     */
    public function register_settings() {
        register_setting(
            'wpfe_logs_settings',
            'wpfe_logs_options',
            array( $this, 'sanitize_settings' )
        );
    }

    /**
     * Sanitize settings.
     *
     * @param array $input The settings input.
     * @return array The sanitized settings.
     */
    public function sanitize_settings( $input ) {
        $sanitized = array();
        
        // Sanitize retention period
        $sanitized['retention_period'] = isset( $input['retention_period'] ) 
            ? sanitize_text_field( $input['retention_period'] )
            : '30';
        
        // Sanitize custom retention days
        $sanitized['retention_days'] = isset( $input['retention_days'] ) 
            ? absint( $input['retention_days'] )
            : 30;
        
        // Sanitize log levels
        $sanitized['log_levels'] = isset( $input['log_levels'] ) && is_array( $input['log_levels'] )
            ? array_map( 'sanitize_text_field', $input['log_levels'] )
            : array( 'error', 'warning', 'info' );
        
        return $sanitized;
    }

    /**
     * Enqueue admin scripts and styles.
     *
     * @param string $hook The current admin page.
     */
    public function enqueue_scripts( $hook ) {
        if ( 'wp-frontend-editor_page_wp-frontend-editor-logs' !== $hook ) {
            return;
        }
        
        // Enqueue Chart.js
        wp_enqueue_script(
            'chartjs',
            'https://cdn.jsdelivr.net/npm/chart.js@2.9.4/dist/Chart.min.js',
            array(),
            '2.9.4',
            true
        );
        
        // Enqueue jQuery UI datepicker
        wp_enqueue_script( 'jquery-ui-datepicker' );
        wp_enqueue_style(
            'jquery-ui',
            'https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css',
            array(),
            '1.12.1'
        );
        
        // Enqueue logs style
        wp_enqueue_style(
            'wpfe-logs',
            WPFE_PLUGIN_URL . 'admin/css/logs.css',
            array( 'dashicons' ),
            WPFE_VERSION
        );
        
        // Enqueue logs script
        wp_enqueue_script(
            'wpfe-logs',
            WPFE_PLUGIN_URL . 'admin/js/logs.js',
            array( 'jquery', 'jquery-ui-datepicker' ),
            WPFE_VERSION,
            true
        );
        
        // Get logs statistics
        $stats = $this->get_logs_stats();
        
        // Localize script
        wp_localize_script(
            'wpfe-logs',
            'wpfeLogs',
            array(
                'i18n' => array(
                    'loading'     => __( 'Loading logs...', 'wp-frontend-editor' ),
                    'error'       => __( 'An error occurred while loading logs.', 'wp-frontend-editor' ),
                    'no_logs'     => __( 'No logs found.', 'wp-frontend-editor' ),
                    'showing'     => __( 'Showing {start} to {end} of {total} logs', 'wp-frontend-editor' ),
                    'delete_error' => __( 'Failed to delete log.', 'wp-frontend-editor' ),
                    'clear_error' => __( 'Failed to clear logs.', 'wp-frontend-editor' ),
                    'url'         => __( 'URL', 'wp-frontend-editor' ),
                    'context'     => __( 'Context', 'wp-frontend-editor' ),
                    'logs_count'  => __( 'Logs Count', 'wp-frontend-editor' ),
                    'dismiss'     => __( 'Dismiss', 'wp-frontend-editor' ),
                ),
                'stats' => $stats,
            )
        );
    }

    /**
     * Render logs page.
     */
    public function render_logs_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }
        
        $log_levels = $this->logger->get_log_levels();
        $users = get_users( array( 'fields' => array( 'ID', 'display_name' ) ) );
        $nonce = wp_create_nonce( 'wpfe_logs_nonce' );
        $options = $this->get_options();
        
        ?>
        <div class="wrap">
            <h1><?php esc_html_e( 'Frontend Editor Logs', 'wp-frontend-editor' ); ?></h1>
            
            <div class="wpfe-logs-notices"></div>
            
            <div class="wpfe-logs-cards">
                <div class="wpfe-logs-card" id="wpfe-card-total">
                    <span class="wpfe-card-icon dashicons dashicons-editor-ul"></span>
                    <div class="wpfe-card-value">0</div>
                    <div class="wpfe-card-label"><?php esc_html_e( 'Total Logs', 'wp-frontend-editor' ); ?></div>
                </div>
                
                <div class="wpfe-logs-card" id="wpfe-card-info">
                    <span class="wpfe-card-icon dashicons dashicons-info wpfe-card-info"></span>
                    <div class="wpfe-card-value">0</div>
                    <div class="wpfe-card-label"><?php esc_html_e( 'Info', 'wp-frontend-editor' ); ?></div>
                </div>
                
                <div class="wpfe-logs-card" id="wpfe-card-warning">
                    <span class="wpfe-card-icon dashicons dashicons-warning wpfe-card-warning"></span>
                    <div class="wpfe-card-value">0</div>
                    <div class="wpfe-card-label"><?php esc_html_e( 'Warnings', 'wp-frontend-editor' ); ?></div>
                </div>
                
                <div class="wpfe-logs-card" id="wpfe-card-error">
                    <span class="wpfe-card-icon dashicons dashicons-dismiss wpfe-card-error"></span>
                    <div class="wpfe-card-value">0</div>
                    <div class="wpfe-card-label"><?php esc_html_e( 'Errors', 'wp-frontend-editor' ); ?></div>
                </div>
                
                <div class="wpfe-logs-card" id="wpfe-card-success">
                    <span class="wpfe-card-icon dashicons dashicons-yes-alt wpfe-card-success"></span>
                    <div class="wpfe-card-value">0</div>
                    <div class="wpfe-card-label"><?php esc_html_e( 'Success', 'wp-frontend-editor' ); ?></div>
                </div>
            </div>
            
            <div class="wpfe-logs-charts">
                <div class="wpfe-logs-chart">
                    <div class="wpfe-chart-header">
                        <h2 class="wpfe-chart-title"><?php esc_html_e( 'Log Level Distribution', 'wp-frontend-editor' ); ?></h2>
                    </div>
                    <div class="wpfe-chart-container">
                        <canvas id="wpfe-level-chart"></canvas>
                    </div>
                </div>
                
                <div class="wpfe-logs-chart">
                    <div class="wpfe-chart-header">
                        <h2 class="wpfe-chart-title"><?php esc_html_e( 'Logs Over Time', 'wp-frontend-editor' ); ?></h2>
                    </div>
                    <div class="wpfe-chart-container">
                        <canvas id="wpfe-time-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="wpfe-logs-page">
                <div class="wpfe-logs-header">
                    <div>
                        <h2 class="wpfe-logs-title"><?php esc_html_e( 'Log Entries', 'wp-frontend-editor' ); ?></h2>
                        <p class="wpfe-logs-header-desc"><?php esc_html_e( 'View and manage logs for the Frontend Editor plugin.', 'wp-frontend-editor' ); ?></p>
                    </div>
                    
                    <div class="wpfe-logs-actions">
                        <button id="wpfe-logs-export" class="button">
                            <span class="dashicons dashicons-download"></span>
                            <?php esc_html_e( 'Export', 'wp-frontend-editor' ); ?>
                        </button>
                        <button id="wpfe-logs-clear" class="button">
                            <span class="dashicons dashicons-trash"></span>
                            <?php esc_html_e( 'Clear Logs', 'wp-frontend-editor' ); ?>
                        </button>
                        <a href="#" class="button wpfe-logs-toggle-settings">
                            <span class="dashicons dashicons-admin-settings"></span>
                            <?php esc_html_e( 'Settings', 'wp-frontend-editor' ); ?>
                        </a>
                    </div>
                </div>
                
                <div class="wpfe-logs-filters">
                    <div class="wpfe-logs-filter-group">
                        <select id="wpfe-logs-level">
                            <option value=""><?php esc_html_e( 'All Levels', 'wp-frontend-editor' ); ?></option>
                            <?php foreach ( $log_levels as $level => $label ) : ?>
                                <option value="<?php echo esc_attr( $level ); ?>"><?php echo esc_html( $label ); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <div class="wpfe-logs-filter-group">
                        <select id="wpfe-logs-user">
                            <option value=""><?php esc_html_e( 'All Users', 'wp-frontend-editor' ); ?></option>
                            <?php foreach ( $users as $user ) : ?>
                                <option value="<?php echo esc_attr( $user->ID ); ?>"><?php echo esc_html( $user->display_name ); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <div class="wpfe-logs-filter-group">
                        <input type="text" id="wpfe-logs-date-from" class="wpfe-logs-datepicker" placeholder="<?php esc_attr_e( 'From Date', 'wp-frontend-editor' ); ?>">
                        <input type="text" id="wpfe-logs-date-to" class="wpfe-logs-datepicker" placeholder="<?php esc_attr_e( 'To Date', 'wp-frontend-editor' ); ?>">
                    </div>
                    
                    <div class="wpfe-logs-search">
                        <span class="dashicons dashicons-search"></span>
                        <input type="text" id="wpfe-logs-search" placeholder="<?php esc_attr_e( 'Search logs...', 'wp-frontend-editor' ); ?>">
                    </div>
                    
                    <div class="wpfe-logs-filter-actions">
                        <button id="wpfe-logs-reset" class="button">
                            <span class="dashicons dashicons-dismiss"></span>
                            <?php esc_html_e( 'Reset', 'wp-frontend-editor' ); ?>
                        </button>
                        <button id="wpfe-logs-refresh" class="button">
                            <span class="dashicons dashicons-update"></span>
                            <?php esc_html_e( 'Refresh', 'wp-frontend-editor' ); ?>
                        </button>
                    </div>
                </div>
                
                <div class="wpfe-logs-container">
                    <div class="wpfe-logs-table-container">
                        <table class="wpfe-logs-table">
                            <thead>
                                <tr>
                                    <th class="column-id"><?php esc_html_e( 'ID', 'wp-frontend-editor' ); ?></th>
                                    <th class="column-timestamp"><?php esc_html_e( 'Timestamp', 'wp-frontend-editor' ); ?></th>
                                    <th class="column-level"><?php esc_html_e( 'Level', 'wp-frontend-editor' ); ?></th>
                                    <th class="column-message"><?php esc_html_e( 'Message', 'wp-frontend-editor' ); ?></th>
                                    <th class="column-user"><?php esc_html_e( 'User', 'wp-frontend-editor' ); ?></th>
                                    <th class="column-ip"><?php esc_html_e( 'IP Address', 'wp-frontend-editor' ); ?></th>
                                    <th class="column-actions"><?php esc_html_e( 'Actions', 'wp-frontend-editor' ); ?></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="7" class="wpfe-loading">
                                        <div class="wpfe-loading-spinner"></div>
                                        <p><?php esc_html_e( 'Loading logs...', 'wp-frontend-editor' ); ?></p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="wpfe-logs-pagination" style="display: none;">
                        <div class="wpfe-pagination-info"><?php esc_html_e( 'Showing 1 to 20 of 100 logs', 'wp-frontend-editor' ); ?></div>
                        <div class="wpfe-pagination-links"></div>
                    </div>
                </div>
            </div>
            
            <!-- Logs Settings -->
            <div class="wpfe-logs-settings" style="display: none;">
                <form method="post" action="options.php" class="wpfe-logs-settings-form">
                    <?php settings_fields( 'wpfe_logs_settings' ); ?>
                    
                    <h3 class="wpfe-logs-settings-title"><?php esc_html_e( 'Log Settings', 'wp-frontend-editor' ); ?></h3>
                    
                    <div class="wpfe-settings-row">
                        <div class="wpfe-settings-field">
                            <label for="wpfe-logs-retention-period"><?php esc_html_e( 'Log Retention', 'wp-frontend-editor' ); ?></label>
                            <select id="wpfe-logs-retention-period" name="wpfe_logs_options[retention_period]" class="regular-text">
                                <option value="forever" <?php selected( $options['retention_period'], 'forever' ); ?>>
                                    <?php esc_html_e( 'Keep Forever', 'wp-frontend-editor' ); ?>
                                </option>
                                <option value="1" <?php selected( $options['retention_period'], '1' ); ?>>
                                    <?php esc_html_e( '1 Day', 'wp-frontend-editor' ); ?>
                                </option>
                                <option value="7" <?php selected( $options['retention_period'], '7' ); ?>>
                                    <?php esc_html_e( '7 Days', 'wp-frontend-editor' ); ?>
                                </option>
                                <option value="30" <?php selected( $options['retention_period'], '30' ); ?>>
                                    <?php esc_html_e( '30 Days', 'wp-frontend-editor' ); ?>
                                </option>
                                <option value="90" <?php selected( $options['retention_period'], '90' ); ?>>
                                    <?php esc_html_e( '90 Days', 'wp-frontend-editor' ); ?>
                                </option>
                                <option value="custom" <?php selected( $options['retention_period'], 'custom' ); ?>>
                                    <?php esc_html_e( 'Custom', 'wp-frontend-editor' ); ?>
                                </option>
                            </select>
                            <p class="description">
                                <?php esc_html_e( 'Specify how long to keep logs.', 'wp-frontend-editor' ); ?>
                            </p>
                        </div>
                        
                        <div id="wpfe-logs-retention-custom-wrap" class="wpfe-settings-field <?php echo 'custom' !== $options['retention_period'] ? 'hidden' : ''; ?>">
                            <label for="wpfe-logs-retention-days"><?php esc_html_e( 'Custom Retention (Days)', 'wp-frontend-editor' ); ?></label>
                            <input type="number" id="wpfe-logs-retention-days" name="wpfe_logs_options[retention_days]" 
                                   value="<?php echo esc_attr( $options['retention_days'] ); ?>" 
                                   min="1" class="regular-text">
                            <p class="description">
                                <?php esc_html_e( 'Number of days to keep logs before automatic deletion.', 'wp-frontend-editor' ); ?>
                            </p>
                        </div>
                    </div>
                    
                    <div class="wpfe-settings-row">
                        <div class="wpfe-settings-field">
                            <label><?php esc_html_e( 'Log Levels', 'wp-frontend-editor' ); ?></label>
                            <p class="description">
                                <?php esc_html_e( 'Select which log levels to record.', 'wp-frontend-editor' ); ?>
                            </p>
                            
                            <?php foreach ( $log_levels as $level => $label ) : 
                                $checked = in_array( $level, $options['log_levels'], true );
                            ?>
                                <label style="display: block; margin-top: 8px;">
                                    <input type="checkbox" name="wpfe_logs_options[log_levels][]" 
                                           value="<?php echo esc_attr( $level ); ?>" 
                                           <?php checked( $checked ); ?>>
                                    <?php echo esc_html( $label ); ?>
                                </label>
                            <?php endforeach; ?>
                        </div>
                    </div>
                    
                    <div class="wpfe-settings-actions">
                        <?php submit_button( __( 'Save Settings', 'wp-frontend-editor' ) ); ?>
                    </div>
                </form>
            </div>
            
            <!-- Delete Modal -->
            <div id="wpfe-delete-modal" class="wpfe-modal">
                <div class="wpfe-modal-content">
                    <span class="wpfe-modal-close">&times;</span>
                    <div class="wpfe-modal-header">
                        <h3 class="wpfe-modal-title"><?php esc_html_e( 'Delete Log Entry', 'wp-frontend-editor' ); ?></h3>
                    </div>
                    <div class="wpfe-modal-body">
                        <p><?php esc_html_e( 'Are you sure you want to delete this log entry? This action cannot be undone.', 'wp-frontend-editor' ); ?></p>
                    </div>
                    <div class="wpfe-modal-footer">
                        <button class="button wpfe-modal-cancel"><?php esc_html_e( 'Cancel', 'wp-frontend-editor' ); ?></button>
                        <button id="wpfe-delete-confirm" class="button button-primary"><?php esc_html_e( 'Delete', 'wp-frontend-editor' ); ?></button>
                    </div>
                </div>
            </div>
            
            <!-- Clear Modal -->
            <div id="wpfe-clear-modal" class="wpfe-modal">
                <div class="wpfe-modal-content">
                    <span class="wpfe-modal-close">&times;</span>
                    <div class="wpfe-modal-header">
                        <h3 class="wpfe-modal-title"><?php esc_html_e( 'Clear All Logs', 'wp-frontend-editor' ); ?></h3>
                    </div>
                    <div class="wpfe-modal-body">
                        <p><?php esc_html_e( 'Are you sure you want to clear all logs? This action cannot be undone.', 'wp-frontend-editor' ); ?></p>
                    </div>
                    <div class="wpfe-modal-footer">
                        <button class="button wpfe-modal-cancel"><?php esc_html_e( 'Cancel', 'wp-frontend-editor' ); ?></button>
                        <button id="wpfe-clear-confirm" class="button button-primary"><?php esc_html_e( 'Clear All', 'wp-frontend-editor' ); ?></button>
                    </div>
                </div>
            </div>
            
            <input type="hidden" id="wpfe_logs_nonce" value="<?php echo esc_attr( $nonce ); ?>">
        </div>
        <?php
    }

    /**
     * Get logs settings options.
     *
     * @return array The options.
     */
    public function get_options() {
        $defaults = array(
            'retention_period' => '30',
            'retention_days'   => 30,
            'log_levels'       => array( 'error', 'warning', 'info', 'success', 'debug' ),
        );
        
        $options = get_option( 'wpfe_logs_options', $defaults );
        
        return wp_parse_args( $options, $defaults );
    }

    /**
     * Get logs statistics.
     *
     * @return array The logs statistics.
     */
    public function get_logs_stats() {
        global $wpdb;
        $log_table = $wpdb->prefix . 'wpfe_logs';
        $stats = array();
        
        // Get total count
        $stats['total'] = $wpdb->get_var( "SELECT COUNT(*) FROM $log_table" );
        
        // Get counts by level
        $level_data = array();
        $levels = $this->logger->get_log_levels();
        
        foreach ( array_keys( $levels ) as $level ) {
            $count = $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM $log_table WHERE level = %s", $level ) );
            $stats[ $level ] = $count;
            $level_data[ $level ] = absint( $count );
        }
        
        $stats['level_data'] = $level_data;
        
        // Get counts by day for the last 7 days
        $time_data = array();
        $days = 7;
        
        for ( $i = $days - 1; $i >= 0; $i-- ) {
            $date = date( 'Y-m-d', strtotime( "-$i days" ) );
            $date_label = date( 'M j', strtotime( "-$i days" ) );
            
            $count = $wpdb->get_var( $wpdb->prepare(
                "SELECT COUNT(*) FROM $log_table WHERE DATE(timestamp) = %s",
                $date
            ) );
            
            $time_data[ $date_label ] = absint( $count );
        }
        
        $stats['time_data'] = $time_data;
        
        return $stats;
    }

    /**
     * AJAX handler to get logs.
     */
    public function ajax_get_logs() {
        check_ajax_referer( 'wpfe_logs_nonce', 'nonce' );
        
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( array( 'message' => __( 'You do not have permission to view logs.', 'wp-frontend-editor' ) ) );
        }
        
        $page = isset( $_POST['page'] ) ? absint( $_POST['page'] ) : 1;
        $level = isset( $_POST['level'] ) ? sanitize_text_field( wp_unslash( $_POST['level'] ) ) : '';
        $user_id = isset( $_POST['user_id'] ) ? absint( $_POST['user_id'] ) : '';
        $search = isset( $_POST['search'] ) ? sanitize_text_field( wp_unslash( $_POST['search'] ) ) : '';
        $date_from = isset( $_POST['date_from'] ) ? sanitize_text_field( wp_unslash( $_POST['date_from'] ) ) : '';
        $date_to = isset( $_POST['date_to'] ) ? sanitize_text_field( wp_unslash( $_POST['date_to'] ) ) : '';
        
        $args = array(
            'page'      => $page,
            'level'     => $level,
            'user_id'   => $user_id,
            'search'    => $search,
            'date_from' => $date_from,
            'date_to'   => $date_to,
        );
        
        $logs_data = $this->logger->get_logs( $args );
        $logs_data['stats'] = $this->get_logs_stats();
        
        wp_send_json_success( $logs_data );
    }

    /**
     * Cleanup old logs.
     */
    public function cleanup_old_logs() {
        global $wpdb;
        $log_table = $wpdb->prefix . 'wpfe_logs';
        $options = $this->get_options();
        
        // Skip if retention period is set to forever
        if ( 'forever' === $options['retention_period'] ) {
            return;
        }
        
        // Get retention period in days
        $days = $options['retention_period'];
        
        if ( 'custom' === $days ) {
            $days = absint( $options['retention_days'] );
        } else {
            $days = absint( $days );
        }
        
        if ( $days < 1 ) {
            $days = 30; // Default to 30 days
        }
        
        // Calculate the date threshold
        $date_threshold = date( 'Y-m-d H:i:s', strtotime( "-$days days" ) );
        
        // Delete old logs
        $wpdb->query( $wpdb->prepare(
            "DELETE FROM $log_table WHERE timestamp < %s",
            $date_threshold
        ) );
    }

    /**
     * Add logs link to plugin page.
     *
     * @param array $links The plugin action links.
     * @return array Modified plugin action links.
     */
    public function add_logs_link( $links ) {
        $logs_link = sprintf(
            '<a href="%s">%s</a>',
            admin_url( 'admin.php?page=wp-frontend-editor-logs' ),
            __( 'Logs', 'wp-frontend-editor' )
        );
        
        // Add logs link after settings link
        $settings_link_pos = array_search( 'settings', array_keys( $links ), true );
        
        if ( false !== $settings_link_pos ) {
            $links = array_merge(
                array_slice( $links, 0, $settings_link_pos + 1 ),
                array( 'logs' => $logs_link ),
                array_slice( $links, $settings_link_pos + 1 )
            );
        } else {
            $links['logs'] = $logs_link;
        }
        
        return $links;
    }
}