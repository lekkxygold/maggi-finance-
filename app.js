// Initialization credentials configuration setup
const SUPABASE_URL = "https://athszjeyyxosemqyzmzz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0aHN6amV5eXhvc2VtcXl6bXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDM0ODksImV4cCI6MjEwODc3OTQ4OX0.MjF0uusJGt9LK48Mv7xqc1sBgyXrvZk-_g8n19fGsrA";

let dbClient = null;
let currentUserProfile = null;

function bootstrapSupabaseClient() {
    if (dbClient) return dbClient;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return dbClient;
    }
    return null;
}

function generateMaggiId() {
    return "MG-" + Math.floor(100000 + Math.random() * 900000);
}

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
        loadAdminDashboardData();
    }
}

function switchAdminTab(tabName) {
    const subTabs = ['alerts', 'review', 'users', 'gift'];
    subTabs.forEach(t => {
        const panel = document.getElementById(`admin-sub-${t}`);
        const btn = document.getElementById(`tab-btn-${t}`);
        if (panel) panel.classList.add('hidden');
        if (btn) btn.classList.remove('active');
    });

    const activePanel = document.getElementById(`admin-sub-${tabName}`);
    const activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if (activePanel) activePanel.classList.remove('hidden');
    if (activeBtn) activeBtn.classList.add('active');

    if (tabName === 'review' || tabName === 'alerts') {
        loadAdminDashboardData();
    }
}

async function handleAuth(type) {
    const client = bootstrapSupabaseClient();
    if (!client) return alert("Database initializing. Please try again.");

    const email = document.getElementById('auth-email').value.trim().toLowerCase();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) return alert("Please enter email and password.");

    const isAdmin = (email === 'omoopeola1@gmail.com');

    if (type === 'register') {
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) return alert(error.message);

        const maggiId = generateMaggiId();
        if (data.user) {
            await client.from('profiles').insert([
                { id: data.user.id, maggi_id: maggiId, wallet_balance: 2000, total_investment: 0, is_admin: isAdmin, email: email }
            ]);
        }
        alert("Registration complete! Welcome Bonus ₦2,000 credited.");
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

async function handleForgotPassword() {
    const client = bootstrapSupabaseClient();
    const email = document.getElementById('auth-email').value.trim();
    if (!email) return alert("Please enter your email address above.");
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) return alert(error.message);
    alert("Password reset email sent!");
}

async function loadUserData(user) {
    const client = bootstrapSupabaseClient();
    if (!client || !user) return;

    const { data: profile } = await client.from('profiles').select('*').eq('id', user.id).single();
    
    if (profile) {
        currentUserProfile = profile;
        
        document.getElementById('user-id-display').innerText = "Maggi ID: " + (profile.maggi_id || 'N/A');
        document.getElementById('dash-balance').innerText = "₦" + (profile.wallet_balance || 0).toLocaleString();
        document.getElementById('dash-investment').innerText = "Active Investments: ₦" + (profile.total_investment || 0).toLocaleString();

        if (profile.bank_name) document.getElementById('bank-name').value = profile.bank_name;
        if (profile.account_number) document.getElementById('account-number').value = profile.account_number;
        if (profile.account_name) document.getElementById('account-name').value = profile.account_name;

        document.getElementById('referral-link-box').innerText = `https://maggi-finance.onrender.com/?ref=${profile.maggi_id}`;

        renderInvestmentTiers();

        document.getElementById('app-nav').classList.remove('hidden');

        if (profile.is_admin || user.email === 'omoopeola1@gmail.com') {
            document.getElementById('admin-nav-tab').classList.remove('hidden');
        }

        switchView('view-dashboard');
    }
}

function renderInvestmentTiers() {
    const container = document.getElementById('tiers-container');
    if (!container) return;

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
        price *= 2;
    }

    container.innerHTML = plans.map(p => `
        <div class="tier-box" style="border: 1px solid ${p.isOpen ? 'var(--accent)' : '#ccc'}; background: ${p.isOpen ? '#fffde6' : '#f1f1f1'};">
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

async function investInPlan(amount) {
    const client = bootstrapSupabaseClient();
    if (!client || !currentUserProfile) return;

    if (currentUserProfile.wallet_balance < amount) return alert("Insufficient wallet balance!");

    const newBalance = currentUserProfile.wallet_balance - amount;
    const newInvestment = (currentUserProfile.total_investment || 0) + amount;

    await client.from('profiles').update({ wallet_balance: newBalance, total_investment: newInvestment }).eq('id', currentUserProfile.id);
    alert(`Successfully invested ₦${amount.toLocaleString()}!`);
    await loadUserData({ id: currentUserProfile.id });
}

function copyCompanyAccount() {
    navigator.clipboard.writeText("6141619370");
    alert("Copied OPay Account: 6141619370!");
}

function copyReferralLink() {
    navigator.clipboard.writeText(document.getElementById('referral-link-box').innerText);
    alert("Referral link copied!");
}

async function submitDepositRequest() {
    const client = bootstrapSupabaseClient();
    const amount = parseFloat(document.getElementById('deposit-amount').value);
    const proof = document.getElementById('deposit-proof').value.trim();

    if (!amount || !proof) return alert("Please fill amount and proof reference.");

    const { error } = await client.from('deposits').insert([
        { user_id: currentUserProfile.id, maggi_id: currentUserProfile.maggi_id, amount: amount, proof: proof, status: 'pending' }
    ]);

    if (error) return alert("Deposit submission error: " + error.message);

    alert("Deposit submitted! Awaiting admin review.");
    document.getElementById('deposit-amount').value = '';
    document.getElementById('deposit-proof').value = '';
}

async function saveUserBankAccount() {
    const client = bootstrapSupabaseClient();
    const bankName = document.getElementById('bank-name').value.trim();
    const accountNumber = document.getElementById('account-number').value.trim();
    const accountName = document.getElementById('account-name').value.trim();

    if (!bankName || !accountNumber || !accountName) return alert("Please fill all bank fields.");

    const { error } = await client.from('profiles').update({ bank_name: bankName, account_number: accountNumber, account_name: accountName }).eq('id', currentUserProfile.id);
    if (error) return alert("Error saving bank account: " + error.message);

    alert("Bank account saved successfully!");
    await loadUserData({ id: currentUserProfile.id });
}

async function submitWithdrawalRequest() {
    const client = bootstrapSupabaseClient();
    if (!currentUserProfile.total_investment || currentUserProfile.total_investment <= 0) return alert("Active investment required to withdraw!");

    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    if (amount < 2000) return alert("Minimum withdrawal is ₦2,000.");
    if (currentUserProfile.wallet_balance < amount) return alert("Insufficient balance.");

    const bankDetails = `${document.getElementById('bank-name').value} - ${document.getElementById('account-number').value} (${document.getElementById('account-name').value})`;

    const { error } = await client.from('withdrawals').insert([
        { 
            user_id: currentUserProfile.id, 
            maggi_id: currentUserProfile.maggi_id, 
            amount: amount, 
            bank_details: bankDetails,
            status: 'pending' 
        }
    ]);

    if (error) return alert("Withdrawal error: " + error.message);

    alert("Withdrawal submitted! Awaiting admin review.");
    document.getElementById('withdraw-amount').value = '';
}

// ADMIN DASHBOARD LOADER
async function loadAdminDashboardData() {
    const client = bootstrapSupabaseClient();
    if (!client || !currentUserProfile || !currentUserProfile.is_admin) return;

    // Fetch Deposits & Withdrawals
    const { data: deposits, error: depErr } = await client.from('deposits').select('*').eq('status', 'pending');
    const { data: withdrawals, error: wdErr } = await client.from('withdrawals').select('*').eq('status', 'pending');
    const { data: users } = await client.from('profiles').select('*');

    if (depErr) console.error("Deposits Fetch Error:", depErr);
    if (wdErr) console.error("Withdrawals Fetch Error:", wdErr);

    const pendingWd = withdrawals || [];
    const pendingDep = deposits || [];

    const totalCount = pendingWd.length + pendingDep.length;
    document.getElementById('alert-count').innerText = totalCount;
    document.getElementById('review-count').innerText = totalCount;

    // 1. Render Alerts Sub-Tab (Card View)
    const alertsList = document.getElementById('alerts-list');
    let alertHtml = '';

    pendingWd.forEach(w => {
        alertHtml += `
            <div class="alert-card">
                <span class="alert-badge">WITHDRAWAL REQUEST</span>
                <div class="alert-title">${w.maggi_id} requested payout</div>
                <div class="alert-desc">Details: ${w.bank_details || 'Bank account info attached'}</div>
                <div class="alert-amount">₦${w.amount.toLocaleString()}</div>
                <div style="display:flex; gap:8px;">
                    <button class="btn-success btn" style="padding:6px;" onclick="approveWithdrawal('${w.id}', '${w.user_id}', ${w.amount})">Approve</button>
                    <button class="btn-danger btn" style="padding:6px;" onclick="rejectWithdrawal('${w.id}')">Reject</button>
                </div>
            </div>
        `;
    });

    pendingDep.forEach(d => {
        alertHtml += `
            <div class="alert-card">
                <span class="alert-badge" style="color:#28a745;">DEPOSIT PROOF</span>
                <div class="alert-title">${d.maggi_id} deposited funds</div>
                <div class="alert-desc">Proof: ${d.proof}</div>
                <div class="alert-amount">₦${d.amount.toLocaleString()}</div>
                <button class="btn-success btn" style="padding:6px;" onclick="approveDeposit('${d.id}', '${d.user_id}', ${d.amount})">Confirm & Credit</button>
            </div>
        `;
    });

    alertsList.innerHTML = alertHtml || '<p style="color:#aaa;">No pending alerts at the moment.</p>';

    // 2. Render Review Sub-Tab
    const reviewDepList = document.getElementById('review-deposits-list');
    const reviewWdList = document.getElementById('review-withdrawals-list');

    if (reviewDepList) {
        reviewDepList.innerHTML = pendingDep.length === 0 ? '<p style="color:#aaa;">No pending deposits.</p>' :
            pendingDep.map(d => `<div style="background:#252525; padding:10px; margin-bottom:8px; border-radius:8px;">
                <strong>User:</strong> ${d.maggi_id} | <strong>Amount:</strong> ₦${d.amount.toLocaleString()}<br>
                <strong>Proof:</strong> ${d.proof}<br>
                <button class="btn-success btn" style="padding:4px 8px; margin-top:5px; font-size:12px; width:auto;" onclick="approveDeposit('${d.id}', '${d.user_id}', ${d.amount})">Approve Deposit</button>
            </div>`).join('');
    }

    if (reviewWdList) {
        reviewWdList.innerHTML = pendingWd.length === 0 ? '<p style="color:#aaa;">No pending withdrawals.</p>' :
            pendingWd.map(w => `<div style="background:#252525; padding:10px; margin-bottom:8px; border-radius:8px;">
                <strong>User:</strong> ${w.maggi_id} | <strong>Amount:</strong> ₦${w.amount.toLocaleString()}<br>
                <strong>Bank:</strong> ${w.bank_details}<br>
                <button class="btn-success btn" style="padding:4px 8px; margin-top:5px; font-size:12px; width:auto;" onclick="approveWithdrawal('${w.id}', '${w.user_id}', ${w.amount})">Approve</button>
                <button class="btn-danger btn" style="padding:4px 8px; margin-top:5px; font-size:12px; width:auto;" onclick="rejectWithdrawal('${w.id}')">Reject</button>
            </div>`).join('');
    }

    // 3. Render Users Table
    const usersContainer = document.getElementById('users-table-container');
    if (usersContainer && users) {
        usersContainer.innerHTML = `<table class="admin-table"><tr><th>Maggi ID</th><th>Balance</th><th>Investment</th></tr>` +
            users.map(u => `<tr><td>${u.maggi_id || 'N/A'}</td><td>₦${(u.wallet_balance||0).toLocaleString()}</td><td>₦${(u.total_investment||0).toLocaleString()}</td></tr>`).join('') + `</table>`;
    }
}

async function approveDeposit(depositId, userId, amount) {
    const client = bootstrapSupabaseClient();
    const { data: target } = await client.from('profiles').select('wallet_balance').eq('id', userId).single();
    if (!target) return;

    await client.from('profiles').update({ wallet_balance: (target.wallet_balance || 0) + amount }).eq('id', userId);
    await client.from('deposits').update({ status: 'approved' }).eq('id', depositId);
    alert("Deposit Approved & Wallet Credited!");
    loadAdminDashboardData();
}

async function approveWithdrawal(withdrawalId, userId, amount) {
    const client = bootstrapSupabaseClient();
    const { data: target } = await client.from('profiles').select('wallet_balance').eq('id', userId).single();
    if (!target) return;

    await client.from('profiles').update({ wallet_balance: (target.wallet_balance || 0) - amount }).eq('id', userId);
    await client.from('withdrawals').update({ status: 'approved' }).eq('id', withdrawalId);
    alert("Withdrawal Approved!");
    loadAdminDashboardData();
}

async function rejectWithdrawal(withdrawalId) {
    const client = bootstrapSupabaseClient();
    await client.from('withdrawals').update({ status: 'rejected' }).eq('id', withdrawalId);
    alert("Withdrawal Rejected!");
    loadAdminDashboardData();
}

async function createAdminGiftCode() {
    const client = bootstrapSupabaseClient();
    const code = document.getElementById('admin-code').value.trim();
    const amount = parseFloat(document.getElementById('admin-amount').value);
    const qty = parseInt(document.getElementById('admin-qty').value);

    if (!code || !amount || !qty) return alert("Please fill code, amount, and quantity.");

    const { error } = await client.from('vouchers').insert([{ code, amount, claims_left: qty }]);
    if (error) return alert("Gift Code creation error: " + error.message);

    alert(`Gift code ${code} issued successfully!`);
}

async function redeemGiftCode() {
    const client = bootstrapSupabaseClient();
    const inputCode = document.getElementById('gift-code-input').value.trim();

    if (!inputCode) return alert("Please enter gift code.");

    const { data: voucher } = await client.from('vouchers').select('*').eq('code', inputCode).single();

    if (!voucher || voucher.claims_left <= 0) return alert("Invalid or expired gift code.");

    await client.from('profiles').update({ wallet_balance: currentUserProfile.wallet_balance + voucher.amount }).eq('id', currentUserProfile.id);
    await client.from('vouchers').update({ claims_left: voucher.claims_left - 1 }).eq('id', voucher.id);

    alert(`Voucher claimed! ₦${voucher.amount.toLocaleString()} added to your balance.`);
    await loadUserData({ id: currentUserProfile.id });
}

document.addEventListener('DOMContentLoaded', async () => {
    const client = bootstrapSupabaseClient();
    if (client) {
        const { data: { session } } = await client.auth.getSession();
        if (session && session.user) {
            await loadUserData(session.user);
        } else {
            document.getElementById('user-id-display').innerText = "Maggi ID: Guest";
        }
    }
});
