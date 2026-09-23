
# Expense Tracker — Laravel CRUD Interview Notes

Prep notes for Spectivis Technologies interview (Sun, Sept 27). Building an
Expense Tracker (Laravel + React/Inertia) to get hands-on with CRUD,
relationships, and the request lifecycle — evaluator cares about explaining
decisions out loud, not just working code.

---

## Setup Recap

- Laravel project created with React starter kit (Inertia.js), Laravel's
  built-in auth, Registration enabled, email verification / 2FA / passkeys /
  password confirmation all skipped (unnecessary friction for a small
  practice CRUD project).
- `php artisan make:model Expense -mcr` → generated Model, Migration,
  resource Controller in one command.
- `expenses` table schema: `title` (string), `amount` (decimal 10,2),
  `category` (string), `date` (date), `notes` (text, nullable), plus
  Laravel's default `id` + timestamps.
- `Expense.php` model: `$fillable = ['title','amount','category','date','notes']`
  — controls which fields can be mass-assigned (e.g. via `Expense::create($data)`),
  protecting against unexpected/malicious fields being injected from form data.
- Route: `Route::resource('expenses', ExpenseController::class)->except(['show'])`
  registered **inside** the `auth` middleware group in `web.php` — so only
  logged-in users can hit any expense route. `show()` excluded and removed
  from the controller entirely (this app's edit form + index list already
  cover viewing a single expense — no separate detail view needed). Migration
  and route are separate concerns: migration builds the DB table, route maps
  URLs to controller methods.
- Decision: keeping this single-user for now (no `user_id` scoping yet);
  RBAC / multi-user scoping planned as a later addition — this is exactly
  where Policies come in (see `destroy()` notes below).

## MVC in Laravel (brief)

- **Model** — represents a table, talks to the DB via Eloquent ORM (no raw SQL).
- **View** — normally Blade, but here it's React components (Inertia renders these).
- **Controller** — middleman: receives request → asks Model for data → sends
  data to View.
- Flow: Route matches URL → Controller method runs → Controller calls Model
  → Controller returns `Inertia::render()` with data → React renders it.

## Architecture Diagram

A request-lifecycle diagram specific to this app (Browser → Route → Middleware
→ Controller → Model → Database, and the return path through
`Inertia::render()` → React → rendered UI) was generated and sent directly
in chat as a PNG (not stored here as a project doc — image uploads aren't
supported by this doc store). Regenerate it any time by asking for "the
architecture diagram" again.

Key things it calls out that a generic Laravel MVC diagram misses:

- **Middleware runs BEFORE the Controller** — it can reject the request early
  (401/redirect) without ever touching the Model. This is where the `auth`
  group check happens.
- **Validation happens INSIDE the Controller**, before any Model/DB call —
  bad data never reaches Eloquent.
- **Route model binding** (used in `edit`/`update`/`destroy`) folds "match
  route → fetch row" into one step — Laravel fetches the row automatically
  from the URL's `{expense}` id, no manual query in the controller body.
- **Inertia replaces the classic Blade "View"** — the Controller never
  renders HTML itself; it hands data + a component name to Inertia, and
  React renders client-side, without a full page reload.

## Controller: `index()`

```php
public function index()
{
    $expenses = Expense::all();

    return Inertia::render('Expenses/Index', [
        'expenses' => $expenses,
    ]);
}
```

**Q&A / things to be able to explain out loud:**

- `Expense::all()` → retrieves every row from `expenses` as an
  `Illuminate\Database\Eloquent\Collection` object — **not** a plain array.
  It behaves array-like (loopable, countable) but is a class with its own
  methods (`map()`, `filter()`, `pluck()`, etc.) wrapping an array of Model
  instances internally. Roughly translates to `SELECT * FROM expenses`.
- `'Expenses/Index'` string → tells Inertia which React component to render,
  resolved against `resources/js/Pages/Expenses/Index.tsx`. Inertia's real
  trick isn't just "skip Blade" — it enables a server-routed, client-rendered
  SPA without building a separate REST API: the controller still owns
  routing/data, but the browser never does a full page reload between pages
  (Inertia swaps components via XHR).
- At scale (e.g. 50k rows): never call `::all()` on a large table — risks
  memory overload and slow/crashing requests, and is useless to the user
  anyway (no one scrolls 50k rows). Correct approach: `Expense::paginate(15)`
  instead — wraps results with page metadata (`current_page`, `total`,
  `links`, etc.) that Inertia/React use to render pagination. Not applied in
  this project yet (small personal dataset) but named as the
  production-correct approach.

## Controller: `create()`

```php
public function create(): Response
{
    return Inertia::render('Expenses/Create');
}
```

**Q&A:**

- No parameters needed: unlike `edit()`, the `/expenses/create` route has
  no `{expense}` segment in its URL — there's no existing row to fetch, so
  no route model binding parameter is needed. Passing `Expense $expense`
  here (a mistake made and corrected while building this) would have
  Laravel's container construct an empty, unsaved `Expense` instance for
  no reason, since there's nothing in the URL to bind against.
- No second argument to `Inertia::render()` either — an empty form has no
  props to pass.
- `create()` vs `edit()` distinction: `edit()` needs `Expense $expense`
  because its URL carries `{expense}`, which Laravel's route model binding
  uses to actually fetch the correct row from the database. `create()`'s
  URL carries nothing to fetch.

## Controller: `store()`

```php
public function store(Request $request)
{
    $validated = $request->validate([
        'title' => 'required|string|max:255',
        'amount' => 'required|numeric',
        'category' => 'required|string',
        'date' => 'required|date',
        'notes' => 'nullable|string',
    ]);

    Expense::create($validated);

    return redirect()->route('expenses.index');
}
```

**Q&A:**

- Why `$validated` instead of `$request->all()` in `create()`: this is a
  **mass assignment vulnerability** concern, not a "server overload" concern.
  `$request->all()` includes *every* field the client sent, including
  fields you never intended (e.g. `user_id`, `is_admin`) that a malicious
  client could inject via dev tools. `$validated` only contains the exact
  keys named in the validation rules. Combined with `$fillable` on the
  model, this is two layers of protection.
- `$fillable` and `create()`: Eloquent models are **fully guarded by
  default** — nothing is mass-assignable unless `$fillable` (allow-list) or
  `$guarded` (block-list) is declared. Forgetting `$fillable` entirely means
  `Expense::create($validated)` throws a `MassAssignmentException` — not
  that it "ignores bad requests." `$fillable` is the gatekeeper that
  decides which keys `create()`/`update()` are allowed to touch.
- Validation failure behavior: `$request->validate([...])` throws a
  `ValidationException` automatically on failure — no manual `if`/`try-catch`
  needed. Execution stops immediately; `create()`/`redirect()` never run.
  For a normal request, Laravel redirects back to the previous page with
  errors flashed into the session; Inertia exposes these as an `errors`
  prop automatically for the React form to display.

## Controller: `edit()`

```php
public function edit(Expense $expense): Response
{
    return Inertia::render('Expenses/Edit', [
        'expense' => $expense
    ]);
}
```

**Q&A:**

- Route model binding: type-hinting `Expense $expense` (matching the
  `{expense}` route parameter name generated by `Route::resource`) tells
  Laravel to automatically fetch the row from the URL segment — no manual
  query needed in the method body.
- Missing record (e.g. `/expenses/999/edit`): Laravel's binding runs
  `findOrFail()` internally. If no match, it throws `ModelNotFoundException`,
  which Laravel's exception handler converts into a 404 **before** the
  controller method body executes. Precise phrasing for the interview:
  "route model binding uses `findOrFail` under the hood, so a missing
  record short-circuits into a 404 automatically."
- Naming matters: the method parameter name must match the route
  parameter name (`{expense}` ↔ `$expense`) for binding to resolve
  automatically — this is convention over configuration.
- Route model binding ≠ authorization. It only guards against "row doesn't
  exist." It does NOT check "does this user have permission to view/edit
  this specific row" — that's a separate concern (Policies/Gates, see
  `destroy()` below).
- vs. Supabase/Next.js comparison: in Supabase you write the fetch query
  by hand every time (`.select().eq('id', id).single()`) inside your route
  handler. Route model binding moves that responsibility out of the
  controller body and into the framework's routing layer — you just
  declare the typed parameter and the model shows up already loaded (or
  the request never reaches your method).
- `Response` return type hint requires `use Inertia\Response;` at the top
  of the controller (different from `Illuminate\Http\Response`) — worth
  double-checking this import exists whenever using the return type hint.

## Controller: `update()`

```php
public function update(Request $request, Expense $expense)
{
    $validated = $request->validate([
        'title' => 'required|string|max:255',
        'amount' => 'required|numeric',
        'category' => 'required|string',
        'date' => 'required|date',
        'notes' => 'nullable|string',
    ]);

    $expense->update($validated);

    return redirect()->route('expenses.index')
        ->with('success', 'Expenses updated successfully!');
}
```

**Q&A:**

- Static vs. instance calls: `Expense::create()` is static because there's
  no existing row — Eloquent is creating a new one. `$expense->update()`
  is an instance call because `$expense` already represents one specific
  row (its primary key is known from route model binding); calling
  `->update()` runs `UPDATE expenses SET ... WHERE id = <this row's id>`.
- Partial updates are safe: `->update($validated)` only touches columns
  present in the array. Untouched columns (`id`, `created_at`, any column
  not in `$validated`) are left alone — Eloquent doesn't null out
  unlisted fields.
- Un-fillable column: if a new column (e.g. `is_recurring`) is added to
  the table but not to `$fillable`, `->update()` **silently ignores** it —
  no error, it just doesn't persist. Common source of confusing bugs;
  check `$fillable` first when a field mysteriously won't save.
- Flash messages + Inertia gap: `->with('success', ...)` flashes into the
  Laravel session, but this does **not** automatically reach a React
  component. In vanilla Laravel+Blade, a template reads it via
  `session('success')`. With Inertia, this requires **shared data**
  configured in `app/Http/Middleware/HandleInertiaRequests.php` (a
  `share()` method exposing the flash message as a prop on every Inertia
  response). Without that middleware config, the flash exists in the
  session but React never sees it — good concrete example of why
  middleware matters. (Not yet wired up — TODO before this flash message
  actually works.)
- Duplicated validation rules (`store` vs `update`): Laravel's answer is a
  **Form Request** class (`php artisan make:request StoreExpenseRequest`)
  — rules live in a dedicated class's `rules()` method, and Laravel runs
  validation automatically before the controller method body runs:
  ```php
  public function store(StoreExpenseRequest $request)
  {
      Expense::create($request->validated());
  }
  ```

  One-sentence distinction: a Form Request moves validation rules out of
  the controller into their own reusable, independently testable class,
  vs. inline `$request->validate([...])` which ties the rules to that one
  method and duplicates across methods needing the same checks. Not yet
  implemented in this project — named as the correct refactor.
- Race condition: if Tab A deletes an expense and Tab B (with the stale
  edit form still open) submits an update for that same ID, nothing
  "syncs" between tabs automatically (no websockets/polling configured).
  Tab B's submission hits `update()`, route model binding's `findOrFail()`
  fails to find the row, and the user gets a 404 mid-submission with
  their edits lost.

## Controller: `destroy()`

```php
public function destroy(Expense $expense)
{
    $expense->delete();

    return redirect()->route('expenses.index')
        ->with('message', 'Expense deleted successfully!');
}
```

**Q&A:**

- Hard delete vs. soft delete: this is a **hard delete** — the row is
  permanently removed. Soft delete requires the `SoftDeletes` trait on the
  model plus a nullable `deleted_at` column on the table; `->delete()`
  then just sets `deleted_at` to now, and normal queries auto-exclude
  soft-deleted rows unless `withTrashed()` is used. Current migration has
  no `deleted_at` column and the model has no `SoftDeletes` trait, so
  deletes here are permanent.
- IDOR vulnerability (important, real gap in current single-user build):
  `destroy()` has no ownership check — any logged-in user could delete
  *any* expense by ID, not just their own, since the only guard right now
  is "authenticated," never "owns this specific record." This is called
  an **Insecure Direct Object Reference**.
- Laravel's fix (Tier 2 — name and describe, not yet implemented): a
  **Policy** class (`ExpensePolicy`) with methods like
  `delete(User $user, Expense $expense): bool` checking ownership (e.g.
  `$user->id === $expense->user_id`), invoked via
  `$this->authorize('delete', $expense)` in the controller — Laravel
  throws a 403 automatically on failure. This is the natural next step
  once `user_id` scoping is added (see Setup Recap decision above).

## Resource Controller — Full Picture

Final method set: `index`, `create`, `store`, `edit`, `update`, `destroy`.
`show()` deliberately excluded (`->except(['show'])` in the route
definition, method deleted from the controller) — this app has no need for
a dedicated single-expense detail view separate from the edit form.

## Still To Do

- [ ] Wire up `HandleInertiaRequests` middleware to share flash messages
  with React (needed for the `->with(...)` calls to actually display)
- [ ] Refactor `store()`/`update()` validation into Form Request classes
- [ ] Build React pages (`Index`, `Create`, `Edit`) under
  `resources/js/Pages/Expenses/`
- [ ] Decide on `user_id` scoping + `ExpensePolicy` for ownership checks
  (currently deferred — single-user for now)
- [ ] Consider `Expense::paginate()` instead of `::all()` if this becomes
  a talking point for "what would you change at scale"
