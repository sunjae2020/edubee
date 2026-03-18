import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// In a real app, these would be in separate JSON files
const resources = {
  en: {
    translation: {
      "dashboard": "Dashboard",
      "crm": "CRM",
      "leads": "Leads",
      "applications": "Applications",
      "contracts": "Contracts & Services",
      "finance": "Finance",
      "invoices": "Invoices",
      "transactions": "Transactions",
      "exchange_rates": "Exchange Rates",
      "admin": "Administration",
      "users": "Users",
      "packages": "Packages",
      "products": "Products",
      "notifications": "Notifications",
      "welcome": "Welcome back",
      "login_title": "Sign in to Edubee",
      "login_subtitle": "Enter your credentials to access your account",
      "email": "Email",
      "password": "Password",
      "sign_in": "Sign In",
    }
  },
  ko: {
    translation: {
      "dashboard": "대시보드",
      "login_title": "Edubee 로그인",
    }
  },
  ja: {
    translation: {
      "dashboard": "ダッシュボード",
    }
  },
  th: {
    translation: {
      "dashboard": "แผงควบคุม",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;
