const STORAGE_KEY = "kaapisoda_state_v1";
const CLOUD_TABLE = "kaapisoda_profiles";
const DUO_TABLE = "kaapisoda_duos";
const DUO_MEMBERS_TABLE = "kaapisoda_duo_members";
const DUO_SUMMARIES_TABLE = "kaapisoda_duo_summaries";
const CLOUD_SAVE_DELAY = 900;

const avatars = [
  { id: "scout", label: "Scout" },
  { id: "mage", label: "Mage" },
  { id: "runner", label: "Runner" },
  { id: "maker", label: "Maker" },
  { id: "scholar", label: "Scholar" },
  { id: "guardian", label: "Guardian" }
];

const baseCategories = [
  "Health",
  "Mental Wellbeing",
  "Education",
  "Career",
  "Research",
  "Money",
  "Business",
  "Creativity",
  "Knowledge",
  "Hobbies",
  "Fitness / Movement",
  "Relationships",
  "Personal Growth",
  "Other"
];

const efforts = {
  small: { label: "Small", icon: "S", xp: 5 },
  normal: { label: "Normal", icon: "N", xp: 10 },
  deep: { label: "Deep", icon: "D", xp: 20 },
  milestone: { label: "Major milestone", icon: "M", xp: 40 }
};

const levels = [
  { level: 1, xp: 0, title: "Awakening" },
  { level: 2, xp: 100, title: "Initiate" },
  { level: 3, xp: 250, title: "Builder" },
  { level: 4, xp: 450, title: "Explorer" },
  { level: 5, xp: 700, title: "Creator" },
  { level: 6, xp: 1000, title: "Researcher" },
  { level: 7, xp: 1400, title: "Warrior" },
  { level: 8, xp: 1850, title: "Alchemist" },
  { level: 9, xp: 2350, title: "Mastermind" },
  { level: 10, xp: 3000, title: "Winterarc" }
];

const baseBuildings = [
  { id: "land", name: "Quiet Land", xp: 0 },
  { id: "campfire", name: "Campfire", xp: 50 },
  { id: "settlement", name: "Settlement", xp: 150 },
  { id: "house", name: "House", xp: 300 },
  { id: "garden", name: "Garden", xp: 500 },
  { id: "library", name: "Library", xp: 800 },
  { id: "lab", name: "Research Lab", xp: 1200 },
  { id: "market", name: "Marketplace", xp: 1700 },
  { id: "academy", name: "Academy", xp: 2300 },
  { id: "castle", name: "Castle", xp: 3000 }
];

const categoryBuildings = {
  Health: { id: "training", name: "Training Grounds", xp: 400 },
  "Mental Wellbeing": { id: "peace", name: "Peace Garden", xp: 400 },
  Education: { id: "scriptorium", name: "Scriptorium", xp: 600 },
  Career: { id: "guild", name: "Guild Hall", xp: 600 },
  Research: { id: "observatory", name: "Observatory", xp: 1000 },
  Money: { id: "treasury", name: "Treasury", xp: 1000 },
  Business: { id: "workshop", name: "Workshop", xp: 800 },
  Creativity: { id: "studio", name: "Art Studio", xp: 600 },
  Knowledge: { id: "archive", name: "Archive", xp: 650 },
  Hobbies: { id: "arts-house", name: "Arts House", xp: 650 },
  "Fitness / Movement": { id: "arena", name: "Movement Arena", xp: 400 },
  Relationships: { id: "community", name: "Community Hall", xp: 800 },
  "Personal Growth": { id: "growth-tower", name: "Growth Tower", xp: 800 },
  Other: { id: "custom-workshop", name: "Open Workshop", xp: 700 }
};

const mapSites = [
  { x: 14, y: 60 },
  { x: 26, y: 45 },
  { x: 39, y: 58 },
  { x: 53, y: 41 },
  { x: 66, y: 56 },
  { x: 76, y: 35 },
  { x: 86, y: 50 },
  { x: 74, y: 68 },
  { x: 49, y: 72 },
  { x: 28, y: 27 },
  { x: 88, y: 25 },
  { x: 12, y: 31 },
  { x: 61, y: 22 },
  { x: 39, y: 20 }
];

const encouragements = [
  "KEEP BUILDING.",
  "ONE STEP COUNTS.",
  "YOUR KINGDOM NEEDS YOU.",
  "GET UP, WINTER SOLDIER.",
  "YOU'RE DOING BETTER THAN YOU THINK.",
  "RESET. DON'T QUIT.",
  "GO BUILD SOMETHING.",
  "FUTURE YOU IS WATCHING.",
  "SMALL PROGRESS IS STILL PROGRESS."
];

let state = loadState();
let setupDraft = createSetupDraft();
let setupPage = 0;
let selectedEffort = "normal";
let cloudClient = null;
let cloudUser = null;
let cloudReady = false;
let cloudHydrating = false;
let cloudSaveTimer = null;
let lastCloudSavedPayload = "";
let profileDraft = null;
let duoSpace = {
  loading: false,
  duo: null,
  summaries: []
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  renderPickers();
  bindEvents();
  await initCloud();
  if (state.users.length) {
    showScreen("game");
    renderApp();
  } else {
    showScreen("landing");
  }
}

function bindEvents() {
  document.body.addEventListener("click", handleClick);
  document.body.addEventListener("change", handleChange);
  $("#auth-form").addEventListener("submit", (event) => event.preventDefault());
  $("#setup-form").addEventListener("submit", finishSetup);
  $("#log-form").addEventListener("submit", submitLog);
  $("#profile-form").addEventListener("submit", saveProfileSettings);
  $("#profile-select").addEventListener("change", (event) => {
    state.currentUserId = event.target.value;
    saveState();
    renderApp();
  });
}

async function initCloud() {
  const config = window.KAAPISODA_SUPABASE || {};
  const hasConfig = Boolean(config.url && config.anonKey);
  const hasClient = Boolean(window.supabase?.createClient);

  if (!hasConfig) {
    setCloudStatus("Local save active. Add Supabase keys to enable login sync.", "local");
    renderCloudUi();
    return;
  }

  if (!hasClient) {
    const loaded = await loadSupabaseScript();
    if (!loaded) {
      setCloudStatus("Supabase client did not load. Local save active.", "error");
      renderCloudUi();
      return;
    }
  }

  if (!window.supabase?.createClient) {
    setCloudStatus("Supabase client did not load. Local save active.", "error");
    renderCloudUi();
    return;
  }

  cloudReady = true;
  cloudClient = window.supabase.createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });

  const { data, error } = await cloudClient.auth.getSession();
  if (error) {
    setCloudStatus(error.message, "error");
    return;
  }

  cloudUser = data.session?.user || null;
  cloudClient.auth.onAuthStateChange(async (_event, session) => {
    cloudUser = session?.user || null;
    await hydrateFromCloud();
    renderCloudUi();
  });

  await hydrateFromCloud();
  await loadDuoSpace();
  renderCloudUi();
}

function loadSupabaseScript() {
  return new Promise((resolve) => {
    const existing = document.querySelector("[data-supabase-js]");
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.async = true;
    script.dataset.supabaseJs = "true";
    script.addEventListener("load", () => resolve(true), { once: true });
    script.addEventListener("error", () => resolve(false), { once: true });
    document.head.appendChild(script);
  });
}

async function signInToCloud(isSignUp) {
  if (!cloudReady) {
    showToast("Add Supabase keys in config.js to enable login.");
    return;
  }

  const email = $("#auth-email").value.trim();
  const password = $("#auth-password").value;
  if (!email || password.length < 8) {
    showToast("Use an email and a password with at least 8 characters.");
    return;
  }

  setCloudStatus(isSignUp ? "Creating login..." : "Signing in...", "syncing");
  const authCall = isSignUp ? cloudClient.auth.signUp : cloudClient.auth.signInWithPassword;
  const { data, error } = await authCall.call(cloudClient.auth, { email, password });
  if (error) {
    setCloudStatus(error.message, "error");
    showToast(error.message);
    return;
  }

  cloudUser = data.session?.user || null;
  if (!cloudUser && data.user) {
    setCloudStatus("Login created. Check email confirmation, then sign in.", "syncing");
    showToast("Login created. Sign in after confirmation.");
    renderCloudUi();
    return;
  }
  await hydrateFromCloud();
  renderCloudUi();
  showToast(isSignUp ? "Login created. Cloud save ready." : "Signed in. Cloud save loaded.");
}

async function signOutOfCloud() {
  if (!cloudReady) return;
  await cloudClient.auth.signOut();
  cloudUser = null;
  duoSpace = { loading: false, duo: null, summaries: [] };
  setCloudStatus("Signed out. Local save active.", "local");
  renderCloudUi();
  renderDuo();
}

async function hydrateFromCloud() {
  if (!cloudReady || !cloudUser) {
    renderCloudUi();
    return;
  }

  cloudHydrating = true;
  setCloudStatus("Checking cloud save...", "syncing");
  const { data, error } = await cloudClient
    .from(CLOUD_TABLE)
    .select("payload, updated_at")
    .eq("user_id", cloudUser.id)
    .maybeSingle();

  if (error) {
    cloudHydrating = false;
    setCloudStatus(error.message, "error");
    return;
  }

  if (data?.payload?.users?.length) {
    state = normalizeState(data.payload);
    saveState({ skipCloud: true });
    setCloudStatus(`Cloud save loaded: ${formatCloudTime(data.updated_at)}`, "online");
  } else {
    state = { users: [], currentUserId: null };
    saveState({ skipCloud: true });
    setCloudStatus("Signed in. Create your Kaapisoda profile.", "online");
    cloudHydrating = false;
    await loadDuoSpace();
    startSetup();
    return;
  }

  lastCloudSavedPayload = JSON.stringify(state);
  cloudHydrating = false;
  await loadDuoSpace();
  if (state.users.length) {
    showScreen("game");
    renderApp();
  }
}

function scheduleCloudSave() {
  if (!cloudReady || !cloudUser || cloudHydrating) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(saveCloudStateNow, CLOUD_SAVE_DELAY);
}

async function saveCloudStateNow() {
  if (!cloudReady || !cloudUser) return;
  const payload = JSON.stringify(state);
  if (payload === lastCloudSavedPayload) {
    renderCloudUi();
    return;
  }

  setCloudStatus("Syncing cloud save...", "syncing");
  const { error } = await cloudClient
    .from(CLOUD_TABLE)
    .upsert({
      user_id: cloudUser.id,
      payload: state,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

  if (error) {
    setCloudStatus(error.message, "error");
    return;
  }

  await saveDuoSummary();
  lastCloudSavedPayload = payload;
  setCloudStatus("Cloud save synced.", "online");
  await loadDuoSpace();
}

async function syncCloudNow() {
  if (!cloudReady || !cloudUser) {
    showToast("Sign in before syncing.");
    return;
  }
  await saveCloudStateNow();
  showToast("Cloud sync complete.");
}

async function createDuoSpace() {
  if (!requireCloudForDuo()) return;
  await saveDuoSummary();
  setDuoStatus("Creating Duo code...", "syncing");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const code = createDuoCode();
    const { data, error } = await cloudClient
      .from(DUO_TABLE)
      .insert({ code, created_by: cloudUser.id })
      .select("id, code, created_at")
      .single();

    if (error) {
      if (error.code === "23505") continue;
      const message = formatDuoError(error);
      setDuoStatus(message, "error");
      showToast(message);
      return;
    }

    const joined = await joinDuoById(data.id);
    if (!joined) return;
    duoSpace.duo = data;
    await loadDuoSpace();
    showToast(`Duo code: ${code}`);
    return;
  }

  setDuoStatus("Could not create a unique Duo code. Try again.", "error");
}

async function joinDuoSpace() {
  if (!requireCloudForDuo()) return;
  const code = $("#duo-code-input").value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) {
    showToast("Enter your friend's Duo code.");
    return;
  }

  await saveDuoSummary();
  setDuoStatus("Joining Duo space...", "syncing");
  const { data, error } = await cloudClient
    .from(DUO_TABLE)
    .select("id, code, created_at")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    const message = formatDuoError(error);
    setDuoStatus(message, "error");
    showToast(message);
    return;
  }

  if (!data) {
    setDuoStatus("No Duo space found for that code.", "error");
    showToast("Duo code not found.");
    return;
  }

  const joined = await joinDuoById(data.id);
  if (!joined) return;
  $("#duo-code-input").value = "";
  duoSpace.duo = data;
  await loadDuoSpace();
  showToast("Joined Duo space.");
}

async function joinDuoById(duoId) {
  const { error } = await cloudClient
    .from(DUO_MEMBERS_TABLE)
    .upsert({ duo_id: duoId, user_id: cloudUser.id }, { onConflict: "duo_id,user_id" });

  if (error) {
    const message = formatDuoError(error);
    setDuoStatus(message, "error");
    showToast(message);
    return false;
  }

  return true;
}

async function refreshDuoSpace() {
  if (!cloudReady || !cloudUser) {
    showToast("Sign in to use Duo.");
    renderDuo();
    return;
  }

  await saveDuoSummary();
  await loadDuoSpace();
  showToast(duoSpace.duo ? "Duo refreshed." : "Create or join a Duo first.");
}

async function loadDuoSpace() {
  if (!cloudReady || !cloudUser) {
    duoSpace = { loading: false, duo: null, summaries: [] };
    return;
  }

  duoSpace.loading = true;
  renderDuo();

  const { data: memberships, error: membershipError } = await cloudClient
    .from(DUO_MEMBERS_TABLE)
    .select("duo_id")
    .eq("user_id", cloudUser.id)
    .limit(1);

  if (membershipError) {
    duoSpace = { loading: false, duo: null, summaries: [] };
    setDuoStatus(formatDuoError(membershipError), "error");
    return;
  }

  const membership = memberships?.[0];
  if (!membership) {
    duoSpace = { loading: false, duo: null, summaries: [] };
    renderDuo();
    return;
  }

  const { data: duo, error: duoError } = await cloudClient
    .from(DUO_TABLE)
    .select("id, code, created_at")
    .eq("id", membership.duo_id)
    .single();

  if (duoError) {
    duoSpace = { loading: false, duo: null, summaries: [] };
    setDuoStatus(formatDuoError(duoError), "error");
    return;
  }

  const { data: allMembers, error: membersError } = await cloudClient
    .from(DUO_MEMBERS_TABLE)
    .select("user_id")
    .eq("duo_id", membership.duo_id);

  if (membersError) {
    duoSpace = { loading: false, duo, summaries: [] };
    setDuoStatus(formatDuoError(membersError), "error");
    return;
  }

  const memberIds = [...new Set((allMembers || []).map((member) => member.user_id))];
  const { data: summaries, error: summaryError } = await cloudClient
    .from(DUO_SUMMARIES_TABLE)
    .select("user_id, display_name, pronouns, avatar, kingdom_name, xp, level, streak, best_streak, building_count, last_action_at, updated_at")
    .in("user_id", memberIds);

  if (summaryError) {
    duoSpace = { loading: false, duo, summaries: [] };
    setDuoStatus(formatDuoError(summaryError), "error");
    return;
  }

  duoSpace = {
    loading: false,
    duo,
    summaries: summaries || []
  };
  renderDuo();
}

async function saveDuoSummary() {
  if (!cloudReady || !cloudUser) return;
  const user = currentUser();
  if (!user) return;
  ensureUserShape(user);
  const latestTask = [...user.tasks].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

  await cloudClient
    .from(DUO_SUMMARIES_TABLE)
    .upsert({
      user_id: cloudUser.id,
      display_name: user.name,
      pronouns: user.pronouns || null,
      avatar: normalizeAvatar(user.avatar),
      kingdom_name: user.kingdomName,
      xp: user.xp || 0,
      level: calculateLevel(user.xp || 0).level,
      streak: user.streak || 0,
      best_streak: user.bestStreak || 0,
      building_count: getUnlockedBuildings(user).length,
      last_action_at: latestTask?.timestamp || null,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
}

function requireCloudForDuo() {
  if (!cloudReady || !cloudUser) {
    showToast("Sign in before using Duo.");
    showCloudLogin();
    return false;
  }
  if (!currentUser()) {
    showToast("Create your profile first.");
    startSetup();
    return false;
  }
  return true;
}

function createDuoCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function setDuoStatus(message, mode = "local") {
  const status = $("#duo-space-status");
  if (!status) return;
  status.textContent = message;
  status.dataset.mode = mode;
}

function formatDuoError(error) {
  if (error?.code === "42P01" || /does not exist|schema cache/i.test(error?.message || "")) {
    return "Duo tables are not set up in Supabase yet. Run the Duo SQL in SUPABASE_SETUP.md.";
  }
  return error?.message || "Duo sync had a problem.";
}

function renderCloudUi() {
  const signedIn = Boolean(cloudUser);
  const enabled = Boolean(cloudReady);
  $(".auth-panel")?.classList.toggle("is-cloud-disabled", !enabled);
  $("#auth-form")?.classList.toggle("hidden", !enabled);
  $("#cloud-disabled-note")?.classList.toggle("hidden", enabled);
  $("#auth-login-fields")?.classList.toggle("hidden", !enabled || signedIn);
  $("#cloud-session-panel")?.classList.toggle("hidden", !enabled || !signedIn);
  $$('[data-action="cloud-sign-in"], [data-action="cloud-sign-up"]').forEach((button) => {
    button.classList.toggle("hidden", signedIn || !enabled);
  });
  $$('[data-action="cloud-sync"], [data-action="cloud-sign-out"]').forEach((button) => {
    button.classList.toggle("hidden", !signedIn || !enabled);
  });
  $$('[data-action="show-cloud-login"]').forEach((button) => {
    button.classList.toggle("hidden", signedIn || !enabled);
  });
  if (signedIn) setCloudStatus(`Signed in as ${cloudUser.email}`, "online");
}

function showCloudLogin() {
  showScreen("landing");
  renderCloudUi();
  $("#auth-email").focus();
}

function setCloudStatus(message, mode = "local", updateGame = true) {
  const text = message || "Local save active.";
  const authStatus = $("#auth-status");
  const gameStatus = $("#game-auth-status");
  if (authStatus) {
    authStatus.textContent = text;
    authStatus.dataset.mode = mode;
  }
  if (gameStatus && updateGame) {
    gameStatus.textContent = text;
    gameStatus.dataset.mode = mode;
  }
}

function handleClick(event) {
  const button = event.target.closest("button");
  if (!button) return;
  const action = button.dataset.action;
  const tab = button.dataset.tab;
  const quickGoal = button.dataset.quickGoal;
  const deleteGoalId = button.dataset.deleteGoal;
  const editGoalId = button.dataset.editGoal;
  const updateGoalId = button.dataset.updateGoal;
  const deleteTaskId = button.dataset.deleteTask;
  const editTaskId = button.dataset.editTask;

  if (tab) setTab(tab);
  if (quickGoal) openLog(quickGoal);
  if (deleteGoalId) deleteGoal(deleteGoalId);
  if (editGoalId) editGoal(editGoalId);
  if (updateGoalId) updateGoalValue(updateGoalId);
  if (deleteTaskId) deleteTask(deleteTaskId);
  if (editTaskId) editTask(editTaskId);

  const actions = {
    "start-setup": startSetup,
    "resume-game": resumeGame,
    "setup-back": previousSetupPage,
    "setup-next": nextSetupPage,
    "add-category": addCustomCategory,
    "add-goal": addDraftGoal,
    "open-log": () => openLog(),
    "close-log": closeLog,
    "new-profile": startSetup,
    "refresh-quests": refreshQuests,
    "save-big3": saveBig3,
    "send-encouragement": sendEncouragement,
    "add-piggy": addPiggy,
    "reset-save": resetSave,
    "close-result": closeResult,
    "open-profile": openProfile,
    "close-profile": closeProfile,
    "add-profile-category": addProfileCategory,
    "add-profile-goal": addProfileGoal,
    "cloud-sign-in": () => signInToCloud(false),
    "cloud-sign-up": () => signInToCloud(true),
    "cloud-sign-out": signOutOfCloud,
    "cloud-sync": syncCloudNow,
    "show-cloud-login": showCloudLogin,
    "create-duo": createDuoSpace,
    "join-duo": joinDuoSpace,
    "refresh-duo": refreshDuoSpace
  };

  if (actions[action]) actions[action]();

  const avatar = button.dataset.avatar;
  if (avatar) {
    setupDraft.avatar = avatar;
    renderAvatarPicker();
  }

  const profileAvatar = button.dataset.profileAvatar;
  if (profileAvatar && profileDraft) {
    profileDraft.avatar = profileAvatar;
    renderProfileAvatarPicker();
  }

  const category = button.dataset.category;
  if (category) {
    toggleCategory(category);
  }

  const profileCategory = button.dataset.profileCategory;
  if (profileCategory && profileDraft) {
    toggleProfileCategory(profileCategory);
  }

  const effort = button.dataset.effort;
  if (effort) {
    selectedEffort = effort;
    renderEffortPicker();
  }
}

function handleChange(event) {
  const target = event.target;
  if (target.matches("[data-milestone-id]")) {
    toggleMilestone(target.dataset.goalId, target.dataset.milestoneId, target.checked);
  }
  if (target.matches("[data-quest-id]")) {
    toggleQuest(target.dataset.questId, target.checked);
  }
  if (target.matches("[data-weekly-id]")) {
    toggleWeekly(target.dataset.weeklyId, target.checked);
  }
}

function createSetupDraft() {
  return {
    avatar: avatars[0].id,
    categories: [],
    goals: []
  };
}

function startSetup() {
  setupDraft = createSetupDraft();
  setupPage = 0;
  $("#setup-form").reset();
  $("#goal-deadline").value = "2026-12-31";
  renderPickers();
  renderSetupPage();
  showScreen("setup");
}

function resumeGame() {
  if (!state.users.length) {
    showToast("No saved profiles yet. Start your first Kaapisoda.");
    startSetup();
    return;
  }
  showScreen("game");
  renderApp();
}

function nextSetupPage() {
  if (setupPage === 0 && !validateIdentity()) return;
  if (setupPage === 1 && setupDraft.categories.length === 0) {
    showToast("Choose at least one category, or add a custom one.");
    return;
  }
  setupPage = Math.min(2, setupPage + 1);
  renderSetupPage();
}

function previousSetupPage() {
  setupPage = Math.max(0, setupPage - 1);
  renderSetupPage();
}

function validateIdentity() {
  const name = $("#player-name").value.trim();
  const kingdomName = $("#kingdom-name").value.trim();
  if (!name || !kingdomName) {
    showToast("Name and kingdom name are needed to begin.");
    return false;
  }
  return true;
}

function renderSetupPage() {
  const pages = ["identity", "categories", "goals"];
  $$(".setup-page").forEach((page) => {
    page.classList.toggle("is-active", page.dataset.setupPage === pages[setupPage]);
  });
  $("#setup-step").textContent = `Step ${setupPage + 1} of 3`;
  $("#setup-title").textContent = [
    "What should we call you?",
    "What parts of your life are you building?",
    "Create your personal goals."
  ][setupPage];
  $('[data-action="setup-back"]').classList.toggle("hidden", setupPage === 0);
  $('[data-action="setup-next"]').classList.toggle("hidden", setupPage === 2);
  $('[data-action="finish-setup"]').classList.toggle("hidden", setupPage !== 2);
  renderGoalCategoryOptions();
  renderDraftGoals();
}

function renderPickers() {
  renderAvatarPicker();
  renderCategoryPicker();
  renderEffortPicker();
}

function renderAvatarPicker() {
  $("#avatar-picker").innerHTML = avatars.map((avatar) => `
    <button type="button" class="choice-button avatar-choice ${setupDraft.avatar === avatar.id ? "is-selected" : ""}" data-avatar="${avatar.id}" role="radio" aria-checked="${setupDraft.avatar === avatar.id}">
      ${renderPixelAvatar(avatar.id)}
      <span>${escapeHtml(avatar.label)}</span>
    </button>
  `).join("");
}

function renderCategoryPicker() {
  const categories = getAllCategories();
  $("#category-picker").innerHTML = categories.map((category) => `
    <button type="button" class="choice-button ${setupDraft.categories.includes(category) ? "is-selected" : ""}" data-category="${category}">
      ${category}
    </button>
  `).join("");
}

function renderEffortPicker() {
  $("#effort-picker").innerHTML = Object.entries(efforts).map(([key, effort]) => `
    <button type="button" class="choice-button effort-choice ${selectedEffort === key ? "is-selected" : ""}" data-effort="${key}">
      <span class="pixel-badge">${effort.icon}</span> ${effort.label}<br><span class="meta-line">+${effort.xp} XP</span>
    </button>
  `).join("");
}

function getAllCategories() {
  return [...new Set([...baseCategories, ...setupDraft.categories])];
}

function toggleCategory(category) {
  setupDraft.categories = setupDraft.categories.includes(category)
    ? setupDraft.categories.filter((item) => item !== category)
    : [...setupDraft.categories, category];
  renderCategoryPicker();
  renderGoalCategoryOptions();
}

function addCustomCategory() {
  const input = $("#custom-category");
  const category = input.value.trim();
  if (!category) return;
  if (!setupDraft.categories.includes(category)) setupDraft.categories.push(category);
  input.value = "";
  renderCategoryPicker();
  renderGoalCategoryOptions();
}

function renderGoalCategoryOptions() {
  const options = (setupDraft.categories.length ? setupDraft.categories : baseCategories)
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("");
  $("#goal-category").innerHTML = options;
}

function addDraftGoal() {
  const name = $("#goal-name").value.trim();
  if (!name) {
    showToast("Give the goal a name first.");
    return;
  }

  const startValue = Number($("#goal-start").value || 0);
  const targetValue = Number($("#goal-target").value || 0);

  if (targetValue && startValue > targetValue) {
    showToast("Starting value cannot be higher than target value.");
    return;
  }

  const goal = {
    id: createId(),
    name,
    category: $("#goal-category").value,
    type: $("#goal-type").value,
    startValue,
    targetValue,
    currentValue: startValue,
    deadline: $("#goal-deadline").value || "2026-12-31",
    why: $("#goal-why").value.trim(),
    milestones: $("#goal-milestones").value
      .split("\n")
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text) => ({ id: createId(), text, done: false })),
    createdAt: new Date().toISOString()
  };

  setupDraft.goals.push(goal);
  ["#goal-name", "#goal-start", "#goal-target", "#goal-why", "#goal-milestones"].forEach((selector) => {
    $(selector).value = "";
  });
  $("#goal-deadline").value = "2026-12-31";
  renderDraftGoals();
}

function renderDraftGoals() {
  const list = $("#setup-goals-list");
  if (!setupDraft.goals.length) {
    list.className = "compact-list empty-list";
    list.textContent = "No goals yet.";
    return;
  }

  list.className = "compact-list";
  list.innerHTML = setupDraft.goals.map((goal) => `
    <article class="goal-card">
      <p class="goal-title">${escapeHtml(goal.name)}</p>
      <p class="meta-line">${escapeHtml(goal.category)} · ${escapeHtml(goal.type)} · ${formatDate(goal.deadline)}</p>
    </article>
  `).join("");
}

function finishSetup(event) {
  event.preventDefault();
  if (!setupDraft.goals.length) {
    showToast("Add at least one goal so the kingdom knows what to grow.");
    return;
  }

  const user = {
    id: createId(),
    name: $("#player-name").value.trim(),
    pronouns: $("#player-pronouns").value.trim(),
    avatar: setupDraft.avatar,
    kingdomName: $("#kingdom-name").value.trim(),
    categories: [...setupDraft.categories],
    createdAt: new Date().toISOString(),
    lastActiveDate: null,
    xp: 0,
    level: 1,
    streak: 0,
    bestStreak: 0,
    resources: { growth: 0, knowledge: 0, gold: 0 },
    goals: setupDraft.goals,
    tasks: [],
    dailyQuests: createDailyQuests(setupDraft.goals),
    big3: ["", "", ""],
    weeklyGoals: createWeeklyGoals(setupDraft.goals),
    piggyBank: 0,
    rewardPoints: 0
  };

  state.users.push(user);
  state.currentUserId = user.id;
  saveState();
  showScreen("game");
  renderApp();
  showToast("Your world is waiting.");
}

function createDailyQuests(goals) {
  return goals.slice(0, 3).map((goal) => ({
    id: createId(),
    text: `Complete one ${goal.category.toLowerCase()} action`,
    goalId: goal.id,
    done: false,
    rewarded: false
  }));
}

function createWeeklyGoals(goals) {
  return goals.slice(0, 3).map((goal) => ({
    id: createId(),
    text: `Make meaningful progress on ${goal.name}`,
    goalId: goal.id,
    done: false,
    rewarded: false
  }));
}

function ensureUserShape(user) {
  if (!user) return;
  user.pronouns = user.pronouns || "";
  user.avatar = normalizeAvatar(user.avatar);
  user.kingdomName = user.kingdomName || "Kaapisoda";
  user.resources ||= { growth: 0, knowledge: 0, gold: 0 };
  user.goals ||= [];
  user.tasks ||= [];
  user.dailyQuests ||= createDailyQuests(user.goals);
  user.weeklyGoals ||= createWeeklyGoals(user.goals);
  user.big3 ||= ["", "", ""];
  user.piggyBank ||= 0;
  user.rewardPoints ||= 0;
  user.categories = getUserCategories(user);
}

function getUserCategories(user) {
  const savedCategories = Array.isArray(user.categories) ? user.categories : [];
  const goalCategories = Array.isArray(user.goals) ? user.goals.map((goal) => goal.category) : [];
  const categories = [...new Set([...savedCategories, ...goalCategories].filter(Boolean))];
  return categories.length ? categories : ["Other"];
}

function openProfile() {
  const user = currentUser();
  if (!user) {
    startSetup();
    return;
  }

  ensureUserShape(user);
  profileDraft = {
    name: user.name || "",
    pronouns: user.pronouns || "",
    kingdomName: user.kingdomName || "",
    avatar: normalizeAvatar(user.avatar),
    categories: [...getUserCategories(user)]
  };

  $("#profile-name").value = profileDraft.name;
  $("#profile-pronouns").value = profileDraft.pronouns;
  $("#profile-kingdom").value = profileDraft.kingdomName;
  $("#profile-goal-deadline").value = "2026-12-31";
  clearProfileGoalFields(false);
  renderProfilePanel();
  $("#profile-dialog").showModal();
}

function closeProfile() {
  profileDraft = null;
  $("#profile-dialog").close();
}

function renderProfilePanel() {
  renderProfileAvatarPicker();
  renderProfileCategoryPicker();
  renderProfileGoalCategoryOptions();
  renderProfileGoalsList();
}

function renderProfileAvatarPicker() {
  if (!profileDraft) return;
  $("#profile-avatar-picker").innerHTML = avatars.map((avatar) => `
    <button type="button" class="choice-button avatar-choice ${profileDraft.avatar === avatar.id ? "is-selected" : ""}" data-profile-avatar="${avatar.id}" role="radio" aria-checked="${profileDraft.avatar === avatar.id}">
      ${renderPixelAvatar(avatar.id)}
      <span>${escapeHtml(avatar.label)}</span>
    </button>
  `).join("");
}

function renderProfileCategoryPicker() {
  if (!profileDraft) return;
  const categories = [...new Set([...baseCategories, ...profileDraft.categories])];
  $("#profile-category-picker").innerHTML = categories.map((category) => `
    <button type="button" class="choice-button ${profileDraft.categories.includes(category) ? "is-selected" : ""}" data-profile-category="${escapeAttribute(category)}">
      ${escapeHtml(category)}
    </button>
  `).join("");
}

function renderProfileGoalCategoryOptions() {
  if (!profileDraft) return;
  const categories = profileDraft.categories.length ? profileDraft.categories : ["Other"];
  $("#profile-goal-category").innerHTML = categories.map((category) => `
    <option value="${escapeAttribute(category)}">${escapeHtml(category)}</option>
  `).join("");
}

function renderProfileGoalsList() {
  const user = currentUser();
  const list = $("#profile-goals-list");
  if (!user || !user.goals.length) {
    list.innerHTML = `<div class="empty-state">No goals yet.</div>`;
    return;
  }

  list.innerHTML = user.goals.map((goal) => `
    <article class="goal-card profile-goal-card">
      <div>
        <p class="goal-title">${escapeHtml(goal.name)}</p>
        <p class="meta-line">${escapeHtml(goal.category)} · ${escapeHtml(goal.type)} · ${formatDate(goal.deadline)}</p>
      </div>
      <div class="card-actions">
        <button type="button" class="mini-action" data-edit-goal="${goal.id}">Edit</button>
        <button type="button" class="mini-action danger-mini" data-delete-goal="${goal.id}">Delete</button>
      </div>
    </article>
  `).join("");
}

function toggleProfileCategory(category) {
  profileDraft.categories = profileDraft.categories.includes(category)
    ? profileDraft.categories.filter((item) => item !== category)
    : [...profileDraft.categories, category];
  if (!profileDraft.categories.length) profileDraft.categories = ["Other"];
  renderProfileCategoryPicker();
  renderProfileGoalCategoryOptions();
}

function addProfileCategory() {
  if (!profileDraft) return;
  const input = $("#profile-custom-category");
  const category = input.value.trim();
  if (!category) return;
  if (!profileDraft.categories.includes(category)) profileDraft.categories.push(category);
  input.value = "";
  renderProfileCategoryPicker();
  renderProfileGoalCategoryOptions();
}

function saveProfileSettings(event) {
  event.preventDefault();
  const user = currentUser();
  if (!user || !profileDraft) return;

  const name = $("#profile-name").value.trim();
  const kingdomName = $("#profile-kingdom").value.trim();
  if (!name || !kingdomName) {
    showToast("Name and kingdom name cannot be empty.");
    return;
  }

  user.name = name;
  user.pronouns = $("#profile-pronouns").value.trim();
  user.kingdomName = kingdomName;
  user.avatar = profileDraft.avatar;
  user.categories = [...new Set(profileDraft.categories.filter(Boolean))];
  ensureUserShape(user);
  saveState();
  renderApp();
  closeProfile();
  showToast("Profile updated.");
}

function addProfileGoal() {
  const user = currentUser();
  if (!user || !profileDraft) return;
  ensureUserShape(user);

  const name = $("#profile-goal-name").value.trim();
  if (!name) {
    showToast("Give the new goal a name first.");
    return;
  }

  const startValue = Number($("#profile-goal-start").value || 0);
  const targetValue = Number($("#profile-goal-target").value || 0);
  if (targetValue && startValue > targetValue) {
    showToast("Starting value cannot be higher than target value.");
    return;
  }

  const category = $("#profile-goal-category").value || "Other";
  const goal = {
    id: createId(),
    name,
    category,
    type: $("#profile-goal-type").value,
    startValue,
    targetValue,
    currentValue: startValue,
    deadline: $("#profile-goal-deadline").value || "2026-12-31",
    why: $("#profile-goal-why").value.trim(),
    milestones: $("#profile-goal-milestones").value
      .split("\n")
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text) => ({ id: createId(), text, done: false })),
    createdAt: new Date().toISOString()
  };

  user.goals.push(goal);
  if (!profileDraft.categories.includes(category)) profileDraft.categories.push(category);
  user.categories = [...new Set([...getUserCategories(user), category])];
  user.dailyQuests.push({
    id: createId(),
    text: `Complete one ${category.toLowerCase()} action`,
    goalId: goal.id,
    done: false,
    rewarded: false
  });
  user.weeklyGoals.push({
    id: createId(),
    text: `Make meaningful progress on ${goal.name}`,
    goalId: goal.id,
    done: false,
    rewarded: false
  });

  clearProfileGoalFields();
  saveState();
  renderApp();
  renderProfilePanel();
  showToast("Goal added.");
}

function clearProfileGoalFields(resetDeadline = true) {
  ["#profile-goal-name", "#profile-goal-start", "#profile-goal-target", "#profile-goal-why", "#profile-goal-milestones"].forEach((selector) => {
    $(selector).value = "";
  });
  if (resetDeadline) $("#profile-goal-deadline").value = "2026-12-31";
}

function showScreen(name) {
  $$(".screen").forEach((screen) => screen.classList.remove("is-active"));
  $(`#${name}-screen`).classList.add("is-active");
}

function setTab(tab) {
  $$(".tab-button").forEach((button) => button.classList.toggle("is-active", button.dataset.tab === tab));
  $$(".tab-panel").forEach((panel) => panel.classList.toggle("is-active", panel.id === `${tab}-tab`));
}

function currentUser() {
  const user = state.users.find((item) => item.id === state.currentUserId) || state.users[0];
  ensureUserShape(user);
  return user;
}

function renderApp() {
  const user = currentUser();
  if (!user) return;
  ensureUserShape(user);
  state.currentUserId = user.id;
  user.level = calculateLevel(user.xp).level;
  renderHeader(user);
  renderKingdom(user);
  renderQuickActions(user);
  renderJournal(user);
  renderGoals(user);
  renderQuests(user);
  renderDuo();
  renderBank(user);
  saveState();
}

function renderHeader(user) {
  $("#day-count").textContent = `Day ${getWinterarcDay()} / 122`;
  $("#current-avatar").innerHTML = renderPixelAvatar(user.avatar);
  $("#current-player").textContent = user.pronouns ? `${user.name} · ${user.pronouns}` : user.name;
  $("#current-kingdom").textContent = user.kingdomName;
  const level = calculateLevel(user.xp);
  const next = getNextLevel(user.xp);
  $("#level-title").textContent = level.title;
  $("#level-label").textContent = `Level ${level.level}`;
  $("#xp-label").textContent = next ? `Season XP · ${user.xp} / ${next.xp} to Level ${next.level}` : `Season XP · ${user.xp}`;
  $("#xp-fill").style.width = `${calculateLevelProgress(user.xp)}%`;
  $("#streak-count").textContent = user.streak;
  $("#best-streak-count").textContent = user.bestStreak;
  $("#building-count").textContent = getUnlockedBuildings(user).length;

  $("#profile-select").innerHTML = state.users.map((profile) => `
    <option value="${profile.id}" ${profile.id === user.id ? "selected" : ""}>${escapeHtml(profile.name)}</option>
  `).join("");
}

function renderKingdom(user) {
  const buildings = getBuildingsForUser(user);
  const unlockedCount = getUnlockedBuildings(user).length;
  const nextUnlock = buildings
    .filter((building) => user.xp < building.xp)
    .sort((a, b) => a.xp - b.xp)[0];
  const terrain = renderTerrainCells(user.xp);
  const sites = buildings.map((building, index) => {
    const unlocked = user.xp >= building.xp;
    const isNext = nextUnlock?.id === building.id;
    const site = mapSites[index % mapSites.length];
    const label = unlocked
      ? `<p class="building-name">${escapeHtml(building.name)}</p>`
      : isNext
        ? `<p class="building-need">Next · ${building.xp} XP</p>`
        : "";
    return `
      <article class="map-site ${unlocked ? "is-unlocked" : "is-locked"} ${isNext ? "is-next" : ""}" style="--x:${site.x};--y:${site.y};--depth:${0.82 + site.y / 260};--delay:${index * 35}ms">
        ${renderPixelBuilding(building.id, unlocked)}
        <div class="map-label">${label}</div>
      </article>
    `;
  }).join("");

  $("#kingdom-grid").innerHTML = `
    <div class="pixel-map" style="--unlocked:${unlockedCount}">
      <div class="pixel-sky" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <div class="pixel-terrain" aria-hidden="true">${terrain}</div>
      <div class="pixel-road" aria-hidden="true"></div>
      <div class="map-sites">${sites}</div>
      <div class="pixel-foreground" aria-hidden="true"></div>
    </div>
  `;
}

function renderTerrainCells(xp) {
  const unlockedTier = Math.min(5, Math.floor(xp / 250));
  const cells = Array.from({ length: 96 }, (_, index) => {
    const row = Math.floor(index / 12);
    const col = index % 12;
    const nearPath = Math.abs(row - Math.round(3 + col * 0.28)) <= 0;
    const fog = row + col > 12 + unlockedTier * 2;
    const water = row === 7 && col < 3;
    const forest = row < 6 && ((row + col) % 6 === 0 || (row * col) % 13 === 0);
    const className = fog ? "fog" : water ? "water" : nearPath ? "path" : forest ? "forest" : "grass";
    return `<span class="terrain-cell terrain-${className}"></span>`;
  });
  return cells.join("");
}

function renderQuickActions(user) {
  $("#quick-actions").innerHTML = user.goals.slice(0, 6).map((goal) => `
    <button type="button" class="choice-button" data-quick-goal="${goal.id}">${escapeHtml(goal.name)}</button>
  `).join("");
}

function renderJournal(user) {
  const list = $("#journal-list");
  if (!user.tasks.length) {
    list.innerHTML = `<div class="empty-state">Nothing logged yet. Your first action can change the world.</div>`;
    return;
  }

  list.innerHTML = [...user.tasks].reverse().map((task) => `
        <article class="entry-card">
          <p class="meta-line">${formatDateTime(task.timestamp)}</p>
          <p class="entry-title">${escapeHtml(task.title)}</p>
          <p class="meta-line">${escapeHtml(task.category)} · ${efforts[task.effort].label} · +${task.xp} XP</p>
          ${task.note ? `<p class="muted">${escapeHtml(task.note)}</p>` : ""}
          <div class="card-actions">
            <button type="button" class="mini-action" data-edit-task="${task.id}">Edit</button>
            <button type="button" class="mini-action danger-mini" data-delete-task="${task.id}">Delete</button>
          </div>
        </article>
      `).join("");
}

function renderGoals(user) {
  const list = $("#goals-list");
  if (!user.goals.length) {
    list.innerHTML = `<div class="empty-state">Your kingdom is waiting. Choose what you're building.</div>`;
  } else {
    list.innerHTML = user.goals.map((goal) => {
      const progress = calculateGoalProgress(goal);
      return `
        <article class="goal-card">
          <p class="goal-title">${escapeHtml(goal.name)}</p>
          <p class="meta-line">${escapeHtml(goal.category)} · ${escapeHtml(goal.type)} · ${formatDate(goal.deadline)}</p>
          ${goal.why ? `<p class="muted">${escapeHtml(goal.why)}</p>` : ""}
          <div class="progress-line">
            <div class="xp-meta"><span>${progress}%</span><span>${goal.currentValue || 0}${goal.targetValue ? ` / ${goal.targetValue}` : ""}</span></div>
            <div class="bar"><span style="width:${progress}%"></span></div>
          </div>
          <div class="goal-edit-row">
            <label>
              Current
              <input type="number" min="0" step="1" value="${goal.currentValue || 0}" data-goal-value="${goal.id}">
            </label>
            <button type="button" class="mini-action" data-update-goal="${goal.id}">Update</button>
            <button type="button" class="mini-action" data-edit-goal="${goal.id}">Edit</button>
            <button type="button" class="mini-action danger-mini" data-delete-goal="${goal.id}">Delete</button>
          </div>
          ${renderMilestones(goal)}
        </article>
      `;
    }).join("");
  }

  $("#category-progress").innerHTML = Object.entries(user.resources).map(([key, value]) => `
    <article class="resource-card">
      <p class="eyebrow">${escapeHtml(key)}</p>
      <strong>${value}</strong>
    </article>
  `).join("");
}

function renderMilestones(goal) {
  if (!goal.milestones.length) return "";
  return `
    <div class="milestones">
      ${goal.milestones.map((milestone) => `
        <label class="milestone-row">
          <input type="checkbox" ${milestone.done ? "checked" : ""} data-goal-id="${goal.id}" data-milestone-id="${milestone.id}">
          ${escapeHtml(milestone.text)}
        </label>
      `).join("")}
    </div>
  `;
}

function renderQuests(user) {
  const dailyDone = user.dailyQuests.filter((quest) => quest.done).length;
  const weeklyDone = user.weeklyGoals.filter((quest) => quest.done).length;
  const big3Done = user.big3.filter(Boolean).length;
  const today = new Date().toISOString().slice(0, 10);
  const big3Claimed = user.big3RewardedDate === today;
  $("#quest-summary").innerHTML = `
    <article class="quest-summary-card">
      <span>Today</span>
      <strong>${dailyDone}/${user.dailyQuests.length || 0}</strong>
      <p>daily quests</p>
    </article>
    <article class="quest-summary-card">
      <span>Big 3</span>
      <strong>${big3Done}/3</strong>
      <p>${big3Claimed ? "reward claimed" : "fill all to claim"}</p>
    </article>
    <article class="quest-summary-card">
      <span>Week</span>
      <strong>${weeklyDone}/${user.weeklyGoals.length || 0}</strong>
      <p>weekly progress</p>
    </article>
  `;

  $("#daily-quests").innerHTML = user.dailyQuests.map((quest) => `
    <article class="quest-card ${quest.done ? "is-done" : ""} ${quest.rewarded ? "is-rewarded" : ""}">
      <label class="quest-row">
        <input type="checkbox" ${quest.done ? "checked" : ""} data-quest-id="${quest.id}">
        <span>${escapeHtml(quest.text)}</span>
        <small>${quest.rewarded ? "Claimed" : "+10 XP"}</small>
      </label>
    </article>
  `).join("") || `<div class="empty-state">Add goals to generate quests.</div>`;

  $("#big3-list").innerHTML = [0, 1, 2].map((index) => `
    <input data-big3="${index}" value="${escapeAttribute(user.big3[index] || "")}" placeholder="Big ${index + 1}">
  `).join("");

  $("#weekly-list").innerHTML = user.weeklyGoals.map((quest) => `
    <article class="quest-card ${quest.done ? "is-done" : ""} ${quest.rewarded ? "is-rewarded" : ""}">
      <label class="quest-row">
        <input type="checkbox" ${quest.done ? "checked" : ""} data-weekly-id="${quest.id}">
        <span>${escapeHtml(quest.text)}</span>
        <small>${quest.rewarded ? "Claimed" : "+20 XP"}</small>
      </label>
    </article>
  `).join("") || `<div class="empty-state">Weekly goals appear after setup.</div>`;
}

function renderDuo() {
  const title = $("#duo-space-title");
  const panel = $("#duo-cloud-panel");
  const codeActions = $(".duo-code-actions");
  const signedIn = Boolean(cloudReady && cloudUser);
  panel?.classList.toggle("is-offline", !signedIn);
  codeActions?.classList.toggle("hidden", signedIn && Boolean(duoSpace.duo));

  if (!signedIn) {
    title.textContent = "Sign in to link with a friend.";
    setDuoStatus("Duo needs cloud login so both phones can see the same space.", "local");
  } else if (duoSpace.loading) {
    title.textContent = "Loading Duo space.";
    setDuoStatus("Checking shared progress...", "syncing");
  } else if (duoSpace.duo) {
    title.textContent = `Duo code ${duoSpace.duo.code}`;
    setDuoStatus("Share this code with your friend. Anyone in this Duo can see the progress cards below.", "online");
  } else {
    title.textContent = "Link with a friend.";
    setDuoStatus("Create a Duo code or join one your friend shares.", "local");
  }

  const summaries = duoSpace.duo ? duoSpace.summaries : [];
  $("#duo-grid").innerHTML = summaries.length
    ? summaries.map(renderDuoSummaryCard).join("")
    : state.users.map((user) => `
      <article class="duo-card">
        <div class="duo-title">${renderPixelAvatar(user.avatar)}<p class="entry-title">${escapeHtml(user.name)}</p></div>
        <p class="meta-line">${escapeHtml(user.kingdomName)}</p>
        <p>Level ${calculateLevel(user.xp).level} · ${user.xp} XP · ${user.streak} streak</p>
        <p class="muted">${signedIn ? "Create or join a Duo code to see your friend here." : "Local preview only. Sign in to share progress."}</p>
      </article>
    `).join("");

  const complete = summaries.length >= 2
    ? summaries.every((summary) => Number(summary.streak || 0) > 0)
    : state.users.length >= 2 && state.users.every((user) => user.tasks.length >= 3);
  $("#duo-challenge").innerHTML = `
    <p class="eyebrow">Duo Challenge</p>
    <h3>Both show up today.</h3>
    <p class="muted">${complete ? "Duo quest complete. Both kingdoms have momentum." : duoSpace.duo ? "Log progress on both accounts to light this up." : "Create or join a Duo space to track each other."}</p>
  `;
}

function renderDuoSummaryCard(summary) {
  const isYou = summary.user_id === cloudUser?.id;
  const updated = summary.updated_at ? formatDateTime(summary.updated_at) : "Not synced yet";
  const lastAction = summary.last_action_at ? formatDateTime(summary.last_action_at) : "No action logged yet";
  return `
    <article class="duo-card ${isYou ? "is-you" : ""}">
      <div class="duo-title">
        ${renderPixelAvatar(summary.avatar)}
        <div>
          <p class="entry-title">${escapeHtml(summary.display_name || "Player")}${isYou ? " · You" : ""}</p>
          <p class="meta-line">${escapeHtml(summary.kingdom_name || "Kaapisoda")}</p>
        </div>
      </div>
      <div class="duo-stat-grid">
        <span><strong>${Number(summary.level || 1)}</strong> level</span>
        <span><strong>${Number(summary.xp || 0)}</strong> XP</span>
        <span><strong>${Number(summary.streak || 0)}</strong> streak</span>
        <span><strong>${Number(summary.building_count || 0)}</strong> areas</span>
      </div>
      <p class="muted">Last action: ${escapeHtml(lastAction)}</p>
      <p class="meta-line">Synced ${escapeHtml(updated)}</p>
    </article>
  `;
}

function renderBank(user) {
  $("#reward-points").textContent = user.rewardPoints;
  $("#piggy-bank").textContent = `₹${user.piggyBank}`;
}

function openLog(goalId = "") {
  const user = currentUser();
  $("#task-title").value = "";
  $("#task-note").value = "";
  $("#task-goal").innerHTML = user.goals.map((goal) => `
    <option value="${goal.id}" ${goal.id === goalId ? "selected" : ""}>${escapeHtml(goal.name)}</option>
  `).join("");
  selectedEffort = "normal";
  renderEffortPicker();
  $("#log-dialog").showModal();
}

function closeLog() {
  $("#log-dialog").close();
}

function submitLog(event) {
  event.preventDefault();
  const user = currentUser();
  const goal = user.goals.find((item) => item.id === $("#task-goal").value);
  if (!goal) {
    showToast("Choose a goal for this action.");
    return;
  }

  const effort = efforts[selectedEffort];
  const previousLevel = calculateLevel(user.xp).level;
  const previousUnlocks = new Set(getUnlockedBuildings(user).map((building) => building.id));
  const previousGoalValue = goal.currentValue || 0;
  const previousStreak = user.streak;
  const resourceKey = resourceForCategory(goal.category);
  const previousResource = user.resources[resourceKey];
  const previousXp = user.xp;
  const task = {
    id: createId(),
    timestamp: new Date().toISOString(),
    title: $("#task-title").value.trim(),
    goalId: goal.id,
    category: goal.category,
    effort: selectedEffort,
    xp: effort.xp,
    note: $("#task-note").value.trim()
  };

  if (!task.title) return;

  user.tasks.push(task);
  user.xp += effort.xp;
  goal.currentValue = Math.min(goal.targetValue || goal.currentValue + 1, (goal.currentValue || 0) + 1);
  addResource(user, goal.category, effort.xp);
  updateStreak(user);
  completeMatchingQuest(user, goal.id);
  user.level = calculateLevel(user.xp).level;

  const nextLevel = calculateLevel(user.xp).level;
  const newUnlocks = getUnlockedBuildings(user).filter((building) => !previousUnlocks.has(building.id));
  const summary = {
    xp: effort.xp,
    bonusXp: user.xp - previousXp - effort.xp,
    totalXp: user.xp,
    goalName: goal.name,
    goalBefore: previousGoalValue,
    goalAfter: goal.currentValue || 0,
    goalProgress: calculateGoalProgress(goal),
    resourceName: resourceKey,
    resourceGain: user.resources[resourceKey] - previousResource,
    streakBefore: previousStreak,
    streakAfter: user.streak,
    levelBefore: previousLevel,
    levelAfter: nextLevel,
    unlock: newUnlocks[0] || null
  };
  if (nextLevel > previousLevel) {
    user.rewardPoints += 25;
    showToast(`Level up! You reached Level ${nextLevel}.`);
  } else if (newUnlocks.length) {
    showToast(`New area unlocked: ${newUnlocks[0].name}.`);
  } else {
    showToast(`+${effort.xp} XP. The kingdom noticed.`);
  }
  if (newUnlocks.length) showUnlockBanner(newUnlocks[0]);

  saveState();
  closeLog();
  renderApp();
  showResult(summary);
}

function addResource(user, category, xp) {
  const key = resourceForCategory(category);
  user.resources[key] += xp;
}

function resourceForCategory(category) {
  if (["Education", "Research", "Knowledge"].includes(category)) return "knowledge";
  if (["Career", "Business", "Money"].includes(category)) return "gold";
  return "growth";
}

function completeMatchingQuest(user, goalId) {
  const quest = user.dailyQuests.find((item) => item.goalId === goalId && !item.done && !item.rewarded);
  if (quest) {
    quest.done = true;
    quest.rewarded = true;
    user.xp += 10;
  }
}

function updateStreak(user) {
  const today = new Date().toISOString().slice(0, 10);
  if (user.lastActiveDate === today) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  user.streak = user.lastActiveDate === yesterday ? user.streak + 1 : 1;
  user.bestStreak = Math.max(user.bestStreak, user.streak);
  user.lastActiveDate = today;
}

function toggleMilestone(goalId, milestoneId, done) {
  const user = currentUser();
  const goal = user.goals.find((item) => item.id === goalId);
  const milestone = goal?.milestones.find((item) => item.id === milestoneId);
  if (!milestone) return;
  milestone.done = done;
  if (done && !milestone.rewarded) {
    user.xp += 15;
    user.rewardPoints += 10;
    milestone.rewarded = true;
    showToast("+15 XP for a milestone.");
  }
  saveState();
  renderApp();
}

function toggleQuest(questId, done) {
  const user = currentUser();
  const quest = user.dailyQuests.find((item) => item.id === questId);
  if (!quest) return;
  quest.done = done;
  if (done && !quest.rewarded) {
    quest.rewarded = true;
    user.xp += 10;
  }
  saveState();
  renderApp();
}

function toggleWeekly(questId, done) {
  const user = currentUser();
  const quest = user.weeklyGoals.find((item) => item.id === questId);
  if (!quest) return;
  quest.done = done;
  if (done && !quest.rewarded) {
    quest.rewarded = true;
    user.xp += 20;
    user.rewardPoints += 10;
  }
  saveState();
  renderApp();
}

function refreshQuests() {
  const user = currentUser();
  user.dailyQuests = createDailyQuests(user.goals);
  saveState();
  renderApp();
  showToast("Fresh quests generated.");
}

function saveBig3() {
  const user = currentUser();
  user.big3 = $$("[data-big3]").map((input) => input.value.trim());
  const today = new Date().toISOString().slice(0, 10);
  if (user.big3.every(Boolean) && user.big3RewardedDate !== today) {
    user.xp += 25;
    user.rewardPoints += 10;
    user.big3RewardedDate = today;
    showToast("Big 3 saved. +25 XP for the full set.");
  } else {
    showToast("Big 3 saved.");
  }
  saveState();
  renderApp();
}

function sendEncouragement() {
  const message = encouragements[Math.floor(Math.random() * encouragements.length)];
  showToast(message);
}

function addPiggy() {
  const user = currentUser();
  const amount = Math.max(0, Number($("#piggy-amount").value || 0));
  if (!amount) return;
  user.piggyBank += amount;
  $("#piggy-amount").value = "";
  saveState();
  renderApp();
  showToast("Accountability noted gently.");
}

function updateGoalValue(goalId) {
  const user = currentUser();
  const goal = user.goals.find((item) => item.id === goalId);
  const input = $(`[data-goal-value="${goalId}"]`);
  if (!goal || !input) return;
  const value = Math.max(0, Number(input.value || 0));
  if (goal.targetValue && value > goal.targetValue) {
    showToast("Current value cannot be higher than the target.");
    input.value = goal.currentValue || 0;
    return;
  }
  goal.currentValue = value;
  saveState();
  renderApp();
  showToast("Goal progress updated.");
}

function editGoal(goalId) {
  const user = currentUser();
  const goal = user.goals.find((item) => item.id === goalId);
  if (!goal) return;

  const name = window.prompt("Goal name", goal.name);
  if (name === null) return;
  const trimmedName = name.trim();
  if (!trimmedName) {
    showToast("Goal name cannot be empty.");
    return;
  }

  const category = window.prompt("Category", goal.category);
  if (category === null) return;
  const trimmedCategory = category.trim();
  if (!trimmedCategory) {
    showToast("Category cannot be empty.");
    return;
  }

  const why = window.prompt("Why does this matter? Optional.", goal.why || "");
  if (why === null) return;

  goal.name = trimmedName;
  goal.category = trimmedCategory;
  goal.why = why.trim();
  if (!user.categories.includes(trimmedCategory)) user.categories.push(trimmedCategory);
  user.dailyQuests.forEach((quest) => {
    if (quest.goalId === goal.id) quest.text = `Complete one ${goal.category.toLowerCase()} action`;
  });
  user.weeklyGoals.forEach((quest) => {
    if (quest.goalId === goal.id) quest.text = `Make meaningful progress on ${goal.name}`;
  });
  saveState();
  renderApp();
  if ($("#profile-dialog")?.open) renderProfilePanel();
  showToast("Goal details updated.");
}

function deleteGoal(goalId) {
  const user = currentUser();
  const goal = user.goals.find((item) => item.id === goalId);
  if (!goal) return;
  const linkedTasks = user.tasks.filter((task) => task.goalId === goalId).length;
  const message = linkedTasks
    ? `Delete "${goal.name}"? ${linkedTasks} journal entr${linkedTasks === 1 ? "y" : "ies"} will stay in the journal.`
    : `Delete "${goal.name}"?`;
  if (!window.confirm(message)) return;
  user.goals = user.goals.filter((item) => item.id !== goalId);
  user.dailyQuests = user.dailyQuests.filter((quest) => quest.goalId !== goalId);
  user.weeklyGoals = user.weeklyGoals.filter((quest) => quest.goalId !== goalId);
  saveState();
  renderApp();
  if ($("#profile-dialog")?.open) renderProfilePanel();
  showToast("Goal deleted.");
}

function editTask(taskId) {
  const user = currentUser();
  const task = user.tasks.find((item) => item.id === taskId);
  if (!task) return;

  const title = window.prompt("Journal entry title", task.title);
  if (title === null) return;
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    showToast("Journal title cannot be empty.");
    return;
  }

  const note = window.prompt("Journal note. Optional.", task.note || "");
  if (note === null) return;

  task.title = trimmedTitle;
  task.note = note.trim();
  saveState();
  renderApp();
  showToast("Journal entry updated.");
}

function deleteTask(taskId) {
  const user = currentUser();
  const task = user.tasks.find((item) => item.id === taskId);
  if (!task) return;
  if (!window.confirm("Delete this journal entry? XP already earned will stay.")) return;
  user.tasks = user.tasks.filter((item) => item.id !== taskId);
  saveState();
  renderApp();
  showToast("Journal entry deleted.");
}

function resetSave() {
  const confirmed = window.confirm("Reset all local Kaapisoda profiles in this browser?");
  if (!confirmed) return;
  state = { users: [], currentUserId: null };
  localStorage.removeItem(STORAGE_KEY);
  setupDraft = createSetupDraft();
  setupPage = 0;
  showScreen("landing");
  renderPickers();
  showToast("Local save reset.");
}

function getBuildingsForUser(user) {
  const categories = new Set(user.goals.map((goal) => goal.category));
  const personalized = [...categories].map((category) => categoryBuildings[category] || categoryBuildings.Other);
  return [...baseBuildings, ...dedupeById(personalized)];
}

function getUnlockedBuildings(user) {
  return getBuildingsForUser(user).filter((building) => user.xp >= building.xp);
}

function dedupeById(items) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function calculateLevel(xp) {
  return levels.reduce((current, level) => xp >= level.xp ? level : current, levels[0]);
}

function getNextLevel(xp) {
  return levels.find((level) => level.xp > xp);
}

function calculateLevelProgress(xp) {
  const current = calculateLevel(xp);
  const next = getNextLevel(xp);
  if (!next) return 100;
  return Math.round(((xp - current.xp) / (next.xp - current.xp)) * 100);
}

function calculateGoalProgress(goal) {
  if (goal.targetValue > 0) {
    return Math.min(100, Math.round(((goal.currentValue || 0) / goal.targetValue) * 100));
  }
  if (goal.milestones.length) {
    const done = goal.milestones.filter((milestone) => milestone.done).length;
    return Math.round((done / goal.milestones.length) * 100);
  }
  return Math.min(100, (goal.currentValue || 0) * 10);
}

function getWinterarcDay() {
  const start = new Date("2026-09-01T00:00:00");
  const now = new Date();
  const diff = Math.floor((stripTime(now) - stripTime(start)) / 86400000) + 1;
  return Math.min(122, Math.max(1, diff));
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { users: [], currentUserId: null };
    return normalizeState(JSON.parse(saved));
  } catch (error) {
    console.warn("Could not load Kaapisoda state", error);
    return { users: [], currentUserId: null };
  }
}

function saveState(options = {}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (!options.skipCloud) scheduleCloudSave();
  } catch (error) {
    showToast("Progress could not be saved in this browser.");
    console.warn("Could not save Kaapisoda state", error);
  }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function showUnlockBanner(building) {
  const banner = $("#unlock-banner");
  banner.innerHTML = `
    <span>NEW AREA UNLOCKED</span>
    <strong>${escapeHtml(building.name)}</strong>
  `;
  banner.classList.add("is-visible");
  clearTimeout(showUnlockBanner.timer);
  showUnlockBanner.timer = setTimeout(() => banner.classList.remove("is-visible"), 3200);
}

function showResult(summary) {
  $("#result-title").textContent = summary.levelAfter > summary.levelBefore
    ? `Level ${summary.levelAfter} reached.`
    : summary.unlock
      ? "New area opened."
      : "Progress saved.";
  $("#result-xp").textContent = `+${summary.xp} XP`;
  $("#result-subtitle").textContent = summary.unlock
    ? `${summary.unlock.name} joined your map.`
    : `Season total: ${summary.totalXp} XP`;
  $("#result-stats").innerHTML = [
    summary.bonusXp > 0
      ? { label: "Quest bonus", value: `+${summary.bonusXp} XP`, detail: "daily quest completed" }
      : null,
    { label: "Goal", value: `${summary.goalName} +${summary.goalAfter - summary.goalBefore}`, detail: `${summary.goalProgress}% complete` },
    { label: "Resource", value: `+${summary.resourceGain} ${capitalize(summary.resourceName)}`, detail: "earned from this action" },
    { label: "Streak", value: `${summary.streakAfter} day${summary.streakAfter === 1 ? "" : "s"}`, detail: summary.streakAfter > summary.streakBefore ? "streak updated" : "already counted today" },
    summary.levelAfter > summary.levelBefore
      ? { label: "Level", value: `Level ${summary.levelAfter}`, detail: "reward points added" }
      : null,
    summary.unlock
      ? { label: "Unlock", value: summary.unlock.name, detail: "new map site active" }
      : null
  ].filter(Boolean).map((item) => `
    <article class="result-stat">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
      <p>${escapeHtml(item.detail)}</p>
    </article>
  `).join("");
  $("#result-dialog").showModal();
}

function closeResult() {
  $("#result-dialog").close();
}

function formatDate(value) {
  if (!value) return "No deadline";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatCloudTime(value) {
  if (!value) return "just now";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function normalizeState(value) {
  const normalized = {
    users: Array.isArray(value.users) ? value.users : [],
    currentUserId: value.currentUserId || null
  };
  normalized.users.forEach(ensureUserShape);
  if (!normalized.currentUserId && normalized.users[0]) normalized.currentUserId = normalized.users[0].id;
  return normalized;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function capitalize(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function renderPixelAvatar(avatar) {
  return `<span class="pixel-avatar pixel-avatar--${escapeAttribute(normalizeAvatar(avatar))}" aria-hidden="true"><span></span></span>`;
}

function normalizeAvatar(avatar) {
  if (avatars.some((item) => item.id === avatar)) return avatar;
  return "mage";
}

function renderPixelBuilding(id, unlocked) {
  const sprite = unlocked ? id : "locked";
  return `<div class="pixel-building pixel-building--${escapeAttribute(sprite)}" aria-hidden="true"><span></span></div>`;
}
