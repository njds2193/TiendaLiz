// auth.js - Authentication Module using Supabase Email/Password
console.log('--- Loading auth.js ---');

const auth = (() => {
    // DOM Elements
    let loginContainer, appContainer, emailInput, passwordInput, loginBtn, loginMessage;

    // Initialize Auth Module
    function init() {
        loginContainer = document.getElementById('login-container');
        appContainer = document.getElementById('app');
        emailInput = document.getElementById('email-input');
        passwordInput = document.getElementById('password-input');
        loginBtn = document.getElementById('login-btn');
        loginMessage = document.getElementById('login-message');

        // Check current session
        checkSession();

        // Event Listeners
        if (loginBtn) loginBtn.addEventListener('click', handleLogin);

        // Allow Enter key
        if (emailInput) {
            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && passwordInput) passwordInput.focus();
            });
        }
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleLogin();
            });
        }
    }

    // Check if user is already logged in
    async function checkSession() {
        if (!window.api.client) {
            console.warn('Supabase client not available. Skipping auth check (Offline Mode?)');
            const cachedSession = localStorage.getItem('sb-session');
            if (cachedSession) {
                showApp();
            } else {
                showLogin();
            }
            return;
        }

        const { data: { session }, error } = await window.api.client.auth.getSession();

        if (session) {
            console.log('User already logged in:', session.user.email);
            showApp();
        } else {
            console.log('No active session');
            showLogin();
        }

        // Listen for auth state changes
        window.api.client.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                showApp();
            } else if (event === 'SIGNED_OUT') {
                showLogin();
            }
        });
    }

    // Handle Login
    async function handleLogin() {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            showMessage('Por favor ingresa correo y contraseña', 'error');
            return;
        }

        setLoading(true);
        showMessage('Iniciando sesión...', 'info');

        try {
            const { data, error } = await window.api.client.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            if (data.session) {
                showMessage('✅ ¡Bienvenido!', 'success');
                showApp();
            }

        } catch (error) {
            console.error('Login error:', error);
            if (error.message.includes('Invalid login credentials')) {
                showMessage('Correo o contraseña incorrectos', 'error');
            } else {
                showMessage('Error: ' + error.message, 'error');
            }
        } finally {
            setLoading(false);
        }
    }

    // Logout
    async function logout() {
        if (confirm('¿Cerrar sesión?')) {
            await window.api.client.auth.signOut();
            window.location.reload();
        }
    }

    // UI Helpers
    function showLogin() {
        if (loginContainer) loginContainer.classList.remove('hidden');
        if (appContainer) appContainer.classList.add('hidden');
    }

    function showApp() {
        if (loginContainer) loginContainer.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');

        // Initialize app if not already running
        if (window.app && !window.app.initialized) {
            window.app.init();
        }
    }

    function showMessage(msg, type) {
        if (!loginMessage) return;
        loginMessage.textContent = msg;
        loginMessage.className = `text-center text-sm font-medium mb-4 ${type === 'error' ? 'text-red-500' :
            type === 'success' ? 'text-green-500' : 'text-blue-500'
            }`;
        loginMessage.classList.remove('hidden');
    }

    function setLoading(isLoading) {
        if (loginBtn) {
            loginBtn.disabled = isLoading;
            loginBtn.textContent = isLoading ? 'Cargando...' : 'Iniciar Sesión';
        }
    }

    return {
        init,
        logout
    };
})();

// Expose to window
window.auth = auth;
