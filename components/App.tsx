import React, { useState, useEffect, useRef, lazy, Suspense, Component, ReactNode } from 'react';
import { useTranslation } from '../i18n';
import { parsePath } from '../src/routing/router';
import { toLegacyPath } from '../src/routing/site-paths';
import { readPrivateCart, writePrivateCart } from '../src/booking/privateStorage';
import Header from './Header';
import ApprovedHome from './home/ApprovedHome';
import ApprovedHeader from './home/ApprovedHeader';
import { createClientSeoScheduler } from '../src/seo/client-state';
import { LOCALE_LOCATION_EVENT, languageFromSearch, localizedNavigationUrl, type SiteLanguage } from '../src/locale';
import Footer from './Footer';
import { useAuth } from './Auth';
import NotFoundPage from './NotFoundPage';

// Helper for lazy loading modules with auto-retry on chunk load failures (e.g., stale bundle hashes)
const lazyWithRetry = <T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>
) =>
  lazy(async () => {
    const pageKey = 'chunk_reload_' + window.location.pathname;
    const pageHasBeenReloaded = sessionStorage.getItem(pageKey);
    try {
      const module = await factory();
      sessionStorage.removeItem(pageKey);
      return module;
    } catch (error) {
      if (!pageHasBeenReloaded) {
        sessionStorage.setItem(pageKey, 'true');
        window.location.reload();
        return new Promise<T>(() => {}); // Wait for reload to avoid unhandled rejections
      }
      throw error;
    }
  });


const FloatingMascot = lazyWithRetry(() => import('./FloatingMascot'));
const CookieConsent = lazyWithRetry(() => import('./CookieConsent'));

// Lazy imports for subpages to reduce initial bundle size and enable route-based code splitting
const CalculatorRoute = lazyWithRetry(() => import('./calculator/CalculatorRoute'));
const CustomerAccessRoute = lazyWithRetry(() => import('./calculator/CustomerAccessRoute'));
const SeoServiceCityPage = lazyWithRetry(() => import('./SeoServiceCityPage'));
const AboutPage = lazyWithRetry(() => import('./about/ApprovedAbout'));
const ApprovedServices = lazyWithRetry(() => import('./services/ApprovedServices'));
const LoginPage = lazyWithRetry(() => import('./LoginPage'));
const RegisterPage = lazyWithRetry(() => import('./RegisterPage'));
const Dashboard = lazyWithRetry(() => import('./Dashboard'));
const GDPRPage = lazyWithRetry(() => import('./GDPRPage'));
const TermsPage = lazyWithRetry(() => import('./TermsPage'));
const ImpressumPage = lazyWithRetry(() => import('./ImpressumPage'));
const KontaktPage = lazyWithRetry(() => import('./KontaktPage'));
const CommercialQuotePage = lazyWithRetry(() => import('./CommercialQuotePage'));
const ReviewInvitePage = lazyWithRetry(() => import('./ReviewInvitePage'));
const RegionHubPage = lazyWithRetry(() => import('./RegionHubPage').then(m => ({ default: m.RegionHubPage })));
const CoverageHubPage = lazyWithRetry(() => import('./CoverageHubPage'));

interface ChunkErrorBoundaryProps {
  children: ReactNode;
}

interface ChunkErrorBoundaryState {
  hasError: boolean;
}

// Error boundary to catch lazy import failure and display a fallback
class ChunkErrorBoundary extends Component<ChunkErrorBoundaryProps, ChunkErrorBoundaryState> {
  declare props: ChunkErrorBoundaryProps;
  declare state: ChunkErrorBoundaryState;

  constructor(props: ChunkErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ChunkErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('Caught chunk loading error in ErrorBoundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center font-sans">
          <div className="w-16 h-16 mb-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold shadow-sm">
            ↻
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Inhalt wird geladen...</h2>
          <p className="text-sm text-slate-600 max-w-sm mb-6 leading-relaxed">
            Eine Aktualisierung ist verfügbar. Bitte laden Sie die Seite neu, um die neuesten Inhalte zu sehen.
          </p>
          <button
            onClick={() => {
              sessionStorage.clear();
              window.location.reload();
            }}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-all shadow-md active:scale-95"
          >
            Seite neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function changeLocation(target: string, language: SiteLanguage, replace = false) {
  const destination = localizedNavigationUrl(target, window.location.href, language);
  const current = window.location.pathname + window.location.search + window.location.hash;
  if (destination !== current) {
    if (replace) window.history.replaceState(window.history.state, '', destination);
    else window.history.pushState(null, '', destination);
  }
  window.dispatchEvent(new Event(LOCALE_LOCATION_EVENT));
  return new URL(destination, window.location.origin);
}

const PATH_TO_PAGE_MAP: Record<string, string> = {
  '/': 'home',
  '/quote': 'consultation',
  '/quote-demo': 'calculator-demo',
  '/customer-access': 'customer-access',
  '/about': 'about',
  '/ueber-kraken': 'about',
  '/services': 'services-page',
  '/leistungen': 'approved-services',
  '/commercial': 'commercial-services',
  '/careers': 'careers',
  '/sustainability': 'sustainability-page',
  '/our-story': 'our-story',
  '/blog': 'blog',
  '/blog/wohnungsabgabe-zurich-perfekte-uebergabe': 'blog',
  '/blog/iot-smart-facility-management-schweizer-bueros': 'blog',
  '/comic': 'comic-page',
  '/comic-shop': 'comic-shop',
  '/gdpr': 'gdpr',
  '/terms': 'terms',
  '/hse': 'hse',
  '/impressum': 'impressum',
  '/imprint': 'impressum',
  '/kontakt': 'kontakt',
  '/login': 'login',
  '/register': 'register',
  '/dashboard': 'dashboard',
  '/commercial-quote': 'commercial-quote',
  '/review-invite': 'review-invite',
  '/reviews': 'review-invite',
  '/reviewsvip': 'review-invite',
  '/dejar-opinion': 'review-invite',
};

const PAGE_TO_PATH_MAP: Record<string, string> = {
  'home': '/',
  'consultation': '/quote',
  'calculator-demo': '/quote-demo',
  'customer-access': '/customer-access',
  'about': '/about',
  'services-page': '/services',
  'approved-services': '/leistungen',
  'commercial-services': '/commercial',
  'careers': '/careers',
  'sustainability-page': '/sustainability',
  'our-story': '/our-story',
  'blog': '/blog',
  'comic-page': '/comic',
  'comic-shop': '/comic-shop',
  'gdpr': '/gdpr',
  'terms': '/terms',
  'hse': '/hse',
  'impressum': '/impressum',
  'kontakt': '/kontakt',
  'login': '/login',
  'register': '/register',
  'dashboard': '/dashboard',
  'commercial-quote': '/commercial-quote',
  'review-invite': '/reviews',
};


const App: React.FC = () => {
  const { language, t } = useTranslation();
  const [seoUrl, setSeoUrl] = useState(() => typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/');
  useEffect(() => {
    const syncSeoUrl = () => setSeoUrl(window.location.pathname + window.location.search);
    window.addEventListener('popstate', syncSeoUrl);
    window.addEventListener(LOCALE_LOCATION_EVENT, syncSeoUrl);
    return () => {
      window.removeEventListener('popstate', syncSeoUrl);
      window.removeEventListener(LOCALE_LOCATION_EVENT, syncSeoUrl);
    };
  }, []);
  const [page, setPage] = useState(() => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    return parsePath(currentPath).page;
  });
  const [seoCityId, setSeoCityId] = useState(() => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    return parsePath(currentPath).cityId;
  });
  const [seoServiceId, setSeoServiceId] = useState(() => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    return parsePath(currentPath).serviceId;
  });
  const { user, loading: authLoading } = useAuth();
  
  const [mounted, setMounted] = useState(false);
  
  // Persistent Cart State
  const [cart, setCart] = useState<any[]>(() => readPrivateCart());
  const persistedCartRef = useRef(JSON.stringify(cart));

  // Load cart, set mounted state and force scroll to top on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
      if (!window.location.hash) window.scrollTo(0, 0);
    }
  }, []);

  // Persist only changed anonymous service choices; a reload does not extend retention.
  useEffect(() => {
    const snapshot = JSON.stringify(cart);
    if (snapshot === persistedCartRef.current) return;
    writePrivateCart(cart);
    persistedCartRef.current = snapshot;
  }, [cart]);

  // Synchronize state with URL on popstate and initial load
  useEffect(() => {
    const handleLocationChange = () => {
      const currentPath = window.location.pathname;

      const parsed = parsePath(currentPath);
      const targetPage = parsed.page;
      
      setSeoCityId(parsed.cityId);
      setSeoServiceId(parsed.serviceId);
      
      const isReviewUser = typeof window !== 'undefined' && localStorage.getItem('kraken_review_user') === 'true';
      const isStaff = user?.staff === true;

      // Guard dashboard access
      if (targetPage === 'dashboard') {
        if (authLoading) {
          setPage('dashboard');
        } else if (!user) {
          setPage('login');
          if (window.location.pathname !== '/login') {
            changeLocation('/login', languageFromSearch(window.location.search) || language, true);
          }
        } else if (isReviewUser && !isStaff) {
          // Strictly block dashboard access for reviewers and redirect to home
          setPage('home');
          if (window.location.pathname !== '/') {
            changeLocation('/', languageFromSearch(window.location.search) || language, true);
          }
        } else {
          setPage('dashboard');
        }
      } else {
        setPage(targetPage);
      }
      if (!window.location.hash) window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', handleLocationChange);
    
    // Process on mount or when user changes
    handleLocationChange();

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [user, authLoading]);

  // Clean up review user flag when logged out
  useEffect(() => {
    if (!user) {
      localStorage.removeItem('kraken_review_user');
    }
  }, [user]);

  // Set review flag if page is review invite
  useEffect(() => {
    if (page === 'review-invite') {
      localStorage.setItem('kraken_review_user', 'true');
    }
  }, [page]);

  const handleNavigate = (targetPage: string) => {
    const isReviewUser = typeof window !== 'undefined' && localStorage.getItem('kraken_review_user') === 'true';
    const isStaff = user?.staff === true;

    if (targetPage.startsWith('/')) {
      const destination = changeLocation(targetPage, language);
      const parsed = parsePath(destination.pathname);
      setSeoCityId(parsed.cityId);
      setSeoServiceId(parsed.serviceId);
      setPage(parsed.page);
      if (!window.location.hash) window.scrollTo(0, 0);
      return;
    }

    if (targetPage === 'dashboard') {
      if (!user) {
        const loginPath = PAGE_TO_PATH_MAP['login'] || '/login';
        changeLocation(loginPath, language);
        setPage('login');
        if (!window.location.hash) window.scrollTo(0, 0);
        return;
      }
      if (isReviewUser && !isStaff) {
        // Prevent review-logged users from opening dashboard
        const homePath = '/';
        changeLocation(homePath, language);
        setPage('home');
        if (!window.location.hash) window.scrollTo(0, 0);
        return;
      }
    }
    
    const targetPath = PAGE_TO_PATH_MAP[targetPage] || '/';
    changeLocation(targetPath, language);
    setPage(targetPage);
    if (!window.location.hash) window.scrollTo(0, 0);
  };

  // The server head is authoritative on arrival; load page metadata only for a stale SPA head.
  const seoScheduler=useRef<ReturnType<typeof createClientSeoScheduler>|null>(null);
  if(!seoScheduler.current)seoScheduler.current=createClientSeoScheduler(()=>import('../src/seo/client'),()=>window.location.pathname+window.location.search);
  React.useEffect(() => {
    const path=window.location.pathname+window.location.search;
    const publicHost=['krakenpfm.ch','www.krakenpfm.ch'].includes(window.location.hostname);
    return seoScheduler.current!.synchronize(path,language,document,publicHost);
  },[page,language,seoCityId,seoServiceId,seoUrl]);

  const renderPage = () => {
    return (
      <ChunkErrorBoundary>
        <Suspense fallback={<PageLoader />}>
        {(() => {
          switch (page) {
            case 'about':
              return <AboutPage onNavigate={handleNavigate} />;
            case 'approved-services':
              return <ApprovedServices onNavigate={handleNavigate} />;
            case 'commercial-quote':
              return <CommercialQuotePage onNavigate={handleNavigate} />;
            case 'review-invite':
              return <ReviewInvitePage onNavigate={handleNavigate} />;
            case 'redirecting':
              return (
                <div id="redirect-loading-screen" className="flex flex-col items-center justify-center min-h-[90vh] bg-[#001A3D] text-white p-6 text-center">
                  <div className="relative w-20 h-20 mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-blue-500 animate-spin"></div>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Redireccionando a Google Reviews</h2>
                  <p className="text-white/60 max-w-sm">Si no te redirecciona automáticamente en unos segundos, haz clic en el siguiente enlace:</p>
                  <a href="https://search.google.com/local/writereview?placeid=ChIJw_vX3CgQkEcR_VMyRUpGfK4" className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-full font-medium transition-colors text-sm text-white inline-block">
                    ⭐️ Enlace Directo Google Reviews
                  </a>
                </div>
              );
            case 'clients':
              return <LoginPage onNavigate={handleNavigate} />;
            case 'dashboard':
              if (authLoading) {
                return (
                  <div id="auth-loading-screen" className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                    <div className="relative w-16 h-16 mb-6">
                      <div className="absolute inset-0 rounded-full border-4 border-blue-600/10"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-blue-600 animate-spin"></div>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 font-sans">Lade Kraken PFM...</h3>
                    <p className="text-slate-500 text-sm mt-1 max-w-xs font-sans">Einen Moment bitte, während die Verbindung hergestellt wird.</p>
                  </div>
                );
              }
              if (!user) {
                return <LoginPage onNavigate={handleNavigate} />;
              }
              return <Dashboard />;
            case 'login':
              return <LoginPage onNavigate={handleNavigate} />;
            case 'register':
              return <RegisterPage onNavigate={handleNavigate} />;
            case 'consultation':
              return <CalculatorRoute onNavigate={handleNavigate} cart={cart} />;
            case 'calculator-demo':
              return <CalculatorRoute onNavigate={handleNavigate} preview />;
            case 'customer-access':
              return <CustomerAccessRoute onNavigate={handleNavigate} />;
            case 'gdpr':
              return <GDPRPage />;
            case 'terms':
              return <TermsPage onNavigate={handleNavigate} />;
            case 'impressum':
              return <ImpressumPage onNavigate={handleNavigate} />;
            case 'kontakt':
              return <KontaktPage onNavigate={handleNavigate} />;
            case 'region-hub':
              return <RegionHubPage regionId={seoCityId as any} onNavigate={handleNavigate} />;
            case 'seo-landing':
              return <SeoServiceCityPage cityId={seoCityId} serviceId={seoServiceId} onNavigate={handleNavigate} />;
            case 'coverage-hub':
              return <CoverageHubPage onNavigate={handleNavigate} />;
            case '404':
              return <NotFoundPage />;
            case 'home':
            default:
              return <ApprovedHome onNavigate={handleNavigate} />;
          }
        })()}
      </Suspense>
    </ChunkErrorBoundary>
  );
};

  const isReviewPage = page === 'review-invite';
  const isLocalSeo = ['region-hub', 'municipality-page', 'coverage-hub', 'seo-landing'].includes(page);
  const isApprovedHome = isLocalSeo || ['home', 'approved-services', 'about', 'kontakt', 'consultation', 'calculator-demo', 'customer-access'].includes(page);

  return (
    <div className="bg-slate-50 text-gray-800 relative">
      {mounted && !isReviewPage && (
        <Suspense fallback={null}>
          <FloatingMascot currentPage={page} cart={cart} onNavigate={handleNavigate} seoCityId={seoCityId} />
        </Suspense>
      )}
      
      {!isReviewPage && !isApprovedHome && <Header onNavigate={handleNavigate} currentPage={page as any} />}
      {isLocalSeo && <div className="kraken-home"><ApprovedHeader onNavigate={handleNavigate} page="local" /></div>}
      {renderPage()}
      <Footer onNavigate={handleNavigate} />
      {mounted && !isReviewPage && (
        <Suspense fallback={null}>
          <CookieConsent onNavigate={handleNavigate} />
        </Suspense>
      )}
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default App;
