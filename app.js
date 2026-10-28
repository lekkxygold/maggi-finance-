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

    if (viewId === 'view-admin' && currentUserProfile && currentUserProfile.is_admin) {
        loadAdminLedgers();
    }
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

    if (error) return alert(error.message);
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

        // Populate Saved Bank Details if present
        if (profile.bank_name) document.getElementById('bank-name').value = profile.bank_name;
        if (profile.account_number) document.getElementById('account-number').value = profile.account_number;
        if (profile.account_name) document.getElementById('account-name').value = profile.account_name;

        // Populate Referral Link Box
        const refBox = document.getElementById('referral-link-box');
        if (refBox) {
            refBox.innerText = `https://maggi-finance.onrender.com/?ref=${profile.maggi_id}`;
        }

        renderInvestmentTiers();

        const appNav = document.getElementById('app-nav');
        if (appNav) appNav.classList.remove('hidden');

        if (profile.is_admin || user.email === 'omoopeola1@gmail.com') {
            const adminTab = document.getElementById('admin-nav-tab');
            if (adminTab) adminTab.classList.remove('hidden');
        }

        switchView('view-dashboard');
    }
}

// Render the 10 Investment Plans (Scaling & 15% Daily Yield)
function renderInvestmentTiers() {
    const container = document.getElementById('tiers-container');
    if (!container) return;

    const planImages = [
        "https://cdn-icons-png.flaticon.com/512/3135/3135706.png",
        "https://cdn-icons-png.flaticon.com/512/2489/2489756.png",
        "https://cdn-icons-png.flaticon.com/512/2953/2953361.png"
    ];

    const plans = [];
    let price = 6000;
    for (let i = 1; i <= 10; i++) {
        plans.push({
            tier: i,
            price: price,
            dailyReturn: price * 0.15,
            totalReturn: (price * 0.15) * 20,
            isOpen: i <= 3 
        });
        price *= 2; // Each plan scales x2 (6000, 12000, 24000...)
    }

    container.innerHTML = plans.map(p => `
        <div class="tier-box" style="border: 1px solid ${p.isOpen ? 'var(--accent)' : '#ccc'}; background: ${p.isOpen ? '#fffde6' : '#f1f1f1'};">
            <img src="${planImages[p.tier - 1] || 'https://cdn-icons-png.flaticon.com/512/3135/3135706.png'}" alt="Badge" style="width: 40px; height: 40px; margin-bottom: 5px;">
            <h4 style="margin: 0 0 5px 0; color: var(--primary);">Tier ${p.tier}</h4>
            <p style="margin: 4px 0; font-weight: bold; font-size: 15px;">₦${p.price.toLocaleString()}</p>
            <p style="margin: 2px 0; font-size: 11px;">Daily: ₦${p.dailyReturn.toLocaleString()} (15%)</p>
            <p style="margin: 2px 0; font-size: 11px;">Duration: 20 Days</p>
            <p style="margin: 2px 0; font-size: 11px; color: #555;">Total: ₦${p.totalReturn.toLocaleString()}</p>
            ${p.isOpen ? 
                `<button class="btn" style="padding: 6px; margin-top: 8px; font-size: 12px;" onclick="investInPlan(${p.price})">Invest Now</button>` : 
                `<span style="display:inline-block; margin-top:8px; background:#ddd; padding:4px 8px; border-radius:4px; font-size:10px; font-weight:bold; color:#666;">Coming Soon</span>`
            }
        </div>
    `).join('');
}

// Invest in a Plan function
async function investInPlan(amount) {
    const client = bootstrapSupabaseClient();
    if (!client || !currentUserProfile) return;

    if (currentUserProfile.wallet_balance < amount) {
        return alert("Insufficient wallet balance! Please make a deposit first.");
    }

    const newBalance = currentUserProfile.wallet_balance - amount;
    const newInvestment = (currentUserProfile.total_investment || 0) + amount;

    const { error } = await client.from('profiles').update({
        wallet_balance: newBalance,
        total_investment: newInvestment
    }).eq('id', currentUserProfile.id);

    if (error) return alert("Investment failed: " + error.message);

    alert(`Successfully invested ₦${amount.toLocaleString()}! Daily income will start dropping in 24 hours.`);
    await loadUserData({ id: currentUserProfile.id });
}

// Copy Company Account Number (One-Tap)
function copyCompanyAccount() {
    navigator.clipboard.writeText("6141619370");
    alert("Company OPay Account Number copied to clipboard!");
}

// Copy Referral Link (One-Tap)
function copyReferralLink() {
    const refText = document.getElementById('referral-link-box').innerText;
    navigator.clipboard.writeText(refText);
    alert("Referral link copied to clipboard!");
}

// Submit Deposit Request ("I have made the payment")
async function submitDepositRequest() {
    const client = bootstrapSupabaseClient();
    if (!client || !currentUserProfile) return;

    const amountInput = document.getElementById('deposit-amount');
    const proofInput = document.getElementById('deposit-proof');

    const amount = parseFloat(amountInput.value);
    const proof = proofInput.value.trim();

    if (!amount || amount <= 0 || !proof) {
        return alert("Please enter the deposit amount and your bank reference/proof.");
    }

    const { error } = await client.from('deposits').insert([
        { user_id: currentUserProfile.id, maggi_id: currentUserProfile.maggi_id, amount: amount, proof: proof, status: 'pending' }
    ]);

    if (error) return alert("Deposit submission error: " + error.message);

    alert("Deposit notification submitted successfully! Awaiting admin approval.");
    amountInput.value = '';
    proofInput.value = '';
}

// Save User Bank Details
async function saveUserBankAccount() {
    const client = bootstrapSupabaseClient();
    if (!client || !currentUserProfile) return;

    const bankName = document.getElementById('bank-name').value.trim();
    const accountNumber = document.getElementById('account-number').value.trim();
    const accountName = document.getElementById('account-name').value.trim();

    if (!bankName || !accountNumber || !accountName) {
        return alert("Please fill out all bank details.");
    }

    const { error } = await client.from('profiles').update({
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName
    }).eq('id', currentUserProfile.id);

    if (error) return alert("Error saving bank details: " + error.message);
    alert("Bank account details saved successfully!");
    await loadUserData({ id: currentUserProfile.id });
}

// Submit Withdrawal Request
async function submitWithdrawalRequest() {
    const client = bootstrapSupabaseClient();
    if (!client || !currentUserProfile) return;

    if (!currentUserProfile.total_investment || currentUserProfile.total_investment <= 0) {
        return alert("You must have an active investment to make a withdrawal!");
    }

    const amountInput = document.getElementById('withdraw-amount');
    const amount = parseFloat(amountInput.value);

    if (amount < 2000) {
        return alert("Minimum payout threshold is ₦2,000.");
    }

    if (!currentUserProfile.bank_number) {
        return alert("Please save your bank account details above first before requesting a withdrawal.");
    }

    if (currentUserProfile.wallet_balance < amount) {
        return alert("Requested withdrawal amount exceeds your available wallet balance.");
    }

    const { error } = await client.from('withdrawals').insert([
        { 
            user_id: currentUserProfile.id, 
            maggi_id: currentUserProfile.maggi_id, 
            amount: amount, 
            bank_details: `${currentUserProfile.bank_name} - ${currentUserProfile.account_number} (${currentUserProfile.account_name})`,
            status: 'pending' 
        }
    ]);

    if (error) return alert("Withdrawal error: " + error.message);

    alert(`Withdrawal request of ₦${amount.toLocaleString()} submitted successfully! Awaiting admin approval.`);
    amountInput.value = '';
}

// Admin Hub: Load Pending Deposits & Withdrawals
async function loadAdminLedgers() {
    const client = bootstrapSupabaseClient();
    if (!client || !currentUserProfile || !currentUserProfile.is_admin) return;

    // Load Deposits
    const { data: deposits } = await client.from('deposits').select('*').eq('status', 'pending');
    const depContainer = document.getElementById('admin-deposits-container');
    if (depContainer) {
        if (!deposits || deposits.length === 0) {
            depContainer.innerHTML = "<p>No pending deposits.</p>";
        } else {
            depContainer.innerHTML = `<table class="admin-table"><tr><th>User ID</th><th>Amount</th><th>Proof</th><th>Action</th></tr>` +
                deposits.map(d => `<tr><td>${d.maggi_id}</td><td>₦${d.amount.toLocaleString()}</td><td>${d.proof}</td><td><button class="btn-success" onclick="approveDeposit('${d.id}', '${d.user_id}', ${d.amount})">Approve</button></td></tr>`).join('') + `</table>`;
        }
    }

    // Load Withdrawals
    const { data: withdrawals } = await client.from('withdrawals').select('*').eq('status', 'pending');
    const wdContainer = document.getElementById('admin-withdrawals-container');
    if (wdContainer) {
        if (!withdrawals || withdrawals.length === 0) {
            wdContainer.innerHTML = "<p>No pending withdrawals.</p>";
        } else {
            wdContainer.innerHTML = `<table class="admin-table"><tr><th>User ID</th><th>Amount</th><th>Bank Info</th><th>Action</th></tr>` +
                withdrawals.map(w => `<tr><td>${w.maggi_id}</td><td>₦${w.amount.toLocaleString()}</td><td>${w.bank_details}</td><td><button class="btn-success" onclick="approveWithdrawal('${w.id}', '${w.user_id}', ${w.amount})">Approve</button> <button class="btn-danger" onclick="rejectWithdrawal('${w.id}')">Reject</button></td></tr>`).join('') + `</table>`;
        }
    }
}

// Admin: Approve Deposit
async function approveDeposit(depositId, userId, amount) {
    const client = bootstrapSupabaseClient();
    const { data: targetUser } = await client.from('profiles').select('wallet_balance').eq('id', userId).single();
    if (!targetUser) return;

    await client.from('profiles').update({ wallet_balance: targetUser.wallet_balance + amount }).eq('id', userId);
    await client.from('deposits').update({ status: 'approved' }).eq('id', depositId);
    alert("Deposit approved and wallet credited!");
    loadAdminLedgers();
}

// Admin: Approve Withdrawal
async function approveWithdrawal(withdrawalId, userId, amount) {
    const client = bootstrapSupabaseClient();
    const { data: targetUser } = await client.from('profiles').select('wallet_balance').eq('id', userId).single();
    if (!targetUser) return;

    if (targetUser.wallet_balance < amount) {
        return alert("User does not have sufficient balance anymore.");
    }

    await client.from('profiles').update({ wallet_balance: targetUser.wallet_balance - amount }).eq('id', userId);
    await client.from('withdrawals').update({ status: 'approved' }).eq('id', withdrawalId);
    alert("Withdrawal approved!");
    loadAdminLedgers();
}

// Admin: Reject Withdrawal
async function rejectWithdrawal(withdrawalId) {
    const client = bootstrapSupabaseClient();
    await client.from('withdrawals').update({ status: 'rejected' }).eq('id', withdrawalId);
    alert("Withdrawal rejected.");
    loadAdminLedgers();
}

// Check session on startup
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
