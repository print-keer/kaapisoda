# Kaapisoda

Kaapisoda is a small browser-based life RPG where real-world progress becomes XP, goal progress, resources, journal entries, and a growing kingdom.

## Run

Open `index.html` in a browser.

The MVP uses vanilla HTML, CSS, JavaScript, and `localStorage`. No install step is required.

## Optional Cloud Save

Kaapisoda can use Supabase Auth and a private cloud save table for login-based cross-device sync. Leave `config.js` blank for local-only mode, or follow `SUPABASE_SETUP.md` to configure Supabase.

## Shared Duo Space

The Duo tab can link two signed-in users with a short Duo code. Each player keeps their private save, while the shared space shows only progress summary fields like name, avatar, XP, streak, level, and unlocked areas.
