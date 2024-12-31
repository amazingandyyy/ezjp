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
      { name: 'features.newsBrowsing', limit: t('settings.membership.limits.newsBrowsing.basic'), basic: true },
      { name: 'features.translation', limit: t('settings.membership.limits.translation.basic'), basic: true },
      { name: 'features.voice', limit: t('settings.membership.limits.voice.basic'), basic: true },
      { name: 'features.aiTutor', notAvailable: true },
      { name: 'features.wordBank', notAvailable: true }
    ],
    buttonAction: null,
    buttonText: t('settings.membership.currentPlan'),
    buttonDisabled: !isPremium
  },
  {
    name: t('settings.membership.premiumPlan'),
    monthlyPrice: t('settings.membership.premiumPrice'),
    yearlyPrice: t('settings.membership.yearlyPrice'),
    isCurrentPlan: isPremium,
    features: [
      { name: 'features.freeFeatures', includesAll: true },
      { name: 'features.voice', unlimited: true, premium: true },
      { name: 'features.aiTutor', unlimited: true, premium: true },
      { name: 'features.wordBank', unlimited: true, premium: true, comingSoon: true }
    ]
  }
];

export default function MembershipSection({ theme = 'light' }) {
  const { t } = useTranslation();
  const { isPremium } = usePremium();
  const { user, signInWithGoogle } = useAuth();
  const [billingInterval, setBillingInterval] = useState('yearly');
  const isDark = theme === 'dark';

  const plans = getPlans(t, isPremium, billingInterval);

  const handleSubscribe = async () => {
    try {
      if (!user) {
        await signInWithGoogle();
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      // Create Stripe Checkout Session on the client
      const { error } = await stripe.redirectToCheckout({
        lineItems: [{
          price: billingInterval === 'yearly' 
            ? process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID 
            : process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID,
          quantity: 1,
        }],
        mode: 'subscription',
        successUrl: `${window.location.origin}/settings?section=membership&checkout=success`,
        cancelUrl: `${window.location.origin}/settings?section=membership&checkout=cancelled`,
        customerEmail: user.email,
      });

      if (error) {
        console.error('Error starting checkout:', error);
        alert(t('settings.membership.checkoutError'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert(t('settings.membership.checkoutError'));
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
                    ? "border-yellow-500/30 bg-gradient-to-b from-yellow-500/20 to-yellow-500/5 shadow-lg shadow-yellow-500/10"
                    : "border-yellow-500/30 bg-gradient-to-b from-yellow-50 to-transparent shadow-lg"
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
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border ${
                      plan.price
                        ? isDark
                          ? "bg-green-500/20 border-green-500/30 text-green-400"
                          : "bg-green-50 border-green-500/30 text-green-600"
                        : isDark
                        ? "bg-yellow-500/20 border-yellow-500/30 text-yellow-400"
                        : "bg-yellow-50 border-yellow-500/30 text-yellow-600"
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
                          : "text-yellow-600"
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
                          ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg shadow-yellow-500/20"
                          : "bg-gradient-to-br from-yellow-400 to-yellow-500 text-white shadow-lg shadow-yellow-500/20"
                        : isDark
                        ? "bg-gradient-to-br from-yellow-500/80 to-yellow-600/80 text-white shadow-lg shadow-yellow-500/20"
                        : "bg-gradient-to-br from-yellow-400 to-yellow-500 text-white shadow-lg shadow-yellow-500/20"
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
                            ? "text-yellow-400"
                            : "text-yellow-600"
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
                              ? "text-yellow-400/80"
                              : "text-yellow-600"
                            : isDark
                            ? "text-yellow-400/80"
                            : "text-yellow-600"
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
                  <li key={feature.name} className="flex items-start gap-3">
                    <div
                      className={`flex items-center justify-center w-5 h-5 rounded-full ${
                        feature.notAvailable
                          ? isDark
                            ? "bg-gray-700/50"
                            : "bg-gray-100"
                          : feature.includesAll
                          ? isDark
                            ? "bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30"
                            : "bg-gradient-to-br from-yellow-100 to-yellow-200 border border-yellow-300"
                          : plan.price
                          ? isDark
                            ? "bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30"
                            : "bg-gradient-to-br from-green-100 to-green-200 border border-green-300"
                          : isDark
                          ? "bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30"
                          : "bg-gradient-to-br from-yellow-100 to-yellow-200 border border-yellow-300"
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
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      ) : (
                        <FaCheck
                          className={`w-3 h-3 ${
                            plan.price
                              ? isDark
                                ? "text-green-400"
                                : "text-green-600"
                              : isDark
                              ? "text-yellow-400"
                              : "text-yellow-600"
                          }`}
                        />
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
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                : "bg-blue-50 text-blue-600 border-blue-200"
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
                          ? "bg-yellow-500/20 text-yellow-400 cursor-not-allowed border border-yellow-500/30"
                          : "bg-yellow-50 text-yellow-600 cursor-not-allowed border border-yellow-200"
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
                      ? "bg-yellow-500/20 text-yellow-400 cursor-not-allowed border border-yellow-500/30"
                      : "bg-yellow-50 text-yellow-600 cursor-not-allowed border border-yellow-200"
                  }`}
                >
                  {t("settings.membership.currentPlan")}
                </button>
              ) : (
                <button
                  onClick={handleSubscribe}
                  className="w-full rounded-lg bg-yellow-500 px-4 py-2 text-center font-semibold text-white shadow-sm hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                >
                  {billingInterval === "monthly"
                    ? t("settings.membership.monthlySubscribe")
                    : t("settings.membership.yearlySubscribe")}
                </button>
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