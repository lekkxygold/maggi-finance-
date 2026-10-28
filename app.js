// Initialization credentials configuration setup
const SUPABASE_URL = "https://athszjeyyxosemqyzmzz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0aHN6amV5eXhvc2VtcXl6bXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDM0ODksImV4cCI6MjEwODc3OTQ4OX0.MjF0uusJGt9LK48Mv7xqc1sBgyXrvZk-_g8n19fGsrA";

let supabase = null;
let currentUserProfile = null;

// Safely initialize Supabase Client
function bootstrapSupabaseClient() {
    if (supabase) return supabase;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return supabase;
    }
    return null;
}

// Generate unique custom Platform IDs
function generateMaggiId() {
    return "MG-" + Math.floor(100000 + Math.random() * 900000);
}

// Global UI Navigation Controller
function switchView(viewId) {
    const views = ['view-auth', 'view-dashboard', 'view-investment', 'view-wallet', 'view-team', 'view-gift', 'view-admin'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    const target = document.getElementById(viewId);
    if (target) target.classList.remove('hidden');

    // Update nav active tab styling
    const navTabs = document.querySelectorAll('#app-nav div');
    navTabs.forEach(tab => tab.classList.remove('active'));
}

// Registration and Login Auth Flow
async function handleAuth(type) {
    const client = bootstrapSupabaseClient();
    if (!client) {
        return alert("Supabase database connection is initializing. Please wait 2 seconds and try again.");
    }

    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email || !password) {
        return alert("Please fill standard input parameters.");
    }

    if (type === 'register') {
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) return alert(error.message);

        const maggiId = generateMaggiId();
        if (data.user) {
            const { error: profileError } = await client.from('profiles').insert([
                { id: data.user.id, maggi_id: maggiId, wallet_balance: 2000, total_investment: 0, is_admin: false }
            ]);
            if (profileError) console.error("Profile Error:", profileError);
        }

        alert("Registration complete! Enjoy your ₦2,000 sign up reward.");
        await loadUserData(data.user);
    } else if (type === 'login') {
        const { data: logData, error: logError } = await client.auth.signInWithPassword({ email, password });
        if (logError) return alert(logError.message);

        alert("Login successful!");
        await loadUserData(logData.user);
    }
}

// Load logged-in user details & update UI
async function loadUserData(user) {
    const client = bootstrapSupabaseClient();
    if (!client || !user) return;

    const { data: profile, error } = await client.from('profiles').select('*').eq('id', user.id).single();
    
    if (profile) {
        currentUserProfile = profile;
        
        // Update header & view values
        const idDisplay = document.getElementById('user-id-display');
        if (idDisplay) idDisplay.innerText = "Maggi ID: " + (profile.maggi_id || 'N/A');

        const dashBalance = document.getElementById('dash-balance');
        if (dashBalance) dashBalance.innerText = "₦" + (profile.wallet_balance || 0).toLocaleString();

        const dashInvest = document.getElementById('dash-investment');
        if (dashInvest) dashInvest.innerText = "Active Investments: ₦" + (profile.total_investment || 0).toLocaleString();

        // Reveal navigation toolbar and dashboard
        const appNav = document.getElementById('app-nav');
        if (appNav) appNav.classList.remove('hidden');

        if (profile.is_admin) {
            const adminTab = document.getElementById('admin-nav-tab');
            if (adminTab) adminTab.classList.remove('hidden');
        }

        switchView('view-dashboard');
    }
}

// Check if user is already logged in on startup
document.addEventListener('DOMContentLoaded', async () => {
    bootstrapSupabaseClient();
    const client = bootstrapSupabaseClient();
    if (client) {
        const { data: { session } } = await client.auth.getSession();
        if (session && session.user) {
            await loadUserData(session.user);
        }
    }
});
