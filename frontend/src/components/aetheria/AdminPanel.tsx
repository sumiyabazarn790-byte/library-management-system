import { useEffect, useMemo, useState } from "react";
import { BookCopy, RefreshCw, Shield, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteAdminBook,
  fetchAdminBooks,
  fetchAdminLoans,
  fetchAdminProfiles,
  fetchAdminSaleListings,
  fetchMemberDetails,
  updateAdminLoanStatus,
  updateAdminProfileRole,
  updateAdminSaleListingStatus,
  upsertAdminBook,
  type AdminLoan,
  type AdminSaleListing,
  type MemberDetail,
} from "@/lib/admin";
import {
  formatLibraryDate,
  formatLibraryMoney,
  getBorrowCurrency,
  getBorrowPrice,
  saleListingsFeatureEnabled,
  toFriendlyLibraryError,
} from "@/lib/library";
import type { Book, LoanStatus, Profile, ProfileRole, SaleListingStatus } from "@/types/library";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type AdminPanelProps = {
  refreshKey: number;
  onLibraryChange?: () => void;
};

type BookDraft = {
  title: string;
  author: string;
  genre: string;
  language: string;
  description: string;
  coverUrl: string;
  totalCopies: number;
  availableCopies: number;
  borrowPrice: number;
  borrowCurrency: string;
};

const emptyBookDraft: BookDraft = {
  title: "",
  author: "",
  genre: "",
  language: "en",
  description: "",
  coverUrl: "",
  totalCopies: 1,
  availableCopies: 1,
  borrowPrice: 3500,
  borrowCurrency: "MNT",
};

const loanStatusLabel: Record<LoanStatus, string> = {
  requested: "Requested",
  active: "Active",
  returned: "Returned",
  cancelled: "Cancelled",
};

const saleStatusLabel: Record<SaleListingStatus, string> = {
  active: "Active",
  sold: "Sold",
  cancelled: "Cancelled",
};

const roleLabel: Record<ProfileRole, string> = {
  admin: "Admin",
  member: "Member",
};

const badgeVariantForState = (status: string) => {
  if (status === "active" || status === "admin" || status === "sold") {
    return "default" as const;
  }

  if (status === "requested") {
    return "secondary" as const;
  }

  if (status === "cancelled") {
    return "destructive" as const;
  }

  return "outline" as const;
};

const getProfileLabel = (profile: Profile | null, userId: string) => {
  if (profile?.display_name?.trim()) {
    return profile.display_name.trim();
  }

  return `User ${userId.slice(0, 8)}`;
};

export const AdminPanel = ({ refreshKey, onLibraryChange }: AdminPanelProps) => {
  const { isAdmin, user, refreshProfile } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<AdminLoan[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [members, setMembers] = useState<MemberDetail[]>([]);
  const [saleListings, setSaleListings] = useState<AdminSaleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [bookDraft, setBookDraft] = useState<BookDraft>(emptyBookDraft);

  const adminCount = useMemo(() => profiles.filter((profile) => profile.role === "admin").length, [profiles]);
  const activeLoans = useMemo(() => loans.filter((loan) => loan.status === "active").length, [loans]);
  const pendingRequests = useMemo(() => loans.filter((loan) => loan.status === "requested").length, [loans]);
  const activeListings = useMemo(
    () => saleListings.filter((listing) => listing.status === "active").length,
    [saleListings],
  );

  const resetBookForm = () => {
    setEditingBookId(null);
    setBookDraft(emptyBookDraft);
  };

  const loadAdminData = async () => {
    if (!isAdmin) {
      setBooks([]);
      setLoans([]);
      setProfiles([]);
      setMembers([]);
      setSaleListings([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [bookData, loanData, profileData, memberData, listingData] = await Promise.all([
        fetchAdminBooks(),
        fetchAdminLoans(),
        fetchAdminProfiles(),
        fetchMemberDetails(),
        fetchAdminSaleListings(),
      ]);

      setBooks(bookData);
      setLoans(loanData);
      setProfiles(profileData);
      setMembers(memberData);
      setSaleListings(listingData);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Admin data load failed";
      toast.error(toFriendlyLibraryError(message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, [isAdmin, refreshKey]);

  if (!isAdmin) {
    return null;
  }

  const updateDraft = <K extends keyof BookDraft>(key: K, value: BookDraft[K]) => {
    setBookDraft((current) => ({ ...current, [key]: value }));
  };

  const handleEditBook = (book: Book) => {
    setEditingBookId(book.id);
    setBookDraft({
      title: book.title,
      author: book.author,
      genre: book.genre,
      language: book.language,
      description: book.description,
      coverUrl: book.cover_url ?? "",
      totalCopies: book.total_copies,
      availableCopies: book.available_copies,
      borrowPrice: getBorrowPrice(book),
      borrowCurrency: getBorrowCurrency(book),
    });
  };

  const handleSaveBook = async () => {
    if (!bookDraft.title.trim() || !bookDraft.author.trim() || !bookDraft.genre.trim()) {
      toast.error("Title, author, genre заавал бөглөнө.");
      return;
    }

    setBusyKey("book-save");

    try {
      await upsertAdminBook({
        id: editingBookId ?? undefined,
        title: bookDraft.title,
        author: bookDraft.author,
        genre: bookDraft.genre,
        language: bookDraft.language,
        description: bookDraft.description,
        coverUrl: bookDraft.coverUrl,
        totalCopies: bookDraft.totalCopies,
        availableCopies: bookDraft.availableCopies,
        borrowPrice: bookDraft.borrowPrice,
        borrowCurrency: bookDraft.borrowCurrency,
      });

      toast.success(editingBookId ? "Номын мэдээлэл шинэчлэгдлээ." : "Шинэ ном нэмэгдлээ.");
      resetBookForm();
      await loadAdminData();
      onLibraryChange?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Book save failed";
      toast.error(toFriendlyLibraryError(message));
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteBook = async (book: Book) => {
    const confirmed = window.confirm(`"${book.title}"-ийг устгах уу? Холбогдсон loan болон listing-үүд хамт устна.`);
    if (!confirmed) {
      return;
    }

    setBusyKey(`book-delete-${book.id}`);

    try {
      await deleteAdminBook(book.id);
      toast.success(`"${book.title}" устгагдлаа.`);
      if (editingBookId === book.id) {
        resetBookForm();
      }
      await loadAdminData();
      onLibraryChange?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Book delete failed";
      toast.error(toFriendlyLibraryError(message));
    } finally {
      setBusyKey(null);
    }
  };

  const handleLoanAction = async (loanId: string, nextStatus: LoanStatus) => {
    setBusyKey(`loan-${loanId}-${nextStatus}`);

    try {
      await updateAdminLoanStatus(loanId, nextStatus);
      toast.success(`Loan төлөв ${loanStatusLabel[nextStatus]} боллоо.`);
      await loadAdminData();
      onLibraryChange?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Loan update failed";
      toast.error(toFriendlyLibraryError(message));
    } finally {
      setBusyKey(null);
    }
  };

  const handleListingAction = async (listingId: string, nextStatus: SaleListingStatus) => {
    setBusyKey(`listing-${listingId}-${nextStatus}`);

    try {
      await updateAdminSaleListingStatus(listingId, nextStatus);
      toast.success(`Sale listing ${saleStatusLabel[nextStatus]} боллоо.`);
      await loadAdminData();
      onLibraryChange?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Listing update failed";
      toast.error(toFriendlyLibraryError(message));
    } finally {
      setBusyKey(null);
    }
  };

  const handleRoleAction = async (profileId: string, nextRole: ProfileRole) => {
    setBusyKey(`role-${profileId}-${nextRole}`);

    try {
      await updateAdminProfileRole(profileId, nextRole);
      if (profileId === user?.id) {
        await refreshProfile();
      }
      toast.success(`Хэрэглэгчийн role ${roleLabel[nextRole]} боллоо.`);
      await loadAdminData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Role update failed";
      toast.error(toFriendlyLibraryError(message));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section id="admin" className="space-y-8 scroll-mt-24">
      <div className="rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top,rgba(73,128,255,0.18),transparent_45%),linear-gradient(135deg,rgba(8,13,30,0.96),rgba(17,24,39,0.92))] p-8 shadow-cinematic">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              <Shield className="size-4" />
              Admin Console
            </div>
            <div>
              <h2 className="text-headline-md">Library control center</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Каталог, бүх loan record, sale listing, хэрэглэгчийн role-уудыг эндээс удирдана.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className="border-primary/30 bg-background/30"
            onClick={() => void loadAdminData()}
            disabled={loading || busyKey !== null}
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-primary/15 bg-background/50">
            <CardHeader className="pb-3">
              <CardDescription>Catalog</CardDescription>
              <CardTitle className="text-3xl">{books.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-primary/15 bg-background/50">
            <CardHeader className="pb-3">
              <CardDescription>Active loans / Requests</CardDescription>
              <CardTitle className="text-3xl">
                {activeLoans} / {pendingRequests}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-primary/15 bg-background/50">
            <CardHeader className="pb-3">
              <CardDescription>Active listings</CardDescription>
              <CardTitle className="text-3xl">{activeListings}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-primary/15 bg-background/50">
            <CardHeader className="pb-3">
              <CardDescription>Admins / Members</CardDescription>
              <CardTitle className="text-3xl">
                {adminCount} / {Math.max(0, profiles.length - adminCount)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="catalog" className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-2xl bg-surface-high/70 p-2">
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="members">
            <Users className="mr-2 size-4" />
            Members
          </TabsTrigger>
          {saleListingsFeatureEnabled ? <TabsTrigger value="listings">Listings</TabsTrigger> : null}
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="glass-strong border-border/50">
            <CardHeader>
              <CardTitle className="text-xl">{editingBookId ? "Edit book" : "Add new book"}</CardTitle>
              <CardDescription>Catalog-д шинэ ном нэмэх эсвэл байгаа номыг засварлах.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input value={bookDraft.title} onChange={(event) => updateDraft("title", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Author</label>
                  <Input value={bookDraft.author} onChange={(event) => updateDraft("author", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Genre</label>
                  <Input value={bookDraft.genre} onChange={(event) => updateDraft("genre", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Language</label>
                  <Input value={bookDraft.language} onChange={(event) => updateDraft("language", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total copies</label>
                  <Input
                    type="number"
                    min={0}
                    value={bookDraft.totalCopies}
                    onChange={(event) => updateDraft("totalCopies", Number(event.target.value || 0))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Available copies</label>
                  <Input
                    type="number"
                    min={0}
                    value={bookDraft.availableCopies}
                    onChange={(event) => updateDraft("availableCopies", Number(event.target.value || 0))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Borrow fee</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={bookDraft.borrowPrice}
                    onChange={(event) => updateDraft("borrowPrice", Number(event.target.value || 0))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Currency</label>
                  <Input
                    value={bookDraft.borrowCurrency}
                    onChange={(event) => updateDraft("borrowCurrency", event.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cover URL</label>
                <Input value={bookDraft.coverUrl} onChange={(event) => updateDraft("coverUrl", event.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={bookDraft.description}
                  onChange={(event) => updateDraft("description", event.target.value)}
                  className="min-h-[140px]"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void handleSaveBook()} disabled={busyKey === "book-save"}>
                  <BookCopy className="size-4" />
                  {editingBookId ? "Save changes" : "Create book"}
                </Button>
                <Button variant="outline" onClick={resetBookForm}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {loading ? (
              <Card className="glass-strong border-border/50">
                <CardContent className="pt-6 text-sm text-muted-foreground">Admin catalog уншиж байна...</CardContent>
              </Card>
            ) : (
              books.map((book) => (
                <Card key={book.id} className="glass-strong border-border/50">
                  <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{book.title}</h3>
                        <Badge variant="outline">{book.genre}</Badge>
                        <Badge variant="secondary">{book.language.toUpperCase()}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{book.author}</p>
                      <p className="text-sm text-muted-foreground line-clamp-3">{book.description || "No description"}</p>
                      <p className="text-xs text-muted-foreground">
                        Copies: {book.available_copies}/{book.total_copies}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Borrow fee: {formatLibraryMoney(getBorrowPrice(book), getBorrowCurrency(book))}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditBook(book)}>
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDeleteBook(book)}
                        disabled={busyKey === `book-delete-${book.id}`}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          {loading ? (
            <Card className="glass-strong border-border/50">
              <CardContent className="pt-6 text-sm text-muted-foreground">Loan мэдээлэл ачаалж байна...</CardContent>
            </Card>
          ) : (
            loans.map((loan) => (
              <Card key={loan.id} className="glass-strong border-border/50">
                <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{loan.book.title}</h3>
                      <Badge variant={badgeVariantForState(loan.status)}>{loanStatusLabel[loan.status]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Reader: {getProfileLabel(loan.profile, loan.user_id)}</p>
                    <p className="text-sm text-muted-foreground">
                      Borrowed: {formatLibraryDate(loan.loaned_at)} | Due: {formatLibraryDate(loan.due_date)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {loan.status === "requested" ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => void handleLoanAction(loan.id, "active")}
                          disabled={busyKey === `loan-${loan.id}-active`}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleLoanAction(loan.id, "cancelled")}
                          disabled={busyKey === `loan-${loan.id}-cancelled`}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : null}

                    {loan.status === "active" ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => void handleLoanAction(loan.id, "returned")}
                          disabled={busyKey === `loan-${loan.id}-returned`}
                        >
                          Mark returned
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleLoanAction(loan.id, "cancelled")}
                          disabled={busyKey === `loan-${loan.id}-cancelled`}
                        >
                          Cancel loan
                        </Button>
                      </>
                    ) : null}

                    {(loan.status === "returned" || loan.status === "cancelled") ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleLoanAction(loan.id, "active")}
                        disabled={busyKey === `loan-${loan.id}-active`}
                      >
                        Reactivate
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          {loading ? (
            <Card className="glass-strong border-border/50">
              <CardContent className="pt-6 text-sm text-muted-foreground">Member мэдээлэл ачаалж байна...</CardContent>
            </Card>
          ) : members.length === 0 ? (
            <Card className="glass-strong border-border/50">
              <CardContent className="pt-6 text-sm text-muted-foreground">Member алга.</CardContent>
            </Card>
          ) : (
            members.map((member) => (
              <Card key={member.id} className="glass-strong border-border/50">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle>{member.display_name || `User ${member.id.slice(0, 8)}`}</CardTitle>
                      <CardDescription>ID: {member.id}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{member.totalLoans} нийт</Badge>
                      <Badge variant="default">{member.activeLoans} идэвхтэй</Badge>
                      {member.overdueLoans > 0 ? (
                        <Badge variant="destructive">{member.overdueLoans} хүлээлтийн дээр</Badge>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                {member.loans.length > 0 ? (
                  <CardContent className="space-y-3">
                    <div className="text-sm font-semibold">Номнууд:</div>
                    {member.loans.map((loan) => {
                      const dueDate = new Date(loan.due_date);
                      const now = new Date();
                      const isOverdue = loan.status === "active" && dueDate < now;

                      return (
                        <div
                          key={loan.id}
                          className="flex flex-col gap-2 rounded-lg border border-border/50 bg-surface-elevated/30 p-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <p className="font-medium text-sm">{loan.book?.title ?? "Unknown book"}</p>
                              <p className="text-xs text-muted-foreground">by {loan.book?.author ?? "Unknown"}</p>
                            </div>
                            <Badge
                              variant={badgeVariantForState(loan.status)}
                              className={isOverdue ? "bg-destructive/80" : ""}
                            >
                              {loanStatusLabel[loan.status]}
                            </Badge>
                          </div>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span>Зээлэгдсэн: {formatLibraryDate(new Date(loan.loaned_at))}</span>
                            <span>Буцаах: {formatLibraryDate(dueDate)}</span>
                            {isOverdue && (
                              <span className="text-destructive font-semibold">Хүлээлтийн дээр!</span>
                            )}
                          </div>
                          {loan.status === "requested" ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs"
                                onClick={() => void handleLoanAction(loan.id, "active")}
                                disabled={busyKey === `loan-${loan.id}-active`}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => void handleLoanAction(loan.id, "cancelled")}
                                disabled={busyKey === `loan-${loan.id}-cancelled`}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : null}
                          {loan.status === "active" ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs"
                                onClick={() => void handleLoanAction(loan.id, "returned")}
                                disabled={busyKey === `loan-${loan.id}-returned`}
                              >
                                Буцаасан гэж хийх
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => void handleLoanAction(loan.id, "cancelled")}
                                disabled={busyKey === `loan-${loan.id}-cancelled`}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </CardContent>
                ) : (
                  <CardContent className="pt-3 text-sm text-muted-foreground">Нөмийг зээлээгүй байна.</CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        {saleListingsFeatureEnabled ? (
          <TabsContent value="listings" className="space-y-4">
            {loading ? (
              <Card className="glass-strong border-border/50">
                <CardContent className="pt-6 text-sm text-muted-foreground">Sale listing уншиж байна...</CardContent>
              </Card>
            ) : saleListings.length === 0 ? (
              <Card className="glass-strong border-border/50">
                <CardContent className="pt-6 text-sm text-muted-foreground">Идэвхтэй sale listing алга.</CardContent>
              </Card>
            ) : (
              saleListings.map((listing) => (
                <Card key={listing.id} className="glass-strong border-border/50">
                  <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{listing.book?.title ?? "Unknown book"}</h3>
                        <Badge variant={badgeVariantForState(listing.status)}>{saleStatusLabel[listing.status]}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Seller: {getProfileLabel(listing.profile, listing.user_id)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Price: {Number(listing.price).toLocaleString("en-US")} {listing.currency}
                      </p>
                      {listing.note ? <p className="text-sm text-muted-foreground">{listing.note}</p> : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {listing.status !== "active" ? (
                        <Button
                          size="sm"
                          onClick={() => void handleListingAction(listing.id, "active")}
                          disabled={busyKey === `listing-${listing.id}-active`}
                        >
                          Reactivate
                        </Button>
                      ) : null}
                      {listing.status !== "sold" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleListingAction(listing.id, "sold")}
                          disabled={busyKey === `listing-${listing.id}-sold`}
                        >
                          Mark sold
                        </Button>
                      ) : null}
                      {listing.status !== "cancelled" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleListingAction(listing.id, "cancelled")}
                          disabled={busyKey === `listing-${listing.id}-cancelled`}
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ) : null}

        <TabsContent value="users" className="space-y-4">
          {loading ? (
            <Card className="glass-strong border-border/50">
              <CardContent className="pt-6 text-sm text-muted-foreground">User role ачаалж байна...</CardContent>
            </Card>
          ) : (
            profiles.map((profile) => {
              const isLastAdmin = profile.role === "admin" && adminCount <= 1;

              return (
                <Card key={profile.id} className="glass-strong border-border/50">
                  <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{profile.display_name || `User ${profile.id.slice(0, 8)}`}</h3>
                        <Badge variant={badgeVariantForState(profile.role)}>{roleLabel[profile.role]}</Badge>
                        {profile.id === user?.id ? <Badge variant="outline">You</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">ID: {profile.id}</p>
                      {isLastAdmin ? (
                        <p className="text-xs text-muted-foreground">Сүүлчийн admin тул member болгож болохгүй.</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {profile.role !== "admin" ? (
                        <Button
                          size="sm"
                          onClick={() => void handleRoleAction(profile.id, "admin")}
                          disabled={busyKey === `role-${profile.id}-admin`}
                        >
                          Make admin
                        </Button>
                      ) : null}
                      {profile.role !== "member" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleRoleAction(profile.id, "member")}
                          disabled={isLastAdmin || busyKey === `role-${profile.id}-member`}
                        >
                          Make member
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
};
