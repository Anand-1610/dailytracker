import { supabase } from "./supabase.js";

// --- DOM ELEMENTS ---
const form = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const captchaQ = document.getElementById("captchaQuestion");
const captchaIn = document.getElementById("captchaInput");
const msgBox = document.getElementById("messageBox");
const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");

// --- STATE ---
let isLoginMode = true;
let captchaSum = 0;

// 1. Initialize Captcha
function generateCaptcha() {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  captchaSum = num1 + num2;
  
  if (captchaQ) {
    captchaQ.innerText = `${num1} + ${num2} = ?`;
  }
  if (captchaIn) {
    captchaIn.value = "";
  }
}

// 2. Tab Switching Logic
window.switchTab = (mode) => {
  isLoginMode = mode === 'login';
  const btn = document.querySelector(".primary");

  if(isLoginMode) {
    tabLogin.classList.add("active");
    tabSignup.classList.remove("active");
    if(btn) btn.innerText = "Log In";
  } else {
    tabSignup.classList.add("active");
    tabLogin.classList.remove("active");
    if(btn) btn.innerText = "Sign Up";
  }

  // Hide any previous messages and reset captcha
  msgBox.style.display = "none";
  generateCaptcha();
};

// 3. Form Submit Handler
if (form) {
  form.onsubmit = async (e) => {
    e.preventDefault();
    msgBox.style.display = "none";

    // A. Validate Captcha
    if (parseInt(captchaIn.value) !== captchaSum) {
      showMessage("Incorrect math answer. Please try again.", true);
      generateCaptcha();
      return;
    }

    // B. Get Values
    const email = emailInput.value;
    const password = passInput.value;
    const btn = document.querySelector(".primary");
    
    // Disable button to prevent double-clicks
    if(btn) {
      btn.disabled = true;
      btn.innerText = "Processing...";
    }

    try {
      if (isLoginMode) {
        // --- LOG IN FLOW ---
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });

        if (error) throw error;
        
        // Redirect on success
        window.location.href = "index.html"; 

      } else {
        // --- SIGN UP FLOW ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Auto-redirect back to dashboard after email click
            emailRedirectTo: window.location.origin + "/index.html" 
          }
        });

        if (error) throw error;

        // Success Message
        showMessage("Success! Please check your email to confirm your account.", false);
        if(btn) btn.innerText = "Check Email";
      }
    } catch (err) {
      console.error("Auth Error:", err);
      showMessage(err.message || "Authentication failed", true);
      
      // Reset button
      if(btn) {
        btn.disabled = false;
        btn.innerText = isLoginMode ? "Log In" : "Sign Up";
      }
      generateCaptcha();
    }
  };
}

// Helper: Show Success/Error Messages
function showMessage(text, isError) {
  msgBox.innerText = text;
  msgBox.className = "msg-box " + (isError ? "msg-error" : "msg-success");
  msgBox.style.display = "block";
}

// --- INITIALIZATION ---

// 1. Generate first captcha
generateCaptcha();

// 2. Check if user is already logged in (Auto-Redirect)
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    // If user is already logged in, send them to dashboard immediately
    window.location.href = "index.html";
  }
})();