import { useTranslation } from '@/lib/hooks/useTranslation';
import { usePremium } from '@/lib/hooks/usePremium';
import { useAuth } from '@/lib/AuthContext';
import { FaCheck, FaCrown, FaBook } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Define plans
const getPlans = (t, isPremium, billingInterval) => [
  {
    name: t('settings.membership.basicPlan'),
    price: t('settings.membership.free'),
    isCurrentPlan: !isPremium,
    features: [
      { name: 'features.newsBrowsing', limit: t('settings.membership.limits.newsBrowsing.basic') },
      { name: 'features.translation', limit: t('settings.membership.limits.translation.basic') },
      { name: 'features.voice', limit: t('settings.membership.limits.voice.basic') },
      // { name: 'features.aiTutor', notAvailable: true },
      // { name: 'features.wordBank', notAvailable: true }
    ],
    buttonAction: null,
    buttonText: isPremium ? t('settings.membership.basicPlan') : t('settings.membership.currentPlan'),
    buttonDisabled: true
  },
  {
    name: t('settings.membership.premiumPlan'),
    monthlyPrice: t('settings.membership.premiumPrice'),
    yearlyPrice: t('settings.membership.yearlyPrice'),
    isCurrentPlan: isPremium,
    features: [
      { name: 'features.freeFeatures', includesAll: true },
      { name: 'features.voice' },
      { name: 'features.aiTutor' },
      { name: 'features.wordBank', comingSoon: true }
    ]
  }
];

export default function MembershipSection({ theme = 'light' }) {
  const { t } = useTranslation();
  const { isPremium } = usePremium();
  const { user, signInWithGoogle } = useAuth();
  const [billingInterval, setBillingInterval] = useState('yearly');
  const isDark = theme === 'dark';
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const plans = getPlans(t, isPremium, billingInterval);

  const handleSubscribe = async () => {
    try {
      setIsLoading(true);

      if (!user?.id) {
        throw new Error('Not logged in');
      }

      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          billingInterval,
          userId: user.id 
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 400 && data.error === 'Active subscription exists') {
          alert(t('settings.membership.errors.activeSubscriptionExists'));
          return;
        }
        throw new Error(data.error || 'Failed to start checkout process');
      }

      // If premium status was restored, reload the page
      if (data.message === 'Premium status restored') {
        alert(t('settings.membership.premiumRestored'));
        window.location.reload();
        return;
      }

      if (!data.url) throw new Error('No checkout URL received');

      // Redirect to Stripe
      window.location.href = data.url;
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to start checkout process');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreMembership = async () => {
    try {
      setIsRestoring(true);
      
      const response = await fetch('/api/stripe/restore-membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to restore membership');
      }

      // Refresh the page to update membership status
      window.location.reload();
    } catch (error) {
      console.error('Error restoring membership:', error);
      alert(error.message);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div
      id="membership"
      className={`overflow-hidden rounded-2xl shadow-sm border backdrop-blur-sm ${
        isDark
          ? "bg-gray-800/80 border-gray-700/50"
          : "bg-white border-gray-200"
      }`}
    >
      <div
        className={`px-8 py-5 border-b ${
          isDark ? "border-gray-700/50" : "border-gray-200"
        }`}
      >
        <h2
          className={`text-base font-medium ${
            isDark ? "text-gray-200" : "text-gray-900"
          }`}
        >
          {t("settings.membership.title")}
        </h2>
      </div>

      <div className="p-8">
        {/* Pricing Switcher */}
        <div className="flex justify-center mb-8">
          <div
            className={`relative flex p-1.5 rounded-xl backdrop-blur-sm border ${
              isDark
                ? "bg-gray-700/30 border-gray-700/50"
                : "bg-gray-100 border-gray-200"
            }`}
          >
            <button
              onClick={() => setBillingInterval("monthly")}
              className={`relative px-8 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                billingInterval === "monthly"
                  ? isDark
                    ? "text-white"
                    : "text-gray-900"
                  : isDark
                  ? "text-gray-400 hover:text-gray-300"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t("settings.membership.monthly")}
              {billingInterval === "monthly" && (
                <div
                  className={`absolute inset-0 rounded-lg border shadow-sm ${
                    isDark
                      ? "bg-gray-700/50 border-gray-600/50"
                      : "bg-white border-gray-200"
                  }`}
                  style={{ zIndex: -1 }}
                />
              )}
            </button>
            <button
              onClick={() => setBillingInterval("yearly")}
              className={`relative px-8 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                billingInterval === "yearly"
                  ? isDark
                    ? "text-white"
                    : "text-gray-900"
                  : isDark
                  ? "text-gray-400 hover:text-gray-300"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t("settings.membership.yearly")}
              {billingInterval === "yearly" && (
                <div
                  className={`absolute inset-0 rounded-lg border shadow-sm ${
                    isDark
                      ? "bg-gray-700/50 border-gray-600/50"
                      : "bg-white border-gray-200"
                  }`}
                  style={{ zIndex: -1 }}
                />
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-2xl border ${
                plan.isCurrentPlan && !plan.price
                  ? isDark
                    ? "border-yellow-500/30 bg-gradient-to-b from-yellow-500/10 to-yellow-500/5 shadow-lg shadow-yellow-500/10"
                    : "border-yellow-500/30 bg-gradient-to-b from-yellow-50 to-transparent shadow-lg shadow-yellow-500/10"
                  : plan.price
                  ? isDark
                    ? "border-gray-700/50 bg-gray-800/50"
                    : "border-gray-200 bg-gray-50"
                  : isDark
                  ? "border-yellow-500/20 bg-gradient-to-b from-yellow-500/10 to-transparent"
                  : "border-yellow-500/30 bg-gradient-to-b from-yellow-50 to-white"
              }`}
            >
              {plan.isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border backdrop-blur-sm ${
                      plan.price
                        ? isDark
                          ? "bg-green-500/20 border-green-500/30 text-green-400"
                          : "bg-green-50 border-green-500/30 text-green-600"
                        : isDark
                        ? "bg-yellow-500/20 border-yellow-500/30 text-yellow-400 shadow-sm"
                        : "bg-yellow-100 border-yellow-200 text-yellow-700 shadow-sm"
                    }`}
                  >
                    <FaCheck
                      className={`w-3 h-3 ${
                        plan.price
                          ? isDark
                            ? "text-green-400"
                            : "text-green-600"
                          : isDark
                          ? "text-yellow-400"
                          : "text-yellow-700"
                      }`}
                    />
                    <span className="text-sm font-medium">
                      {t("settings.membership.currentPlan")}
                    </span>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${
                      plan.price
                        ? isDark
                          ? "bg-gray-700/50 text-gray-400"
                          : "bg-green-100 text-green-600"
                        : plan.isCurrentPlan
                        ? isDark
                          ? "bg-gray-700 text-gray-300"
                          : "bg-gradient-to-br from-yellow-400/90 via-yellow-500/90 to-yellow-600/90 text-yellow-100 shadow-lg shadow-yellow-500/20"
                        : isDark
                        ? "bg-gradient-to-br from-yellow-400/90 via-yellow-500/90 to-yellow-600/90 text-yellow-100 shadow-lg shadow-yellow-500/20"
                        : "bg-yellow-100 text-yellow-600"
                    }`}
                  >
                    {plan.price ? (
                      <FaBook className="w-5 h-5" />
                    ) : (
                      <FaCrown className="w-5 h-5" />
                    )}
                  </span>
                  <div>
                    <h3
                      className={`text-lg font-medium ${
                        plan.isCurrentPlan && !plan.price
                          ? isDark
                            ? "text-gray-200"
                            : "text-gray-700"
                          : isDark
                          ? "text-gray-200"
                          : "text-gray-900"
                      }`}
                    >
                      {plan.name}
                    </h3>
                    {!plan.price && (
                      <div
                        className={`text-sm ${
                          plan.isCurrentPlan
                            ? isDark
                              ? "text-gray-400"
                              : "text-gray-600"
                            : isDark
                            ? "text-gray-400"
                            : "text-gray-600"
                        }`}
                      >
                        {t("settings.membership.unlimitedAccess")}
                      </div>
                    )}
                  </div>
                </div>

                {plan.price ? (
                  <div
                    className={`text-3xl font-bold ${
                      isDark ? "text-gray-100" : "text-gray-900"
                    }`}
                  >
                    {plan.price}
                  </div>
                ) : (
                  <div className="flex items-baseline flex-wrap gap-2">
                    <div
                      className={`text-3xl font-bold ${
                        isDark ? "text-gray-100" : "text-gray-900"
                      }`}
                    >
                      {billingInterval === "monthly"
                        ? plan.monthlyPrice
                        : plan.yearlyPrice}
                    </div>
                    <div
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      / {t("settings.membership.month")}
                    </div>
                    {billingInterval === "yearly" && (
                      <>
                        <div
                          className={`text-sm line-through ${
                            isDark ? "text-gray-500" : "text-gray-400"
                          }`}
                        >
                          ({plan.monthlyPrice} /{" "}
                          {t("settings.membership.month")})
                        </div>
                        <div
                          className={`text-sm ${
                            isDark ? "text-yellow-400" : "text-yellow-600"
                          }`}
                        >
                          {t("settings.membership.yearlyDiscount")}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature.name} className="flex gap-3">
                    <div
                      className={`flex-shrink-0 flex items-center justify-center w-5 h-5 mt-1 rounded-full ${
                        feature.notAvailable
                          ? isDark
                            ? "bg-gray-700/50"
                            : "bg-gray-100"
                          : feature.includesAll
                          ? isDark
                            ? "bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30"
                            : "bg-yellow-100 border border-yellow-200"
                          : plan.price
                          ? isDark
                            ? "bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30"
                            : "bg-green-100 border border-green-200"
                          : isDark
                          ? "bg-gradient-to-br from-gray-600/20 to-gray-700/20 border border-gray-600/30"
                          : "bg-yellow-100 border border-yellow-200"
                      }`}
                    >
                      {feature.notAvailable ? (
                        <svg
                          className={`w-3 h-3 ${
                            isDark ? "text-gray-500" : "text-gray-400"
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      ) : feature.includesAll ? (
                        <svg
                          className={`w-3 h-3 ${
                            isDark ? "text-yellow-400" : "text-yellow-600"
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className={`w-3 h-3 ${
                            plan.price
                              ? isDark
                                ? "text-green-400"
                                : "text-green-600"
                              : isDark
                              ? "text-yellow-400"
                              : "text-yellow-600"
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`${
                            isDark ? "text-gray-200" : "text-gray-900"
                          } ${feature.includesAll ? "font-medium" : ""}`}
                        >
                          {t(
                            `settings.membership.features.${feature.name
                              .split(".")
                              .pop()}`
                          )}
                        </span>
                        {feature.premium && (
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${
                              isDark
                                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                : "bg-yellow-100 text-yellow-600 border-yellow-200"
                            }`}
                          >
                            {t("settings.membership.premiumLabel")}
                          </span>
                        )}
                        {feature.basic && (
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${
                              isDark
                                ? "bg-gray-700 text-gray-400 border-gray-600"
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            {t("settings.membership.basicLabel")}
                          </span>
                        )}
                        {feature.comingSoon && (
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${
                              isDark
                                ? "bg-gray-800/80 text-gray-400 border-gray-700/50"
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            {t("settings.membership.comingSoon")}
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-sm mb-1 ${
                          isDark ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {t(
                          `settings.membership.descriptions.${feature.name
                            .split(".")
                            .pop()}`
                        )}
                      </div>
                      <div
                        className={`text-sm ${
                          isDark ? "text-gray-500" : "text-gray-500"
                        }`}
                      >
                        {feature.unlimited ? (
                          <span
                            className={`${
                              plan.price
                                ? isDark
                                  ? "text-green-400"
                                  : "text-green-600"
                                : isDark
                                ? "text-yellow-400"
                                : "text-yellow-600"
                            }`}
                          >
                            {t("settings.membership.unlimited")}
                          </span>
                        ) : feature.notAvailable ? (
                          <span
                            className={
                              isDark ? "text-gray-500" : "text-gray-400"
                            }
                          >
                            {t("settings.membership.premiumOnly")}
                          </span>
                        ) : (
                          feature.limit
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {plan.price ? (
                <button
                  onClick={plan.buttonAction}
                  disabled={plan.buttonDisabled}
                  className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    plan.buttonDisabled
                      ? plan.isCurrentPlan
                        ? isDark
                          ? "bg-gray-800/80 border border-gray-700/50 text-gray-400"
                          : "bg-gray-100 border border-gray-200 text-gray-600"
                        : isDark
                        ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : isDark
                      ? "bg-green-500/90 hover:bg-green-500 text-white"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
                >
                  {plan.buttonText}
                </button>
              ) : isPremium ? (
                <button
                  disabled
                  className={`w-full px-4 py-3 rounded-xl text-sm font-medium ${
                    isDark
                      ? "bg-yellow-500/10 text-yellow-400 cursor-not-allowed border border-yellow-500/30"
                      : "bg-yellow-50 text-yellow-600 cursor-not-allowed border border-yellow-500/30"
                  }`}
                >
                  {t("settings.membership.currentPlan")}
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={handleSubscribe}
                    disabled={isLoading}
                    className={`w-full rounded-lg px-4 py-3 text-center font-medium text-white shadow-sm transition-all duration-200 ${
                      isLoading
                        ? "bg-yellow-400/90 cursor-not-allowed"
                        : "bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-600 hover:to-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
                    }`}
                  >
                    {isLoading
                      ? t("settings.membership.processing")
                      : billingInterval === "monthly"
                      ? t("settings.membership.monthlySubscribe")
                      : t("settings.membership.yearlySubscribe")}
                  </button>
                  <button
                    onClick={handleSubscribe}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isDark
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-500 hover:text-gray-700"
                    } hover:underline`}
                  >
                    {t("settings.membership.restoreMembership")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div
        className={`px-8 py-4 border-t ${
          isDark ? "border-gray-700/50" : "border-gray-200"
        }`}
      >
        <div className="flex items-center justify-center gap-1">
          <span
            className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
          >
            {t("settings.membership.featureRequest")}
          </span>
          <a
            href="/changelog?section=suggestions"
            className={`text-sm font-medium hover:underline ${
              isDark ? "text-yellow-400" : "text-yellow-600"
            }`}
          >
            {t("settings.membership.suggestFeature")}
          </a>
        </div>
      </div>
    </div>
  );
} 