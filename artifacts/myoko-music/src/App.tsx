import { useState, type FormEvent } from 'react';
import { ArrowDown, ArrowRight, Check, ChevronDown, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import logoImage from '@assets/myoko-logo.png';
import releaseImage from '@assets/myoko-release.png';

type CartLine = { quantity: number; bundle: boolean };
type CheckoutForm = { name: string; email: string; country: string; address: string; card: string; expiry: string; cvc: string; billing: string };

const queryClient = new QueryClient();
const money = (value: number) => `${value.toLocaleString('en-US')} KIP`;

function Home() {
  const [cart, setCart] = useState<CartLine>({ quantity: 0, bundle: false });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [form, setForm] = useState<CheckoutForm>({ name: '', email: '', country: 'Lao PDR', address: '', card: '', expiry: '', cvc: '', billing: '' });

  const quantity = cart.quantity;
  const subtotal = cart.bundle ? 45000 : quantity * 27000;
  const discount = couponApplied ? 5000 : 0;
  const total = Math.max(0, subtotal - discount);

  const addToCart = (bundle = false) => {
    setCart((current) => bundle
      ? { quantity: Math.max(2, current.quantity), bundle: true }
      : { quantity: Math.max(1, current.quantity + 1), bundle: current.bundle && current.quantity + 1 >= 2 });
    setCartOpen(true);
  };
  const changeQuantity = (amount: number) => setCart((current) => ({ ...current, quantity: Math.max(0, current.quantity + amount), bundle: false }));
  const goTo = (id: string) => {
    setMobileMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
  const completeCheckout = (event: FormEvent) => {
    event.preventDefault();
    setOrderComplete(true);
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
            <p className="reveal font-mono-brand text-[10px] uppercase tracking-[.25em] text-primary">Independent label / Vientiane, Laos</p>
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
              <div className="absolute -bottom-5 -left-7 border border-foreground bg-secondary px-4 py-3 font-mono-brand text-[10px] uppercase tracking-[.12em] shadow-[4px_4px_0_rgba(14,13,12,.9)]">Side A<br /><span className="text-primary">Make your own</span></div>
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
                  <div><p className="font-display text-2xl font-bold">Myoko / 001</p><p className="mt-1 font-mono-brand text-[10px] uppercase tracking-[.15em] text-background/50">A record for right now</p></div>
                  <span className="font-mono-brand text-[10px] text-secondary">33⅓ RPM</span>
                </div>
              </div>
              <div className="flex flex-col gap-5">
                <div className="bg-secondary p-6 text-foreground sm:p-8">
                  <div className="flex items-start justify-between"><span className="font-mono-brand text-[10px] uppercase tracking-[.18em]">One record</span><span className="font-display text-4xl font-bold">01</span></div>
                  <h3 className="mt-12 font-display text-3xl font-bold leading-tight tracking-[-.05em]">Your sound.<br />Your rules.</h3>
                  <p className="mt-4 max-w-xs text-sm leading-relaxed text-foreground/65">A physical reminder that the best version of your taste is the one nobody can copy.</p>
                  <button className="focus-ring mt-7 flex w-full items-center justify-between border border-foreground bg-foreground px-4 py-3 font-mono-brand text-[10px] uppercase tracking-[.15em] text-background transition hover:bg-primary" onClick={() => addToCart(false)} data-testid="button-add-single">Add to bag <ArrowRight size={15} /></button>
                </div>
                <button className="focus-ring group flex flex-1 flex-col justify-between border border-background/30 p-6 text-left transition hover:border-secondary hover:bg-background/5 sm:p-8" onClick={() => addToCart(true)} data-testid="button-add-bundle">
                  <div className="flex items-center justify-between"><span className="font-mono-brand text-[10px] uppercase tracking-[.18em] text-secondary">The better together offer</span><ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></div>
                  <div><p className="mt-12 font-display text-3xl font-bold tracking-[-.05em]">Two for <span className="text-secondary">45,000</span></p><p className="mt-2 text-sm text-background/55">Keep one. Gift one. Start a tiny movement.</p></div>
                </button>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 border-t border-background/20 pt-6 text-background/55 sm:grid-cols-4">
              {['Locally packed', 'Student-led', 'Small-batch drop', 'No loud markup'].map((text, i) => <div key={text} className="flex items-center gap-2 font-mono-brand text-[9px] uppercase tracking-[.12em]"><span className="text-secondary">0{i + 1}</span>{text}</div>)}
            </div>
          </div>
        </section>

        <section id="story" className="mx-auto grid max-w-[1280px] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[.75fr_1.25fr] lg:px-12 lg:py-36">
          <div><p className="font-mono-brand text-[10px] uppercase tracking-[.24em] text-primary">02 / Our sound</p><div className="mt-8 h-32 w-32 rounded-full border border-foreground bg-secondary p-3"><img src={logoImage} alt="" className="record-spin h-full w-full rounded-full object-cover" /></div></div>
          <div>
            <h2 className="max-w-3xl font-display text-5xl font-bold leading-[.95] tracking-[-.07em] sm:text-7xl">Not a playlist.<br /><span className="text-primary">A point of view.</span></h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <p className="text-base leading-relaxed text-foreground/70">Myoko Music started with a simple question: what if a small music product felt as personal as the song you play when nobody is watching? We are a student-built label making room for individual taste.</p>
              <p className="text-base leading-relaxed text-foreground/70">The name is a nod to “Make Your Own Kind of Music” — not as a slogan, but as a dare. Keep the strange idea. Turn it up. Share it with someone who gets it.</p>
            </div>
            <div className="mt-12 border-l-2 border-primary pl-5"><p className="font-display text-2xl font-semibold leading-tight tracking-[-.03em]">“There is no wrong way to press play.”</p><p className="mt-2 font-mono-brand text-[9px] uppercase tracking-[.15em] text-foreground/50">— Myoko, liner notes</p></div>
          </div>
        </section>

        <section id="crew" className="border-y border-foreground bg-secondary px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-[1280px]">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="font-mono-brand text-[10px] uppercase tracking-[.24em]">03 / The crew</p><h2 className="mt-4 font-display text-5xl font-bold leading-[.9] tracking-[-.07em] sm:text-7xl">Four people.<br />One <span className="text-primary">frequency.</span></h2></div><p className="max-w-xs text-sm leading-relaxed text-foreground/65">The humans behind the label, the packing tape, and the very opinionated group chat.</p></div>
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
            <div><p className="max-w-sm text-base leading-relaxed text-primary-foreground/75">The first Myoko drop is ready for your desk, your bag, your friend who always sends the best songs.</p><button className="focus-ring mt-8 flex items-center gap-4 border border-primary-foreground px-5 py-4 font-mono-brand text-[10px] uppercase tracking-[.17em] transition hover:bg-primary-foreground hover:text-primary" onClick={() => addToCart(true)} data-testid="button-final-order">Order the bundle <ArrowRight size={16} /></button></div>
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
          <div className="flex items-center justify-between border-b border-foreground/20 px-6 py-5"><div><p className="font-mono-brand text-[10px] uppercase tracking-[.2em] text-primary">Your bag</p><h2 className="mt-1 font-display text-3xl font-bold tracking-[-.06em]">Ready to play.</h2></div><button className="focus-ring p-2" onClick={() => setCartOpen(false)} aria-label="Close shopping bag" data-testid="button-close-cart"><X size={20} /></button></div>
          <div className="flex-1 overflow-y-auto px-6 py-7">
            {quantity === 0 ? <div className="flex h-full flex-col items-center justify-center text-center"><div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-foreground"><ShoppingBag size={22} /></div><h3 className="font-display text-2xl font-bold">The bag is quiet.</h3><p className="mt-2 max-w-xs text-sm text-foreground/55">Add a record and give it something to say.</p><button className="focus-ring mt-7 bg-primary px-5 py-3 font-mono-brand text-[10px] uppercase tracking-[.15em] text-primary-foreground" onClick={() => { setCartOpen(false); goTo('listen'); }} data-testid="button-empty-shop">Browse the release</button></div> : <div>
              <div className="flex gap-4 border-b border-foreground/15 pb-6"><img src={releaseImage} alt="Myoko Music release" className="h-20 w-20 rounded-[4px] object-cover" /><div className="flex flex-1 justify-between"><div><h3 className="font-display text-xl font-bold">Myoko / 001</h3><p className="mt-1 font-mono-brand text-[9px] uppercase tracking-[.13em] text-foreground/50">{cart.bundle ? 'Bundle offer' : 'Single release'}</p></div><p className="font-mono-brand text-xs">{money(cart.bundle ? 45000 : 27000)}</p></div></div>
              <div className="flex items-center justify-between border-b border-foreground/15 py-5"><span className="font-mono-brand text-[10px] uppercase tracking-[.15em]">Quantity</span><div className="flex items-center gap-3"><button className="focus-ring border border-foreground p-1" onClick={() => changeQuantity(-1)} aria-label="Decrease quantity" data-testid="button-decrease-quantity"><Minus size={14} /></button><span className="w-5 text-center font-mono-brand text-xs" data-testid="text-item-quantity">{quantity}</span><button className="focus-ring border border-foreground p-1" onClick={() => changeQuantity(1)} aria-label="Increase quantity" data-testid="button-increase-quantity"><Plus size={14} /></button></div></div>
              <div className="border-b border-foreground/15 py-5"><label htmlFor="coupon" className="font-mono-brand text-[10px] uppercase tracking-[.15em]">Coupon code</label><div className="mt-3 flex gap-2"><input id="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="MYOKO5K" className="focus-ring min-w-0 flex-1 border border-foreground bg-transparent px-3 py-2 font-mono-brand text-xs uppercase outline-none" data-testid="input-coupon" /><button className="focus-ring border border-foreground px-3 py-2 font-mono-brand text-[10px] uppercase tracking-[.1em] hover:bg-foreground hover:text-background" onClick={() => setCouponApplied(coupon.trim().toUpperCase() === 'MYOKO5K')} data-testid="button-apply-coupon">Apply</button></div>{couponApplied && <p className="mt-2 flex items-center gap-1 text-xs text-accent"><Check size={13} /> 5,000 KIP taken off.</p>}</div>
              <div className="space-y-3 pt-6 text-sm"><div className="flex justify-between"><span className="text-foreground/55">Subtotal</span><span data-testid="text-subtotal">{money(subtotal)}</span></div>{couponApplied && <div className="flex justify-between text-accent"><span>Coupon</span><span>-{money(discount)}</span></div>}<div className="flex justify-between border-t border-foreground/20 pt-4 font-display text-xl font-bold"><span>Total</span><span data-testid="text-cart-total">{money(total)}</span></div></div>
            </div>}
          </div>
          {quantity > 0 && <div className="border-t border-foreground/20 px-6 py-6"><p className="mb-4 text-center font-mono-brand text-[9px] uppercase tracking-[.12em] text-foreground/50">Checkout is a demo — no payment will be charged</p><button className="focus-ring flex w-full items-center justify-center gap-3 bg-primary px-5 py-4 font-mono-brand text-[11px] uppercase tracking-[.15em] text-primary-foreground transition hover:bg-accent" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }} data-testid="button-checkout">Continue to demo checkout <ArrowRight size={15} /></button></div>}
        </div>
      </div>}

      {checkoutOpen && <div className="fixed inset-0 z-[60] overflow-y-auto bg-foreground/60 px-4 py-6 sm:px-8 sm:py-12" role="dialog" aria-modal="true" aria-label="Demo checkout">
        <div className="mx-auto max-w-3xl bg-background">
          {orderComplete ? <div className="flex min-h-[550px] flex-col items-center justify-center px-6 py-16 text-center sm:px-16"><div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-background"><Check size={38} strokeWidth={2} /></div><p className="mt-8 font-mono-brand text-[10px] uppercase tracking-[.22em] text-primary">Thank you for backing small music</p><h2 className="mt-4 font-display text-5xl font-bold leading-[.9] tracking-[-.08em] sm:text-7xl">Your order<br /><span className="text-primary">is complete.</span></h2><p className="mt-6 max-w-md text-sm leading-relaxed text-foreground/60">This was a demonstration checkout. No payment was processed and no real order was created.</p><div className="mt-8 border border-foreground px-5 py-3 font-mono-brand text-xs tracking-[.12em]" data-testid="text-order-reference">ORDER REF / MYK-{Math.floor(1000 + Math.random() * 8999)}</div><button className="focus-ring mt-8 flex items-center gap-3 border border-foreground px-5 py-3 font-mono-brand text-[10px] uppercase tracking-[.14em] hover:bg-foreground hover:text-background" onClick={() => { setCheckoutOpen(false); setOrderComplete(false); setCart({ quantity: 0, bundle: false }); }} data-testid="button-close-confirmation">Back to Myoko <ArrowRight size={14} /></button></div> : <form onSubmit={completeCheckout} className="p-6 sm:p-10">
            <div className="flex items-start justify-between border-b border-foreground/20 pb-7"><div><p className="font-mono-brand text-[10px] uppercase tracking-[.2em] text-primary">Demo checkout</p><h2 className="mt-2 font-display text-4xl font-bold tracking-[-.07em]">Make it yours.</h2><p className="mt-2 max-w-md text-sm text-foreground/60">A safe preview of the Myoko checkout. This form never charges your card.</p></div><button type="button" className="focus-ring p-2" onClick={() => setCheckoutOpen(false)} aria-label="Close checkout" data-testid="button-close-checkout"><X size={20} /></button></div>
            <div className="mt-8 grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="form-label">Full name</span><input required value={form.name} onChange={(e) => setField('name', e.target.value)} className="form-input" placeholder="Your name" data-testid="input-checkout-name" /></label>
              <label><span className="form-label">Email address</span><input required type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} className="form-input" placeholder="you@example.com" data-testid="input-checkout-email" /></label>
              <label><span className="form-label">Country / region</span><select required value={form.country} onChange={(e) => setField('country', e.target.value)} className="form-input" data-testid="input-checkout-country"><option>Lao PDR</option><option>Thailand</option><option>Vietnam</option><option>Singapore</option><option>Other</option></select></label>
              <label className="sm:col-span-2"><span className="form-label">Address</span><input required value={form.address} onChange={(e) => setField('address', e.target.value)} className="form-input" placeholder="Street, city, province" data-testid="input-checkout-address" /></label>
            </div>
            <div className="mt-9 border-t border-foreground/20 pt-7"><div className="flex items-center justify-between"><h3 className="font-display text-2xl font-bold tracking-[-.05em]">Payment details</h3><span className="font-mono-brand text-[9px] uppercase tracking-[.12em] text-foreground/45">Demo only</span></div><div className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2"><label className="sm:col-span-2"><span className="form-label">Card number</span><input required inputMode="numeric" value={form.card} onChange={(e) => setField('card', e.target.value)} className="form-input font-mono-brand" placeholder="0000 0000 0000 0000" data-testid="input-checkout-card" /></label><label><span className="form-label">Expiry</span><input required value={form.expiry} onChange={(e) => setField('expiry', e.target.value)} className="form-input font-mono-brand" placeholder="MM / YY" data-testid="input-checkout-expiry" /></label><label><span className="form-label">CVC</span><input required inputMode="numeric" value={form.cvc} onChange={(e) => setField('cvc', e.target.value)} className="form-input font-mono-brand" placeholder="000" data-testid="input-checkout-cvc" /></label><label className="sm:col-span-2"><span className="form-label">Billing details</span><textarea required value={form.billing} onChange={(e) => setField('billing', e.target.value)} className="form-input min-h-20 resize-y" placeholder="Billing address or notes" data-testid="input-checkout-billing" /></label></div></div>
            <div className="mt-8 flex flex-col-reverse items-stretch justify-between gap-4 border-t border-foreground/20 pt-6 sm:flex-row sm:items-center"><p className="font-mono-brand text-[10px] uppercase tracking-[.12em] text-foreground/50">Total today <strong className="ml-2 text-foreground">{money(total)}</strong></p><button type="submit" className="focus-ring flex items-center justify-center gap-3 bg-primary px-6 py-4 font-mono-brand text-[10px] uppercase tracking-[.15em] text-primary-foreground hover:bg-accent" data-testid="button-submit-checkout">Place demo order <ArrowRight size={15} /></button></div>
          </form>}
        </div>
      </div>}
    </div>
  );
}

function Router() {
  return <Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><ErrorBoundary resetKey={useLocation()[0]}><Router /></ErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;