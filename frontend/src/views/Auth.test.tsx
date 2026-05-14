import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("does not redirect after signup when manual sign-in is required", async () => {
    const signUpMock = vi.fn().mockResolvedValue({
      error: null,
      reason: null,
      manualSignInRequired: true,
    });

    useAuthMock.mockReturnValue({
      signIn: vi.fn(),
      signUp: signUpMock,
      signInWithGoogle: vi.fn(),
      resendConfirmationEmail: vi.fn(),
      user: null,
      loading: false,
      authUnavailableMessage: null,
    });

    render(<Auth />);

    fireEvent.click(screen.getByRole("button", { name: "Burtguuleh" }));
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Tester" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("Nuuts ug"), { target: { value: "password123" } });

    const submitButtons = screen.getAllByRole("button", { name: "Burtguuleh" });
    fireEvent.click(submitButtons[submitButtons.length - 1]);

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith("new@example.com", "password123", "Tester");
    });

    await waitFor(() => {
      expect(screen.queryByLabelText("Display Name")).not.toBeInTheDocument();
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
