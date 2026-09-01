const loginSection = document.getElementById("loginSection");
const adminSection = document.getElementById("adminSection");

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

let supabase = null;


// ========================================
// SHOW ERROR
// ========================================

function showError(message) {
  console.error(message);

  loginMessage.textContent =
    "DEBUG: " + message;
}


// ========================================
// INITIALIZE
// ========================================

async function initialize() {

  try {

    showError("Step 1: Loading Supabase configuration...");

    const response =
      await fetch("/api/config", {
        cache: "no-store"
      });

    if (!response.ok) {
      throw new Error(
        "Config API returned HTTP " +
        response.status
      );
    }

    const config =
      await response.json();

    if (!config.url) {
      throw new Error(
        "Supabase URL is missing."
      );
    }

    if (!config.key) {
      throw new Error(
        "Supabase publishable key is missing."
      );
    }

    showError(
      "Step 2: Configuration loaded. Loading Supabase..."
    );


    const supabaseModule =
      await import(
        "https://esm.sh/@supabase/supabase-js@2"
      );

    if (!supabaseModule.createClient) {
      throw new Error(
        "Supabase library loaded, but createClient is missing."
      );
    }

    showError(
      "Step 3: Supabase library loaded. Creating client..."
    );


    supabase =
      supabaseModule.createClient(
        config.url,
        config.key
      );

    if (!supabase) {
      throw new Error(
        "Supabase client could not be created."
      );
    }

    showError(
      "Step 4: Supabase client created. Checking session..."
    );


    const {
      data,
      error
    } =
      await supabase.auth.getSession();

    if (error) {
      throw error;
    }


    if (data?.session) {

      showError(
        "Step 5: Existing session found. Login works."
      );

      loginSection.classList.add("hidden");
      adminSection.classList.remove("hidden");

      return;
    }


    loginMessage.textContent =
      "Supabase connection is working. Please sign in.";

  } catch (error) {

    console.error(
      "REAL ADMIN ERROR:",
      error
    );

    showError(
      error?.message ||
      String(error)
    );
  }
}


// ========================================
// LOGIN
// ========================================

loginForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    if (!supabase) {

      loginMessage.textContent =
        "Supabase is not connected yet.";

      return;
    }

    const email =
      document
        .getElementById("adminEmail")
        .value
        .trim();

    const password =
      document
        .getElementById("adminPassword")
        .value;

    loginMessage.textContent =
      "Signing in...";

    try {

      const {
        data,
        error
      } =
        await supabase.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        throw error;
      }

      if (!data?.session) {

        throw new Error(
          "Supabase accepted the login but returned no session."
        );
      }

      loginMessage.textContent =
        "Login successful!";

      loginSection.classList.add("hidden");
      adminSection.classList.remove("hidden");

    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );

      loginMessage.textContent =
        "LOGIN ERROR: " +
        (error?.message || String(error));
    }
  }
);


// ========================================
// START
// ========================================

initialize();
