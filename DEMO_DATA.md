# Lumina AI Demo Book Data Guide

This guide explains how to work with the demo book data in Lumina AI, including setup, seeding, and testing.

## Overview

Lumina AI comes with comprehensive demo book data to support development, testing, and demonstrations. The data includes:

- **~50 books** across multiple genres and languages
- **Multiple languages**: English and Mongolian
- **Varied copy counts**: Some books have many copies available, others are fully borrowed
- **Public readable books**: Selected books for the public catalog feature
- **Reading content samples**: Preview content for demonstration

## Setup Methods

### Method 1: Automatic (Database Migration)

The simplest way to seed demo data is during database setup:

```bash
# From the repo root:
npm run db:push
```

This runs all pending migrations, including `20260429_add_demo_book_data.sql`, which:
- Inserts 20+ demo books into the database
- Skips any books that already exist (safe to run multiple times)
- Sets public readable flags and content for specific books

**Pros:**
- Automatic and seamless
- Part of standard database setup
- No additional dependencies

**Cons:**
- Less flexible if you need to customize the data
- Harder to debug if something goes wrong

### Method 2: Programmatic (Node.js Script)

For more control or to refresh demo data during development:

```bash
# From the repo root:
npm run seed:books
```

This runs `backend/scripts/seed-demo-books.js`, which:
- Connects to your Supabase project
- Inserts demo books one by one
- Provides detailed console feedback
- Handles duplicate entries gracefully

**Pros:**
- More control and flexibility
- Better error reporting
- Can be easily modified for custom seeding

**Cons:**
- Requires Supabase environment variables to be configured
- Slightly slower than migration (O(n) inserts vs batch insert)
- Additional Node.js dependency

## Book Data Structure

Each book record contains:

```javascript
{
  title: string,           // Book title
  author: string,          // Author name
  genre: string,           // Genre (Fiction, Science Fiction, etc.)
  language: string,        // Language code (en, mn)
  description: string,     // Book description/blurb
  total_copies: number,    // Total copies in library
  available_copies: number, // Currently available copies
  is_public_readable: boolean, // Whether book appears in public catalog
  reading_content: string[] | null, // Array of chapter/reading samples
}
```

## Available Demo Books

### English Fiction & Literature (11 books)
- The Midnight Library - Matt Haig
- Project Hail Mary - Andy Weir
- The House in the Cerulean Sea - TJ Klune (PUBLIC)
- Piranesi - Susanna Clarke (PUBLIC)
- The Seven Husbands of Evelyn Hugo - Taylor Jenkins Reid
- A Brief History of Time - Stephen Hawking
- Sapiens - Yuval Noah Harari
- The Innovators - Walter Isaacson

### Mystery & Thriller (3 books)
- The Thursday Murder Club - Richard Osman
- A Deadly Education - Naomi Novik
- The Silent Patient - Alex Michaelides

### Science & Nature (5 books)
- Atomic Habits - James Clear
- The Selfish Gene - Richard Dawkins
- Braiding Sweetgrass - Robin Wall Kimmerer (PUBLIC)

### Fantasy & Adventure (5 books)
- The Poppy War - R.F. Kuang
- Six of Crows - Leigh Bardugo

### Memoir & Essays (1 book)
- Educated - Tara Westover

### Graphic Novel & Poetry (2 books)
- Maus - Art Spiegelman
- Milk and Honey - Rupi Kaur

### Horror (1 book)
- The Haunting of Hill House - Shirley Jackson

### Mongolian (3 books)
- Төрийн мэдээлэл - Д. Баатар (History)
- Эргүүлсэн ойлголт - Л. Амарын (Philosophy)
- Аялал ба авъяас - М. Өнөр (Travel)

## Usage Examples

### Example 1: Running with Demo Data

After seeding, the library will display:
- Full list of books in the catalog
- Books with varying availability (some fully available, some borrowed)
- Mongolian books for language testing
- Public readable books in the public catalog

### Example 2: Testing Borrowing

1. Seed the demo data: `npm run seed:books`
2. Sign in with a test user
3. Browse the catalog (all books visible)
4. Click "Borrow" on any book
5. See the book added to "My Loans"
6. Available copies decrease by 1

### Example 3: Testing Search & Filter

With demo data, you can test:
- **Search by title**: "Midnight Library", "Project Hail"
- **Filter by genre**: Fiction, Science Fiction, Fantasy, etc.
- **Filter by language**: English, Mongolian
- **Sort by availability**: Some books have 0 copies, others have many

### Example 4: Testing AI Recommendations

The demo books span diverse genres, allowing the AI assistant to:
- Make relevant recommendations based on reading history
- Understand user preferences
- Suggest books across different genres

## Customizing Demo Data

### Adding More Books

Edit `backend/scripts/seed-demo-books.js` and add to the `DEMO_BOOKS` array:

```javascript
{
  title: "Your Book Title",
  author: "Author Name",
  genre: "Genre",
  language: "en",
  description: "Book description here",
  total_copies: 5,
  available_copies: 3,
  is_public_readable: false,
}
```

Then run:
```bash
npm run seed:books
```

### Making Books Public Readable

To make a book appear in the public catalog, set:
```javascript
is_public_readable: true,
reading_content: [
  "Chapter 1 preview...",
  "Chapter 2 preview...",
]
```

### Resetting Demo Data

To clear and reseed all demo data:

```bash
# Delete existing books (in Supabase dashboard or via SQL)
DELETE FROM public.books WHERE id LIKE 'seed-%' OR author IN (select author from seed);

# Re-seed
npm run seed:books
```

## Testing Checklist

Use the demo data to test:

- [ ] **Browse Catalog**: All books visible in catalog view
- [ ] **Search**: Search by title, author, genre works
- [ ] **Filter**: Filter by genre, language, availability
- [ ] **Book Details**: Click book to see full details
- [ ] **Borrowing**: Borrow a book, see it in "My Loans"
- [ ] **Availability**: Some books show "No copies available"
- [ ] **Public Catalog**: Public books appear in public reading section
- [ ] **Localization**: Mongolian books display correctly
- [ ] **Recommendations**: AI recommends books based on demo data
- [ ] **Admin Panel**: Admin can see and manage demo books

## Troubleshooting

### Issue: `npm run seed:books` fails with auth error

**Solution**: Ensure your Supabase environment variables are set:
```bash
# In frontend/.env.local, verify:
NEXT_PUBLIC_SUPABASE_URL=<your-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
SUPABASE_SERVICE_ROLE_KEY=<optional-service-key>
```

### Issue: Books already exist, won't seed again

**Solution**: This is by design (prevents duplicates). To force reseed:

1. Delete existing books in Supabase dashboard
2. Run `npm run seed:books` again

### Issue: Migration fails with duplicate error

**Solution**: The migration checks `if not exists` before inserting, so it's safe to run multiple times. If it still fails:

1. Check if books table exists
2. Ensure migrations have been applied
3. Run `npm run db:push` again

## Performance Notes

- **Migration seeding**: Fast (batch insert), ~1-2 seconds
- **Script seeding**: Slower (individual inserts), ~5-10 seconds
- **Database query**: All 50 books load instantly
- **UI rendering**: No performance issues with demo data volume

## Next Steps

Once demo data is seeded:

1. **Start development**: `npm run dev`
2. **Test features**: Use the demo books to test functionality
3. **Create accounts**: Make test accounts and borrow books
4. **Demo to stakeholders**: Use the populated library for demonstrations
5. **Performance testing**: Test with realistic data volumes

For more information, see [README.md](./README.md) and the main backend [README.md](./backend/README.md).
