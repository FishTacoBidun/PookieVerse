// API Base URL
const API_BASE_URL = 'https://pookieverse.onrender.com/api';

// DOM Elements
const logoContainer = document.getElementById('logoContainer');
const signInContainer = document.getElementById('signInContainer');
const scrapbookContainer = document.getElementById('scrapbookContainer');
const signInForm = document.getElementById('signInForm');
const scrapbookEntries = document.getElementById('scrapbookEntries');
const noEntries = document.getElementById('noEntries');
const exitScrapbookBtn = document.getElementById('exitScrapbookBtn');
const addEntryBtn = document.getElementById('addEntryBtn');
const addEntryOverlay = document.getElementById('addEntryOverlay');
const addEntryForm = document.getElementById('addEntryForm');
const closeEntryFormBtn = document.getElementById('closeEntryFormBtn');
const signInError = document.getElementById('signInError');
const addEntryError = document.getElementById('addEntryError');

// Custom Confirmation Message Elements
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmMessage = document.getElementById('confirmMessage');
const confirmYesBtn = document.getElementById('confirmYesBtn');
const confirmNoBtn = document.getElementById('confirmNoBtn');

// Loading Screen Elements
const loadingOverlay = document.getElementById('loadingOverlay');

// Debug Console Elements
const debugConsole = document.getElementById('debugConsole');
const debugContent = document.getElementById('debugContent');
const debugCloseBtn = document.getElementById('debugCloseBtn');

// Track whether we're in "add" or "edit" mode
let formMode = 'add';
let editingEntryId = null;

// Authentication token storage
let authToken = localStorage.getItem('authToken') || null;

// Helper function to get auth headers
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    // If we have a token, use it (for mobile/browsers blocking cookies)
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        console.log('[AUTH] Using JWT token for authentication');
    } else {
        console.log('[AUTH] Using session cookie for authentication');
    }
    
    return headers;
}

// Helper function to make authenticated fetch requests
async function authenticatedFetch(url, options = {}) {
    // Always include credentials for session-based auth (works on desktop)
    options.credentials = 'include';
    
    // Add Authorization header if we have a token (works on mobile)
    if (authToken) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${authToken}`
        };
        console.log('[FETCH] Using JWT authentication for:', url);
    } else {
        console.log('[FETCH] Using session cookie authentication for:', url);
    }
    
    return fetch(url, options);
}

// Debug Console Functionality
let debugEnabled = false;
let logoTapCount = 0;
let logoTapTimeout = null;

// Override console methods to capture logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function addDebugLog(message, type = 'log') {
    if (!debugEnabled) return;
    
    const logDiv = document.createElement('div');
    logDiv.className = `debug-log ${type}`;
    logDiv.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    debugContent.appendChild(logDiv);
    debugContent.scrollTop = debugContent.scrollHeight;
    
    // Limit to last 100 logs
    while (debugContent.children.length > 100) {
        debugContent.removeChild(debugContent.firstChild);
    }
}

console.log = function(...args) {
    originalConsoleLog.apply(console, args);
    addDebugLog(args.join(' '), 'log');
};

console.error = function(...args) {
    originalConsoleError.apply(console, args);
    addDebugLog(args.join(' '), 'error');
};

console.warn = function(...args) {
    originalConsoleWarn.apply(console, args);
    addDebugLog(args.join(' '), 'warn');
};

// Enable debug console by tapping logo 5 times
logoContainer.addEventListener('click', () => {
    logoTapCount++;
    
    if (logoTapTimeout) {
        clearTimeout(logoTapTimeout);
    }
    
    if (logoTapCount >= 5) {
        debugEnabled = true;
        debugConsole.style.display = 'block';
        addDebugLog('Debug console enabled', 'info');
        logoTapCount = 0;
    } else {
        logoTapTimeout = setTimeout(() => {
            logoTapCount = 0;
        }, 1000);
    }
});

debugCloseBtn.addEventListener('click', () => {
    debugConsole.style.display = 'none';
});

// Volume control 1 - 10
const MUSIC_VOLUME = 4;
const CLICK_VOLUME = 2;
const SEND_VOLUME = 7;

// Audio elements
const menuMusic = new Audio('sounds/menu_music.mp3');
const sendSound = new Audio('sounds/send_sound.mp3');
const clickSound = new Audio('sounds/click_sound.mp3');

// Initialize audio settings
function initializeAudio() {
    // Calculate volumes (convert 1-10 scale to 0.1-1.0 scale)
    const musicVolume = Math.max(1, Math.min(10, MUSIC_VOLUME)) / 10;
    const clickVolume = Math.max(1, Math.min(10, CLICK_VOLUME)) / 10;
    const sendVolume = Math.max(1, Math.min(10, SEND_VOLUME)) / 10;
    
    // Set menu music to loop and set volume
    menuMusic.loop = true;
    menuMusic.volume = musicVolume;
    
    // Set sound effect volumes
    sendSound.volume = sendVolume;
    clickSound.volume = clickVolume;
    
    // Start menu music immediately
    menuMusic.play().catch(error => {
        console.log('Menu music autoplay blocked. Will start on first user interaction.');
    });
}

// Play click sound helper function
function playClickSound() {
    clickSound.currentTime = 0; // Reset to start so it can play multiple times quickly
    clickSound.play().catch(error => console.log('Click sound play failed:', error));
    ensureMusicPlaying(); // Ensure music starts if it was blocked
}

// Play send sound helper function
function playSendSound() {
    sendSound.currentTime = 0;
    sendSound.play().catch(error => console.log('Send sound play failed:', error));
}

// Ensure music starts on first user interaction if autoplay was blocked
let musicStarted = false;
function ensureMusicPlaying() {
    if (!musicStarted && menuMusic.paused) {
        menuMusic.play().catch(error => console.log('Music play failed:', error));
        musicStarted = true;
    }
}

// Custom confirm function
function customConfirm(message) {
    return new Promise((resolve) => {
        confirmMessage.textContent = message;
        
        // Prevent background scrolling
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        
        confirmOverlay.style.display = 'flex';
        setTimeout(() => {
            confirmOverlay.classList.add('visible');
        }, 10);

        const handleYes = () => {
            playClickSound();
            cleanup();
            resolve(true);
        };

        const handleNo = () => {
            playClickSound();
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            confirmOverlay.classList.remove('visible');
            setTimeout(() => {
                confirmOverlay.style.display = 'none';
                // Restore previous overflow state
                document.body.style.overflow = previousOverflow;
            }, 300);
            confirmYesBtn.removeEventListener('click', handleYes);
            confirmNoBtn.removeEventListener('click', handleNo);
        };

        confirmYesBtn.addEventListener('click', handleYes);
        confirmNoBtn.addEventListener('click', handleNo);
    });
}

// Loading screen functions
function showLoadingScreen() {
    document.body.style.overflow = 'hidden';
    loadingOverlay.style.display = 'flex';
    setTimeout(() => {
        loadingOverlay.classList.add('visible');
    }, 10);
}

function hideLoadingScreen() {
    loadingOverlay.classList.remove('visible');
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }, 300);
}

// Test backend connection
async function testBackendConnection() {
    try {
        const response = await fetch('https://pookieverse.onrender.com/', {
            credentials: 'include'
        });
        const data = await response.json();
        console.log('Backend connection test:', data);
        return true;
    } catch (error) {
        console.error('Backend connection failed:', error);
        console.error('Make sure the backend server is running');
        return false;
    }
}

// Check if device is mobile
function isMobileDevice() {
    return window.innerWidth <= 800 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Format date input for mobile (MM/DD/YYYY with automatic slashes)
function formatDateInput(input) {
    input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
        
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2);
        }
        if (value.length >= 5) {
            value = value.substring(0, 5) + '/' + value.substring(5);
        }
        if (value.length > 10) {
            value = value.substring(0, 10);
        }
        
        e.target.value = value;
    });
    
    // Add placeholder
    input.placeholder = 'MM/DD/YYYY';
    input.maxLength = 10;
}

// Convert mobile date format (MM/DD/YYYY) to ISO format (YYYY-MM-DD)
function mobileToISODate(dateString) {
    if (!dateString || dateString.length !== 10) return null;
    
    const parts = dateString.split('/');
    if (parts.length !== 3) return null;
    
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const year = parts[2];
    
    // Validate
    if (month < 1 || month > 12 || day < 1 || day > 31 || year.length !== 4) {
        return null;
    }
    
    return `${year}-${month}-${day}`;
}

// Convert ISO date format (YYYY-MM-DD) to mobile format (MM/DD/YYYY)
function isoToMobileDate(isoDate) {
    if (!isoDate) return '';
    
    const date = new Date(isoDate);
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const year = date.getUTCFullYear();
    
    return `${month}/${day}/${year}`;
}

// Setup mobile date inputs
function setupMobileDateInputs() {
    if (!isMobileDevice()) return;
    
    console.log('[MOBILE] Setting up mobile date inputs');
    
    // Convert birthday input to text on mobile
    const birthdayInput = document.getElementById('birthday');
    if (birthdayInput) {
        birthdayInput.type = 'text';
        birthdayInput.inputMode = 'numeric';
        birthdayInput.classList.add('date-input-mobile');
        formatDateInput(birthdayInput);
    }
    
    // Convert entry date input to text on mobile
    const entryDateInput = document.getElementById('entryDate');
    if (entryDateInput) {
        entryDateInput.type = 'text';
        entryDateInput.inputMode = 'numeric';
        entryDateInput.classList.add('date-input-mobile');
        formatDateInput(entryDateInput);
    }
}

// Check if cookies are enabled
function checkCookieSupport() {
    try {
        document.cookie = 'cookietest=1; SameSite=None; Secure';
        const cookiesEnabled = document.cookie.indexOf('cookietest=') !== -1;
        document.cookie = 'cookietest=1; expires=Thu, 01-Jan-1970 00:00:01 GMT; SameSite=None; Secure';
        
        console.log('[COOKIE CHECK] Cookies enabled:', cookiesEnabled);
        console.log('[COOKIE CHECK] Current cookies:', document.cookie);
        console.log('[COOKIE CHECK] User Agent:', navigator.userAgent);
        
        if (!cookiesEnabled) {
            console.warn('[COOKIE CHECK] Cookies appear to be disabled or blocked!');
            setTimeout(() => {
                showError(signInError, 'Warning: Cookies may be blocked. Enable cookies in browser settings or disable "Prevent Cross-Site Tracking" on Safari.');
            }, 2000);
            setTimeout(() => hideError(signInError), 8000);
        }
        
        return cookiesEnabled;
    } catch (e) {
        console.error('[COOKIE CHECK] Error checking cookie support:', e);
        return false;
    }
}

// Initialize page
window.addEventListener('DOMContentLoaded', function() {
    console.log('[INIT] Page loaded, initializing...');
    console.log('[INIT] API Base URL:', API_BASE_URL);
    
    // Initialize audio
    initializeAudio();
    
    // Setup mobile date inputs
    setupMobileDateInputs();
    
    // Test backend connection
    testBackendConnection();
    
    // Check cookie support
    setTimeout(() => {
        checkCookieSupport();
    }, 1500);
    
    // Trigger logo animation
    setTimeout(() => {
        logoContainer.classList.add('logo-animate');
    }, 500);
    
    // Trigger sign-in box fade-in after logo animation
    setTimeout(() => {
        signInContainer.classList.add('sign-in-visible');
    }, 1200);

    // Check if user is already authenticated
    checkAuthStatus();
});

// Check authentication status on page load
async function checkAuthStatus() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/auth/status`);
        
        if (!response.ok) {
            console.log('Auth status check failed:', response.status);
            return;
        }
        
        const data = await response.json();
        console.log('Auth status check result:', data);
        console.log('Auth method:', data.authMethod || 'none');
        
        if (data.authenticated) {
            // User is already signed in, hide sign-in and show scrapbook
            console.log('User already authenticated, showing scrapbook');
            signInContainer.style.display = 'none';
            signInContainer.classList.remove('sign-in-visible');
            showScrapbook();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        // Don't show error to user on page load, just log it
    }
}

// Sign in form submission
signInForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Play click sound (this will also ensure music starts if it was blocked)
    playClickSound();
    
    const name = document.getElementById('firstName').value.trim();
    let birthday = document.getElementById('birthday').value;
    
    if (!name || !birthday) {
        showError(signInError, 'Please fill in all fields');
        return false;
    }

    // Convert mobile date format to ISO format if needed
    if (isMobileDevice() && birthday.includes('/')) {
        const isoDate = mobileToISODate(birthday);
        if (!isoDate) {
            showError(signInError, 'Invalid date format. Use MM/DD/YYYY');
            return false;
        }
        birthday = isoDate;
        console.log('[SIGNIN] Converted mobile date to ISO:', birthday);
    }

    // Show loading screen before making the request
    showLoadingScreen();

    try {
        console.log('[SIGNIN] Starting sign in request...');
        console.log('[SIGNIN] API URL:', `${API_BASE_URL}/auth/signin`);
        
        const response = await fetch(`${API_BASE_URL}/auth/signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ name, birthday })
        });

        console.log('[SIGNIN] Response received, status:', response.status);
        console.log('[SIGNIN] Response headers:', response.headers);

        // Check if response is ok
        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { message: `Server error: ${response.status}` };
            }
            hideLoadingScreen();
            showError(signInError, errorData.message || 'Error signing in. Please try again.');
            console.error('[SIGNIN] Sign in response error:', response.status, errorData);
            return false;
        }

        const data = await response.json();
        console.log('[SIGNIN] Sign in response data:', data);

        if (data.success) {
            console.log('[SIGNIN] Sign in successful, checking authentication method...');
            
            // Store JWT token if provided (for mobile/browsers blocking cookies)
            if (data.token) {
                authToken = data.token;
                localStorage.setItem('authToken', authToken);
                console.log('[SIGNIN] JWT token stored in localStorage');
            }
            
            // Add a small delay to ensure cookie is set
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verify we can make authenticated requests
            try {
                const testResponse = await authenticatedFetch(`${API_BASE_URL}/auth/status`);
                const testData = await testResponse.json();
                console.log('[SIGNIN] Auth status check:', testData);
                console.log('[SIGNIN] Auth method:', testData.authMethod || 'unknown');
                
                if (!testData.authenticated) {
                    console.error('[SIGNIN] Authentication failed! Neither cookies nor JWT working.');
                    hideLoadingScreen();
                    showError(signInError, 'Login issue: Authentication failed. Please try again or contact support.');
                    return false;
                }
                
                // Success!
                console.log(`[SIGNIN] Authenticated successfully via ${testData.authMethod}`);
            } catch (testError) {
                console.error('[SIGNIN] Auth status check failed:', testError);
                // Continue anyway, might work
            }
            
            hideLoadingScreen();
            hideError(signInError);
            // Fade out sign-in, then show scrapbook
            signInContainer.classList.remove('sign-in-visible');
            signInContainer.classList.add('sign-in-hidden');
            
            setTimeout(() => {
                signInContainer.style.display = 'none';
                showScrapbook();
            }, 800);
        } else {
            hideLoadingScreen();
            showError(signInError, data.message || 'Invalid credentials');
        }
    } catch (error) {
        console.error('[SIGNIN] Sign in error:', error);
        hideLoadingScreen();
        showError(signInError, `Error: ${error.message}. Check your internet connection or try a different browser.`);
    }
});

// Show scrapbook view
function showScrapbook() {
    console.log('Showing scrapbook view');
    document.body.style.overflow = 'auto';
    
    // Make sure sign-in is hidden
    signInContainer.style.display = 'none';
    signInContainer.classList.remove('sign-in-visible');
    signInContainer.classList.add('sign-in-hidden');
    
    // Show scrapbook container
    scrapbookContainer.style.display = 'block';
    scrapbookContainer.classList.remove('scrapbook-hidden');
    
    setTimeout(() => {
        scrapbookContainer.classList.add('scrapbook-visible');
        console.log('Scrapbook container should now be visible');
    }, 50);
    
    // Load entries after a short delay to ensure container is visible
    setTimeout(() => {
        loadScrapbookEntries();
    }, 100);
}

// Hide scrapbook view and show sign-in
exitScrapbookBtn.addEventListener('click', async () => {
    playClickSound();
    
    if (await customConfirm('Are you sure you want to exit the scrapbook?')) {
        document.body.style.overflow = 'hidden';
        scrapbookContainer.classList.remove('scrapbook-visible');
        scrapbookContainer.classList.add('scrapbook-hidden');
        
        setTimeout(() => {
            scrapbookContainer.style.display = 'none';
            signInContainer.style.display = 'block';
            signInContainer.classList.remove('sign-in-hidden');
            signInContainer.classList.add('sign-in-visible');
            
            // Sign out on backend and clear token
            authenticatedFetch(`${API_BASE_URL}/auth/signout`, {
                method: 'POST'
            });
            
            // Clear JWT token from localStorage
            authToken = null;
            localStorage.removeItem('authToken');
            console.log('[SIGNOUT] Cleared authentication token');
        }, 800);
    }
});

// Load scrapbook entries from API
async function loadScrapbookEntries() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/scrapbook/entries`);

        console.log('Load entries response status:', response.status);

        if (response.status === 401) {
            // Not authenticated, show sign-in form again
            console.log('Not authenticated (401), showing sign-in form');
            // Clear token if it's invalid
            authToken = null;
            localStorage.removeItem('authToken');
            
            scrapbookContainer.classList.remove('scrapbook-visible');
            scrapbookContainer.classList.add('scrapbook-hidden');
            setTimeout(() => {
                scrapbookContainer.style.display = 'none';
                signInContainer.style.display = 'block';
                signInContainer.classList.remove('sign-in-hidden');
                signInContainer.classList.add('sign-in-visible');
            }, 800);
            return;
        }

        if (!response.ok) {
            console.error('Error loading entries, status:', response.status);
            // Still try to show "No Entries" instead of reloading
            displayEntries([]);
            return;
        }

        const data = await response.json();
        console.log('Entries data:', data);

        if (data.success) {
            displayEntries(data.entries || []);
        } else {
            console.error('Error loading entries:', data.message);
            displayEntries([]);
        }
    } catch (error) {
        console.error('Error loading entries:', error);
        // Show "No Entries" instead of crashing
        displayEntries([]);
    }
}

// Display scrapbook entries
function displayEntries(entries) {
    scrapbookEntries.innerHTML = '';
    
    if (!entries || entries.length === 0) {
        noEntries.style.display = 'block';
        return;
    }

    noEntries.style.display = 'none';

    // Sort entries by date (newest first)
    const sortedEntries = [...entries].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });

    sortedEntries.forEach(entry => {
        const entryElement = createEntryElement(entry);
        scrapbookEntries.appendChild(entryElement);
    });
}

// Create a scrapbook entry element
function createEntryElement(entry) {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'scrapbook-entry';
    entryDiv.dataset.entryId = entry._id;

    // Format date
    const entryDate = new Date(entry.date);
    // Use UTC to avoid timezone offset issues
    const year = entryDate.getUTCFullYear();
    const month = entryDate.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
    const day = entryDate.getUTCDate();
    const formattedDate = `${month} ${day}, ${year}`;

    entryDiv.innerHTML = `
        <button class="entry-edit-btn" onclick="editEntry('${entry._id}')">✎</button>
        <button class="entry-delete-btn" onclick="deleteEntry('${entry._id}')">✕</button>
        <h2 class="entry-title">${escapeHtml(entry.title)}</h2>
        <p class="entry-date">${formattedDate}</p>
        <img src="${escapeHtml(entry.imageUrl)}" alt="${escapeHtml(entry.title)}" class="entry-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect fill=%22%23ddd%22 width=%22400%22 height=%22300%22/%3E%3Ctext fill=%22%23999%22 font-family=%22sans-serif%22 font-size=%2218%22 dy=%2210.5%22 font-weight=%22bold%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22%3EImage not found%3C/text%3E%3C/svg%3E'">
        <p class="entry-description">${escapeHtml(entry.description)}</p>
    `;

    return entryDiv;
}

// Delete entry
async function deleteEntry(entryId) {
    playClickSound();
    
    if (await customConfirm('Are you sure you want to delete this entry?')) {
        showLoadingScreen();
        
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/scrapbook/entries/${entryId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            hideLoadingScreen();

            if (data.success) {
                // Remove entry from DOM
                const entryElement = document.querySelector(`[data-entry-id="${entryId}"]`);
                if (entryElement) {
                    entryElement.remove();
                }
                
                // Check if no entries left
                const remainingEntries = document.querySelectorAll('.scrapbook-entry');
                if (remainingEntries.length === 0) {
                    noEntries.style.display = 'block';
                }
            } else {
                alert('Error deleting entry: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Delete error:', error);
            hideLoadingScreen();
            alert('Error deleting entry. Please try again.');
        }
    }
}

// Show add entry form
addEntryBtn.addEventListener('click', () => {
    playClickSound();

    formMode = 'add';
    editingEntryId = null;
    document.querySelector('.add-entry-title').textContent = 'Add Scrapbook Entry';
    addEntryForm.reset();
    document.getElementById('imagePreview').style.display = 'none';
    // Make image field required for add mode
    document.getElementById('entryImage').required = true;
    hideError(addEntryError);

    // Prevent background scrolling
    document.body.style.overflow = 'hidden';

    addEntryOverlay.style.display = 'flex';
    setTimeout(() => {
        addEntryOverlay.classList.add('visible');
    }, 10);
});

// Edit entry function
async function editEntry(entryId) {
    playClickSound();
    
    try {
        // Fetch the entry data
        const response = await authenticatedFetch(`${API_BASE_URL}/scrapbook/entries/${entryId}`);
        
        if (!response.ok) {
            alert('Error loading entry for editing');
            return;
        }
        
        const data = await response.json();
        if (!data.success) {
            alert('Error loading entry for editing');
            return;
        }
        
        const entry = data.entry;
        
        // Set form to edit mode
        formMode = 'edit';
        editingEntryId = entryId;
        document.querySelector('.add-entry-title').textContent = 'Edit Scrapbook Entry';
        
        // Populate form fields
        document.getElementById('entryTitle').value = entry.title;
        
        // Format date for input
        const entryDate = new Date(entry.date);
        const year = entryDate.getUTCFullYear();
        const month = String(entryDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(entryDate.getUTCDate()).padStart(2, '0');
        
        // Use mobile format (MM/DD/YYYY) on mobile, ISO format (YYYY-MM-DD) on desktop
        if (isMobileDevice()) {
            document.getElementById('entryDate').value = `${month}/${day}/${year}`;
        } else {
            document.getElementById('entryDate').value = `${year}-${month}-${day}`;
        }
        
        document.getElementById('entryDescription').value = entry.description;
        
        // Show existing image preview
        const previewImg = document.getElementById('previewImg');
        const imagePreview = document.getElementById('imagePreview');
        previewImg.src = entry.imageUrl;
        imagePreview.style.display = 'block';
        
        // Make image field optional for edit mode (they can keep the existing image)
        document.getElementById('entryImage').required = false;
        
        hideError(addEntryError);
        
        // Prevent background scrolling
        document.body.style.overflow = 'hidden';
        
        // Show the form
        addEntryOverlay.style.display = 'flex';
        setTimeout(() => {
            addEntryOverlay.classList.add('visible');
        }, 10);
        
    } catch (error) {
        console.error('Edit entry error:', error);
        alert('Error loading entry for editing. Please try again.');
    }
}

// Close add/edit entry form
closeEntryFormBtn.addEventListener('click', async () => {
    playClickSound();
    
    const message = formMode === 'edit' 
        ? 'Are you sure you want to cancel editing this entry?' 
        : 'Are you sure you want to stop making this entry?';
    
    if (await customConfirm(message)) {
        closeAddEntryForm();
    }
});

function closeAddEntryForm() {
    addEntryOverlay.classList.remove('visible');
    
    // Restore background scrolling
    document.body.style.overflow = 'auto';
    
    setTimeout(() => {
        addEntryOverlay.style.display = 'none';
        addEntryForm.reset();
        document.getElementById('imagePreview').style.display = 'none';
        hideError(addEntryError);
        formMode = 'add';
        editingEntryId = null;
    }, 300);
}

// Image preview functionality - set up after DOM is ready
function setupImagePreview() {
    const entryImageInput = document.getElementById('entryImage');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');

    if (entryImageInput && imagePreview && previewImg) {
        entryImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (previewImg) previewImg.src = event.target.result;
                    if (imagePreview) imagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                if (imagePreview) imagePreview.style.display = 'none';
            }
        });
    } else {
        console.warn('Image preview elements not found, preview functionality disabled');
    }
}

// Set up image preview when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupImagePreview);
} else {
    setupImagePreview();
}

// Add/Edit entry form submission
if (addEntryForm) {
    addEntryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        playClickSound();
        
        try {
            const confirmationMessage = formMode === 'edit'
                ? 'Are you sure you want to save these changes?'
                : 'Are you sure you\'re done making this entry?';
                
            if (await customConfirm(confirmationMessage)) {
                // Get form elements - query from the form itself to ensure they exist
                const titleInput = addEntryForm.querySelector('#entryTitle');
                const dateInput = addEntryForm.querySelector('#entryDate');
                const imageInput = addEntryForm.querySelector('#entryImage');
                const descriptionInput = addEntryForm.querySelector('#entryDescription');

                console.log('Form elements:', { titleInput, dateInput, imageInput, descriptionInput });

                if (!titleInput || !dateInput || !imageInput || !descriptionInput) {
                    console.error('Form elements not found:', { titleInput, dateInput, imageInput, descriptionInput });
                    showError(addEntryError, 'Form error. Please refresh the page.');
                    return;
                }

                const title = titleInput.value ? titleInput.value.trim() : '';
                let date = dateInput.value || '';
                const imageFile = imageInput.files ? imageInput.files[0] : null;
                const description = descriptionInput.value ? descriptionInput.value.trim() : '';

                // Validation
                if (!title || !date || !description) {
                    showError(addEntryError, 'Please fill in all fields');
                    return;
                }

                // Convert mobile date format to ISO format if needed
                if (isMobileDevice() && date.includes('/')) {
                    const isoDate = mobileToISODate(date);
                    if (!isoDate) {
                        showError(addEntryError, 'Invalid date format. Use MM/DD/YYYY');
                        return;
                    }
                    date = isoDate;
                    console.log('[FORM] Converted mobile date to ISO:', date);
                }

                // In add mode, image is required. In edit mode, it's optional (keeps existing if not changed)
                if (formMode === 'add' && !imageFile) {
                    showError(addEntryError, 'Please select an image');
                    return;
                }

                // Show loading screen before making request
                showLoadingScreen();

                // Create FormData for file upload
                const formData = new FormData();
                formData.append('title', title);
                formData.append('date', date);
                if (imageFile) {
                    formData.append('image', imageFile);
                }
                formData.append('description', description);

                // Determine URL and method based on mode
                const url = formMode === 'edit' 
                    ? `${API_BASE_URL}/scrapbook/entries/${editingEntryId}`
                    : `${API_BASE_URL}/scrapbook/entries`;
                const method = formMode === 'edit' ? 'PUT' : 'POST';

                const fetchOptions = {
                    method: method,
                    credentials: 'include',
                    body: formData
                };
                
                // Add Authorization header if we have a token (for mobile)
                if (authToken) {
                    fetchOptions.headers = {
                        'Authorization': `Bearer ${authToken}`
                    };
                }
                
                const response = await fetch(url, fetchOptions);

                if (!response.ok) {
                    const errorText = await response.text();
                    let errorData;
                    try {
                        errorData = JSON.parse(errorText);
                    } catch {
                        errorData = { message: `Server error: ${response.status}` };
                    }
                    hideLoadingScreen();
                    const errorMessage = formMode === 'edit' ? 'Error updating entry' : 'Error creating entry';
                    showError(addEntryError, errorData.message || errorMessage);
                    return;
                }

                const data = await response.json();

                hideLoadingScreen();

                if (data.success) {
                    // Play success sound
                    playSendSound();
                    
                    closeAddEntryForm();
                    // Reload entries
                    loadScrapbookEntries();
                } else {
                    const errorMessage = formMode === 'edit' ? 'Error updating entry' : 'Error creating entry';
                    showError(addEntryError, data.message || errorMessage);
                }
            }
        } catch (error) {
            console.error('Form submission error:', error);
            console.error('Error details:', error.message, error.stack);
            hideLoadingScreen();
            const errorMessage = formMode === 'edit' ? 'Error updating entry' : 'Error creating entry';
            showError(addEntryError, `${errorMessage}: ${error.message}. Please try again.`);
        }
    });
} else {
    console.error('addEntryForm not found - form submission handler not set up');
}

// Utility functions
function showError(errorElement, message) {
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

function hideError(errorElement) {
    errorElement.classList.remove('show');
    errorElement.textContent = '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make deleteEntry and editEntry available globally
window.deleteEntry = deleteEntry;
window.editEntry = editEntry;

// Global error handler to prevent page reloads
window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
    event.preventDefault();
    return false;
});

// Prevent unhandled promise rejections from causing issues
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// Prevent clicking through overlays to background
addEntryOverlay.addEventListener('click', (e) => {
    // Only close if clicking directly on the overlay (not the form inside)
    if (e.target === addEntryOverlay) {
        e.preventDefault();
        e.stopPropagation();
    }
});

confirmOverlay.addEventListener('click', (e) => {
    // Prevent clicking through confirmation overlay
    if (e.target === confirmOverlay) {
        e.preventDefault();
        e.stopPropagation();
    }
});

loadingOverlay.addEventListener('click', (e) => {
    // Prevent clicking through loading overlay
    e.preventDefault();
    e.stopPropagation();
});

