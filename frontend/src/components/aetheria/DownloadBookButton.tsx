import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getBookDownloadApiPath } from "@/lib/library";
import type { Book } from "@/types/library";

type DownloadBookButtonProps = {
  book: Pick<Book, "id" | "title" | "author">;
  className?: string;
  label?: string;
};

const readDownloadError = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
      return payload.error;
    }
  }

  return await response.text().catch(() => "Download failed.");
};

export const DownloadBookButton = ({
  book,
  className = "inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10",
  label = "Download file",
}: DownloadBookButtonProps) => {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!user || !session?.access_token) {
      navigate("/auth");
      return;
    }

    setDownloading(true);

    try {
      const response = await fetch(getBookDownloadApiPath(book), {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(await readDownloadError(response));
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      const header = response.headers.get("content-disposition") ?? "";
      const fileNameMatch = header.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
      const fallbackFileName = `${book.title} - ${book.author}.txt`;
      downloadLink.href = objectUrl;
      downloadLink.download = decodeURIComponent(fileNameMatch?.[1] ?? fallbackFileName).replace(/"/g, "");
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
      toast.success(`"${book.title}" download started.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button type="button" onClick={() => void handleDownload()} disabled={downloading} className={className}>
      {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
      {downloading ? "Preparing..." : label}
    </button>
  );
};
