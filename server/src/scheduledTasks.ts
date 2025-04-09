import cron from 'node-cron';
import { clearWalkingDistanceCache } from './services/hsyWmsService';
import { clearStatFiCache } from './services/statFiService';
import { clearOverpassCache } from './services/overpassService';

/**
 * Initializes and schedules all recurring tasks for the application.
 */
export function initializeScheduledTasks() {
    console.log('Initializing scheduled tasks...');

    // Schedule HSY walking distance cache clear daily at midnight
    cron.schedule('0 0 * * *', () => {
        console.log('Running daily task: Clearing HSY walking distance cache...');
        clearWalkingDistanceCache();
    }, {
        scheduled: true,
        timezone: "Europe/Helsinki"
    });

    // Schedule Overpass API cache clear daily at 1 AM (staggered)
    cron.schedule('0 1 * * *', () => {
        console.log('Running daily task: Clearing Overpass API cache...');
        clearOverpassCache();
    }, {
        scheduled: true,
        timezone: "Europe/Helsinki"
    });

    // Schedule StatFi property data cache clear weekly on Sunday at 2 AM
    cron.schedule('0 2 * * 0', () => { // 0 = Sunday
        console.log('Running weekly task: Clearing StatFi property data cache...');
        clearStatFiCache();
    }, {
        scheduled: true,
        timezone: "Europe/Helsinki"
    });

    // --- Add more scheduled tasks here --- 
    // Example: Pre-cache specific data
    // cron.schedule('...', () => { ... }); 

    console.log('Scheduled tasks initialized.');
} 
