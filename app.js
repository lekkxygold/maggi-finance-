// Initialization credentials configuration setup 
const SUPABASE_URL = "https://supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0aHN6amV5eXhvc2VtcXl6bXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDM0ODksImV4cCI6MjEwODc3OTQ4OX0.MjF0uusJGt9LK48Mv7xqc1sBgyXrvZk-_g8n19fGsrA";

const supabase = bootstrapSupabaseClient();
let currentUserProfile = null;

function bootstrapSupabaseClient() {
    if(typeof supabase !== 'undefined') return supabase;
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
// Generate unique custom Platform IDs
function generateMaggiId() {
    return "MG-" + Math.floor(100000 + Math.random() * 900000);
}

// Global UI Navigation Controller
function switchView(viewId) {
    ['view-auth', 'view-dashboard', 'view-investment', 'view-wallet', 'view-team', 'view-gift', 'view-admin'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });
    document.getElementById(viewId).classList.remove('hidden');
}

// Registration and Welcome Balance Injection flow
async function handleAuth(type) {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    if(!email || !password) return alert("Please fill standard input parameters.");

    if (type === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if(error) return alert(error.message);
        
        const maggiId = generateMaggiId();
        const { error: profileError } = await supabase.from('profiles').insert([
            { id: data.user.id, maggi_id: maggiId, wallet_balance: 2000, total_investment: 0, is_admin: false }
        ]);
        if(profileError) console.error(profileError);
        alert("Registration complete! Enjoy your ₦2,000 sign up reward.");
    }
    
    // Core session login check
    const { data: logData, error: logError } = await supabase.auth.signInWithPassword({ email, password });
    if(logError) return alert(logError.message);
    
    loadUserProfile(logData.user.id);
}

// Load Account and UI Context States
async function loadUserProfile(userId) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if(error) return;
    
    currentUserProfile = data;
    document.getElementById('user-id-display').innerText = `Maggi ID: ${data.maggi_id}`;
    document.getElementById('dash-balance').innerText = `₦${data.wallet_balance.toLocaleString()}`;
    document.getElementById('dash-investment').innerText = `Active Investments: ₦${data.total_investment.toLocaleString()}`;
    document.getElementById('referral-link-box').innerText = `${window.location.origin}/?ref=${data.maggi_id}`;
    
    if(data.is_admin) {
        document.getElementById('admin-nav-tab').classList.remove('hidden');
    }
    
    renderInvestmentPlans();
    switchView('view-dashboard');
}

// Populate the 10 custom functional Tiers
function renderInvestmentPlans() {
    const container = document.getElementById('tiers-container');
    container.innerHTML = "";
    
    for(let i = 1; i <= 10; i++) {
        const cost = 6000 * i;
        const dailyReturn = cost * 0.10;
        
        container.innerHTML += `
            <div class="tier-box">
                <h4>Maggi Pack Tier ${i}</h4>
                <p>Cost: <strong>₦${cost.toLocaleString()}</strong></p>
                <p style="color:green;">Yield: ₦${dailyReturn.toLocaleString()}/day</p>
                <button class="btn" style="padding:5px; font-size:12px;" onclick="purchaseTier(${cost})">Activate Pack</button>
            </div>
        `;
    }
}

// Handle investment deduction validation logic
async function purchaseTier(cost) {
    if(currentUserProfile.wallet_balance < cost) {
        return alert("Insufficient funds to secure this tier product.");
    }
    
    const newBalance = currentUserProfile.wallet_balance - cost;
    const newTotalInvestment = currentUserProfile.total_investment + cost;
    
    const { error } = await supabase.from('profiles')
        .update({ wallet_balance: newBalance, total_investment: newTotalInvestment })
        .eq('id', currentUserProfile.id);
        
    if(!error) {
        alert("Maggi Yield Tier activated successfully!");
        loadUserProfile(currentUserProfile.id);
    }
}

// Payout Verification Handler
async function submitWithdrawalRequest() {
    const amt = parseFloat(document.getElementById('withdraw-amount').value);
    if(amt < 2000) return alert("Minimum platform withdrawal limit is ₦2,000.");
    if(amt > currentUserProfile.wallet_balance) return alert("Requested payout exceeds wallet account balance.");
    
    const processingFee = amt * 0.10;
    const netPayout = amt - processingFee;
    const finalBalance = currentUserProfile.wallet_balance - amt;
    
    const { error } = await supabase.from('profiles').update({ wallet_balance: finalBalance }).eq('id', currentUserProfile.id);
    if(!error) {
        alert(`Payout requested processing! Gross processing amount: ₦${amt}. Net amount processed to your account after 10% standard processing processing fee: ₦${netPayout}`);
        loadUserProfile(currentUserProfile.id);
    }
}

// Gift Code Voucher System Executions
async function redeemGiftCode() {
    const codeStr = document.getElementById('gift-code-input').value.trim();
    const { data: codeData, error } = await supabase.from('gift_codes').select('*').eq('code', codeStr).single();
    
    if(error || !codeData) return alert("Invalid entry voucher code string input.");
    if(new Date() > new Date(codeData.valid_until)) return alert("This gift code package has expired.");
    if(codeData.used_quantity >= codeData.max_quantity) return alert("Maximum code redemption limit reached.");
    
    const updatedBalance = currentUserProfile.wallet_balance + codeData.amount;
    await supabase.from('profiles').update({ wallet_balance: updatedBalance }).eq('id', currentUserProfile.id);
    await supabase.from('gift_codes').update({ used_quantity: codeData.used_quantity + 1 }).eq('code', codeStr);
    
    alert(`Success! voucher code redeemed. ₦${codeData.amount} added to your active dashboard wallet.`);
    loadUserProfile(currentUserProfile.id);
}

// Admin Console Functions
async function createAdminGiftCode() {
    const code = document.getElementById('admin-code').value.toUpperCase();
    const amount = parseFloat(document.getElementById('admin-amount').value);
    const qty = parseInt(document.getElementById('admin-qty').value);
    const expiry = document.getElementById('admin-expiry').value;
    
    const { error } = await supabase.from('gift_codes').insert([{ code, amount, max_quantity: qty, valid_until: expiry }]);
    if(!error) alert(`Promo Voucher Code ${code} issued safely!`);
}
