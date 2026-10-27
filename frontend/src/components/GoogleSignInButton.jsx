import { useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { Loader2 } from "lucide-react";
import authService from "@/services/authServices";
import { funnelEvent, getSignupContext } from "@/marketing/leadHelper/leadLog";

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

// False when VITE_GOOGLE_CLIENT_ID is unset — pages hide the Google option then.
export const isGoogleEnabled = CLIENT_ID !== "";

// "Continue with Google": signs in, or creates a free-trial account on first use.
// New accounts go to the /welcome setup wizard; everyone else to /dashboard.
export default function GoogleSignInButton({ onError, onSuccess, onBeforeSignIn }) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isGoogleEnabled) return null;

  const handleSuccess = async (credentialResponse) => {
    onError?.("");
    setIsLoading(true);
    try {
      onBeforeSignIn?.();
      const objCtx = getSignupContext();
      const response = await authService.googleLogin(credentialResponse.credential, {
        industry: objCtx.industry,
        source: objCtx.src,
      });
      const objInfo = response.dctUserInfo;
      if (objInfo.blnIsNewUser) funnelEvent("signup_completed");
      localStorage.setItem("access_token", response.strAccessToken);
      localStorage.setItem("userInfo", JSON.stringify(objInfo));
      if (onSuccess) {
        // The caller carries on (the website editor saves the draft first); keep the spinner up.
        await onSuccess(response);
        return;
      }
      window.location.href = objInfo.blnNeedsOnboarding ? "/welcome" : "/dashboard";
    } catch (error) {
      onError?.(error.message || "Google sign-in failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <div className="flex justify-center min-h-[44px]">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing you in...
          </div>
        ) : (
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => onError?.("Google sign-in failed. Please try again.")}
            text="continue_with"
            shape="rectangular"
            theme="outline"
            size="large"
            width="360"
          />
        )}
      </div>
    </GoogleOAuthProvider>
  );
}
