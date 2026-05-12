import { render, waitFor } from "@testing-library/react";
import Auth from "./Auth";

const navigateMock = vi.fn();
const useAuthMock = vi.fn();
const useLocationMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useLocation: () => useLocationMock(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

describe("Auth", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useAuthMock.mockReset();
    useLocationMock.mockReset();
    useLocationMock.mockReturnValue({ search: "" });
  });

  it("redirects authenticated users after render", async () => {
    useAuthMock.mockReturnValue({
      signIn: vi.fn(),
      signUp: vi.fn(),
      signInWithGoogle: vi.fn(),
      resendConfirmationEmail: vi.fn(),
      user: { id: "user-1" },
      loading: false,
      authUnavailableMessage: null,
    });

    render(<Auth />);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/app#browse", { replace: true });
    });
  });

  it("redirects authenticated users to the requested next path", async () => {
    useLocationMock.mockReturnValue({ search: "?next=%2Freader%2Fbook-123" });
    useAuthMock.mockReturnValue({
      signIn: vi.fn(),
      signUp: vi.fn(),
      signInWithGoogle: vi.fn(),
      resendConfirmationEmail: vi.fn(),
      user: { id: "user-1" },
      loading: false,
      authUnavailableMessage: null,
    });

    render(<Auth />);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/reader/book-123", { replace: true });
    });
  });
});
