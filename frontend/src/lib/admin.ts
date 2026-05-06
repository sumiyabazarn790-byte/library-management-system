import { supabase } from "@/integrations/supabase/client";
import { saleListingsFeatureEnabled } from "@/lib/library";
import type {
  Book,
  LoanStatus,
  LoanWithBook,
  Profile,
  ProfileRole,
  SaleListing,
  SaleListingStatus,
} from "@/types/library";

export type AdminLoan = LoanWithBook & {
  profile: Profile | null;
};

export type AdminSaleListing = SaleListing & {
  book: Book | null;
  profile: Profile | null;
};

export type AdminBookInput = {
  id?: string;
  title: string;
  author: string;
  genre: string;
  language: string;
  description: string;
  coverUrl?: string | null;
  totalCopies: number;
  availableCopies: number;
  borrowPrice: number;
  borrowCurrency: string;
};

const fetchProfilesByIds = async (userIds: string[]) => {
  if (!userIds.length) {
    return {} as Record<string, Profile>;
  }

  const { data, error } = await supabase.from("profiles").select("*").in("id", userIds);

  if (error) {
    throw error;
  }

  return Object.fromEntries(((data ?? []) as Profile[]).map((profile) => [profile.id, profile]));
};

export const fetchAdminBooks = async () => {
  const { data, error } = await supabase.from("books").select("*").order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Book[];
};

export const upsertAdminBook = async (input: AdminBookInput) => {
  const totalCopies = Math.max(0, Math.trunc(input.totalCopies));
  const availableCopies = Math.min(totalCopies, Math.max(0, Math.trunc(input.availableCopies)));
  const borrowPrice = Math.max(0, Number.isFinite(input.borrowPrice) ? input.borrowPrice : 0);

  const payload = {
    title: input.title.trim(),
    author: input.author.trim(),
    genre: input.genre.trim(),
    language: input.language.trim() || "en",
    description: input.description.trim(),
    cover_url: input.coverUrl?.trim() || null,
    total_copies: totalCopies,
    available_copies: availableCopies,
    borrow_price: Number(borrowPrice.toFixed(2)),
    borrow_currency: input.borrowCurrency.trim().toUpperCase() || "MNT",
  };

  if (input.id) {
    const { data, error } = await supabase.from("books").update(payload).eq("id", input.id).select("*").single();

    if (error) {
      throw error;
    }

    return data as Book;
  }

  const { data, error } = await supabase.from("books").insert(payload).select("*").single();

  if (error) {
    throw error;
  }

  return data as Book;
};

export const deleteAdminBook = async (bookId: string) => {
  const { error } = await supabase.from("books").delete().eq("id", bookId);

  if (error) {
    throw error;
  }
};

export const fetchAdminLoans = async (limit = 60) => {
  const { data, error } = await supabase
    .from("loans")
    .select("*, book:books(*)")
    .order("loaned_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const loans = (data ?? []) as unknown as LoanWithBook[];
  const profileMap = await fetchProfilesByIds(Array.from(new Set(loans.map((loan) => loan.user_id))));

  return loans.map((loan) => ({
    ...loan,
    profile: profileMap[loan.user_id] ?? null,
  })) as AdminLoan[];
};

export const updateAdminLoanStatus = async (loanId: string, status: LoanStatus) => {
  const { data, error } = await supabase.rpc("admin_update_loan_status", {
    p_loan_id: loanId,
    p_next_status: status,
  });

  if (error) {
    throw error;
  }

  return data;
};

export const fetchAdminSaleListings = async (limit = 60) => {
  if (!saleListingsFeatureEnabled) {
    return [] as AdminSaleListing[];
  }

  const { data, error } = await supabase
    .from("sale_listings")
    .select("*, book:books(*)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const listings = (data ?? []) as unknown as Array<SaleListing & { book: Book | null }>;
  const profileMap = await fetchProfilesByIds(Array.from(new Set(listings.map((listing) => listing.user_id))));

  return listings.map((listing) => ({
    ...listing,
    profile: profileMap[listing.user_id] ?? null,
  })) as AdminSaleListing[];
};

export const updateAdminSaleListingStatus = async (listingId: string, status: SaleListingStatus) => {
  const { data, error } = await supabase
    .from("sale_listings")
    .update({ status })
    .eq("id", listingId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as SaleListing;
};

export const fetchAdminProfiles = async () => {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Profile[];
};

export const updateAdminProfileRole = async (profileId: string, role: ProfileRole) => {
  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", profileId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Profile;
};

export type MemberDetail = Profile & {
  loans: AdminLoan[];
  totalLoans: number;
  activeLoans: number;
  overdueLoans: number;
};

export const fetchMemberDetails = async (): Promise<MemberDetail[]> => {
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "member")
    .order("display_name", { ascending: true });

  if (profileError) {
    throw profileError;
  }

  const memberProfiles = (profiles ?? []) as Profile[];
  
  const { data: loans, error: loanError } = await supabase
    .from("loans")
    .select("*, book:books(*)")
    .in("user_id", memberProfiles.map(p => p.id))
    .order("loaned_at", { ascending: false });

  if (loanError) {
    throw loanError;
  }

  const loansByUserId: Record<string, AdminLoan[]> = {};
  for (const loan of (loans ?? []) as unknown as LoanWithBook[]) {
    if (!loansByUserId[loan.user_id]) {
      loansByUserId[loan.user_id] = [];
    }
    loansByUserId[loan.user_id].push({
      ...loan,
      profile: null,
    });
  }

  return memberProfiles.map(profile => {
    const memberLoans = loansByUserId[profile.id] ?? [];
    const now = new Date();
    const overdueLoans = memberLoans.filter(l => 
      l.status === "active" && new Date(l.due_date) < now
    ).length;

    return {
      ...profile,
      loans: memberLoans,
      totalLoans: memberLoans.length,
      activeLoans: memberLoans.filter(l => l.status === "active").length,
      overdueLoans,
    };
  });
};
