import { useEffect, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowRight, Check, ChevronDown, Gift, ShoppingBag, X } from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import logoImage from '@assets/myoko-logo.png';
import releaseImage from '@assets/myoko-release.png';
import loyaltyImage from '@assets/myoko-loyalty.jpg';

type CartLine = { quantity: number };
type CheckoutForm = {
  name: string;
  className: string;
  school: string;
  albumName: string;
  deliveryPreference: string;
  deliveryNotes: string;
};
type Offer = { id: string; name: string; quantity: number; price: number; description: string };

const queryClient = new QueryClient();
const money = (value: number) => `${value.toLocaleString('en-US')} KIP`;
const offers: Offer[] = [
  { id: 'special-one', name: 'The Special One Offer', quantity: 1, price: 27000, description: 'One customized keychain, made just for you.' },
  { id: 'better-together', name: 'The Better Together Offer', quantity: 2, price: 45000, description: 'Keep one. Gift one. Start a tiny movement.' },
  { id: 'gang', name: 'The Gang Offer', quantity: 4, price: 100000, description: 'A keychain for your whole music-loving crew.' },
  { id: 'family', name: 'The Family Offer', quantity: 7, price: 167000, description: 'Seven keychains for the people who get your sound.' },
];
const deliveryOptions = [
  'Deliver at Morning Break',
  'Deliver at Lunch',
  'Deliver at Afternoon Break',
  'Deliver After School',
];
const emptyCheckoutForm: CheckoutForm = {
  name: '',
  className: '',
  school: '',
  albumName: '',
  deliveryPreference: deliveryOptions[0],
  deliveryNotes: '',
};

const bestOfferPlan = (quantity: number) => {
  if (quantity <= 0) return [] as Offer[];
  const plan = Array.from({ length: quantity + 1 }, () => ({ cost: Number.POSITIVE_INFINITY, offers: [] as Offer[] }));
  plan[0] = { cost: 0, offers: [] };
  for (let total = 1; total <= quantity; total += 1) {
    for (const offer of offers) {
      if (total < offer.quantity || !Number.isFinite(plan[total - offer.quantity].cost)) continue;
      const candidateOffers = [...plan[total - offer.quantity].offers, offer];
      const candidateCost = plan[total - offer.quantity].cost + offer.price;
      if (candidateCost < plan[total].cost || (candidateCost === plan[total].cost && candidateOffers.length < plan[total].offers.length)) {
        plan[total] = { cost: candidateCost, offers: candidateOffers };
      }
    }
  }
  return plan[quantity].offers;
};

const readStoredNumber = (key: string) => {
  if (typeof window === 'undefined') return 0;
  const stored = Number(window.localStorage.getItem(key));
  return Number.isFinite(stored) && stored >= 0 ? stored : 0;
};

function Home() {
  const [cart, setCart] = useState<CartLine>({ quantity: 0 });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [loyaltyStamps, setLoyaltyStamps] = useState(() => readStoredNumber('myoko-loyalty-stamps'));
  const [loyaltyRewardAvailable, setLoyaltyRewardAvailable] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('myoko-loyalty-reward') === 'true');
  const [loyaltyApplied, setLoyaltyApplied] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderReference, setOrderReference] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [form, setForm] = useState<CheckoutForm>(emptyCheckoutForm);

  const quantity = cart.quantity;
  const offerPlan = bestOfferPlan(quantity);
  const subtotal = offerPlan.reduce((sum, offer) => sum + offer.price, 0);
  const discount = couponApplied ? 5000 : 0;
  const loyaltyDiscount = loyaltyApplied ? Math.round(subtotal * 0.3) : 0;
  const total = Math.max(0, subtotal - discount - loyaltyDiscount);
  const groupedPlan = offers
    .map((offer) => ({ offer, count: offerPlan.filter((plannedOffer) => plannedOffer.id === offer.id).length }))
    .filter(({ count }) => count > 0);

  useEffect(() => {
    window.localStorage.setItem('myoko-loyalty-stamps', String(loyaltyStamps));
    window.localStorage.setItem('myoko-loyalty-reward', String(loyaltyRewardAvailable));
  }, [loyaltyRewardAvailable, loyaltyStamps]);

  const addOffer = (offer: Offer) => {
    setCart((current) => ({ quantity: current.quantity + offer.quantity }));
    setCartOpen(true);
  };
  const clearCart = () => {
    setCart({ quantity: 0 });
    setCoupon('');
    setCouponApplied(false);
    setLoyaltyApplied(false);
  };
  const resetCheckout = () => {
    clearCart();
    setForm(emptyCheckoutForm);
    setOrderComplete(false);
    setOrderReference('');
    setCheckoutError('');
  };
  const goTo = (id: string) => {
    setMobileMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
  const completeCheckout = async (event: FormEvent) => {
    event.preventDefault();
    setCheckoutError('');
    setSubmittingOrder(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.name,
          className: form.className,
          school: form.school,
          albumName: form.albumName,
          deliveryPreference: form.deliveryPreference,
          deliveryNotes: form.deliveryNotes,
          quantity,
          couponCode: couponApplied ? coupon : '',
          loyaltyApplied,
        }),
      });
      const result = await response.json() as { orderNumber?: string; message?: string };
      if (!response.ok || !result.orderNumber) {
        throw new Error(result.message || 'Could not save your order. Please try again.');
      }

      const nextStamps = loyaltyStamps + quantity;
      setLoyaltyStamps(nextStamps);
      if (loyaltyApplied) {
        setLoyaltyRewardAvailable(false);
      } else if (nextStamps >= 10) {
        setLoyaltyRewardAvailable(true);
      }
      setOrderReference(result.orderNumber);
      setOrderComplete(true);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Could not save your order. Please try again.');
    } finally {
      setSubmittingOrder(false);
    }
  };
  const setField = (field: keyof CheckoutForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <div className="myoko-page noise min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-30 border-b border-foreground/15 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-[74px] max-w-[1280px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <button className="focus-ring flex items-center gap-2" onClick={() => goTo('top')} aria-label="Back to top" data-testid="button-logo-home">
            <img src={logoImage} alt="Myoko Music record logo" className="h-10 w-10 rounded-full object-cover" />
            <span className="font-display text-lg font-extrabold tracking-[-.04em]">MYOKO</span>
          </button>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <button className="focus-ring font-mono-brand text-[10px] uppercase tracking-[.18em] hover:text-primary" onClick={() => goTo('listen')} data-testid="link-shop">Shop</button>
            <button className="focus-ring font-mono-brand text-[10px] uppercase tracking-[.18em] hover:text-primary" onClick={() => goTo('story')} data-testid="link-story">Our sound</button>
            <button className="focus-ring font-mono-brand text-[10px] uppercase tracking-[.18em] hover:text-primary" onClick={() => goTo('crew')} data-testid="link-crew">The crew</button>
          </nav>
          <div className="flex items-center gap-3">
            <button className="focus-ring flex items-center gap-2 border border-foreground px-3 py-2 font-mono-brand text-[10px] uppercase tracking-[.12em] transition hover:bg-foreground hover:text-background" onClick={() => setLoyaltyOpen(true)} aria-label="Open loyalty card" data-testid="button-loyalty">
              <Gift size={15} strokeWidth={1.8} /> <span className="hidden sm:inline">Loyalty</span>
            </button>
            <button className="focus-ring relative flex items-center gap-2 border border-foreground px-3 py-2 font-mono-brand text-[10px] uppercase tracking-[.12em] transition hover:bg-foreground hover:text-background" onClick={() => setCartOpen(true)} aria-label={`Open cart with ${quantity} items`} data-testid="button-open-cart">
              <ShoppingBag size={15} strokeWidth={1.8} /> <span className="hidden sm:inline">Bag</span>
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] text-primary-foreground" data-testid="text-cart-count">{quantity}</span>
            </button>
            <button className="focus-ring border border-foreground p-2 md:hidden" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu" data-testid="button-mobile-menu">
              <ChevronDown className={`transition-transform ${mobileMenu ? 'rotate-180' : ''}`} size={17} />
            </button>
          </div>
        </div>
        {mobileMenu && <nav className="border-t border-foreground/15 bg-background px-5 py-4 md:hidden" aria-label="Mobile navigation">
          <div className="flex flex-col gap-4">
            {['listen', 'story', 'crew'].map((id) => <button key={id} className="font-mono-brand text-left text-xs uppercase tracking-[.2em]" onClick={() => goTo(id)} data-testid={`link-mobile-${id}`}>{id === 'listen' ? 'Shop' : id === 'story' ? 'Our sound' : 'The crew'}</button>)}
          </div>
        </nav>}
      </header>

      <main id="top">
        <section className="relative mx-auto grid min-h-[650px] max-w-[1280px] items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:px-12 lg:py-24">
          <div className="relative z-10">
            <p className="reveal font-mono-brand text-[10px] uppercase tracking-[.25em] text-primary">MYOKO Music / Vientiane, Laos</p>
            <h1 className="reveal reveal-delay-1 mt-6 max-w-3xl font-display text-[clamp(4rem,10vw,9.3rem)] font-extrabold leading-[.82] tracking-[-.095em]">
              YOUR<br /><span className="text-primary">OWN</span><br />MUSIC.
            </h1>
            <div className="reveal reveal-delay-2 mt-8 flex max-w-lg items-start gap-5">
              <div className="mt-2 h-px w-12 shrink-0 bg-foreground" />
              <p className="text-balance text-base leading-relaxed text-foreground/70">Keychains filled with your favorite music, endorsed with the feelings you love. Customized NFC sheet music keychains.</p>
            </div>
            <div className="reveal reveal-delay-3 mt-9 flex flex-wrap items-center gap-4">
              <button className="focus-ring hard-shadow group flex items-center gap-3 bg-primary px-5 py-3 font-mono-brand text-[11px] uppercase tracking-[.16em] text-primary-foreground transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none" onClick={() => goTo('listen')} data-testid="button-hero-shop">Find your sound <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></button>
              <button className="focus-ring flex items-center gap-2 px-2 py-3 font-mono-brand text-[10px] uppercase tracking-[.14em] underline decoration-1 underline-offset-4" onClick={() => goTo('story')} data-testid="button-hero-story">Why Myoko <ArrowDown size={13} /></button>
            </div>
          </div>
          <div className="relative flex min-h-[390px] items-center justify-center lg:min-h-[550px]">
            <div className="grid-paper absolute right-0 top-4 h-[76%] w-[78%] border border-foreground/20" />
            <div className="absolute right-[6%] top-[10%] font-mono-brand text-[10px] uppercase tracking-[.2em] text-foreground/50 [writing-mode:vertical-rl]">Press play / 01</div>
            <div className="record-float relative z-10 w-[min(77vw,430px)]">
              <div className="rounded-full border-[10px] border-primary bg-primary p-2 shadow-[14px_16px_0_rgba(14,13,12,.95)]">
                <img src={logoImage} alt="Myoko Music record" className="record-spin block aspect-square w-full rounded-full object-cover" />
              </div>
              <div className="absolute -bottom-5 -left-7 border border-foreground bg-secondary px-4 py-3 font-mono-brand text-[10px] uppercase tracking-[.12em] shadow-[4px_4px_0_rgba(14,13,12,.9)]">Understand it.<br /><span className="text-primary">Make your own music.</span></div>
            </div>
            <div className="absolute bottom-2 left-0 hidden w-40 rotate-[-7deg] border border-foreground bg-accent p-4 text-primary-foreground sm:block">
              <p className="font-mono-brand text-[9px] uppercase leading-relaxed tracking-[.12em]">A tiny label<br />with a loud point<br />of view.</p>
            </div>
          </div>
        </section>

        <div className="overflow-hidden border-y border-foreground bg-primary py-3 text-primary-foreground">
          <div className="ticker-track flex w-max whitespace-nowrap font-mono-brand text-[10px] uppercase tracking-[.2em]">
            {Array.from({ length: 6 }, (_, i) => <span key={i} className="mx-6">Make your own kind of music <span className="mx-6 text-secondary">✦</span></span>)}
          </div>
        </div>

        <section id="listen" className="bg-foreground px-5 py-20 text-background sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-[1280px]">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="font-mono-brand text-[10px] uppercase tracking-[.24em] text-secondary">01 / Shop</p>
                <h2 className="mt-4 max-w-2xl font-display text-5xl font-bold leading-[.92] tracking-[-.07em] sm:text-7xl">Listen to it<br /><span className="text-primary">your</span> own way.</h2>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-background/60">A pocket-sized music keychain for the days that you need them. Affordable by design. Impossible to ignore.</p>
            </div>
            <div className="mt-14 grid gap-7 lg:grid-cols-[1.2fr_.8fr]">
              <div className="relative overflow-hidden border border-background/25 bg-[#171615] p-5 sm:p-8">
                <div className="absolute right-7 top-7 font-mono-brand text-[9px] uppercase tracking-[.18em] text-background/40">MYK-001 / 2025</div>
                  <div className="flex min-h-[390px] items-center justify-center">
                  <div className="relative w-[min(78vw,440px)]">
                    <div className="absolute inset-0 translate-x-5 translate-y-5 rounded-[4px] border border-primary/50 bg-primary/20" />
                    <img src={releaseImage} alt="Myoko Music release artwork" className="relative block w-full rounded-[4px] object-contain shadow-[0_0_0_11px_#b93c3c,0_0_0_12px_#171615]" />
                  </div>
                </div>
                <div className="flex items-end justify-between gap-4 border-t border-background/20 pt-5">
                  <div><p className="font-display text-2xl font-bold">Music Keychains</p><p className="mt-1 font-mono-brand text-[10px] uppercase tracking-[.15em] text-background/50">Order your favorite album now!!!</p></div>
                </div>
              </div>
              <div className="flex flex-col gap-5">
                <div className="bg-secondary p-6 text-foreground sm:p-8">
                  <div className="flex items-start justify-between"><span className="font-mono-brand text-[10px] uppercase tracking-[.18em]">Offers, not loose keychains</span><span className="font-display text-4xl font-bold">04</span></div>
                  <h3 className="mt-10 font-display text-3xl font-bold leading-tight tracking-[-.05em]">Pick a stack.<br />We find the best value.</h3>
                  <p className="mt-4 max-w-xs text-sm leading-relaxed text-foreground/65">Every order is built from these offers. Add any combination and we automatically choose the lowest-cost way to reach your keychain count.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {offers.map((offer, index) => (
                    <button key={offer.id} className="focus-ring group flex min-h-44 flex-col justify-between border border-background/30 p-5 text-left transition hover:border-secondary hover:bg-background/5" onClick={() => addOffer(offer)} data-testid={`button-add-offer-${offer.id}`}>
                      <div className="flex items-start justify-between gap-3"><span className="font-mono-brand text-[9px] uppercase tracking-[.15em] text-secondary">{offer.name}</span><span className="font-mono-brand text-[9px] text-background/45">0{index + 1}</span></div>
                      <div><p className="mt-6 font-display text-2xl font-bold tracking-[-.05em]">{offer.quantity} {offer.quantity === 1 ? 'Keychain' : 'Keychains'}</p><p className="mt-1 font-mono-brand text-xs text-secondary">{money(offer.price)}</p><p className="mt-3 text-xs leading-relaxed text-background/55">{offer.description}</p></div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 border-t border-background/20 pt-6 text-background/55 sm:grid-cols-4">
              {['Locally packed with care', 'Personalized', 'Affordable with great quality', '90 days money-back guranteed'].map((text, i) => <div key={text} className="flex items-center gap-2 font-mono-brand text-[9px] uppercase tracking-[.12em]"><span className="text-secondary">0{i + 1}</span>{text}</div>)}
            </div>
          </div>
        </section>

        <section id="story" className="mx-auto grid max-w-[1280px] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[.75fr_1.25fr] lg:px-12 lg:py-36">
          <div><p className="font-mono-brand text-[10px] uppercase tracking-[.24em] text-primary">02 / The Origin </p><div className="mt-8 h-32 w-32 rounded-full border border-foreground bg-secondary p-3"><img src={logoImage} alt="" className="record-spin h-full w-full rounded-full object-cover" /></div></div>
          <div>
            <h2 className="max-w-3xl font-display text-5xl font-bold leading-[.95] tracking-[-.07em] sm:text-7xl">How We<br /><span className="text-primary">Started.</span></h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <p className="text-base leading-relaxed text-foreground/70">Myoko Music started with a simple question: what if a aesthetically pleasing keychain felt as personal as the song you play when nobody is watching? 1 question turned into 5 great individuals who understood the problem and found the best possible solution ever. We are a student-built label making room for individual taste and preferences.</p>
              <p className="text-base leading-relaxed text-foreground/70">The name is a nod to “Make Your Own Kind of Music” by Mama Cass — which is our slogan, which we do exactly that. Spread the words of aesthetic and music combined with our customized keychains.</p>
            </div>
            <div className="mt-12 border-l-2 border-primary pl-5"><p className="font-display text-2xl font-semibold leading-tight tracking-[-.03em]">“There is no wrong way to press play. Express Yourself.”</p><p className="mt-2 font-mono-brand text-[9px] uppercase tracking-[.15em] text-foreground/50">— Myoko, Jason</p></div>
          </div>
        </section>

        <section id="crew" className="border-y border-foreground bg-secondary px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-[1280px]">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="font-mono-brand text-[10px] uppercase tracking-[.24em]">03 / The Team</p><h2 className="mt-4 font-display text-5xl font-bold leading-[.9] tracking-[-.07em] sm:text-7xl">Four people.<br />One <span className="text-primary">Mission.</span></h2></div><p className="max-w-xs text-sm leading-relaxed text-foreground/65">The humans behind the label, The production, Organization and the care behind the business.</p></div>
            <div className="mt-14 grid gap-px border border-foreground bg-foreground sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['01', 'New', 'CEO & Founder', 'Keeps the needle moving.'],
                ['02', 'Jason', 'Head of Marketing', 'Finds the right ears.'],
                ['03', 'Sandra', 'Head of Finance', 'Makes the math sing.'],
                ['04', 'Tino', 'HR Manager', 'Protects the good energy.'],
              ].map(([number, name, role, line]) => <article key={name} className="group flex min-h-[265px] flex-col justify-between bg-secondary p-6 transition hover:bg-background sm:p-7" data-testid={`card-team-${name.toLowerCase()}`}><div className="flex justify-between font-mono-brand text-[10px]"><span>{number}</span><span className="text-primary">MYK</span></div><div><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-foreground bg-primary font-display text-xl font-bold text-primary-foreground transition group-hover:rotate-12">{name.charAt(0)}</div><h3 className="font-display text-2xl font-bold tracking-[-.05em]">{name}</h3><p className="mt-1 font-mono-brand text-[10px] uppercase tracking-[.12em] text-primary">{role}</p><p className="mt-4 text-sm text-foreground/60">{line}</p></div></article>)}
            </div>
          </div>
        </section>

        <section className="bg-primary px-5 py-24 text-primary-foreground sm:px-8 lg:px-12 lg:py-32">
          <div className="mx-auto grid max-w-[1280px] items-end gap-10 lg:grid-cols-[1fr_.65fr]">
            <div><p className="font-mono-brand text-[10px] uppercase tracking-[.24em] text-secondary">04 / Take it home</p><h2 className="mt-5 max-w-4xl font-display text-[clamp(3.5rem,8vw,8rem)] font-extrabold leading-[.82] tracking-[-.1em]">MAKE<br />SOME<br /><span className="text-secondary">NOISE.</span></h2></div>
            <div><p className="max-w-sm text-base leading-relaxed text-primary-foreground/75">The first Myoko drop is ready for your desk, your bag, your friend who always sends the best songs.</p><button className="focus-ring mt-8 flex items-center gap-4 border border-primary-foreground px-5 py-4 font-mono-brand text-[10px] uppercase tracking-[.17em] transition hover:bg-primary-foreground hover:text-primary" onClick={() => goTo('listen')} data-testid="button-final-offers">See all offers <ArrowRight size={16} /></button></div>
          </div>
        </section>
      </main>

      <footer className="bg-foreground px-5 py-8 text-background sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3"><img src={logoImage} alt="" className="h-9 w-9 rounded-full object-cover" /><span className="font-display text-lg font-bold">MYOKO MUSIC</span></div>
          <p className="font-mono-brand text-[9px] uppercase tracking-[.15em] text-background/50">Built by students / made for listeners / 2025</p>
          <button className="focus-ring self-start font-mono-brand text-[9px] uppercase tracking-[.15em] underline underline-offset-4 sm:self-auto" onClick={() => goTo('top')} data-testid="button-back-top">Back to top ↑</button>
        </div>
      </footer>

      {cartOpen && <div className="fixed inset-0 z-50 flex justify-end bg-foreground/45" role="dialog" aria-modal="true" aria-label="Shopping bag">
        <div className="flex h-full w-full max-w-md flex-col bg-background shadow-[-18px_0_40px_rgba(0,0,0,.18)]">
           <div className="flex items-center justify-between border-b border-foreground/20 px-6 py-5"><div><p className="font-mono-brand text-[10px] uppercase tracking-[.2em] text-primary">Your bag</p><h2 className="mt-1 font-display text-3xl font-bold tracking-[-.06em]">Ready to play.</h2></div><button className="focus-ring p-2" onClick={() => { setCartOpen(false); clearCart(); }} aria-label="Close shopping bag and clear it" data-testid="button-close-cart"><X size={20} /></button></div>
          <div className="flex-1 overflow-y-auto px-6 py-7">
             {quantity === 0 ? <div className="flex h-full flex-col items-center justify-center text-center"><div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-foreground"><ShoppingBag size={22} /></div><h3 className="font-display text-2xl font-bold">The bag is quiet.</h3><p className="mt-2 max-w-xs text-sm text-foreground/55">Choose an offer and give it something to say.</p><button className="focus-ring mt-7 bg-primary px-5 py-3 font-mono-brand text-[10px] uppercase tracking-[.15em] text-primary-foreground" onClick={() => { setCartOpen(false); goTo('listen'); }} data-testid="button-empty-shop">Browse the offers</button></div> : <div>
               <div className="flex gap-4 border-b border-foreground/15 pb-6"><img src={releaseImage} alt="Myoko Music release" className="h-20 w-20 rounded-[4px] object-cover" /><div className="flex flex-1 justify-between"><div><h3 className="font-display text-xl font-bold">Your offer stack</h3><p className="mt-1 font-mono-brand text-[9px] uppercase tracking-[.13em] text-foreground/50">{quantity} keychains / best value</p></div><p className="font-mono-brand text-xs">{money(subtotal)}</p></div></div>
               <div className="border-b border-foreground/15 py-5"><div className="flex items-center justify-between"><span className="font-mono-brand text-[10px] uppercase tracking-[.15em]">Best offer combination</span><span className="font-mono-brand text-xs text-primary" data-testid="text-item-quantity">{quantity} keychains</span></div><div className="mt-4 space-y-3">{groupedPlan.map(({ offer, count }) => <div key={offer.id} className="flex items-center justify-between text-sm"><span>{count} × {offer.name}</span><span className="font-mono-brand text-xs">{money(offer.price * count)}</span></div>)}</div><p className="mt-4 text-xs leading-relaxed text-foreground/55">We automatically combine offers so you never pay more than necessary.</p></div>
               <div className="border-b border-foreground/15 py-5"><label htmlFor="coupon" className="font-mono-brand text-[10px] uppercase tracking-[.15em]">Coupon code</label><div className="mt-3 flex gap-2"><input id="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="MYOKO5K" className="focus-ring min-w-0 flex-1 border border-foreground bg-transparent px-3 py-2 font-mono-brand text-xs uppercase outline-none" data-testid="input-coupon" /><button className="focus-ring border border-foreground px-3 py-2 font-mono-brand text-[10px] uppercase tracking-[.1em] hover:bg-foreground hover:text-background" onClick={() => setCouponApplied(coupon.trim().toUpperCase() === 'MYOKO5K')} data-testid="button-apply-coupon">Apply</button></div>{couponApplied && <p className="mt-2 flex items-center gap-1 text-xs text-accent"><Check size={13} /> 5,000 KIP taken off.</p>}</div>
               {loyaltyRewardAvailable && <div className="border-b border-foreground/15 py-5"><div className="flex items-start justify-between gap-4"><div><p className="font-mono-brand text-[10px] uppercase tracking-[.15em] text-primary">Loyalty reward unlocked</p><p className="mt-2 text-sm leading-relaxed text-foreground/70">Free keychain + 30% off this new order.</p></div><button className={`focus-ring shrink-0 border px-3 py-2 font-mono-brand text-[9px] uppercase tracking-[.1em] ${loyaltyApplied ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground hover:bg-foreground hover:text-background'}`} onClick={() => setLoyaltyApplied((applied) => !applied)} data-testid="button-apply-loyalty">{loyaltyApplied ? 'Applied' : 'Use reward'}</button></div>{loyaltyApplied && <p className="mt-3 flex items-center gap-1 text-xs text-accent"><Check size={13} /> One free keychain added. 30% taken off.</p>}</div>}
               <div className="space-y-3 pt-6 text-sm"><div className="flex justify-between"><span className="text-foreground/55">Subtotal</span><span data-testid="text-subtotal">{money(subtotal)}</span></div>{couponApplied && <div className="flex justify-between text-accent"><span>Coupon</span><span>-{money(discount)}</span></div>}{loyaltyApplied && <div className="flex justify-between text-accent"><span>Loyalty reward</span><span>-{money(loyaltyDiscount)}</span></div>}{loyaltyApplied && <div className="flex justify-between text-foreground/55"><span>Keychains included</span><span>{quantity + 1}</span></div>}<div className="flex justify-between border-t border-foreground/20 pt-4 font-display text-xl font-bold"><span>Total</span><span data-testid="text-cart-total">{money(total)}</span></div></div>
            </div>}
          </div>
          {quantity > 0 && <div className="border-t border-foreground/20 px-6 py-6"><p className="mb-4 text-center font-mono-brand text-[9px] uppercase tracking-[.12em] text-foreground/50">Checkout is a demo — no payment will be charged</p><button className="focus-ring flex w-full items-center justify-center gap-3 bg-primary px-5 py-4 font-mono-brand text-[11px] uppercase tracking-[.15em] text-primary-foreground transition hover:bg-accent" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }} data-testid="button-checkout">Continue to demo checkout <ArrowRight size={15} /></button></div>}
        </div>
      </div>}

      {checkoutOpen && <div className="fixed inset-0 z-[60] overflow-y-auto bg-foreground/60 px-4 py-6 sm:px-8 sm:py-12" role="dialog" aria-modal="true" aria-label="Demo checkout">
        <div className="mx-auto max-w-3xl bg-background">
          {orderComplete ? <div className="flex min-h-[550px] flex-col items-center justify-center px-6 py-16 text-center sm:px-16"><div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-background"><Check size={38} strokeWidth={2} /></div><p className="mt-8 font-mono-brand text-[10px] uppercase tracking-[.22em] text-primary">Your order is saved</p><h2 className="mt-4 font-display text-5xl font-bold leading-[.9] tracking-[-.08em] sm:text-7xl">See you<br /><span className="text-primary">at school.</span></h2><p className="mt-6 max-w-md text-sm leading-relaxed text-foreground/60">We’ll make your keychains and meet you during your selected delivery time. Payment is collected at handover by cash or your agreed QR method.</p><div className="mt-8 border border-foreground px-5 py-3 font-mono-brand text-xs tracking-[.12em]" data-testid="text-order-reference">ORDER REF / {orderReference}</div><button className="focus-ring mt-8 flex items-center gap-3 border border-foreground px-5 py-3 font-mono-brand text-[10px] uppercase tracking-[.14em] hover:bg-foreground hover:text-background" onClick={() => { setCheckoutOpen(false); resetCheckout(); }} data-testid="button-close-confirmation">Back to Myoko <ArrowRight size={14} /></button></div> : <form onSubmit={completeCheckout} className="p-6 sm:p-10">
            <div className="flex items-start justify-between border-b border-foreground/20 pb-7"><div><p className="font-mono-brand text-[10px] uppercase tracking-[.2em] text-primary">Reserve your keychains</p><h2 className="mt-2 font-display text-4xl font-bold tracking-[-.07em]">Make it yours.</h2><p className="mt-2 max-w-md text-sm text-foreground/60">Place a real preorder. We’ll collect payment when we give it to you at school. Closing this window clears the bag.</p></div><button type="button" className="focus-ring p-2" onClick={() => { setCheckoutOpen(false); resetCheckout(); }} aria-label="Close checkout and clear it" data-testid="button-close-checkout"><X size={20} /></button></div>
            <div className="mt-8 grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="form-label">1. Name <span className="text-primary">*</span></span><input required value={form.name} onChange={(e) => setField('name', e.target.value)} className="form-input" placeholder="Your name" data-testid="input-checkout-name" /></label>
              <label><span className="form-label">2. Class <span className="text-primary">*</span></span><input required value={form.className} onChange={(e) => setField('className', e.target.value)} className="form-input" placeholder="For example: 10A" data-testid="input-checkout-class" /></label>
              <label><span className="form-label">3. School <span className="text-primary">*</span></span><input required value={form.school} onChange={(e) => setField('school', e.target.value)} className="form-input" placeholder="Your school" data-testid="input-checkout-school" /></label>
              <label className="sm:col-span-2"><span className="form-label">4. Album name <span className="text-primary">*</span></span><input required value={form.albumName} onChange={(e) => setField('albumName', e.target.value)} className="form-input" placeholder="The album name for your keychain" data-testid="input-checkout-album" /></label>
              <label className="sm:col-span-2"><span className="form-label">5. Delivery preference <span className="text-primary">*</span></span><select required value={form.deliveryPreference} onChange={(e) => setField('deliveryPreference', e.target.value)} className="form-input" data-testid="input-checkout-delivery"><option value="" disabled>Select a delivery time</option>{deliveryOptions.map((option) => <option key={option}>{option}</option>)}</select><span className="mt-2 block text-xs leading-relaxed text-foreground/55">Not receiving the delivery at the chosen time means that you need to order again. It cannot be rescheduled.</span></label>
              <label className="sm:col-span-2"><span className="form-label">6. Other notes for delivery <span className="text-foreground/45">(optional)</span></span><textarea value={form.deliveryNotes} onChange={(e) => setField('deliveryNotes', e.target.value)} className="form-input min-h-24 resize-y" placeholder="For example: the meeting area to exchange and get the product" data-testid="input-checkout-delivery-notes" /></label>
            </div>
            <div className="mt-9 border-t border-foreground/20 pt-7"><div className="flex items-center justify-between"><h3 className="font-display text-2xl font-bold tracking-[-.05em]">Payment at handover</h3><span className="font-mono-brand text-[9px] uppercase tracking-[.12em] text-foreground/45">Cash / QR</span></div><p className="mt-3 text-sm leading-relaxed text-foreground/60">We’ll collect payment when we deliver your order. Choose cash or an approved BCEL OnePay/TrustPay QR method with the Myoko team.</p></div>
            {checkoutError && <p className="mt-6 border border-primary bg-primary/10 px-4 py-3 text-sm text-primary" role="alert">{checkoutError}</p>}
            <div className="mt-8 flex flex-col-reverse items-stretch justify-between gap-4 border-t border-foreground/20 pt-6 sm:flex-row sm:items-center"><p className="font-mono-brand text-[10px] uppercase tracking-[.12em] text-foreground/50">Total at handover <strong className="ml-2 text-foreground">{money(total)}</strong></p><button type="submit" disabled={submittingOrder} className="focus-ring flex items-center justify-center gap-3 bg-primary px-6 py-4 font-mono-brand text-[10px] uppercase tracking-[.15em] text-primary-foreground hover:bg-accent disabled:cursor-wait disabled:opacity-60" data-testid="button-submit-checkout">{submittingOrder ? 'Saving order…' : 'Place order'} <ArrowRight size={15} /></button></div>
          </form>}
        </div>
      </div>}

      {loyaltyOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-foreground/60 px-4 py-6 sm:px-8" role="dialog" aria-modal="true" aria-label="Myoko loyalty card">
        <div className="w-full max-w-2xl bg-background shadow-[12px_12px_0_rgba(14,13,12,.95)]">
          <div className="flex items-start justify-between border-b border-foreground/20 px-6 py-5 sm:px-8"><div><p className="font-mono-brand text-[10px] uppercase tracking-[.2em] text-primary">Myoko rewards</p><h2 className="mt-1 font-display text-3xl font-bold tracking-[-.06em]">Keep the music going.</h2></div><button className="focus-ring p-2" onClick={() => setLoyaltyOpen(false)} aria-label="Close loyalty card" data-testid="button-close-loyalty"><X size={20} /></button></div>
          <div className="grid gap-7 p-6 sm:p-8 md:grid-cols-[1.1fr_.9fr]">
            <div><img src={loyaltyImage} alt="Myoko Music loyalty card with ten stamp circles" className="w-full rounded-[4px] border border-foreground/20 object-cover" /><p className="mt-3 font-mono-brand text-[9px] uppercase tracking-[.12em] text-foreground/50">Your progress never resets.</p></div>
            <div className="flex flex-col justify-between">
              <div><div className="flex items-end justify-between"><span className="font-mono-brand text-[10px] uppercase tracking-[.15em]">Your stamps</span><span className="font-display text-4xl font-bold text-primary" data-testid="text-loyalty-stamps">{Math.min(loyaltyStamps, 10)}<span className="text-foreground/30">/10</span></span></div><div className="mt-4 grid grid-cols-5 gap-2">{Array.from({ length: 10 }, (_, index) => <span key={index} className={`flex aspect-square items-center justify-center rounded-full border border-foreground font-mono-brand text-[9px] ${index < loyaltyStamps ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground/35'}`}>{index + 1}</span>)}</div><p className="mt-5 text-sm leading-relaxed text-foreground/65">{loyaltyRewardAvailable ? 'Your reward is ready: apply it to a new order for one free keychain and 30% off.' : `${Math.max(0, 10 - loyaltyStamps)} more ${10 - loyaltyStamps === 1 ? 'keychain' : 'keychains'} until your free keychain and 30% off reward unlocks.`}</p></div>
              <div className="mt-8 border-t border-foreground/15 pt-5"><p className="font-mono-brand text-[9px] uppercase tracking-[.12em] text-foreground/50">How it works</p><p className="mt-2 text-sm leading-relaxed text-foreground/70">Every completed website order adds its keychains forever. At ten, your reward stays available until you choose to use it on a future order.</p><button className="focus-ring mt-5 flex items-center gap-3 border border-foreground px-4 py-3 font-mono-brand text-[10px] uppercase tracking-[.14em] hover:bg-foreground hover:text-background" onClick={() => setLoyaltyOpen(false)} data-testid="button-close-loyalty-note">Keep listening <ArrowRight size={14} /></button></div>
            </div>
          </div>
        </div>
      </div>}
    </div>
  );
}

type AdminOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  className: string;
  school: string;
  albumName: string;
  deliveryPreference: string;
  deliveryNotes: string | null;
  keychainQuantity: number;
  offers: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  couponDiscount: number;
  loyaltyDiscount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: 'unpaid' | 'paid';
  orderStatus: 'new' | 'confirmed' | 'making' | 'ready' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
};

const adminOrderStatuses: AdminOrder['orderStatus'][] = ['new', 'confirmed', 'making', 'ready', 'completed', 'cancelled'];

function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState('');

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await fetch('/api/admin/orders');
      if (response.status === 401) {
        setAuthenticated(false);
        return;
      }
      const result = await response.json() as { orders?: AdminOrder[]; message?: string };
      if (!response.ok) throw new Error(result.message || 'Could not load orders');
      setOrders(result.orders || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetch('/api/admin/session')
      .then(async (response) => {
        const result = await response.json() as { authenticated?: boolean };
        setAuthenticated(result.authenticated === true);
        if (result.authenticated) await loadOrders();
      })
      .catch(() => {
        setAuthenticated(false);
        setError('The admin service is unavailable.');
      });
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const result = await response.json() as { message?: string };
    if (!response.ok) {
      setError(result.message || 'Login failed');
      return;
    }
    setPassword('');
    setAuthenticated(true);
    await loadOrders();
  };

  const updateOrder = async (id: string, values: Partial<Pick<AdminOrder, 'orderStatus' | 'paymentStatus'>>) => {
    const response = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const result = await response.json() as { order?: AdminOrder; message?: string };
    if (!response.ok || !result.order) {
      setError(result.message || 'Could not update order');
      return;
    }
    setOrders((current) => current.map((order) => order.id === id ? result.order as AdminOrder : order));
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthenticated(false);
    setOrders([]);
  };

  if (authenticated === null) {
    return <div className="myoko-page flex min-h-[100dvh] items-center justify-center bg-background px-5"><p className="font-mono-brand text-xs uppercase tracking-[.18em]">Checking admin access…</p></div>;
  }

  if (!authenticated) {
    return <main className="myoko-page noise flex min-h-[100dvh] items-center justify-center bg-foreground px-5 py-10 text-background"><div className="w-full max-w-md border border-background/25 bg-[#171615] p-7 sm:p-10"><div className="flex items-center gap-3"><img src={logoImage} alt="" className="h-10 w-10 rounded-full object-cover" /><span className="font-display text-xl font-bold">MYOKO MUSIC</span></div><p className="mt-12 font-mono-brand text-[10px] uppercase tracking-[.22em] text-secondary">Private team area</p><h1 className="mt-3 font-display text-5xl font-bold leading-[.9] tracking-[-.08em]">Orders<br /><span className="text-primary">only.</span></h1><p className="mt-5 text-sm leading-relaxed text-background/60">This page is for the Myoko team. Customers do not need an account to place an order.</p><form onSubmit={login} className="mt-8"><label><span className="form-label text-background">Admin password</span><input autoFocus required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="form-input border-background/35 text-background placeholder:text-background/35" placeholder="Enter the team password" data-testid="input-admin-password" /></label>{error && <p className="mt-4 text-sm text-secondary" role="alert">{error}</p>}<button type="submit" className="focus-ring mt-6 flex w-full items-center justify-center gap-3 bg-primary px-5 py-4 font-mono-brand text-[10px] uppercase tracking-[.15em] text-primary-foreground hover:bg-accent" data-testid="button-admin-login">Open orders <ArrowRight size={15} /></button></form></div></main>;
  }

  return <main className="myoko-page noise min-h-[100dvh] bg-background px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><div className="mx-auto max-w-[1280px]"><header className="flex flex-col justify-between gap-5 border-b border-foreground/20 pb-7 sm:flex-row sm:items-end"><div><p className="font-mono-brand text-[10px] uppercase tracking-[.22em] text-primary">Private team area</p><h1 className="mt-2 font-display text-5xl font-bold tracking-[-.08em]">Myoko <span className="text-primary">orders.</span></h1><p className="mt-3 text-sm text-foreground/60">Manage preorders, delivery timing, and handover payment.</p></div><div className="flex gap-3"><button className="focus-ring border border-foreground px-4 py-3 font-mono-brand text-[10px] uppercase tracking-[.12em] hover:bg-foreground hover:text-background" onClick={() => void loadOrders()} disabled={loadingOrders}>{loadingOrders ? 'Refreshing…' : 'Refresh'}</button><button className="focus-ring border border-foreground px-4 py-3 font-mono-brand text-[10px] uppercase tracking-[.12em] hover:bg-foreground hover:text-background" onClick={() => void logout()}>Log out</button></div></header>{error && <p className="mt-6 border border-primary bg-primary/10 px-4 py-3 text-sm text-primary" role="alert">{error}</p>}<div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="border border-foreground/20 bg-secondary p-5"><p className="font-mono-brand text-[9px] uppercase tracking-[.15em]">Total orders</p><p className="mt-3 font-display text-4xl font-bold">{orders.length}</p></div><div className="border border-foreground/20 bg-secondary p-5"><p className="font-mono-brand text-[9px] uppercase tracking-[.15em]">To make</p><p className="mt-3 font-display text-4xl font-bold">{orders.filter((order) => !['completed', 'cancelled'].includes(order.orderStatus)).length}</p></div><div className="border border-foreground/20 bg-secondary p-5"><p className="font-mono-brand text-[9px] uppercase tracking-[.15em]">Unpaid</p><p className="mt-3 font-display text-4xl font-bold">{orders.filter((order) => order.paymentStatus === 'unpaid').length}</p></div></div><div className="mt-8 space-y-5">{orders.length === 0 && <div className="border border-foreground/20 p-10 text-center"><p className="font-display text-2xl font-bold">No orders yet.</p><p className="mt-2 text-sm text-foreground/60">New website orders will appear here.</p></div>}{orders.map((order) => <article key={order.id} className="border border-foreground/20 bg-background p-5 sm:p-7"><div className="flex flex-col justify-between gap-5 border-b border-foreground/15 pb-5 lg:flex-row lg:items-start"><div><div className="flex flex-wrap items-center gap-3"><span className="font-mono-brand text-xs text-primary">{order.orderNumber}</span><span className="font-mono-brand text-[9px] uppercase tracking-[.13em] text-foreground/45">{new Date(order.createdAt).toLocaleString()}</span></div><h2 className="mt-3 font-display text-3xl font-bold tracking-[-.06em]">{order.customerName}</h2><p className="mt-1 text-sm text-foreground/60">{order.className} · {order.school} · {order.albumName}</p></div><div className="text-left lg:text-right"><p className="font-display text-2xl font-bold">{money(order.total)}</p><p className="mt-1 font-mono-brand text-[9px] uppercase tracking-[.12em] text-foreground/50">{order.keychainQuantity} keychains / {order.paymentMethod.replaceAll('_', ' ')}</p></div></div><div className="grid gap-5 py-5 md:grid-cols-[1fr_1fr_.8fr]"><div><p className="font-mono-brand text-[9px] uppercase tracking-[.14em] text-primary">Offers</p><p className="mt-2 text-sm leading-relaxed">{order.offers.map((offer) => `${offer.quantity} × ${offer.name}`).join(' · ')}</p></div><div><p className="font-mono-brand text-[9px] uppercase tracking-[.14em] text-primary">Delivery</p><p className="mt-2 text-sm">{order.deliveryPreference}</p><p className="mt-1 text-sm text-foreground/60">{order.deliveryNotes || 'No extra delivery note.'}</p></div><div><p className="font-mono-brand text-[9px] uppercase tracking-[.14em] text-primary">Payment</p><select value={order.paymentStatus} onChange={(event) => void updateOrder(order.id, { paymentStatus: event.target.value as AdminOrder['paymentStatus'] })} className="form-input mt-2" data-testid={`select-payment-${order.id}`}><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></div></div><div className="flex flex-col gap-4 border-t border-foreground/15 pt-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono-brand text-[9px] uppercase tracking-[.14em] text-primary">Order status</p><select value={order.orderStatus} onChange={(event) => void updateOrder(order.id, { orderStatus: event.target.value as AdminOrder['orderStatus'] })} className="form-input mt-2 sm:w-64" data-testid={`select-order-status-${order.id}`}>{adminOrderStatuses.map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}</select></div><p className="max-w-sm text-xs leading-relaxed text-foreground/50">The customer selected <strong className="text-foreground/75">{order.deliveryPreference}</strong>. Missing that handover means the order cannot be rescheduled.</p></div></article>)}</div></div></main>;
}

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/admin" component={AdminPage} /><Route component={NotFound} /></Switch>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><ErrorBoundary resetKey={useLocation()[0]}><Router /></ErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;