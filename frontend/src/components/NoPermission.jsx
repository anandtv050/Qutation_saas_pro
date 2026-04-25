import { Link, useNavigate } from "react-router-dom";
import { Lock, ArrowLeft, Mail, Hourglass, Clock, AlertCircle } from "lucide-react";

/**
 * Reusable "restricted access" page/banner. One component, multiple scenarios.
 *
 * Variants:
 *   "permission" (default) — User's plan doesn't include the feature.
 *                            Lock icon. Title: "No Access to {feature}"
 *   "quota"                — User hit daily/monthly limit.
 *                            Hourglass icon. Title: "Limit Reached"
 *   "trial"                — Trial has expired / subscription issue.
 *                            Clock icon. Title: "Subscription Expired"
 *   "error"                — Generic blocked action.
 *                            Alert icon. Title: "Action Blocked"
 *
 * Layout modes:
 *   compact={false} (default) — Full centered page with Back / Dashboard buttons
 *   compact={true}            — Inline card with no buttons (good for embedding)
 *
 * Props:
 *   - variant: "permission" | "quota" | "trial" | "error"
 *   - moduleKey / moduleName: feature being blocked (e.g., "ai", "Warranty")
 *   - title: override the auto-generated title
 *   - message: override the auto-generated message (or pass backend error here)
 *   - contactEmail: shows "Contact admin" mailto link
 *   - compact: render as inline card instead of full page
 *   - onDismiss: optional close handler (renders an X button when set)
 *
 * Examples:
 *   // Route guard (current usage in App.jsx ModuleRoute)
 *   <NoPermission moduleKey="warranty" />
 *
 *   // Quota reached (catch backend 400 error)
 *   <NoPermission variant="quota" message={apiError} compact />
 *
 *   // Inline notice in AI mode
 *   <NoPermission moduleKey="ai" moduleName="Quick Create" compact />
 */

const VARIANTS = {
  permission: {
    icon: Lock,
    iconBg: "bg-neutral-100",
    iconColor: "text-neutral-400",
    defaultTitle: (label) => `No Access to ${label}`,
    defaultMessage: (label) => `Your current plan doesn't include ${label}. Contact your admin to upgrade your plan or grant access.`,
  },
  quota: {
    icon: Hourglass,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    defaultTitle: () => "Limit Reached",
    defaultMessage: (label) => `You've used your daily limit for ${label}. Try again tomorrow or upgrade your plan for unlimited access.`,
  },
  trial: {
    icon: Clock,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
    defaultTitle: () => "Subscription Expired",
    defaultMessage: () => "Your trial or subscription has expired. Contact your admin to renew.",
  },
  error: {
    icon: AlertCircle,
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
    defaultTitle: () => "Action Blocked",
    defaultMessage: (label) => `${label} is currently unavailable.`,
  },
};

export default function NoPermission({
  variant = "permission",
  moduleKey,
  moduleName,
  title,
  message,
  contactEmail,
  compact = false,
  onDismiss,
}) {
  const navigate = useNavigate();
  const cfg = VARIANTS[variant] || VARIANTS.permission;
  const Icon = cfg.icon;
  const featureLabel = moduleName || (moduleKey ? moduleKey.replace(/_/g, " ") : "this feature");
  const finalTitle = title || cfg.defaultTitle(featureLabel);
  const finalMessage = message || cfg.defaultMessage(featureLabel);

  // Compact inline mode — for embedding inside a page (e.g., as a banner)
  if (compact) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-5 max-w-md mx-auto relative">
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-600 text-xl leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 ${cfg.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-neutral-900 mb-1 capitalize">{finalTitle}</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">{finalMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  // Full page mode — for use as a route element
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md w-full">
        <div className={`w-20 h-20 ${cfg.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
          <Icon className={`w-10 h-10 ${cfg.iconColor}`} />
        </div>

        <h1 className="text-2xl font-bold text-neutral-900 mb-3 capitalize">{finalTitle}</h1>

        <p className="text-neutral-500 mb-8 leading-relaxed">{finalMessage}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-neutral-200 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-black text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>

        {contactEmail && (
          <a
            href={`mailto:${contactEmail}?subject=Access%20request:%20${encodeURIComponent(featureLabel)}`}
            className="inline-flex items-center gap-2 mt-6 text-sm text-neutral-500 hover:text-black transition-colors"
          >
            <Mail className="w-4 h-4" />
            Contact admin
          </a>
        )}
      </div>
    </div>
  );
}
