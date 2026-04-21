

## Plan: i18n (Arabic/English), Light/Dark Mode, and Enhanced Verification

The bids system already exists with the correct flow (user posts request by category, providers submit bids, users accept/reject). The Service Requests page (`/provider/requests`) and Bids page (`/provider/offers`) are already separate. This plan focuses on the three missing features.

---

### 1. Internationalization (Arabic + English)

**New file: `src/i18n/translations.ts`**
- Export `en` and `ar` translation objects with keys for all UI strings (nav labels, page titles, buttons, form labels, empty states, toasts, categories, urgency levels, etc.)
- RTL support for Arabic

**New file: `src/i18n/LanguageContext.tsx`**
- React context providing `{ language, setLanguage, t, dir }` where `t(key)` returns the translated string
- `dir` returns `'rtl'` for Arabic, `'ltr'` for English
- Persist language choice in `localStorage`

**Update `src/App.tsx`**
- Wrap app in `LanguageProvider`
- Set `dir` attribute on `<html>` element based on language

**Update `src/components/layout/Navbar.tsx`**
- Add language toggle button (EN/AR) in the header

**Update all pages and components**
- Replace hardcoded English strings with `t('key')` calls
- This affects ~25+ files but is mechanical: page titles, button labels, form labels, empty states, tab labels, toast messages

---

### 2. Light Mode / Dark Mode

**Update `src/index.css`**
- Add a `.light` class (or media query) with light-theme CSS variables (white backgrounds, dark text, adjusted primary/secondary/border colors)
- Keep current dark theme as default

**Update `src/stores/ui-store.ts`**
- Add `theme: 'dark' | 'light'` state and `setTheme` action
- Persist in `localStorage`; apply `dark`/`light` class to `<html>` on change

**Update `src/components/layout/Navbar.tsx`**
- Add a Sun/Moon toggle button next to the language toggle

---

### 3. Enhanced Provider Verification with File Uploads

Since there is no backend, file uploads will be simulated: we store `File` metadata (name, type, size) in local state and display them. The admin can "view" file names and types.

**Update `src/types/index.ts`**
- Add `files: { name: string; type: string; size: number }[]` to `VerificationRequest`
- Add optional `description` field

**Update `src/pages/provider/ProviderVerificationPage.tsx`**
- Add a `<textarea>` for free-text information
- Add a file input accepting `.pdf,.xlsx,.xls,.jpg,.jpeg,.png,.gif`
- Show selected files with names and remove buttons
- On submit: store file metadata + text in the verification request

**Update `src/pages/admin/AdminVerificationPage.tsx`**
- Display the provider's text description
- List all uploaded files with icons (PDF icon, image icon, spreadsheet icon)
- "Open" button simulates viewing (shows file name/type in a dialog since no real file storage)

**Update `src/stores/data-store.ts`**
- No structural changes needed; the `addVerificationRequest` already stores the full object

---

### Files Summary

**New (2)**: `src/i18n/translations.ts`, `src/i18n/LanguageContext.tsx`

**Modified (~30)**:
- `src/index.css` — light theme variables
- `src/stores/ui-store.ts` — theme state
- `src/App.tsx` — LanguageProvider wrapper, theme/dir on html
- `src/types/index.ts` — VerificationRequest file metadata
- `src/components/layout/Navbar.tsx` — language + theme toggles
- `src/components/layout/SidebarNav.tsx` — translated labels
- `src/pages/provider/ProviderVerificationPage.tsx` — file upload + description
- `src/pages/admin/AdminVerificationPage.tsx` — view files + description
- All page files — replace hardcoded strings with `t()` calls

