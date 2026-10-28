// Initialization credentials configuration setup
const SUPABASE_URL = "https://athszjeyyxosemqyzmzz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0aHN6amV5eXhvc2VtcXl6bXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDM0ODksImV4cCI6MjEwODc3OTQ4OX0.MjF0uusJGt9LK48Mv7xqc1sBgyXrvZk-_g8n19fGsrA";

let dbClient = null;
let currentUserProfile = null;

// Safely initialize Supabase Client
function bootstrapSupabaseClient() {
    if (dbClient) return dbClient;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return dbClient;
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

    const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email || !password) {
        return alert("Please fill standard input parameters.");
    }

    const isAdmin = (email === 'omoopeola1@gmail.com');

    if (type === 'register') {
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) return alert(error.message);

        const maggiId = generateMaggiId();
        if (data.user) {
            const { error: profileError } = await client.from('profiles').insert([
                { id: data.user.id, maggi_id: maggiId, wallet_balance: 2000, total_investment: 0, is_admin: isAdmin }
            ]);
            if (profileError) console.error("Profile Error:", profileError);
        }

        alert("Registration complete! Enjoy your ₦2,000 sign up reward.");
        await loadUserData(data.user);
    } else if (type === 'login') {
        const { data: logData, error: logError } = await client.auth.signInWithPassword({ email, password });
        if (logError) return alert(logError.message);

        // Ensure admin status is synced if it's the admin email
        if (isAdmin) {
            await client.from('profiles').update({ is_admin: true }).eq('id', logData.user.id);
        }

        alert("Login successful!");
        await loadUserData(logData.user);
    }
}

// Forgot Password Handler
async function handleForgotPassword() {
    const client = bootstrapSupabaseClient();
    if (!client) return alert("Supabase is still connecting. Please wait a moment.");

    const emailInput = document.getElementById('auth-email');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) {
        return alert("Please enter your email address in the email field above first, then click 'Forgot Password?'.");
    }

    const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
    });

    if (error) {
        return alert(error.message);
    }

    alert("Password reset link has been sent to your email address. Please check your inbox.");
}

// Load logged-in user details & update UI
async function loadUserData(user) {
    const client = bootstrapSupabaseClient();
    if (!client || !user) return;

    const { data: profile, error } = await client.from('profiles').select('*').eq('id', user.id).single();
    
    if (profile) {
        currentUserProfile = profile;
        
        const idDisplay = document.getElementById('user-id-display');
        if (idDisplay) idDisplay.innerText = "Maggi ID: " + (profile.maggi_id || 'N/A');

        const dashBalance = document.getElementById('dash-balance');
        if (dashBalance) dashBalance.innerText = "₦" + (profile.wallet_balance || 0).toLocaleString();

        const dashInvest = document.getElementById('dash-investment');
        if (dashInvest) dashInvest.innerText = "Active Investments: ₦" + (profile.total_investment || 0).toLocaleString();

        const refBox = document.getElementById('referral-link-box');
        if (refBox) {
            refBox.innerText = `https://maggi-finance.onrender.com/?ref=${profile.maggi_id}`;
        }

        renderInvestmentTiers();

        const appNav = document.getElementById('app-nav');
        if (appNav) appNav.classList.remove('hidden');

        // Show Admin tab if user is admin
        if (profile.is_admin || user.email === 'omoopeola1@gmail.com') {
            const adminTab = document.getElementById('admin-nav-tab');
            if (adminTab) adminTab.classList.remove('hidden');
        }

        switchView('view-dashboard');
    }
}

// Render the 10 Investment Plans (First 3 Open, 7 Coming Soon)
function renderInvestmentTiers() {
    const container = document.getElementById('tiers-container');
    if (!container) return;

    const plans = [];
    let basePrice = 6000;
    for (let i = 1; i <= 10; i++) {
        plans.push({
            tier: i,
            price: basePrice,
            dailyReturn: basePrice * 0.10,
            totalReturn: (basePrice * 0.10) * 20,
            isOpen: i <= 3 
        });
        basePrice += 4000;
    }

    container.innerHTML = plans.map(p => `
        <div class="tier-box" style="border: 1px solid ${p.isOpen ? 'var(--accent)' : '#ccc'}; background: ${p.isOpen ? '#fffde6' : '#f1f1f1'};">
            <h4 style="margin: 0 0 5px 0; color: var(--primary);">Tier ${p.tier} Plan</h4>
            <p style="margin: 4px 0; font-weight: bold; font-size: 16px;">₦${p.price.toLocaleString()}</p>
            <p style="margin: 2px 0; font-size: 12px;">Daily Return: ₦${p.dailyReturn.toLocaleString()} (10%)</p>
            <p style="margin: 2px 0; font-size: 12px;">Duration: 20 Days</p>
            <p style="margin: 2px 0; font-size: 12px; color: #555;">Total Return: ₦${p.totalReturn.toLocaleString()}</p>
            ${p.isOpen ? 
                `<button class="btn" style="padding: 6px; margin-top: 8px; font-size: 13px;" onclick="investInPlan(${p.price})">Invest Now</button>` : 
                `<span style="display:inline-block; margin-top:8px; background:#ddd; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold; color:#666;">Coming Soon</span>`
            }
        </div>
    `).join('');
}

// Invest in a Plan function
async function investInPlan(amount) {
    const client = bootstrapSupabaseClient();
    if (!client || !currentUserProfile) return;

    if (currentUserProfile.wallet_balance < amount) {
        return alert("Insufficient wallet balance to invest in this plan!");
    }

    const newBalance = currentUserProfile.wallet_balance - amount;
    const newInvestment = (currentUserProfile.total_investment || 0) + amount;

    const { error } = await client.from('profiles').update({
        wallet_balance: newBalance,
        total_investment: newInvestment
    }).eq('id', currentUserProfile.id);

    if (error) {
        return alert("Investment failed: " + error.message);
    }

    alert(`Successfully invested ₦${amount.toLocaleString()}! Daily income will start dropping in 24 hours.`);
    await loadUserData({ id: currentUserProfile.id });
}

// Submit Withdrawal Request with Bank Details & Active Investment Check
async function submitWithdrawalRequest() {
    const client = bootstrapSupabaseClient();
    if (!client || !currentUserProfile) return;

    if (!currentUserProfile.total_investment || currentUserProfile.total_investment <= 0) {
        return alert("You must have an active investment to make a withdrawal!");
    }

    const amountInput = document.getElementById('withdraw-amount');
    const bankNameInput = document.getElementById('bank-name');
    const accountNumberInput = document.getElementById('account-number');
    const accountNameInput = document.getElementById('account-name');

    const amount = amountInput ? parseFloat(amountInput.value) : 0;
    const bankName = bankNameInput ? bankNameInput.value.trim() : '';
    const accountNumber = accountNumberInput ? accountNumberInput.value.trim() : '';
    const accountName = accountNameInput ? accountNameInput.value.trim() : '';

    if (amount < 2000) {
        return alert("Minimum payout threshold is ₦2,000.");
    }

    if (!bankName || !accountNumber || !accountName) {
        return alert("Please fill in all bank account details for your withdrawal.");
    }

    if (currentUserProfile.wallet_balance < amount) {
        return alert("Requested withdrawal amount exceeds your available wallet balance.");
    }

    const updatedBalance = currentUserProfile.wallet_balance - amount;
    const { error } = await client.from('profiles').update({
        wallet_balance: updatedBalance
    }).eq('id', currentUserProfile.id);

    if (error) return alert("Withdrawal error: " + error.message);

    alert(`Withdrawal request of ₦${amount.toLocaleString()} submitted successfully to ${bankName} (${accountNumber})!`);
    await loadUserData({ id: currentUserProfile.id });
}

// Check if user is already logged in on startup
document.addEventListener('DOMContentLoaded', async () => {
    const client = bootstrapSupabaseClient();
    if (client) {
        const { data: { session } } = await client.auth.getSession();
        if (session && session.user) {
            await loadUserData(session.user);
        } else {
            const idDisplay = document.getElementById('user-id-display');
            if (idDisplay) idDisplay.innerText = "Maggi ID: Guest";
        }
    }
});
