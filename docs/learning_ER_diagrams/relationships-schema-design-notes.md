# Relationship Types & Schema Design — Working Notes

Consolidated from the expense-tracker / university / restaurant / hospital
practice sessions. This is the reasoning method, not just definitions —
use the *tests* below to derive an answer live, rather than recalling one.

---

## 1. The two-direction cardinality test

Never classify a relationship by "there are many of both" — that's true of
almost everything and tells you nothing. Always check **both directions
separately**:

> Can one **X** have many **Y**? Can one **Y** have many **X**?

| Direction 1 | Direction 2 | Relationship |
|---|---|---|
| capped at 1 | capped at 1 | **One-to-one** |
| capped at 1 | many | **One-to-many** (from the "many" side, this is "many-to-one") |
| many | many | **Many-to-many** |

Common trap: "a student can take many courses" sounds like one-to-many,
but the *other* direction ("a course can have many students") is also
true — so it's actually many-to-many. Always check both directions before
naming the type.

Non-trap that looks similar: an attribute of an entity (a student's age)
is **not** a second entity, so it can't form a 1:1 relationship at all —
1:1 requires two things that could each stand alone as their own table.

---

## 2. Foreign key placement

**One-to-many:** the FK is *forced* onto the "many" side. A column can
only hold one value; the "one" side would need to hold multiple values in
a single column, which isn't possible. `expenses.category_id`,
`students.university_id`, `doctor.department_id` — all "many" side.

**One-to-one:** either side *could* technically hold the FK — this is an
actual design decision, not forced. Put the FK on the side that's more
likely to not exist yet / is optional (e.g. `students.passport_id`,
nullable, since not every student has a passport yet). Add a `UNIQUE`
constraint on that FK column — without it, nothing stops two rows on the
"one" side pointing at the same row on the other side, which would quietly
turn it into one-to-many.

**Many-to-many:** neither side can hold the FK directly — both would need
to store multiple values in one column. Requires a third table (see
pivot tables, below).

---

## 3. Self-referential vs. ordinary FK — the actual test

A relationship is self-referential **only when the FK and the PK it
points to live in the same table.**

- `categories.parent_id → categories.category_id` — same table both ends
  → self-referential.
- `menu_items.category_id → categories.category_id` — different tables
  → ordinary one-to-many, even though the table it points to (`categories`)
  happens to have a hierarchy inside it.

**Common mistake to avoid:** building a *separate* table for the "child"
concept (e.g. a standalone `beverages` table for sub-categories, or a
`sub_departments` table) instead of adding one nullable `parent_id` column
to the *same* table. Two tables referencing each other isn't
self-referential — it's just two flat tables, and it risks a circular FK
dependency (neither table can be created first).

**Correct self-referential design (one table only):**

```
categories
  category_id   INT PK, auto-increment
  name          VARCHAR
  parent_id     INT, nullable, FK → categories.category_id
```

Top-level rows get `parent_id = NULL`. A child row's `parent_id` holds the
**id number** of its parent row — not a name, not a different column name,
just the parent row's own primary key value.

---

## 4. Pivot tables (resolving many-to-many)

A foreign key column holds exactly one value. In a many-to-many
relationship, *both* sides would need to hold multiple values in a single
column — impossible. The fix: drop a third table (pivot / junction table)
in the middle, turning one many-to-many relationship into two ordinary
one-to-many relationships.

```
[Actor] --(1)--< Performance >--(N)-- [Movie]
```

### Pivot table primary key: composite vs. surrogate

- **Composite key** `(actor_id, movie_id)` works *only if* that exact
  pairing can never legitimately repeat.
- **Surrogate key** (auto-incrementing `id`) is required when the pairing
  *can* repeat — e.g.:
  - A student retaking the same course in a later term (`enrollments`).
  - An order containing two separate lines for the same dish
    (`order_items` — solved more simply with a `quantity` column instead
    of two rows, when the repeat happens *within the same transaction*).
  - A patient seeing the same doctor again for a follow-up
    (`appointments`).

When using a surrogate key, add a `UNIQUE` constraint on the columns that
*should* still block accidental duplicates (e.g.
`UNIQUE(student_id, course_id, term, year)` allows a retake in a
*different* term/year, but blocks registering for the same course twice
in the *same* term).

### Pivot table "meeting attributes"

The pivot table is also the correct place for data that only exists
because the two entities met — not before, and not derivable from either
side alone: `quantity` and `price_at_order` on `order_items`; `grade` on
`enrollments`; `salary`/`character_name` on an Actor–Movie `Performance`
table.

---

## 5. Snapshot vs. live-reference columns

When a pivot or child table could either store a value directly or just
look it up via FK, use this test:

> **Does the live value drift over time in a way that would make a past
> record wrong if you always looked it up fresh?**

- **Snapshot it** (store a frozen copy) when yes — e.g. `price_at_order`
  on `order_items`. If `menu.price` changes next month, last month's
  order should still show what was actually charged. This is deliberate,
  intentional denormalization: duplicating data on purpose because "always
  derive it live" would silently corrupt historical accuracy.
- **Reference it live** via the FK, no snapshot column, when no — e.g. a
  waiter's name, a dish's display name, a customer's ID. These don't need
  to be "frozen in time"; the relationship itself (which waiter served
  this order) never changes, so showing the current name is fine (often
  preferable).

This is the same reasoning behind denormalized snapshot columns seen in
real production schemas (e.g. a CRM's `property_showings` table storing
snapshot fields rather than always live-joining).

---

## 6. Worked schemas from this sprint

**Expense Tracker:** `categories` (self-referencing via `parent_id`) →
`expenses` (ordinary 1:many via `category_id`).

**University enrollment:**
`universities` → `students` (1:many) · `students` ↔ `courses` via
`enrollments` pivot (many:many, surrogate PK, `UNIQUE(student_id,
course_id, term, year)` to allow retakes across terms).

**Restaurant:**
`categories` (self-referencing) → `menu_items` (1:many) ·
`orders` ↔ `menu_items` via `order_items` pivot (many:many, surrogate PK,
`quantity` + `price_at_order` snapshot) · `waiter`/`customer` → `orders`
(1:many, live-referenced, no snapshot needed).

**Hospital appointments:**
`hospital` → `department` (1:many) · `department` self-referencing via
`parent_id` (sub-departments) · `department` → `doctor` (1:many) ·
`doctor`/`patient` ↔ `appointment` via pivot (many:many, surrogate PK) ·
`status` is a plain enum column on `appointment` — **not** a relationship
of any kind, just an attribute (a value having "only one state at a time"
does not make it a 1:1 relationship — this was a recurring trap).

---

## 7. Recurring mistakes to watch for (caught and fixed this sprint)

1. Calling something 1:1 because an entity only has "one" of an
   *attribute* (age, status) — attributes aren't entities; there's no
   relationship to name at all.
2. Calling something 1:many by only checking one direction (students →
   courses) without checking the reverse — it was actually many:many.
3. Building a separate table for a self-referential concept instead of
   adding a `parent_id` column to the same table (categories/beverages,
   department/sub_departments).
4. Using a composite PK on a pivot table without checking whether the
   pairing can repeat.
5. After fixing a table's columns, forgetting to update the ER diagram's
   relationship lines to match the new/renamed columns — lines pointing
   at columns that no longer exist.
6. Duplicating a foreign key on both sides of a relationship "just in
   case" instead of picking the one side the cardinality actually forces
   it onto.
