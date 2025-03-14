/**
 * Frontend Editor Logs
 * JavaScript for the logs interface
 */
(function($) {
    'use strict';

    // Initialize logs interface
    function initLogs() {
        setupFilters();
        setupPagination();
        setupLogActions();
        setupCharts();
        setupDatepickers();
        setupModals();
    }

    // Setup filter events
    function setupFilters() {
        // Level filter
        $('#wpfe-logs-level').on('change', function() {
            refreshLogs();
        });

        // User filter
        $('#wpfe-logs-user').on('change', function() {
            refreshLogs();
        });

        // Search filter
        let searchTimeout;
        $('#wpfe-logs-search').on('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(function() {
                refreshLogs();
            }, 500);
        });

        // Date filters
        $('#wpfe-logs-date-from, #wpfe-logs-date-to').on('change', function() {
            refreshLogs();
        });

        // Reset filters
        $('#wpfe-logs-reset').on('click', function(e) {
            e.preventDefault();
            $('#wpfe-logs-level').val('');
            $('#wpfe-logs-user').val('');
            $('#wpfe-logs-search').val('');
            $('#wpfe-logs-date-from').val('');
            $('#wpfe-logs-date-to').val('');
            refreshLogs();
        });

        // Refresh button
        $('#wpfe-logs-refresh').on('click', function(e) {
            e.preventDefault();
            refreshLogs();
        });

        // Export button
        $('#wpfe-logs-export').on('click', function(e) {
            e.preventDefault();
            exportLogs();
        });

        // Clear all logs
        $('#wpfe-logs-clear').on('click', function(e) {
            e.preventDefault();
            showClearModal();
        });
    }

    // Setup pagination
    function setupPagination() {
        $('.wpfe-logs-container').on('click', '.wpfe-pagination-link:not(.disabled)', function(e) {
            e.preventDefault();
            const page = $(this).data('page');
            refreshLogs(page);
        });
    }

    // Setup log row actions
    function setupLogActions() {
        // Toggle log details
        $('.wpfe-logs-container').on('click', '.wpfe-log-toggle', function(e) {
            e.preventDefault();
            const $row = $(this).closest('tr');
            const $detailsRow = $row.next('.wpfe-log-details-row');
            const $icon = $(this).find('.dashicons');
            
            if ($detailsRow.length) {
                $detailsRow.toggleClass('is-open');
                $icon.toggleClass('dashicons-arrow-down-alt2 dashicons-arrow-up-alt2');
                
                if ($detailsRow.hasClass('is-open')) {
                    $detailsRow.show();
                } else {
                    $detailsRow.hide();
                }
            }
        });

        // Delete log
        $('.wpfe-logs-container').on('click', '.wpfe-log-delete', function(e) {
            e.preventDefault();
            const logId = $(this).data('id');
            showDeleteModal(logId);
        });
    }

    // Refresh logs with AJAX
    function refreshLogs(page = 1) {
        const $container = $('.wpfe-logs-container');
        const $tableBody = $('.wpfe-logs-table tbody');
        const nonce = $('#wpfe_logs_nonce').val();
        
        // Get filter values
        const level = $('#wpfe-logs-level').val();
        const userId = $('#wpfe-logs-user').val();
        const search = $('#wpfe-logs-search').val();
        const dateFrom = $('#wpfe-logs-date-from').val();
        const dateTo = $('#wpfe-logs-date-to').val();
        
        // Show loading
        $tableBody.html('<tr><td colspan="7" class="wpfe-loading"><div class="wpfe-loading-spinner"></div><p>' + wpfeLogs.i18n.loading + '</p></td></tr>');
        
        // Reset pagination
        $('.wpfe-logs-pagination').hide();
        
        // Make AJAX request
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'wpfe_get_logs',
                nonce: nonce,
                page: page,
                level: level,
                user_id: userId,
                search: search,
                date_from: dateFrom,
                date_to: dateTo
            },
            success: function(response) {
                if (response.success) {
                    updateLogsTable(response.data);
                    updatePagination(response.data);
                    updateStatsCards(response.data);
                } else {
                    $tableBody.html('<tr><td colspan="7">' + response.data.message + '</td></tr>');
                }
            },
            error: function() {
                $tableBody.html('<tr><td colspan="7">' + wpfeLogs.i18n.error + '</td></tr>');
            }
        });
    }

    // Update the logs table with new data
    function updateLogsTable(data) {
        const $tableBody = $('.wpfe-logs-table tbody');
        let html = '';
        
        if (data.logs.length === 0) {
            html = '<tr><td colspan="7" class="wpfe-log-empty"><div class="wpfe-log-empty-icon dashicons dashicons-format-aside"></div><p>' + wpfeLogs.i18n.no_logs + '</p></td></tr>';
        } else {
            // Build table rows
            data.logs.forEach(function(log) {
                // Main row
                html += '<tr data-id="' + log.id + '">';
                html += '<td class="column-id">' + log.id + '</td>';
                html += '<td class="column-timestamp">' + log.timestamp_formatted + '</td>';
                html += '<td class="column-level"><span class="wpfe-level-badge wpfe-level-' + log.level + '">' + log.level + '</span></td>';
                html += '<td class="column-message">' + log.message + '</td>';
                html += '<td class="column-user">' + log.user_name + '</td>';
                html += '<td class="column-ip">' + log.ip_address + '</td>';
                html += '<td class="column-actions">';
                html += '<div class="wpfe-log-actions">';
                html += '<a href="#" class="wpfe-log-toggle wpfe-log-action"><span class="dashicons dashicons-arrow-down-alt2"></span></a>';
                html += '<a href="#" class="wpfe-log-delete wpfe-log-action" data-id="' + log.id + '"><span class="dashicons dashicons-trash"></span></a>';
                html += '</div>';
                html += '</td>';
                html += '</tr>';
                
                // Details row
                html += '<tr class="wpfe-log-details-row" style="display:none;">';
                html += '<td colspan="7" class="wpfe-log-details">';
                html += '<div class="wpfe-log-detail-grid">';
                
                // URL
                if (log.url) {
                    html += '<div class="wpfe-log-detail-label">' + wpfeLogs.i18n.url + ':</div>';
                    html += '<div class="wpfe-log-detail-value">' + log.url + '</div>';
                }
                
                // Context
                if (log.context && Object.keys(log.context).length > 0) {
                    html += '<div class="wpfe-log-detail-label">' + wpfeLogs.i18n.context + ':</div>';
                    html += '<div class="wpfe-log-detail-value"><pre class="wpfe-log-context">' + JSON.stringify(log.context, null, 2) + '</pre></div>';
                }
                
                html += '</div>';
                html += '</td>';
                html += '</tr>';
            });
        }
        
        $tableBody.html(html);
    }

    // Update pagination
    function updatePagination(data) {
        const $pagination = $('.wpfe-logs-pagination');
        const $paginationInfo = $('.wpfe-pagination-info');
        const $paginationLinks = $('.wpfe-pagination-links');
        
        // If no logs or only one page, hide pagination
        if (data.total === 0 || data.pages <= 1) {
            $pagination.hide();
            return;
        }
        
        // Show pagination
        $pagination.show();
        
        // Update info text
        const start = ((data.page - 1) * data.per_page) + 1;
        const end = Math.min(data.total, data.page * data.per_page);
        $paginationInfo.text(wpfeLogs.i18n.showing.replace('{start}', start).replace('{end}', end).replace('{total}', data.total));
        
        // Build pagination links
        let links = '';
        
        // Previous button
        links += '<a href="#" class="wpfe-pagination-link' + (data.page <= 1 ? ' disabled' : '') + '" data-page="' + (data.page - 1) + '">';
        links += '<span class="dashicons dashicons-arrow-left-alt2"></span>';
        links += '</a>';
        
        // Page links
        const maxLinks = 5;
        const start_page = Math.max(1, data.page - Math.floor(maxLinks / 2));
        const end_page = Math.min(data.pages, start_page + maxLinks - 1);
        
        for (let i = start_page; i <= end_page; i++) {
            links += '<a href="#" class="wpfe-pagination-link' + (i === data.page ? ' current' : '') + '" data-page="' + i + '">' + i + '</a>';
        }
        
        // Next button
        links += '<a href="#" class="wpfe-pagination-link' + (data.page >= data.pages ? ' disabled' : '') + '" data-page="' + (data.page + 1) + '">';
        links += '<span class="dashicons dashicons-arrow-right-alt2"></span>';
        links += '</a>';
        
        $paginationLinks.html(links);
    }

    // Update stats cards
    function updateStatsCards(data) {
        if (data.stats) {
            // Update card values
            $('#wpfe-card-total .wpfe-card-value').text(data.stats.total || 0);
            $('#wpfe-card-info .wpfe-card-value').text(data.stats.info || 0);
            $('#wpfe-card-warning .wpfe-card-value').text(data.stats.warning || 0);
            $('#wpfe-card-error .wpfe-card-value').text(data.stats.error || 0);
            $('#wpfe-card-success .wpfe-card-value').text(data.stats.success || 0);
            
            // Update charts
            if (window.wpfeLogLevelChart && data.stats.level_data) {
                window.wpfeLogLevelChart.data.datasets[0].data = Object.values(data.stats.level_data);
                window.wpfeLogLevelChart.update();
            }
            
            if (window.wpfeTimeChart && data.stats.time_data) {
                window.wpfeTimeChart.data.labels = Object.keys(data.stats.time_data);
                window.wpfeTimeChart.data.datasets[0].data = Object.values(data.stats.time_data);
                window.wpfeTimeChart.update();
            }
        }
    }

    // Setup charts
    function setupCharts() {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js is not loaded. Charts will not be displayed.');
            return;
        }
        
        // Level distribution chart
        const levelCtx = document.getElementById('wpfe-level-chart');
        if (levelCtx) {
            window.wpfeLogLevelChart = new Chart(levelCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(wpfeLogs.stats.level_data || {}),
                    datasets: [{
                        data: Object.values(wpfeLogs.stats.level_data || {}),
                        backgroundColor: [
                            '#0078d7', // info
                            '#9a6700', // warning
                            '#d73a49', // error
                            '#28a745', // success
                            '#666666'  // debug
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    legend: {
                        position: 'right',
                        labels: {
                            fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif'
                        }
                    }
                }
            });
        }

        // Time distribution chart
        const timeCtx = document.getElementById('wpfe-time-chart');
        if (timeCtx) {
            window.wpfeTimeChart = new Chart(timeCtx, {
                type: 'line',
                data: {
                    labels: Object.keys(wpfeLogs.stats.time_data || {}),
                    datasets: [{
                        label: wpfeLogs.i18n.logs_count,
                        data: Object.values(wpfeLogs.stats.time_data || {}),
                        borderColor: '#1e8cbe',
                        backgroundColor: 'rgba(30, 140, 190, 0.1)',
                        borderWidth: 2,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        xAxes: [{
                            gridLines: {
                                display: false
                            }
                        }],
                        yAxes: [{
                            ticks: {
                                beginAtZero: true,
                                precision: 0
                            }
                        }]
                    }
                }
            });
        }
    }

    // Setup date pickers
    function setupDatepickers() {
        if ($.datepicker) {
            $('.wpfe-logs-datepicker').datepicker({
                dateFormat: 'yy-mm-dd',
                changeMonth: true,
                changeYear: true,
                maxDate: '+0d'
            });
        }
    }

    // Export logs
    function exportLogs() {
        // Get filter values
        const level = $('#wpfe-logs-level').val();
        const userId = $('#wpfe-logs-user').val();
        const search = $('#wpfe-logs-search').val();
        const dateFrom = $('#wpfe-logs-date-from').val();
        const dateTo = $('#wpfe-logs-date-to').val();
        const nonce = $('#wpfe_logs_nonce').val();
        
        // Create form and submit
        const $form = $('<form>', {
            action: ajaxurl,
            method: 'POST',
            target: '_blank'
        });
        
        $form.append($('<input>', {
            type: 'hidden',
            name: 'action',
            value: 'wpfe_export_logs'
        }));
        
        $form.append($('<input>', {
            type: 'hidden',
            name: 'nonce',
            value: nonce
        }));
        
        if (level) {
            $form.append($('<input>', {
                type: 'hidden',
                name: 'level',
                value: level
            }));
        }
        
        if (userId) {
            $form.append($('<input>', {
                type: 'hidden',
                name: 'user_id',
                value: userId
            }));
        }
        
        if (search) {
            $form.append($('<input>', {
                type: 'hidden',
                name: 'search',
                value: search
            }));
        }
        
        if (dateFrom) {
            $form.append($('<input>', {
                type: 'hidden',
                name: 'date_from',
                value: dateFrom
            }));
        }
        
        if (dateTo) {
            $form.append($('<input>', {
                type: 'hidden',
                name: 'date_to',
                value: dateTo
            }));
        }
        
        $('body').append($form);
        $form.submit();
        $form.remove();
    }

    // Setup modals
    function setupModals() {
        // Close modal
        $('.wpfe-modal-close, .wpfe-modal-cancel').on('click', function() {
            $('.wpfe-modal').hide();
        });
        
        // Delete confirmation
        $('#wpfe-delete-confirm').on('click', function() {
            const logId = $(this).data('id');
            deleteLog(logId);
        });
        
        // Clear confirmation
        $('#wpfe-clear-confirm').on('click', function() {
            clearLogs();
        });
        
        // Close modal on outside click
        $(window).on('click', function(e) {
            if ($(e.target).hasClass('wpfe-modal')) {
                $('.wpfe-modal').hide();
            }
        });
    }

    // Show delete confirmation modal
    function showDeleteModal(logId) {
        $('#wpfe-delete-confirm').data('id', logId);
        $('#wpfe-delete-modal').show();
    }

    // Show clear confirmation modal
    function showClearModal() {
        $('#wpfe-clear-modal').show();
    }

    // Delete a log entry
    function deleteLog(logId) {
        const nonce = $('#wpfe_logs_nonce').val();
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'wpfe_delete_log',
                nonce: nonce,
                log_id: logId
            },
            success: function(response) {
                // Hide modal
                $('.wpfe-modal').hide();
                
                if (response.success) {
                    // Remove row from table
                    $('tr[data-id="' + logId + '"]').next('.wpfe-log-details-row').remove();
                    $('tr[data-id="' + logId + '"]').remove();
                    
                    // Show notice
                    showNotice(response.data.message, 'success');
                    
                    // Refresh logs to update stats
                    refreshLogs($('.wpfe-pagination-link.current').data('page') || 1);
                } else {
                    showNotice(response.data.message, 'error');
                }
            },
            error: function() {
                $('.wpfe-modal').hide();
                showNotice(wpfeLogs.i18n.delete_error, 'error');
            }
        });
    }

    // Clear all logs
    function clearLogs() {
        const nonce = $('#wpfe_logs_nonce').val();
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'wpfe_clear_logs',
                nonce: nonce
            },
            success: function(response) {
                // Hide modal
                $('.wpfe-modal').hide();
                
                if (response.success) {
                    // Show notice
                    showNotice(response.data.message, 'success');
                    
                    // Refresh logs
                    refreshLogs(1);
                } else {
                    showNotice(response.data.message, 'error');
                }
            },
            error: function() {
                $('.wpfe-modal').hide();
                showNotice(wpfeLogs.i18n.clear_error, 'error');
            }
        });
    }

    // Show admin notice
    function showNotice(message, type = 'success') {
        const $notice = $('<div class="notice notice-' + type + ' is-dismissible"><p>' + message + '</p></div>');
        $notice.hide();
        $('.wpfe-logs-notices').append($notice);
        $notice.slideDown();
        
        // Add dismiss button
        $notice.append('<button type="button" class="notice-dismiss"><span class="screen-reader-text">' + wpfeLogs.i18n.dismiss + '</span></button>');
        
        // Handle dismiss
        $notice.find('.notice-dismiss').on('click', function() {
            $notice.slideUp(function() {
                $notice.remove();
            });
        });
        
        // Auto dismiss after 5 seconds
        setTimeout(function() {
            $notice.slideUp(function() {
                $notice.remove();
            });
        }, 5000);
    }

    // Setup settings
    function setupSettings() {
        // Retention period changes
        $('#wpfe-logs-retention-period').on('change', function() {
            const value = $(this).val();
            $('#wpfe-logs-retention-custom-wrap').toggleClass('hidden', value !== 'custom');
        });
        
        // Toggle settings
        $('.wpfe-logs-toggle-settings').on('click', function(e) {
            e.preventDefault();
            $('.wpfe-logs-settings').slideToggle();
        });
    }

    // Initialize on document ready
    $(document).ready(function() {
        initLogs();
        setupSettings();
    });

})(jQuery);