/**
 * WP Frontend Editor - Test Elements Modules
 * Simple test script to verify that all element modules load correctly
 */

(function($) {
    'use strict';
    
    $(document).ready(function() {
        console.log('[WPFE Test] Testing element modules loading');
        
        // Check if the WPFE object exists
        if (typeof WPFE === 'undefined') {
            console.error('[WPFE Test] WPFE object not found');
            return;
        }
        
        // Check if modules are loaded
        var modules = [
            'element-core',
            'element-utils',
            'element-buttons',
            'element-detection',
            'element-acf',
            'elements'
        ];
        
        var allLoaded = true;
        for (var i = 0; i < modules.length; i++) {
            var moduleName = modules[i];
            var loaded = WPFE.modulesReady[moduleName] === true;
            
            console.log('[WPFE Test] Module ' + moduleName + ': ' + (loaded ? 'Loaded' : 'Not loaded'));
            
            if (!loaded) {
                allLoaded = false;
            }
        }
        
        if (allLoaded) {
            console.log('[WPFE Test] All element modules loaded successfully');
        } else {
            console.error('[WPFE Test] Some element modules failed to load');
        }
        
        // Check if critical functions exist
        var functions = [
            'WPFE.elements.init',
            'WPFE.elements.addEditButton',
            'WPFE.elements.runProgressiveDiscovery',
            'WPFE.elements.findAcfFields',
            'WPFE.elements.setupElements'
        ];
        
        var allFunctionsExist = true;
        for (var j = 0; j < functions.length; j++) {
            var functionName = functions[j];
            var parts = functionName.split('.');
            var obj = window;
            
            for (var k = 0; k < parts.length - 1; k++) {
                obj = obj[parts[k]];
                if (!obj) break;
            }
            
            var exists = obj && typeof obj[parts[parts.length - 1]] === 'function';
            
            console.log('[WPFE Test] Function ' + functionName + ': ' + (exists ? 'Exists' : 'Missing'));
            
            if (!exists) {
                allFunctionsExist = false;
            }
        }
        
        if (allFunctionsExist) {
            console.log('[WPFE Test] All critical functions exist');
        } else {
            console.error('[WPFE Test] Some critical functions are missing');
        }
    });
    
})(jQuery);