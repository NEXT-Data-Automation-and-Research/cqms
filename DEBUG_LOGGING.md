# Debug Logging Guide

## Issue: Logs and Supervisor Name Not Showing

### Quick Fix Steps

1. **Enable Debug Logging in Browser Console:**
   ```javascript
   localStorage.setItem('LOG_LEVEL', 'debug');
   location.reload();
   ```

2. **Check Logger Initialization:**
   - Open browser console
   - Look for: `[Logger] Initialized with log level: debug`
   - If you see this, logger is working

3. **Verify Supervisor Name Fetching:**
   - Check console for: `[PersonProfile] Starting profile enrichment`
   - Check console for: `[PersonProfile] Found supervisor email, fetching name`
   - Check console for: `[PersonProfile] Found supervisor name in people table`

### Expected Log Flow

When the page loads, you should see:
1. `[Logger] Initialized with log level: debug` (from logger.ts)
2. `[PersonProfile] Loaded person profile from people table` (info level)
3. `[PersonProfile] Starting profile enrichment` (debug level)
4. `[PersonProfile] Enrichment function called` (debug level)
5. `[PersonProfile] Found supervisor email, fetching name` (info level)
6. `[PersonProfile] Found supervisor name in people table` (info level)
7. `[PersonProfile] Profile enrichment completed` (info level)
8. `[PersonProfile] Set supervisor name from enriched profile` (info level)

### If Logs Still Don't Show

1. **Check if logger is imported correctly:**
   - Verify `person-profile-loader.ts` imports `createLogger` from `logger.ts`
   - Check browser console for any import errors

2. **Manually test logger:**
   ```javascript
   // In browser console
   import('/js/utils/logger.js').then(module => {
     const logger = module.createLogger('Test');
     logger.debug('Test debug log');
     logger.info('Test info log');
     logger.warn('Test warn log');
     logger.error('Test error log');
   });
   ```

3. **Check if enrichment is being called:**
   - Add a breakpoint in `enrichProfileWithSupervisorName` function
   - Check if `fetchPersonProfile` is returning the enriched profile

### If Supervisor Name Still Doesn't Show

1. **Check if supervisor_name is in profile:**
   ```javascript
   // In browser console after page loads
   const profile = await fetchPersonProfile();
   console.log('Supervisor name:', profile?.supervisor_name);
   console.log('Team supervisor:', profile?.team_supervisor);
   ```

2. **Check if pill element exists:**
   ```javascript
   const pill = document.getElementById('pillSupervisor');
   const display = document.getElementById('displaySupervisor');
   console.log('Pill element:', pill);
   console.log('Display element:', display);
   console.log('Display text:', display?.textContent);
   ```

3. **Manually set supervisor name to test:**
   ```javascript
   const display = document.getElementById('displaySupervisor');
   if (display) {
     display.textContent = 'Test Supervisor Name';
     const pill = document.getElementById('pillSupervisor');
     if (pill) pill.classList.remove('hidden');
   }
   ```

