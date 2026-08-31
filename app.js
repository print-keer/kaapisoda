const STORAGE_KEY = "kaapisoda_state_v1";

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

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

document.addEventListener("DOMContentLoaded", init);

function init() {
  renderPickers();
  bindEvents();
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
  $("#setup-form").addEventListener("submit", finishSetup);
  $("#log-form").addEventListener("submit", submitLog);
  $("#profile-select").addEventListener("change", (event) => {
    state.currentUserId = event.target.value;
    saveState();
    renderApp();
  });
}

function handleClick(event) {
  const button = event.target.closest("button");
  if (!button) return;
  const action = button.dataset.action;
  const tab = button.dataset.tab;
  const quickGoal = button.dataset.quickGoal;

  if (tab) setTab(tab);
  if (quickGoal) openLog(quickGoal);

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
    "add-piggy": addPiggy
  };

  if (actions[action]) actions[action]();

  const avatar = button.dataset.avatar;
  if (avatar) {
    setupDraft.avatar = avatar;
    renderAvatarPicker();
  }

  const category = button.dataset.category;
  if (category) {
    toggleCategory(category);
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
    done: false
  }));
}

function createWeeklyGoals(goals) {
  return goals.slice(0, 3).map((goal) => ({
    id: createId(),
    text: `Make meaningful progress on ${goal.name}`,
    goalId: goal.id,
    done: false
  }));
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
  return state.users.find((user) => user.id === state.currentUserId) || state.users[0];
}

function renderApp() {
  const user = currentUser();
  if (!user) return;
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
  $("#kingdom-grid").innerHTML = buildings.map((building) => {
    const unlocked = user.xp >= building.xp;
    return `
      <article class="building-tile ${unlocked ? "is-unlocked" : "is-locked"}">
        ${renderPixelBuilding(building.id, unlocked)}
        <p class="building-name">${unlocked ? escapeHtml(building.name) : "???"}</p>
        <p class="building-need">${unlocked ? "Unlocked" : `${building.xp} XP`}</p>
      </article>
    `;
  }).join("");
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
  $("#daily-quests").innerHTML = user.dailyQuests.map((quest) => `
    <article class="quest-card ${quest.done ? "is-done" : ""}">
      <label class="quest-row">
        <input type="checkbox" ${quest.done ? "checked" : ""} data-quest-id="${quest.id}">
        ${escapeHtml(quest.text)}
      </label>
    </article>
  `).join("") || `<div class="empty-state">Add goals to generate quests.</div>`;

  $("#big3-list").innerHTML = [0, 1, 2].map((index) => `
    <input data-big3="${index}" value="${escapeAttribute(user.big3[index] || "")}" placeholder="Big ${index + 1}">
  `).join("");

  $("#weekly-list").innerHTML = user.weeklyGoals.map((quest) => `
    <article class="quest-card ${quest.done ? "is-done" : ""}">
      <label class="quest-row">
        <input type="checkbox" ${quest.done ? "checked" : ""} data-weekly-id="${quest.id}">
        ${escapeHtml(quest.text)}
      </label>
    </article>
  `).join("") || `<div class="empty-state">Weekly goals appear after setup.</div>`;
}

function renderDuo() {
  $("#duo-grid").innerHTML = state.users.map((user) => `
    <article class="duo-card">
      <div class="duo-title">${renderPixelAvatar(user.avatar)}<p class="entry-title">${escapeHtml(user.name)}</p></div>
      <p class="meta-line">${escapeHtml(user.kingdomName)}</p>
      <p>Level ${calculateLevel(user.xp).level} · ${user.xp} XP · ${user.streak} streak</p>
      <p class="muted">${getUnlockedBuildings(user).length} buildings unlocked</p>
    </article>
  `).join("");

  const complete = state.users.length >= 2 && state.users.every((user) => user.tasks.length >= 3);
  $("#duo-challenge").innerHTML = `
    <p class="eyebrow">Duo Challenge</p>
    <h3>Both complete 3 meaningful actions.</h3>
    <p class="muted">${complete ? "Duo quest complete. Both kingdoms have momentum." : "Create two profiles and log three actions each."}</p>
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
  if (nextLevel > previousLevel) {
    user.rewardPoints += 25;
    showToast(`Level up! You reached Level ${nextLevel}.`);
  } else {
    showToast(`+${effort.xp} XP. The kingdom noticed.`);
  }

  saveState();
  closeLog();
  renderApp();
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
  const quest = user.dailyQuests.find((item) => item.goalId === goalId && !item.done);
  if (quest) {
    quest.done = true;
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
  if (done) {
    user.xp += 15;
    user.rewardPoints += 10;
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
  if (done) user.xp += 10;
  saveState();
  renderApp();
}

function toggleWeekly(questId, done) {
  const user = currentUser();
  const quest = user.weeklyGoals.find((item) => item.id === questId);
  if (!quest) return;
  quest.done = done;
  if (done) {
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
  if (user.big3.every(Boolean)) {
    user.xp += 25;
    user.rewardPoints += 10;
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
    const parsed = JSON.parse(saved);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      currentUserId: parsed.currentUserId || null
    };
  } catch (error) {
    console.warn("Could not load Kaapisoda state", error);
    return { users: [], currentUserId: null };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
