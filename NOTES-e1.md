# Session E1: sign-in and admin with nothing fake left

27 Sep 2026. Branch `feat/e1-auth` in both repos, built on `feat/d-collections`. It was tested on
`advpos_e1`, a local copy of the live backup of 26 Sep with migrations 26, 30–33, 35 and 36 applied,
plus 37 and 38 from this session. **Nothing was run on live. Nothing was pushed or merged.**

## OWNER MUST SEE

1. **Every active staff account on the 26 Sep copy still uses a password anybody can know.**
   - 7 of the 11 accounts that existed before this session sign in with `Vizo@1234`, the password the
     old New User form gave everybody.
   - The other 4 use the seed passwords written in `06_neon_auth.sql` and `HANDOFF.md`.
   - This was checked by BCrypt-verifying the known defaults against the local copy only. No names
     are listed here.
   - Migration 37 does **not** force these accounts to change, because that would send everybody
     to `/setup` at once. That is your decision. You have two ways to do it:
     - **One by one:** Setup → Users → (user) → **Password → Set a temporary password**. This takes
       effect immediately.
     - **Everyone at their next sign-in, without changing any password now:** run
       ```sql
       UPDATE "User" SET "MustChangePassword" = true, "TemporaryPasswordHash" = "PasswordHash",
              "TemporaryPasswordIssuedAt" = now() AT TIME ZONE 'Asia/Karachi'
        WHERE "IsActive" AND "RoleId" IN (SELECT "RoleId" FROM "Role" WHERE "IsStaffRole");
       ```
       Each person can still sign in with their current password once, and is then made to choose
       their own on `/setup`.
2. **Email must work in production for "forgot password" and invites.**
   - `EmailSettings` in `appsettings.json` is the Gmail account `muhammadtalhabinsuhail@gmail.com`
     with an app password.
   - It was not sent through during testing (see "How email was tested").
   - If that account's app password has been revoked, then:
     - the forgot-password screen still answers normally, and the failure is written only to the API
       log;
     - the Super Admin is told **"could not be emailed"** and is still shown the temporary password.
   - After deploying, send one test from Setup → Users → (another admin) → **Password → Email a
     reset code**.
3. **Migration 38 deletes the 5 rows that were in `BackupHistory`.** They were seed data describing
   backups that never happened ("MinIO Primary", 1.2 GB, `sha256:a8f9…`). No real backup had ever
   been taken.

## What was wrong, and what it is now

| # | Before | Now |
|---|---|---|
| 1 | `/forgot-password` posted to an action that was commented out in `AuthController`, so it returned 404. Also, **`PasswordResetCode`'s timestamps were mapped as `timestamptz`**, so even with that action restored, the first code would have failed to save (HANDOFF trap 12), and `reset-password` could never mark a code as spent. The reset flow had never worked end to end. | New `PasswordRecoveryController`: `POST api/auth/forgot-password`. It gives the same generic reply for every address, works for active staff only, spends any old codes, stores a 6-digit code as a BCrypt(11) hash, and sets the expiry from `PasswordReset:CodeExpiryMinutes`. The email goes out **after** the reply, so the response time does not reveal which addresses are real, and unknown addresses pay for a dummy BCrypt check. Each address gets at most one code per minute. SMTP failures are logged and never revealed. The timestamp mapping is fixed in `PasswordResetCode.cs` (annotations). |
| 2 | Admin "Send password reset" overwrote the password hash with a random GUID and sent nothing, which locked the person out. | The **Password** menu on the user page has two options. **Email a reset code**: a real code is sent, the current password keeps working, and the person finishes on the Forgot password screens. If the mail fails, the admin gets a 502 saying so, and the undelivered code is spent. **Set a temporary password**: the password is shown to the admin once, can also be emailed, the old password stops working, and the person must change it at sign-in. |
| 3 | `/setup` waited 700 ms and showed a toast. | It posts to the new `POST api/account/change-password`, which checks the temporary password, sets the new one and clears the flag in one save. Its checklist now shows all four API password rules; the lowercase rule was missing. It refuses a wrong temporary password on that field, and refuses reusing it. |
| 4 | Every new user got `Vizo@1234`, and "Send invite email" was ignored. | The server generates a 12-character random password (`Kp7m-Xw3r-Tq9z`, which avoids look-alike characters) and returns it **once**. A dialog shows it with a Copy button. "Email the password too" really sends it. `User.MustChangePassword` is set (migration 37). `GET api/account/status` is checked after login and on every app load, and the user is sent to `/setup`. |
| 5 | `/locked` claimed "5 failed attempts in 10 minutes", "30 minutes" and "an email has been sent". | It now says an administrator locked the account and to ask them. It no longer shows a timer, a count, a claim that an email was sent, or a reset button. |
| 6 | The login page showed 4 real names and emails, fake "ORD-26-0175 · 24 items" / "PKR 65,400" cards, a hard-coded © 2026, `href="#"` links, and a "Keep me signed in" box that was never read. | The panels show only the role: label, icon and blurb. Clicking one focuses an **empty** email box. The floating cards now read "Orders packed & dispatched" and "Collections posted to the ledger", each with an icon and a shimmering bar. The year is the current year. The dead links are removed. **Keep me signed in** is now real: unticked means session cookies, which are gone when the browser closes. All the existing animation is kept. |
| 7 | "Backup & Restore" was fake: a RUNNING row that never finished, Download permanently disabled, and no restore. | **Run Backup Now** takes a real backup, and **Download** saves the zip. See the Backups section below. The page is now titled **Backups**, and it says plainly that restoring is done by the owner from the file. |

## Decisions

- **Item 2: both options.**
  - A reset code is the safe default, because nothing changes until the person acts.
  - A temporary password covers the person with no working email, and the case where a password
    may have been seen by someone else.
  - An admin cannot set a temporary password on their own account; that goes through Security.
- **The must-change flag is honest whichever screen the password is changed on.**
  - The column `TemporaryPasswordHash` keeps the hash the temporary password had. The account
    "must change" only while `PasswordHash` still equals it.
  - That covers changes made on the Security screen or with an emailed code. Both go through
    Talha's `AuthController`, which does not know about the flag.
  - `GET account/status` notices the change and clears the flag.
- **Where backups are stored: in the database, in a separate `BackupFile` table (`bytea`), not in
  Cloudinary.**
  - Why not Cloudinary:
    - The zip holds everything, including password hashes, so it must never sit at a public URL.
    - Cloudinary also blocks `.zip` delivery by default on these accounts (trap 11).
  - The database is about 16 MB, and each zip is about 100 KB.
  - The newest `Backup:KeepFiles` (default 7) files are kept. Older runs keep their history row,
    marked "File let go".
  - `BackupFile` is left out of the backup itself; otherwise each zip would contain all the earlier
    ones.
  - The page tells the owner to download the file and keep it off the server.
- **No restore button.** A restore replaces every row. `RESTORE.txt` inside the zip gives the
  procedure, into a fresh database.

## Built

**API (backend repo)**
- `Services/Mailer.cs`: a static MailKit sender used for the reset code and the temporary password.
  - It uses port 465 with SSL, otherwise STARTTLS. It never falls back to plain text.
  - It has a 15-second timeout.
  - If `EmailSettings:PickupDirectory` is set, it writes a `.eml` file instead of sending.
- `Services/Credentials.cs`:
  - the password rules, which mirror AuthController;
  - the temporary-password generator;
  - set, check and clear of the temporary password;
  - `IssueResetCodeAsync`.
- `Services/DatabaseBackup.cs`:
  - It uses one read-only REPEATABLE READ snapshot.
  - It runs `COPY "T" TO STDOUT (FORMAT csv, HEADER)` for every public table and zips the results.
  - The zip also contains `sequences.csv`, `manifest.json` and `RESTORE.txt`.
    - `manifest.json` lists the row counts and the **migration level, detected by probing** rather
      than stored, so it cannot go stale when E2 or E3 add migrations.
    - It also gives a **load order** worked out from the foreign keys (Tarjan). The only cycle is
      User ↔ Location.
- `Controllers/PasswordRecoveryController.cs`: `POST api/auth/forgot-password`.
  - **If Talha ever restores his commented-out action, delete this file**, or the two will clash on
    the same route.
- `Controllers/AccountController.cs`: `GET api/account/status` and `POST api/account/change-password`.
- `AdminUsersController`:
  - `POST users` now generates the password, emails the invite and returns `temporaryPassword` once.
  - `POST users/{id}/password-reset` is now the code-by-email option.
  - New: `POST users/{id}/temporary-password {sendEmail}`.
  - `GET users/{id}` adds `mustChangePassword` and `temporaryPasswordIssuedAt`.
- `AdminBackupController`:
  - `POST backups/run` does the real run. It refuses a second run while one is in progress (409),
    and marks stale RUNNING rows older than 15 minutes as FAILED.
  - `GET backups/{id}/download` returns the zip. Downloads are logged.
  - The list gains `tableCount`, `rowTotal`, `error`, `hasFile`, `sizeBytes` and `fileName`.
  - The stats now count only stored files, and the success rate counts only finished runs.
- Models:
  - `User.Custom.cs`, `BackupHistory.Custom.cs` and `BackupFile.cs` are mapped with annotations.
  - `AppDbContext.Backups.cs` holds the DbSet.
  - `PasswordResetCode.cs` has the timestamp fix.
- **None of Talha's five files were touched.**

**Web (frontend repo)**
- `app/login/page.tsx`, plus a `.shimmerBar` class appended to `login.module.css`.
- `app/setup/page.tsx`, `app/locked/page.tsx`, and the wording on `app/forgot-password/page.tsx`. That
  screen now says "if that address belongs to a staff account…" to match the generic reply.
- `components/providers/session-provider.tsx`:
  - `saveSession(token, user, remember)`;
  - session cookies, remembered as `advpos-remember` so that the `/auth/me` refresh does not turn
    them back into persistent cookies;
  - `fetchMustChangePassword`;
  - the guard that sends the user to `/setup`.
- `components/layout/app-shell.tsx`: it does not show the app behind the redirect.
- `components/widgets/temporary-password-dialog.tsx`: the one-time password dialog, with Copy and a
  line reporting the email result.
- `app/(app)/admin/users/new/page.tsx`: no password is sent; the invite text is honest; the dialog
  shows after Create; the invite card is hidden when editing.
- `app/(app)/admin/users/[id]/page.tsx`: the Password menu, a "Must change password" pill, and a
  Password field.
- `app/(app)/admin/backup/page.tsx`: real stats, a history with contents, size, time taken,
  checksum and error, Download, and cards on phones.
- `lib/documents.ts`: `downloadFile(path, fallbackName)`. The history row carries `fileName`, because
  CORS does not expose `Content-Disposition`.

## Migrations (E1 range 37–38; local only, safe to run twice)
- `37_must_change_password.sql`: adds `User.MustChangePassword`, `TemporaryPasswordHash` and
  `TemporaryPasswordIssuedAt`.
- `38_backup_files.sql`:
  - creates the `BackupFile` table;
  - adds `BackupHistory.TableCount`, `RowTotal` and `ErrorMessage`;
  - deletes the seed rows, identified as `TableCount IS NULL`.

## Owner steps (deploy)
1. Run 37 and 38 on live **before** deploying the API. The new model reads those columns.
2. Optional: set `Backup:KeepFiles` (default 7).
3. Do not set `EmailSettings:PickupDirectory` in production.
4. After deploying:
   - send a test reset code to an admin;
   - take a backup and download it;
   - decide on OWNER MUST SEE item 1.

## How email was tested (and why no real address got mail)
- In `appsettings.Development.json` (gitignored), `EmailSettings:PickupDirectory` pointed at a
  scratch folder. `Mailer` wrote each message there as a `.eml` file, and the tests read the code and
  the password from it. **Nothing left the machine.**
- One timing check also sent a forgot-password request for an existing local address
  (`sara@vizo.com.pk`). It went only into the pickup folder.
- The failure path was tested by restarting the API with `EmailSettings__PickupDirectory=""` and
  `EmailSettings__SmtpHost=127.0.0.1`, `SmtpPort=2525`, where nothing listens.

## Evidence (local `advpos_e1`)

**API: 34/34 checks passed.**
- New user:
  - the password has the form `xxxx-xxxx-xxxx`;
  - the invite `.eml` contains it;
  - `Vizo@1234` in the request body is ignored (sign-in with it gives 401);
  - sign-in with the temporary password works, and status then shows `mustChangePassword: true`.
- Change-password refuses:
  - a wrong current password (on the right field);
  - a weak new password;
  - reuse of the temporary password.
- A valid change clears the flag. The temporary password then gives 401, and the new one gives 200.
- Forgot-password:
  - The reply is identical for a real address, an unknown one and garbage.
  - Only the real address produces a mail.
  - Exactly one live code is stored, as a BCrypt hash.
  - A repeat within 60 seconds creates no new code.
  - A wrong code gives 400. `verify-code` gives 200, `reset-password` gives 200, and the new
    password signs in. The spent code is then refused.
- Admin "Email a reset code": the current password **still works**, and the emailed code resets it.
- Admin temporary password:
  - the old password stops working;
  - the user must change it;
  - changing it through `Auth/change-password` (the Security screen) **clears the flag
    automatically**;
  - setting one on your own account gives 400.

**SMTP down: 6/6 passed.**
- Forgot-password still returns the identical 200, and the error is in the API log.
- Admin reset code gives 502 with the SMTP reason, and the code is spent.
- Create-with-invite gives 200, with `emailed:false` and the reason, and the password is still shown.

**Backup:**
- A run took 2 s: 97 tables, about 4,160 rows, a 101 KB zip.
- The SHA-256 matches the history row.
- `BackupFile` is not in the zip; `RESTORE.txt` and `sequences.csv` are.
- The row counts equal the database.
- Without a token the download gives 401; as the accountant it gives 403.
- **Restore round trip:**
  - The zip was downloaded through the API.
  - It was loaded into an empty copy of the schema in `loadOrder`: only User and Location needed the
    replica role, and the sequences were reset.
  - All 97 tables' row counts equal the manifest, and **every table's content md5 is identical** to
    the source (apart from the three log tables written after the snapshot).
  - The scratch database was dropped.

**Browser: headless Chromium on http://127.0.0.2:3006, 33/33 checks passed.**
- Login page (1440 and 375 px):
  - no staff names or emails, and no invented figures;
  - a panel click focuses an empty email box;
  - © shows the current year.
- Forgot-password done entirely in the browser at 375 px, with the code taken from the `.eml`.
- New User form:
  - the one-time dialog shows the password and "Also emailed to…";
  - the user page shows "Must change password".
- The new user signed in with **Keep me signed in off**:
  - both cookies had `expires = -1`, so they are session cookies;
  - the user landed on `/setup`, where a wrong temporary password was refused;
  - after saving, the user was on `/dashboard` and the flag was cleared.
- With the box **ticked**, the cookie was persistent.
- Typing `/sales/orders` while on a temporary password leads to `/setup`.
- Password menu at 375 px: the temporary-password dialog, and the "Reset code sent" toast.
- Locked account: the login goes to `/locked` with the honest text, at both widths.
- Backups: Run → "Backup taken", then Download saved `advpos-backup-….zip` (100 entries), at both
  widths.
- **No sideways scroll at 375 px** on login, forgot-password, setup, the user page, the dialog,
  locked and backups.

**Gate:**
- backend `dotnet build`: 0 errors, and no warnings in the new files;
- `tsc --noEmit`: clean;
- `eslint src`: 0 errors, 47 warnings. The warnings in the touched files are the existing
  `form.watch` and unused-directive ones.

## Found, not changed
- The backend has no **server-side** must-change gate: a person on a temporary password could still
  call the API directly with their token. They are that user anyway, so the only effect is skipping
  the nudge. A real gate would need middleware in `Program.cs` (Talha's).
- `AuthController.Login` has no automatic lockout; only the admin lock exists. The locked page now
  says exactly that. A real lockout needs a column and a change to Login (Talha's file).
- `AuthController.WriteLog` swallows its own exceptions with `Console.WriteLine`. That is harmless,
  but a failed log row is invisible.
- CORS does not expose `Content-Disposition`, so `lib/export.ts`'s xlsx downloads always fall back to
  their `fallbackName`. It is a one-line `.WithExposedHeaders("Content-Disposition")` in
  `Program.cs` (Talha's).
- A migration that adds a table or column should add one probe line to `DatabaseBackup.Probes`, so
  that the backup manifest reports the new level (E2: 39–40, E3: 41–42).
