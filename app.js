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

    if (viewId === 'view-wallet' && currentUserProfile) {
        loadUserTransactions();
    }

    if (viewId === 'view-team' && currentUserProfile) {
        loadTeamRecords();
    }

    if (viewId === 'view-admin' && currentUserProfile) {
        if (currentUserProfile.is_admin || currentUserProfile.email === 'omoopeola1@gmail.com') {
            loadAdminDashboardData();
        } else {
            alert("Access denied. Admin rights required.");
            switchView('view-dashboard');
        }
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
    if (!client) return alert("Database initializing. Please wait 2 seconds.");

    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const refCodeInput = document.getElementById('auth-ref-code');
    const nameInput = document.getElementById('auth-name');

    const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
    const password = passwordInput ? passwordInput.value : '';
    const refCode = refCodeInput ? refCodeInput.value.trim() : null;

    if (!email || !password) return alert("Please enter both email and password.");

    const isAdmin = (email === 'omoopeola1@gmail.com');

    if (type === 'register') {
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) return alert("Registration Error: " + error.message);

        const user = data.user;
        if (user) {
            const maggiId = generateMaggiId();
            
            await client.from('profiles').upsert([
                { 
                    id: user.id, 
                    maggi_id: maggiId, 
                    wallet_balance: 2000, 
                    total_investment: 0, 
                    is_admin: isAdmin, 
                    email: email,
                    referred_by: refCode 
                }
            ]);

            alert("Registration complete! Welcome Bonus ₦2,000 credited.");
            
            const { data: signData } = await client.auth.signInWithPassword({ email, password });
            if (signData && signData.user) {
                await loadUserData(signData.user);
            } else {
                await loadUserData(user);
            }
        }
    } else if (type === 'login') {
        const { data: logData, error: logError } = await client.auth.signInWithPassword({ email, password });
        if (logError) return alert("Login Error: " + logError.message);

        if (isAdmin && logData.user) {
            await client.from('profiles').update({ is_admin: true }).eq('id', logData.user.id);
        }
        
        alert("Login successful!");
        await loadUserData(logData.user);
    }
}

async function handleLogout() {
    const client = bootstrapSupabaseClient();
    if (client) {
        await client.auth.signOut();
    }
    currentUserProfile = null;
    document.getElementById('app-nav').classList.add('hidden');
    document.getElementById('logout-btn').classList.add('hidden');
    switchView('view-auth');
    alert("Logged out successfully.");
}

async function handleForgotPassword() {
    const client = bootstrapSupabaseClient();
    const email = document.getElementById('auth-email').value.trim();
    if (!email) return alert("Please enter your email address above.");
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) return alert("Reset Error: " + error.message);
    alert("Password reset email sent!");
}

async function loadUserData(user) {
    const client = bootstrapSupabaseClient();
    if (!client || !user) return;

    let { data: profile } = await client.from('profiles').select('*').eq('id', user.id).single();
    
    if (!profile) {
        const maggiId = generateMaggiId();
        const isAdmin = (user.email === 'omoopeola1@gmail.com');
        const { data: newProfile } = await client.from('profiles').insert([
            { id: user.id, maggi_id: maggiId, wallet_balance: 2000, total_investment: 0, is_admin: isAdmin, email: user.email }
        ]).select().single();
        profile = newProfile;
    }

    if (profile) {
        currentUserProfile = profile;
        
        document.getElementById('user-id-display').innerText = "Maggi ID: " + (profile.maggi_id || 'N/A');
        document.getElementById('dash-balance').innerText = "₦" + (profile.wallet_balance || 0).toLocaleString();
        document.getElementById('dash-investment').innerText = "Active Investments: ₦" + (profile.total_investment || 0).toLocaleString();

        if (profile.bank_name) document.getElementById('bank-name').value = profile.bank_name;
        if (profile.account_number) document.getElementById('account-number').value = profile.account_number;
        if (profile.account_name) document.getElementById('account-name').value = profile.account_name;

        document.getElementById('referral-link-box').innerText = `https://maggi-finance.onrender.com/?ref=${profile.maggi_id}`;

        document.getElementById('app-nav').classList.remove('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');

        if (profile.is_admin || user.email === 'omoopeola1@gmail.com') {
            document.getElementById('admin-nav-tab').classList.remove('hidden');
        }

        switchView('view-dashboard');
    }
}

async function investInPlan(tierNumber, amount) {
    const client = bootstrapSupabaseClient();
    if (!client || !currentUserProfile) return;

    if (currentUserProfile.wallet_balance < amount) return alert("Insufficient wallet balance!");

    const newBalance = currentUserProfile.wallet_balance - amount;
    const newInvestment = (currentUserProfile.total_investment || 0) + amount;

    // Update investor profile
    await client.from('profiles').update({ wallet_balance: newBalance, total_investment: newInvestment }).eq('id', currentUserProfile.id);

    // PROCESS 3-TIER INVESTMENT REFERRAL COMMISSIONS & LOG TO COMMISSIONS TABLE
    if (currentUserProfile.referred_by) {
        const l1RefClean = (currentUserProfile.referred_by || '').trim();
        const { data: l1User } = await client.from('profiles').select('*').ilike('maggi_id', l1RefClean).single();
        
        if (l1User) {
            const l1Bonus = amount * 0.20; // Level 1: 20%
            await client.from('profiles').update({ wallet_balance: (l1User.wallet_balance || 0) + l1Bonus }).eq('id', l1User.id);
            try {
                await client.from('commissions').insert([{
                    user_id: l1User.id,
                    from_user: currentUserProfile.maggi_id,
                    level: 1,
                    amount: l1Bonus
                }]);
            } catch(e) { console.log(e); }

            if (l1User.referred_by) {
                const l2RefClean = (l1User.referred_by || '').trim();
                const { data: l2User } = await client.from('profiles').select('*').ilike('maggi_id', l2RefClean).single();
                
                if (l2User) {
                    const l2Bonus = amount * 0.02; // Level 2: 2%
                    await client.from('profiles').update({ wallet_balance: (l2User.wallet_balance || 0) + l2Bonus }).eq('id', l2User.id);
                    try {
                        await client.from('commissions').insert([{
                            user_id: l2User.id,
                            from_user: currentUserProfile.maggi_id,
                            level: 2,
                            amount: l2Bonus
                        }]);
                    } catch(e) { console.log(e); }

                    if (l2User.referred_by) {
                        const l3RefClean = (l2User.referred_by || '').trim();
                        const { data: l3User } = await client.from('profiles').select('*').ilike('maggi_id', l3RefClean).single();
                        
                        if (l3User) {
                            const l3Bonus = amount * 0.01; // Level 3: 1%
                            await client.from('profiles').update({ wallet_balance: (l3User.wallet_balance || 0) + l3Bonus }).eq('id', l3User.id);
                            try {
                                await client.from('commissions').insert([{
                                    user_id: l3User.id,
                                    from_user: currentUserProfile.maggi_id,
                                    level: 3,
                                    amount: l3Bonus
                                }]);
                            } catch(e) { console.log(e); }
                        }
                    }
                }
            }
        }
    }

    alert(`Successfully invested Tier ${tierNumber} (₦${amount.toLocaleString()})! Referral commissions successfully credited.`);
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
    loadUserTransactions();
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
    loadUserTransactions();
}

async function loadUserTransactions() {
    const client = bootstrapSupabaseClient();
    if (!client || !currentUserProfile) return;

    const { data: deposits } = await client.from('deposits').select('*').eq('user_id', currentUserProfile.id);
    const { data: withdrawals } = await client.from('withdrawals').select('*').eq('user_id', currentUserProfile.id);
    
    let commissions = [];
    try {
        const res = await client.from('commissions').select('*').eq('user_id', currentUserProfile.id);
        if (res.data) commissions = res.data;
    } catch (err) {
        console.log("Commissions table query skipped/not ready:", err);
    }

    const feed = document.getElementById('user-transactions-feed');
    if (!feed) return;

    let html = '';
    const allTxs = [
        ...(deposits || []).map(d => ({ ...d, type: 'Deposit' })),
        ...(withdrawals || []).map(w => ({ ...w, type: 'Withdrawal' })),
        ...(commissions || []).map(c => ({ ...c, type: `Referral Commission (Lvl ${c.level})`, status: 'credited', proof: `From: ${c.from_user}` }))
    ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    allTxs.forEach(tx => {
        let statusColor = '#f39c12';
        if (tx.status === 'approved' || tx.status === 'credited') statusColor = '#28a745';
        if (tx.status === 'rejected' || tx.status === 'failed') statusColor = '#dc3545';

        html += `
            <div class="tx-item">
                <div>
                    <strong>${tx.type}</strong><br>
                    <small style="color:#666;">₦${(tx.amount || 0).toLocaleString()} - ${tx.proof || tx.bank_details || ''}</small>
                </div>
                <div>
                    <span style="background:${statusColor}; color:white; padding:3px 8px; border-radius:10px; font-size:10px; font-weight:bold; text-transform:uppercase;">${tx.status}</span>
                </div>
            </div>
        `;
    });

    feed.innerHTML = html || '<p style="color:#666;">No transaction history yet.</p>';
}

async function loadTeamRecords() {
    const client = bootstrapSupabaseClient();
    if (!client || !currentUserProfile) return;

    const { data: allProfiles, error } = await client.from('profiles').select('*');
    if (error || !allProfiles) return;

    const myId = (currentUserProfile.maggi_id || '').trim().toLowerCase();

    const level1 = allProfiles.filter(p => (p.referred_by || '').trim().toLowerCase() === myId);
    const level1Ids = new Set(level1.map(p => (p.maggi_id || '').trim().toLowerCase()));

    const level2 = allProfiles.filter(p => level1Ids.has((p.referred_by || '').trim().toLowerCase()));
    const level2Ids = new Set(level2.map(p => (p.maggi_id || '').trim().toLowerCase()));

    const level3 = allProfiles.filter(p => level2Ids.has((p.referred_by || '').trim().toLowerCase()));

    const totalMembers = level1.length + level2.length + level3.length;
    const teamCountEl = document.getElementById('team-count');
    if (teamCountEl) teamCountEl.innerText = totalMembers;

    // Calculate Total Team Deposits / Investments
    const totalTeamInv = [...level1, ...level2, ...level3].reduce((sum, member) => sum + (member.total_investment || 0), 0);
    
    const teamList = document.getElementById('team-records-list');
    if (!teamList) return;

    let summaryHtml = `
        <div style="background:#fff8dc; border:1px solid #fef3c7; padding:12px; border-radius:10px; margin-bottom:12px; text-align:center;">
            <strong style="font-size:14px; color:#b45309;">Total Team Investments/Deposits: ₦${totalTeamInv.toLocaleString()}</strong>
        </div>
    `;

    if (totalMembers === 0) {
        teamList.innerHTML = summaryHtml + '<p style="color:#666; font-size:13px;">No team members yet. Share your referral link to earn Level 1 (20%), Level 2 (2%), and Level 3 (1%) commissions when they invest!</p>';
        return;
    }

    let html = summaryHtml;
    const formatDate = (dateStr) => {
        if (!dateStr) return 'Recently';
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString();
    };

    if (level1.length > 0) {
        html += `<h4 style="margin:10px 0 5px 0; color:var(--primary);">Level 1 Directs (20% Investment Commission)</h4>`;
        html += level1.map(r => `
            <div class="tx-item">
                <div><strong>ID:</strong> ${r.maggi_id}<br><small style="color:#666;">Joined: ${formatDate(r.created_at)} | Active Inv: ₦${(r.total_investment||0).toLocaleString()}</small></div>
                <div><span style="background:#28a745; color:white; padding:3px 8px; border-radius:10px; font-size:10px; font-weight:bold;">Level 1</span></div>
            </div>
        `).join('');
    }

    if (level2.length > 0) {
        html += `<h4 style="margin:15px 0 5px 0; color:#333;">Level 2 (2% Investment Commission)</h4>`;
        html += level2.map(r => `
            <div class="tx-item">
                <div><strong>ID:</strong> ${r.maggi_id}<br><small style="color:#666;">Joined: ${formatDate(r.created_at)} | Active Inv: ₦${(r.total_investment||0).toLocaleString()}</small></div>
                <div><span style="background:#007bff; color:white; padding:3px 8px; border-radius:10px; font-size:10px; font-weight:bold;">Level 2</span></div>
            </div>
        `).join('');
    }

    if (level3.length > 0) {
        html += `<h4 style="margin:15px 0 5px 0; color:#666;">Level 3 (1% Investment Commission)</h4>`;
        html += level3.map(r => `
            <div class="tx-item">
                <div><strong>ID:</strong> ${r.maggi_id}<br><small style="color:#666;">Joined: ${formatDate(r.created_at)} | Active Inv: ₦${(r.total_investment||0).toLocaleString()}</small></div>
                <div><span style="background:#6c757d; color:white; padding:3px 8px; border-radius:10px; font-size:10px; font-weight:bold;">Level 3</span></div>
            </div>
        `).join('');
    }

TeamList.innerHTML = html;
}

async function loadAdminDashboardData() {
    const client = bootstrapSupabaseClient();
    if (!client) return;

    const { data: deposits } = await client.from('deposits').select('*');
    const { data: withdrawals } = await client.from('withdrawals').select('*');
    const { data: users } = await client.from('profiles').select('*');

    const pendingWd = (withdrawals || []).filter(w => w.status === 'pending');
    const pendingDep = (deposits || []).filter(d => d.status === 'pending');

    const totalCount = pendingWd.length + pendingDep.length;
    document.getElementById('alert-count').innerText = totalCount;
    document.getElementById('review-count').innerText = totalCount;

    const alertsList = document.getElementById('alerts-list');
    let alertHtml = '';

    pendingWd.forEach(w => {
        alertHtml += `
            <div class="alert-card">
                <span class="alert-badge">WITHDRAWAL REQUEST</span>
                <div class="alert-title">${w.maggi_id || 'User'} requested payout</div>
                <div class="alert-desc">Details: ${w.bank_details || 'Bank account info attached'}</div>
                <div class="alert-amount">₦${(w.amount || 0).toLocaleString()}</div>
                <div style="display:flex; gap:8px; margin-top:8px;">
                    <button class="btn-success btn" style="padding:6px; font-size:12px;" onclick="approveWithdrawal('${w.id}', '${w.user_id}', ${w.amount})">Approve</button>
                    <button class="btn-danger btn" style="padding:6px; font-size:12px;" onclick="rejectWithdrawal('${w.id}')">Reject / Failed</button>
                </div>
            </div>
        `;
    });

    pendingDep.forEach(d => {
        alertHtml += `
            <div class="alert-card">
                <span class="alert-badge" style="color:#28a745;">DEPOSIT PROOF</span>
                <div class="alert-title">${d.maggi_id || 'User'} deposited funds</div>
                <div class="alert-desc">Proof: ${d.proof}</div>
                <div class="alert-amount">₦${(d.amount || 0).toLocaleString()}</div>
                <div style="display:flex; gap:8px; margin-top:8px;">
                    <button class="btn-success btn" style="padding:6px; font-size:12px;" onclick="approveDeposit('${d.id}', '${d.user_id}', ${d.amount}, '${d.maggi_id}')">Confirm & Credit</button>
                    <button class="btn-danger btn" style="padding:6px; font-size:12px;" onclick="rejectDeposit('${d.id}')">Reject / Failed</button>
                </div>
            </div>
        `;
    });

    alertsList.innerHTML = alertHtml || '<p style="color:#aaa;">No pending alerts at the moment.</p>';

    const reviewDepList = document.getElementById('review-deposits-list');
    const reviewWdList = document.getElementById('review-withdrawals-list');

    if (reviewDepList) {
        reviewDepList.innerHTML = pendingDep.length === 0 ? '<p style="color:#aaa;">No pending deposits.</p>' :
            pendingDep.map(d => `<div style="background:#252525; padding:10px; margin-bottom:8px; border-radius:8px; color:#fff;">
                <strong>User:</strong> ${d.maggi_id} | <strong>Amount:</strong> ₦${d.amount.toLocaleString()}<br>
                <strong>Proof:</strong> ${d.proof}<br>
                <div style="display:flex; gap:6px; margin-top:5px;">
                    <button class="btn-success btn" style="padding:4px 8px; font-size:12px; width:auto;" onclick="approveDeposit('${d.id}', '${d.user_id}', ${d.amount}, '${d.maggi_id}')">Approve</button>
                    <button class="btn-danger btn" style="padding:4px 8px; font-size:12px; width:auto;" onclick="rejectDeposit('${d.id}')">Reject</button>
                </div>
            </div>`).join('');
    }

    if (reviewWdList) {
        reviewWdList.innerHTML = pendingWd.length === 0 ? '<p style="color:#aaa;">No pending withdrawals.</p>' :
            pendingWd.map(w => `<div style="background:#252525; padding:10px; margin-bottom:8px; border-radius:8px; color:#fff;">
                <strong>User:</strong> ${w.maggi_id} | <strong>Amount:</strong> ₦${w.amount.toLocaleString()}<br>
                <strong>Bank:</strong> ${w.bank_details}<br>
                <div style="display:flex; gap:6px; margin-top:5px;">
                    <button class="btn-success btn" style="padding:4px 8px; font-size:12px; width:auto;" onclick="approveWithdrawal('${w.id}', '${w.user_id}', ${w.amount})">Approve</button>
                    <button class="btn-danger btn" style="padding:4px 8px; font-size:12px; width:auto;" onclick="rejectWithdrawal('${w.id}')">Reject</button>
                </div>
            </div>`).join('');
    }

    const usersContainer = document.getElementById('users-table-container');
    if (usersContainer && users) {
        usersContainer.innerHTML = `<table class="admin-table"><tr><th>Maggi ID</th><th>Balance</th><th>Investment</th></tr>` +
            users.map(u => `<tr><td>${u.maggi_id || 'N/A'}</td><td>₦${(u.wallet_balance||0).toLocaleString()}</td><td>₦${(u.total_investment||0).toLocaleString()}</td></tr>`).join('') + `</table>`;
    }
}

async function approveDeposit(depositId, userId, amount, maggiId) {
    const client = bootstrapSupabaseClient();
    const { data: target } = await client.from('profiles').select('*').eq('id', userId).single();
    if (!target) return alert("User profile not found.");

    await client.from('profiles').update({ wallet_balance: (target.wallet_balance || 0) + amount }).eq('id', userId);
    await client.from('deposits').update({ status: 'approved' }).eq('id', depositId);

    alert("Deposit Approved & Credited!");
    loadAdminDashboardData();
}

async function rejectDeposit(depositId) {
    const client = bootstrapSupabaseClient();
    await client.from('deposits').update({ status: 'rejected' }).eq('id', depositId);
    alert("Deposit marked as Rejected/Failed!");
    loadAdminDashboardData();
}

async function approveWithdrawal(withdrawalId, userId, amount) {
    const client = bootstrapSupabaseClient();
    const { data: target } = await client.from('profiles').select('wallet_balance').eq('id', userId).single();
    if (!target) return alert("User profile not found.");

    if (target.wallet_balance < amount) return alert("User has insufficient balance.");

    await client.from('profiles').update({ wallet_balance: (target.wallet_balance || 0) - amount }).eq('id', userId);
    await client.from('withdrawals').update({ status: 'approved' }).eq('id', withdrawalId);
    alert("Withdrawal Approved!");
    loadAdminDashboardData();
}

async function rejectWithdrawal(withdrawalId) {
    const client = bootstrapSupabaseClient();
    await client.from('withdrawals').update({ status: 'rejected' }).eq('id', withdrawalId);
    alert("Withdrawal marked as Rejected/Failed!");
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
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam) {
        const refInput = document.getElementById('auth-ref-code');
        if (refInput) {
            refInput.value = refParam;
            refInput.readOnly = true;
        }
    }

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
