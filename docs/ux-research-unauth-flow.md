# UX Research: Unauthenticated User Flows in Creative Tools

## Executive Summary

After analyzing 6 creative/craft tools (NeedlePaint, StitchFiddle, Pic2Pat, Remove.bg, Photopea, and Figma), the dominant pattern is **"try before you sign up"** - allowing users to experience the core value proposition before requiring authentication.

**Key finding:** The most successful tools let users complete the core workflow (upload → process → preview) without login. Auth gates appear only when users want to:
- Save work to the cloud
- Download high-quality output
- Access premium features

---

## Tool-by-Tool Analysis

### 1. NeedlePaint.com (Primary Target)

**Business Model:** E-commerce (sells physical needlepoint kits)

| Question | Finding |
|----------|---------|
| Can try without login? | ✅ Yes - "Upload image file" button on homepage |
| Login required at? | At checkout (when purchasing physical kit) |
| Try-before-signup? | Full image upload and preview without auth |
| Data persistence? | Session-based, tied to order flow |
| Conversion pattern | Tool → Preview → Add to Cart → Checkout (login) |

**Key UX Patterns:**
- Immediate CTA: "Upload image file" is prominent
- No account creation friction for exploration
- Login only when money exchanges hands
- The tool IS the marketing - seeing your photo as needlepoint sells the product

---

### 2. StitchFiddle (Cross-stitch/Knitting Pattern Creator)

**Business Model:** Freemium (free basic, paid premium)

| Question | Finding |
|----------|---------|
| Can try without login? | ✅ Yes - Full editor access |
| Login required at? | Save/store charts, access premium features |
| Try-before-signup? | Complete workflow: select craft → upload photo → edit pattern |
| Data persistence? | None without login (work lost on close) |
| Conversion pattern | Use tool → See value → "Save" prompt → Signup |

**Key UX Patterns:**
- Gradual disclosure: Craft type → Floss brand → Start method → Editor
- "From picture" option available immediately
- Navigation shows "Signup / Login" but doesn't gate the tool
- "My charts" links redirect to login page

---

### 3. Pic2Pat (Cross-stitch Pattern Generator)

**Business Model:** Free tool (ad-supported + webshop)

| Question | Finding |
|----------|---------|
| Can try without login? | ✅ Yes - 100% free, no login at all |
| Login required at? | Never (for the pattern tool) |
| Try-before-signup? | N/A - no signup exists |
| Data persistence? | Downloads to user's computer |
| Conversion pattern | Use tool → Download PDF → (Optional) Buy supplies from webshop |

**Key UX Patterns:**
- Zero friction - upload immediately
- 3-step wizard clearly communicated upfront
- Pattern stored locally, no cloud dependency
- Monetization via associated webshop, not the tool itself

---

### 4. Remove.bg (Background Removal)

**Business Model:** Freemium (free low-res, paid HD)

| Question | Finding |
|----------|---------|
| Can try without login? | ✅ Yes - Process any image instantly |
| Login required at? | HD download, bulk processing, API access |
| Try-before-signup? | Full processing, preview of result |
| Data persistence? | Session-based, images processed server-side |
| Conversion pattern | Upload → See magic → "Download HD" prompt → Signup |

**Key UX Patterns:**
- Prominent "Upload Image" CTA with drag-drop
- "Try one of these" sample images for zero-commitment testing
- Free tier shows capability with watermarked/low-res output
- Clear value demonstration before asking for anything

---

### 5. Photopea (Online Photo Editor)

**Business Model:** Freemium (ad-supported free, paid removes ads)

| Question | Finding |
|----------|---------|
| Can try without login? | ✅ Yes - Full editor, all features |
| Login required at? | Never required (optional for cloud save) |
| Try-before-signup? | Complete professional editing suite |
| Data persistence? | Local file system (browser) |
| Conversion pattern | "It's free and works" → Remove ads ($) |

**Key UX Patterns:**
- "Start using Photopea" → Immediate full editor
- "Account" button visible but not required
- Saves to local computer by default
- Privacy-first: "All files open instantly, never leave your device"
- Most permissive model - compete on being the best free option

---

### 6. Figma (Design Tool)

**Business Model:** Freemium (free tier, paid teams)

| Question | Finding |
|----------|---------|
| Can try without login? | ❌ No - Must sign up first |
| Login required at? | Before accessing editor |
| Try-before-signup? | Limited to marketing content |
| Data persistence? | Cloud-first, requires account |
| Conversion pattern | Marketing → Signup (free) → Use tool → Upgrade |

**Key UX Patterns:**
- "Get started for free" prominent but requires account
- Collaborative cloud model necessitates accounts
- Generous free tier reduces signup friction
- Account = identity for sharing/collaboration

---

## Patterns & Insights

### The "Value First" Principle
5 of 6 tools let users experience core value before signup. The exception (Figma) has a collaborative model where accounts enable sharing.

### Auth Gate Placement Spectrum

```
No Gate ←————————————————————————————→ Full Gate
   |          |          |          |          |
Pic2Pat   Photopea   Remove.bg  StitchFiddle  Figma
           (optional) (quality)   (save)      (entry)
```

### Common Conversion Triggers

| Trigger | Examples |
|---------|----------|
| **Save/Persist** | StitchFiddle ("Save chart"), most common |
| **Quality/Resolution** | Remove.bg (HD download) |
| **Purchase** | NeedlePaint (checkout) |
| **Collaboration** | Figma (sharing) |
| **Never** | Pic2Pat, Photopea (monetize differently) |

### Clever UX Patterns Observed

1. **Sample Images** (Remove.bg): "No image? Try one of these" - eliminates upload friction for tire-kickers
2. **Local-First** (Photopea): Privacy selling point, no server dependency
3. **Progress Investment** (StitchFiddle): Let users invest time, then prompt save
4. **Preview Quality** (Remove.bg): Show watermarked result, charge for clean version
5. **Checkout Gate** (NeedlePaint): Only ask for account when money moves

---

## Recommendations for Our Needlepoint App

### 1. Allow Full Tool Access Without Login ✅

**Rationale:** Every successful creative tool in this research lets users try before signing up. The conversion happens after users see value.

**Implementation:**
```
Landing → Upload Image → See Canvas Preview → Edit/Adjust
                                              ↓
                                        [Save/Download]
                                              ↓
                                    Login/Signup Prompt
```

### 2. Gate at Save/Download, Not Entry

**Where to require auth:**
- ✅ Save project to cloud
- ✅ Download high-res output
- ✅ Access project history
- ❌ Upload image (no gate)
- ❌ Preview result (no gate)
- ❌ Basic editing (no gate)

### 3. Preserve Anonymous Work on Signup

**Critical UX:** Don't lose the work someone just created.

**Implementation options:**

**Option A: Session Storage + Migration**
```typescript
// Before auth
localStorage.setItem('pendingProject', JSON.stringify({
  imageData: base64,
  settings: { gridSize, colorCount, ... },
  timestamp: Date.now()
}));

// After auth (in auth callback)
const pending = localStorage.getItem('pendingProject');
if (pending) {
  await saveProjectToUser(userId, JSON.parse(pending));
  localStorage.removeItem('pendingProject');
}
```

**Option B: Anonymous User Upgrade**
```typescript
// Create anonymous session on first interaction
const anonId = getOrCreateAnonId(); // stored in localStorage

// On signup, merge anonymous data
await db.project.updateMany({
  where: { anonUserId: anonId },
  data: { userId: newUserId, anonUserId: null }
});
```

### 4. Recommended Auth Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     HOMEPAGE                                 │
│  "Transform your photo into a needlepoint canvas"           │
│                                                              │
│  [Upload Your Photo]  ← Primary CTA, no login required      │
│                                                              │
│  "Try with sample images" (optional quick-start)            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                     EDITOR                                   │
│  Canvas preview + adjustment controls                        │
│  - Grid size                                                 │
│  - Color count                                              │
│  - Cropping                                                  │
│                                                              │
│  [Download]  [Save Project]  ← These trigger auth           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│               AUTH MODAL (not page redirect!)               │
│  "Save your project to access it anytime"                   │
│                                                              │
│  [Continue with Google]                                     │
│  [Continue with Email]                                      │
│                                                              │
│  Your work will be saved automatically after sign in.       │
└─────────────────────────────────────────────────────────────┘
```

### 5. Specific Implementation Notes

**Session Persistence:**
- Store work-in-progress in `localStorage` keyed by a random session ID
- On page refresh, check for existing session and restore state
- Show "Continue where you left off?" if returning visitor with saved session

**Auth Trigger UX:**
```tsx
function handleDownload() {
  if (!user) {
    // Store intent
    sessionStorage.setItem('postAuthAction', 'download');
    // Show modal, don't redirect
    setShowAuthModal(true);
    return;
  }
  // Proceed with download
  downloadCanvas();
}

// In auth callback
useEffect(() => {
  if (user) {
    const action = sessionStorage.getItem('postAuthAction');
    if (action === 'download') {
      sessionStorage.removeItem('postAuthAction');
      downloadCanvas();
    }
  }
}, [user]);
```

**Soft Prompts (Optional):**
- After 2-3 edits: "Sign up to save your work" (dismissible banner)
- On tab close with unsaved work: "Sign up to save before leaving" (beforeunload)

---

## Summary Decision Matrix

| Feature | Require Auth? | Rationale |
|---------|--------------|-----------|
| Upload image | No | Barrier to entry |
| View preview | No | This IS the value prop |
| Adjust settings | No | Part of core experience |
| Download low-res | Maybe | Could be free tier |
| Download high-res | Yes | Clear value exchange |
| Save to cloud | Yes | Requires account |
| Access history | Yes | Account feature |
| Premium features | Yes | Monetization |

---

## Files Referenced
- Primary research conducted: Feb 8, 2026
- Tools analyzed: NeedlePaint, StitchFiddle, Pic2Pat, Remove.bg, Photopea, Figma
