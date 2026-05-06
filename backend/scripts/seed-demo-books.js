#!/usr/bin/env node

/**
 * Seed demo book data into Supabase using REST API
 * Usage: node backend/scripts/seed-demo-books.js [--clean]
 */

import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Node.js хувилбар шалгах (fetch дэмждэг эсэх)
if (typeof fetch === "undefined") {
  console.error("❌ Алдаа: Node.js хувилбар v18-аас дээш байх шаардлагатай.");
  process.exit(1);
}

// Скрипт хаанаас ажиллаж байгаагаас үл хамааран .env.local-ыг зөв олох
const envPath = path.resolve(__dirname, "../../frontend/.env.local");
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error("❌ .env.local файлыг уншиж чадсангүй:", result.error.message);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Seeding хийхэд Service Role Key ашиглах нь RLS дүрмийг алгасах боломжийг олгоно
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)?.trim();
const SUPABASE_KEY = SERVICE_ROLE_KEY || ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing Supabase environment variables");
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", SUPABASE_URL ? "✓" : "✗");
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", SERVICE_ROLE_KEY ? "✓" : "✗");
  console.log("\n💡 Зөвлөмж: frontend/.env.local файлдаа SUPABASE_SERVICE_ROLE_KEY-г нэмээрэй.");
  process.exit(1);
}

// JWT-ээс Project Ref-ийг унших туслах функц
const getProjectRefFromKey = (key) => {
  try {
    const parts = key.split('.');
    if (parts.length !== 3) return "Invalid JWT";
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.ref || "Unknown";
  } catch {
    return "Decode Error";
  }
};

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

if (!SERVICE_ROLE_KEY) {
  console.warn("⚠️  Анхаар: ANON_KEY ашиглаж байна. RLS тохиргооноос хамаарч амжилтгүй болох магадлалтай.");
}

console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
console.log(`🔑 Түлхүүр: ${SUPABASE_KEY.substring(0, 10)}... (Төрөл: ${SERVICE_ROLE_KEY ? 'Service Role' : 'Anon'})\n`);

const DEMO_BOOKS = [
  { title: "The Midnight Library", author: "Matt Haig", genre: "Fiction", language: "en", description: "A dazzling novel about all the choices that go into a life well lived.", total_copies: 5, available_copies: 5, is_public_readable: false },
  { title: "Project Hail Mary", author: "Andy Weir", genre: "Science Fiction", language: "en", description: "A lone astronaut must save Earth from extinction.", total_copies: 6, available_copies: 6, is_public_readable: false },
  { title: "The House in the Cerulean Sea", author: "TJ Klune", genre: "Fantasy", language: "en", description: "A cozy fantasy about an orphanage for magical children.", total_copies: 5, available_copies: 4, is_public_readable: true, reading_content: ["Chapter 1", "Chapter 2"] },
  { title: "Piranesi", author: "Susanna Clarke", genre: "Fantasy", language: "en", description: "A mysterious novel set in an impossible house.", total_copies: 4, available_copies: 3, is_public_readable: true, reading_content: ["Entry 1", "Entry 2", "Entry 3"] },
  { title: "The Seven Husbands of Evelyn Hugo", author: "Taylor Jenkins Reid", genre: "Fiction", language: "en", description: "Old Hollywood glamour and intrigue.", total_copies: 6, available_copies: 5, is_public_readable: false },
  { title: "The Thursday Murder Club", author: "Richard Osman", genre: "Mystery", language: "en", description: "Four friends form a murder club.", total_copies: 5, available_copies: 4, is_public_readable: false },
  { title: "A Deadly Education", author: "Naomi Novik", genre: "Fantasy", language: "en", description: "Dark academia fantasy about surviving magic school.", total_copies: 4, available_copies: 4, is_public_readable: false },
  { title: "The Silent Patient", author: "Alex Michaelides", genre: "Thriller", language: "en", description: "A woman shoots her husband then never speaks again.", total_copies: 6, available_copies: 6, is_public_readable: false },
  { title: "Educated", author: "Tara Westover", genre: "Memoir", language: "en", description: "A memoir about leaving a survivalist family.", total_copies: 5, available_copies: 5, is_public_readable: false },
  { title: "Atomic Habits", author: "James Clear", genre: "Self-Help", language: "en", description: "How small habits lead to remarkable results.", total_copies: 8, available_copies: 6, is_public_readable: false },
  { title: "Sapiens", author: "Yuval Noah Harari", genre: "History", language: "en", description: "A sweeping history of humankind.", total_copies: 7, available_copies: 5, is_public_readable: false },
  { title: "The Innovators", author: "Walter Isaacson", genre: "Technology", language: "en", description: "Stories of geniuses behind the digital revolution.", total_copies: 5, available_copies: 4, is_public_readable: false },
  { title: "A Brief History of Time", author: "Stephen Hawking", genre: "Science", language: "en", description: "An exploration of black holes and time.", total_copies: 6, available_copies: 5, is_public_readable: false },
  { title: "The Selfish Gene", author: "Richard Dawkins", genre: "Science", language: "en", description: "A revolutionary view of evolution.", total_copies: 4, available_copies: 4, is_public_readable: false },
  { title: "Braiding Sweetgrass", author: "Robin Wall Kimmerer", genre: "Nature", language: "en", description: "Indigenous wisdom and botanical science.", total_copies: 5, available_copies: 3, is_public_readable: true, reading_content: ["Introduction", "Part 1"] },
  { title: "Pride and Prejudice", author: "Jane Austen", genre: "Classics", language: "en", description: "A sharp, witty classic about first impressions, family pressures, and a love that learns to deserve itself.", total_copies: 12, available_copies: 12, is_public_readable: false, reading_content: ["It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife.", "However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.", "\"My dear Mr. Bennet,\" said his lady to him one day, \"have you heard that Netherfield Park is let at last?\"", "\"But it is,\" returned she; \"for Mrs. Long has just been here, and she told me all about it.\"", "\"Why, my dear, you must know, Mrs. Long says that Netherfield is taken by a young man of large fortune from the north of England; that he came down on Monday in a chaise and four to see the place, and was so much delighted with it that he agreed with Mr. Morris immediately; that he is to take possession before Michaelmas, and some of his servants are to be in the house by the end of next week.\"", "\"Oh, single, my dear, to be sure! A single man of large fortune; four or five thousand a year. What a fine thing for our girls!\"", "\"My dear Mr. Bennet,\" replied his wife, \"how can you be so tiresome? You must know that I am thinking of his marrying one of them.\"", "\"Design? Nonsense, how can you talk so! But it is very likely that he may fall in love with one of them, and therefore you must visit him as soon as he comes.\"", "\"I see no occasion for that. You and the girls may go -- or you may send them by themselves, which perhaps will be still better; for as you are as handsome as any of them, Mr. Bingley might like you the best of the party.\""] },
  { title: "Frankenstein", author: "Mary Shelley", genre: "Classics", language: "en", description: "A foundational Gothic novel about ambition, responsibility, and the loneliness created when invention outruns compassion.", total_copies: 10, available_copies: 10, is_public_readable: false, reading_content: ["You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings.", "I arrived here yesterday, and my first task is to assure my dear sister of my welfare and increasing confidence in the success of my undertaking.", "I am already far north of London, and as I walk in the streets of Petersburgh, I feel a cold northern breeze play upon my cheeks, which braces my nerves and fills me with delight.", "Do you understand this feeling? This breeze, which has travelled from the regions towards which I am advancing, gives me a foretaste of those icy climes."] },
  { title: "The Secret Garden", author: "Frances Hodgson Burnett", genre: "Classics", language: "en", description: "A restorative classic in which grief, friendship, and a neglected garden slowly bring a household back to life.", total_copies: 9, available_copies: 9, is_public_readable: false, reading_content: ["When Mary Lennox was sent to Misselthwaite Manor to live with her uncle everybody said she was the most disagreeable-looking child ever seen.", "It was true, too. She had a little thin face and a little thin body, thin light hair and a sour expression.", "Her hair was yellow, and her face was yellow because she had been born in India and had always been ill in one way or another.", "Her father had held a position under the English Government and had always been busy and ill himself, and her mother had been a great beauty who cared only to go to parties and amuse herself with gay people."] },
  { title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", genre: "Mystery", language: "en", description: "Twelve detective adventures filled with deduction, disguises, and the brisk intelligence of Baker Street.", total_copies: 11, available_copies: 11, is_public_readable: false, reading_content: ["To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name.", "In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler.", "All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind.", "He was, I take it, the most perfect reasoning and observing machine that the world has seen, but as a lover he would have placed himself in a false position."] },
  { title: "The Wonderful Wizard of Oz", author: "L. Frank Baum", genre: "Fantasy", language: "en", description: "A bright American fantasy about courage, tenderness, and the strange companions found on the road home.", total_copies: 8, available_copies: 8, is_public_readable: false, reading_content: ["Dorothy lived in the midst of the great Kansas prairies, with Uncle Henry, who was a farmer, and Aunt Em, who was the farmer's wife.", "Their house was small, for the lumber to build it had to be carried by wagon many miles.", "There were four walls, a floor and a roof, which made one room; and this room contained a rusty looking cookstove, a cupboard for the dishes, a table, three or four chairs, and the beds.", "When Aunt Em came there to live she was a young, pretty wife. The sun and wind had changed her, too."] },
  { title: "A Little Princess", author: "Frances Hodgson Burnett", genre: "Classics", language: "en", description: "A resilient coming-of-age classic about imagination, dignity, and kindness preserved under hardship.", total_copies: 8, available_copies: 7, is_public_readable: false, reading_content: ["Once on a dark winter's day, when the yellow fog hung so thick and heavy in the streets of London that the lamps were lighted and the shop fronts looked as if they were already beginning to prepare for night, there drove up to the door of Miss Minchin's Select Seminary for Young Ladies a rather dingy cab.", "It was the arrival of a new pupil who had left India with her papa to be placed at school.", "As the big cab drew up, Miss Minchin, who was watching it from the front drawing-room, came out to meet the little girl when she was brought into the house by her father.", "Sara Crewe was seven years old. She was a queer little figure, dressed in deep mourning, and holding herself very erect."] },
  { title: "The Poppy War", author: "R.F. Kuang", genre: "Fantasy", language: "en", description: "A dark fantasy inspired by Chinese history.", total_copies: 4, available_copies: 3, is_public_readable: false },
  { title: "Six of Crows", author: "Leigh Bardugo", genre: "Fantasy", language: "en", description: "A heist novel in a fantasy world.", total_copies: 6, available_copies: 4, is_public_readable: false },
  { title: "Maus", author: "Art Spiegelman", genre: "Graphic Novel", language: "en", description: "A graphic novel about the Holocaust.", total_copies: 3, available_copies: 3, is_public_readable: false },
  { title: "Milk and Honey", author: "Rupi Kaur", genre: "Poetry", language: "en", description: "Poetry about love, loss, and healing.", total_copies: 4, available_copies: 4, is_public_readable: false },
  { title: "The Haunting of Hill House", author: "Shirley Jackson", genre: "Horror", language: "en", description: "A masterpiece of psychological horror.", total_copies: 4, available_copies: 4, is_public_readable: false },
  { title: "Төрийн мэдээлэл", author: "Д. Баатар", genre: "History", language: "mn", description: "Монголын хаан улсын төрийн байгууллага.", total_copies: 4, available_copies: 4, is_public_readable: false },
  { title: "Эргүүлсэн ойлголт", author: "Л. Амарын", genre: "Philosophy", language: "mn", description: "Философийн ойлголт.", total_copies: 3, available_copies: 3, is_public_readable: false },
  { title: "Аялал ба авъяас", author: "М. Өнөр", genre: "Travel", language: "mn", description: "Аялалын дурсгал.", total_copies: 5, available_copies: 2, is_public_readable: false },
  { title: "Тунгалаг Тамир", author: "Ч. Лодойдамба", genre: "Classics", language: "mn", description: "Монголын орчин үеийн уран зохиолын сод бүтээл.", total_copies: 5, available_copies: 5, is_public_readable: false },
  { title: "Ногоон нүдэн лам", author: "Ц. Оюунгэрэл", genre: "Historical Fiction", language: "mn", description: "Хэлмэгдүүлэлтийн үеийн Монгол орны түүхийг харуулсан роман.", total_copies: 4, available_copies: 4, is_public_readable: false },
  { title: "Зүрхний хилэн", author: "Б. Ринчен", genre: "Historical Fiction", language: "mn", description: "Монголчуудын эрх чөлөө, тусгаар тогтнолын төлөөх тэмцлийг харуулсан бүтээл.", total_copies: 3, available_copies: 3, is_public_readable: false },
  { title: "Монголын нууц товчоо", author: "Unknown", genre: "History", language: "mn", description: "Монголын эртний түүх, соёлын гайхамшигт дурсгал.", total_copies: 10, available_copies: 10, is_public_readable: true, reading_content: ["1-р бүлэг: Чингис хааны язгуур", "2-р бүлэг: Тэмүжиний хүүхэд нас"] },
].map((book) => {
  const hasReaderText = Array.isArray(book.reading_content) && book.reading_content.length > 0;
  return {
    borrow_price: 0,
    borrow_currency: "MNT",
    ...book,
    is_public_readable: book.is_public_readable || hasReaderText,
  };
});

async function seedBooks() {
  console.log("🌱 Starting demo book data seed...\n");

  try {
    // Optional cleanup of old demo data
    if (process.argv.includes('--clean')) {
      console.log("🧹 Cleaning up old demo data...");
      const titles = DEMO_BOOKS.map(b => b.title);
      const { error: deleteError } = await supabase
        .from('books')
        .delete()
        .in('title', titles);

      if (deleteError) {
        console.warn("⚠️ Cleanup warning:", deleteError.message);
      } else {
        console.log("✅ Cleanup complete.\n");
      }
    }

    // Fetch existing books to avoid duplicates in one go
    console.log("📚 Fetching existing books from database...");
    const { data: existingBooks, error: checkError, status: checkStatus } = await supabase
      .from('books')
      .select('title, author');

    if (checkError) {
      if (checkStatus === 401) {
        console.error("❌ 401 Unauthorized: Таны SUPABASE_SERVICE_ROLE_KEY буруу байна.");
        console.log(`📍 API URL: ${SUPABASE_URL}`);
        console.log(`🔑 Key Ref: ${getProjectRefFromKey(SUPABASE_KEY)}`);
        console.log(`🔑 Key Prefix: ${SUPABASE_KEY.substring(0, 15)}...`);
        console.log("\n💡 Шалтгаан: Таны .env.local дахь түлхүүр энэ локал серверт тохирохгүй байна.");
        console.log("💡 Шийдэл: Таны CLI блок хийгдсэн тул хөтөч дээрээ http://localhost:54323 хаягаар орж");
        console.log("   Settings -> API хэсгээс шинэ 'service_role' түлхүүрийг хуулж авна уу.");
      }
      throw new Error(`Холболтын алдаа (${checkStatus}): ${checkError.message}`);
    }

    const existingLookup = new Set(
      existingBooks.map(b => `${(b.title || "").trim().toLowerCase()}|${(b.author || "").trim().toLowerCase()}`)
    );

    console.log(`✅ Өгөгдлийн сантай холбогдлоо. Одоо ${existingBooks.length} ном байна.`);

    // Filter out books that already exist
    const booksToInsert = DEMO_BOOKS.filter(book => {
      const key = `${(book.title || "").trim().toLowerCase()}|${(book.author || "").trim().toLowerCase()}`;
      return !existingLookup.has(key);
    });

    if (booksToInsert.length === 0) {
      console.log("✨ Бүх ном аль хэдийн бүртгэгдсэн байна. Нэмэх шаардлагагүй.");
      return;
    }

    console.log(`📖 Inserting ${booksToInsert.length} new demo books...\n`);
    
    // Batch insert using SDK
    const { error: insertError, status: insertStatus } = await supabase
      .from('books')
      .insert(booksToInsert);

    if (insertError) {
      throw new Error(`Batch insert failed (${insertStatus}): ${insertError.message}`);
    }

    console.log(`✅ Амжилттай: ${booksToInsert.length} ном нэмэгдлээ.`);
    console.log(`✨ Demo book data seed complete!`);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error("❌ Алдаа: Supabase сервер ажиллахгүй байна. (http://127.0.0.1:54321)");
      console.log("💡 Шийдэл: 'npx supabase start' тушаалыг ажиллуулна уу.");
    } else {
      console.error("❌ Алдаа гарлаа:", error.message);
    }
    process.exit(1);
  }
}

seedBooks();
