/* global supabase, VINI_SUPABASE_CONFIG */
(() => {
  "use strict";

  const app = document.querySelector("#app");
  const config = window.VINI_SUPABASE_CONFIG || {};
  const hasSupabaseConfig = Boolean(config.url && config.anonKey);
  const configured = hasSupabaseConfig && Boolean(window.supabase?.createClient);
  const db = configured ? window.supabase.createClient(config.url, config.anonKey) : null;
  const whatsappNumber = "919104881806";
  const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const today = new Date();
  const isoToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const fallbackVehicles = [
    { id: "demo-mercedes-s-class", make: "Mercedes-Benz", model: "S-Class", year: 2025, category: "Sedan", category_id: "sedan", seats: 5, luggage: 3, transmission: "Automatic", fuel: "Petrol", daily_rate: 18000, currency: "INR", description: "An elegant sanctuary in motion. The S-Class pairs serene comfort with beautifully considered technology.", image_url: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1400&q=85", gallery_urls: [], features: ["Leather interior", "Panoramic roof", "Ambient lighting", "Chauffeur available"], is_available: true, is_featured: true },
    { id: "demo-bmw-5-series", make: "BMW", model: "5 Series", year: 2025, category: "Sedan", category_id: "sedan", seats: 5, luggage: 3, transmission: "Automatic", fuel: "Petrol", daily_rate: 14000, currency: "INR", description: "Confident, composed and unmistakably dynamic. A refined companion for the city and the open road.", image_url: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1400&q=85", gallery_urls: [], features: ["Premium sound", "Leather interior", "Navigation", "Adaptive cruise"], is_available: true, is_featured: true },
    { id: "demo-range-rover-sport", make: "Land Rover", model: "Range Rover Sport", year: 2025, category: "SUV", category_id: "suv", seats: 5, luggage: 4, transmission: "Automatic", fuel: "Diesel", daily_rate: 22000, currency: "INR", description: "Effortless capability wrapped in unmistakable British luxury, for journeys beyond the expected.", image_url: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1400&q=85", gallery_urls: [], features: ["All-wheel drive", "Panoramic roof", "Premium audio", "Air suspension"], is_available: true, is_featured: true },
    { id: "demo-porsche-911", make: "Porsche", model: "911 Carrera", year: 2025, category: "Sports", category_id: "sports", seats: 2, luggage: 2, transmission: "Automatic", fuel: "Petrol", daily_rate: 28000, currency: "INR", description: "A timeless silhouette, an unmistakable soundtrack, and every reason to take the longer way.", image_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=85", gallery_urls: [], features: ["Sport chrono", "Adaptive suspension", "Premium audio", "Launch control"], is_available: true, is_featured: true },
    { id: "demo-audi-q7", make: "Audi", model: "Q7", year: 2025, category: "SUV", category_id: "suv", seats: 7, luggage: 4, transmission: "Automatic", fuel: "Diesel", daily_rate: 16000, currency: "INR", description: "Space for everyone, poise for every occasion. The Q7 makes the family journey feel exceptional.", image_url: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1400&q=85", gallery_urls: [], features: ["7 seats", "Quattro AWD", "Virtual cockpit", "Panoramic roof"], is_available: true, is_featured: false },
    { id: "demo-mercedes-v-class", make: "Mercedes-Benz", model: "V-Class", year: 2025, category: "Van", category_id: "van", seats: 7, luggage: 5, transmission: "Automatic", fuel: "Diesel", daily_rate: 20000, currency: "INR", description: "A first-class lounge on the move. Generous space meets thoughtful hospitality for your group.", image_url: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1400&q=85", gallery_urls: [], features: ["Captain seats", "Privacy glass", "Climate zones", "Luggage space"], is_available: true, is_featured: false }
  ];
  let vehicles = fallbackVehicles;
  let categories = [];
  let serviceFeePercent = 5;
  let menuOpen = false;
  let adminUser = null;
  let adminTab = "bookings";
  let adminVehicles = [];
  let adminBookings = [];
  let adminEnquiries = [];
  let dataLoadError = "";

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const slug = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const notice = (message, error = false) => `<div class="notice${error ? " error" : ""}">${escapeHtml(message)}</div>`;
  const pageHero = (label, title, copy) => `<section class="page-hero"><span class="eyebrow">${escapeHtml(label)}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(copy)}</p></section>`;
  const infoBar = () => dataLoadError
    ? notice(dataLoadError, true)
    : hasSupabaseConfig && !configured
      ? notice("The Supabase client could not be loaded. Check your internet connection and CDN access, then reload.")
      : configured ? "" : notice("Preview mode: browsing and price estimates work now. Connect your Supabase project to enable live availability, confirmed booking requests, enquiries and admin access.");

  function toast(message, error = false) {
    const region = document.querySelector(".toast-region");
    const item = document.createElement("div");
    item.className = `toast${error ? " error" : ""}`;
    item.textContent = message;
    region.append(item);
    window.setTimeout(() => item.remove(), 4800);
  }

  function readRoute() {
    const raw = location.hash.replace(/^#/, "") || "home";
    const [path, query] = raw.split("?");
    const segments = path.split("/").filter(Boolean);
    return { page: segments[0] || "home", id: segments[1], params: new URLSearchParams(query || "") };
  }

  function go(hash) {
    location.hash = hash.startsWith("#") ? hash : `#${hash}`;
  }

  function vehicleCard(car, routeParams = null) {
    const label = car.categories?.name || car.category?.name || car.category || "Luxury";
    const id = car.id;
    const carQuery = new URLSearchParams();
    ["pickup", "return", "location"].forEach((key) => {
      if (routeParams?.get(key)) carQuery.set(key, routeParams.get(key));
    });
    const carHref = `#car/${encodeURIComponent(id)}${carQuery.size ? `?${carQuery}` : ""}`;
    return `<article class="vehicle-card">
      <a class="vehicle-image" href="${carHref}" aria-label="View ${escapeHtml(car.make)} ${escapeHtml(car.model)}">
        <img src="${escapeHtml(car.image_url || "")}" alt="${escapeHtml(`${car.year} ${car.make} ${car.model}`)}" loading="lazy">
        ${car.is_featured ? '<span class="vehicle-tag">VINI selection</span>' : ""}
      </a>
      <div class="vehicle-content">
        <span class="vehicle-category">${escapeHtml(label)} · ${escapeHtml(car.year)}</span>
        <h3 class="vehicle-title">${escapeHtml(car.make)} ${escapeHtml(car.model)}</h3>
        <div class="vehicle-specs"><span>${escapeHtml(car.seats)} seats</span><span>${escapeHtml(car.transmission || "Automatic")}</span><span>${escapeHtml(car.fuel || "Premium")}</span></div>
        <div class="vehicle-price-row"><span class="vehicle-price">${money.format(Number(car.daily_rate || 0))} <small>/ day</small></span><a class="arrow-link" href="${carHref}" aria-label="Explore car">↗</a></div>
      </div>
    </article>`;
  }

  function bookingWidget() {
    return `<form class="booking-widget" id="search-booking">
      <div class="field"><label for="search-category">Choose your experience</label><select id="search-category" name="category"><option value="">All vehicle types</option>${(categories.length ? categories : [{ slug: "sedan", name: "Sedan" }, { slug: "suv", name: "SUV" }, { slug: "sports", name: "Sports" }, { slug: "van", name: "Van" }]).map((category) => `<option value="${escapeHtml(category.slug)}">${escapeHtml(category.name)}</option>`).join("")}</select></div>
      <div class="field"><label for="search-pickup">Pick-up date</label><input id="search-pickup" name="pickup" type="date" min="${isoToday}" required></div>
      <div class="field"><label for="search-return">Return date</label><input id="search-return" name="return" type="date" min="${isoToday}" required></div>
      <div class="field"><label for="search-location">Pick-up location</label><input id="search-location" name="location" type="text" placeholder="City or airport" autocomplete="off"></div>
      <button class="button" type="submit">Explore cars <span aria-hidden="true">↗</span></button>
    </form>`;
  }

  function homePage() {
    const featured = vehicles.filter((car) => car.is_featured).slice(0, 3);
    const display = featured.length ? featured : vehicles.slice(0, 3);
    return `<section class="hero"><div class="hero-inner"><span class="eyebrow">VINI CAR RENTAL · INDIA</span><h1>Arrive with<br><em>intention.</em></h1><p class="hero-copy">A considered collection of exceptional cars, paired with the kind of service that makes every mile matter.</p><a class="button" href="#fleet">Explore the collection <span aria-hidden="true">↗</span></a></div></section>
      ${infoBar() ? `<div class="section section-tight">${infoBar()}</div>` : ""}${bookingWidget()}
      <section class="section"><div class="section-heading"><div><span class="eyebrow">THE VINI COLLECTION</span><h2>Exceptional by nature.</h2></div><div><p>Chosen for their character. Prepared for your comfort. Ready for the road ahead.</p><a class="text-link" href="#fleet">View all vehicles <span>↗</span></a></div></div>
      <div class="vehicle-grid">${display.map((car) => vehicleCard(car)).join("")}</div></section>
      <section class="editorial"><div class="editorial-image"><img src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=85" alt="Sculpted luxury car detail" loading="lazy"></div><div class="editorial-copy"><span class="eyebrow">A DIFFERENT KIND OF DRIVE</span><h2>More than the car. The feeling it leaves.</h2><p>At VINI, luxury is in the details: a beautifully prepared vehicle, a human being ready to help, and the freedom to make the journey entirely your own.</p><a class="text-link" href="#about">Discover the VINI way <span>↗</span></a></div></section>
      <section class="promise-strip"><div class="promise"><strong>Thoughtfully curated</strong><span>A distinctive fleet for every kind of occasion.</span></div><div class="promise"><strong>People, always</strong><span>Considered, personal service from first hello.</span></div><div class="promise"><strong>Clarity at every turn</strong><span>Transparent pricing. No unexpected detours.</span></div></section>`;
  }

  function fleetPage(params) {
    const selectedCategory = params.get("category") || "";
    return `${pageHero("THE VINI COLLECTION", "A car for your kind of journey.", "From composed city arrivals to open-road escapes, find the right companion for the miles ahead.")}
      <section class="section section-tight">${infoBar()}<div class="filter-row"><div class="filter-buttons" id="fleet-filters"><button class="filter-chip${!selectedCategory ? " active" : ""}" data-category="">All vehicles</button>${["Sedan", "SUV", "Sports", "Van"].map((item) => `<button class="filter-chip${selectedCategory === slug(item) ? " active" : ""}" data-category="${slug(item)}">${item}</button>`).join("")}</div>
      <select class="sort-select" id="fleet-sort" aria-label="Sort vehicles"><option value="featured">Curated selection</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></div>
      <div class="vehicle-grid" id="fleet-grid"></div><div id="fleet-empty"></div></section>`;
  }

  function detailsPage(id, params) {
    const car = vehicles.find((item) => item.id === decodeURIComponent(id || ""));
    if (!car) return `${pageHero("THE VINI COLLECTION", "A considered choice.", "This vehicle may have moved on. Explore our collection to find your next drive.")}<section class="section"><a class="button button-dark" href="#fleet">Explore the fleet</a></section>`;
    const gallery = [car.image_url, ...(car.gallery_urls || [])].filter(Boolean);
    const category = car.categories?.name || car.category?.name || car.category || "Luxury";
    const bookingParams = new URLSearchParams({ vehicle: car.id });
    ["pickup", "return", "location"].forEach((key) => {
      if (params.get(key)) bookingParams.set(key, params.get(key));
    });
    return `${pageHero(category.toUpperCase(), `${car.make} ${car.model}`, `${car.year} · ${car.description || "A considered companion for your next journey."}`)}
      <section class="section section-tight"><div class="details-layout"><div><img class="details-main-image" id="details-main-image" src="${escapeHtml(gallery[0] || "")}" alt="${escapeHtml(`${car.make} ${car.model}`)}">${gallery.length > 1 ? `<div class="gallery-thumbs">${gallery.map((url) => `<img src="${escapeHtml(url)}" alt="View ${escapeHtml(car.make)} ${escapeHtml(car.model)}" data-gallery-image="${escapeHtml(url)}" loading="lazy">`).join("")}</div>` : ""}
      <div class="prose"><h2>Designed around your journey</h2><p>${escapeHtml(car.description || "")}</p><div class="feature-list">${(car.features || []).map((feature) => `<span>${escapeHtml(feature)}</span>`).join("")}</div></div></div>
      <aside class="details-panel"><span class="eyebrow">${escapeHtml(category)} · ${escapeHtml(car.year)}</span><h1>${escapeHtml(car.make)} ${escapeHtml(car.model)}</h1><div class="vehicle-specs"><span>${escapeHtml(car.seats)} seats</span><span>${escapeHtml(car.luggage || 2)} bags</span><span>${escapeHtml(car.transmission || "Automatic")}</span><span>${escapeHtml(car.fuel || "Premium")}</span></div><div class="detail-price">${money.format(Number(car.daily_rate || 0))} <small>/ day</small></div><p class="form-note">Your final quote includes rental days and applicable service fees. No surprises, just clarity.</p><a class="button button-dark" style="width:100%" href="#booking?${bookingParams}">Reserve this car <span aria-hidden="true">↗</span></a><p class="form-note">Availability is confirmed when our team accepts your request.</p></aside></div></section>`;
  }

  function bookingPage(params) {
    const chosen = params.get("vehicle") || "";
    return `${pageHero("YOUR JOURNEY STARTS HERE", "A few details. Then the open road.", "Tell us when and where. We will take care of the rest.")}
      <section class="section section-tight"><div class="content-narrow">${infoBar()}<form class="form-card" id="booking-form"><div class="page-heading"><span class="eyebrow">RESERVATION REQUEST</span><h1 style="font-size:34px">Plan your drive.</h1><p>Share your details and continue to WhatsApp to send your reservation request to our team.</p></div>
      <div class="form-grid"><div class="form-field"><label for="booking-vehicle">Your vehicle</label><select id="booking-vehicle" name="vehicle" required><option value="">Select a vehicle</option>${vehicles.filter((car) => car.is_available).map((car) => `<option value="${escapeHtml(car.id)}"${car.id === chosen ? " selected" : ""}>${escapeHtml(car.make)} ${escapeHtml(car.model)} — ${money.format(Number(car.daily_rate))}/day</option>`).join("")}</select></div>
      <div class="form-field"><label for="booking-location">Pick-up location</label><input id="booking-location" name="location" required placeholder="City, hotel or airport" value="${escapeHtml(params.get("location") || "")}"></div>
      <div class="form-field"><label for="booking-pickup">Pick-up date</label><input id="booking-pickup" name="pickup" type="date" min="${isoToday}" value="${escapeHtml(params.get("pickup") || "")}" required></div>
      <div class="form-field"><label for="booking-return">Return date</label><input id="booking-return" name="return" type="date" min="${escapeHtml(params.get("pickup") || isoToday)}" value="${escapeHtml(params.get("return") || "")}" required></div>
      <div class="form-field"><label for="booking-name">Full name</label><input id="booking-name" name="name" autocomplete="name" required minlength="2"></div>
      <div class="form-field"><label for="booking-email">Email address</label><input id="booking-email" name="email" type="email" autocomplete="email" required></div>
      <div class="form-field"><label for="booking-phone">Phone number</label><input id="booking-phone" name="phone" type="tel" autocomplete="tel" required minlength="7"></div>
      <div class="form-field full"><label for="booking-notes">Anything else we should know? (optional)</label><textarea id="booking-notes" name="notes" maxlength="1000" placeholder="Arrival details, preferences or a special request"></textarea></div></div>
      <div class="quote-box" id="booking-quote"><div class="quote-line"><span>Select your dates and vehicle to see your quote</span><span>—</span></div></div><div id="availability-message" aria-live="polite"></div>
      <p class="form-note">Your request will open WhatsApp to <strong>+91 91048 81806</strong> with your details and estimated quote ready to send. Availability is confirmed by our team; no payment is taken here.</p>
      <button class="button button-dark" type="submit">Continue to WhatsApp <span aria-hidden="true">↗</span></button></form>
      <div class="form-card" style="margin-top:24px"><span class="eyebrow">ALREADY RESERVED?</span><h2 style="font:400 27px var(--serif);color:var(--navy)">Check your booking status.</h2><form id="status-form" class="form-grid"><div class="form-field"><label for="status-code">Booking reference</label><input id="status-code" name="code" required placeholder="Paste your booking reference"></div><div class="form-field" style="align-self:end"><button class="button button-outline" type="submit">Check status</button></div></form><div id="status-result"></div></div></div></section>`;
  }

  function aboutPage() {
    return `${pageHero("THE VINI STORY", "We believe the journey should feel as good as the arrival.", "An independent luxury car rental experience built around the details that matter.")}
      <section class="section"><div class="content-narrow prose"><span class="eyebrow">A MORE PERSONAL DRIVE</span><h2>Considered cars. Considerate people.</h2><p>VINI CAR RENTAL was created for people who believe that how you travel is part of where you are going. We bring together a carefully selected fleet and a deeply personal approach, so every journey feels intentional from the first conversation.</p><p>Whether you are arriving for an important meeting, celebrating a milestone or simply taking the scenic route, our team is here to make the experience feel effortless. We focus on well-prepared cars, clear communication and service that respects your time.</p><h2>Our promise</h2><p>We will be clear about the car, the price and the process. We will listen before we recommend. And we will treat your journey with the care it deserves.</p><a class="button button-dark" href="#fleet">Find your VINI drive</a></div></section>
      <section class="promise-strip"><div class="promise"><strong>Curated with care</strong><span>Every vehicle is selected for comfort, character and condition.</span></div><div class="promise"><strong>Service, not scripts</strong><span>Real people, thoughtful answers and clear next steps.</span></div><div class="promise"><strong>Trust, built mile by mile</strong><span>Transparent terms and a relationship that goes beyond the keys.</span></div></section>`;
  }

  function contactPage() {
    return `${pageHero("WE ARE HERE FOR YOU", "A real person, just a message away.", "Tell us about your plans. We would love to help you find the right way there.")}
      <section class="section section-tight"><div class="contact-grid"><div><div class="contact-card"><span class="eyebrow">LET'S TALK</span><h2>Good journeys begin with a conversation.</h2><p style="color:rgb(255 255 255 / 70%);font-size:12px">Our team is happy to help with a reservation, a vehicle question or a bespoke request.</p><div class="contact-line"><small>Call / WhatsApp</small><a href="https://wa.me/919104881806" target="_blank" rel="noopener">+91 91048 81806 · Message us ↗</a></div><div class="contact-line"><small>Email</small><a href="mailto:hello@vinicarrental.com">hello@vinicarrental.com</a></div></div></div>
      <div><div class="form-card">${infoBar()}<form id="contact-form"><div class="form-grid"><div class="form-field"><label for="contact-name">Your name</label><input id="contact-name" name="name" required minlength="2"></div><div class="form-field"><label for="contact-email">Email address</label><input id="contact-email" name="email" type="email" required></div><div class="form-field"><label for="contact-phone">Phone (optional)</label><input id="contact-phone" name="phone" type="tel"></div><div class="form-field"><label for="contact-subject">How can we help?</label><select id="contact-subject" name="subject"><option>Booking enquiry</option><option>Fleet question</option><option>Corporate travel</option><option>Other</option></select></div><div class="form-field full"><label for="contact-message">Your message</label><textarea id="contact-message" name="message" required minlength="10" maxlength="3000"></textarea></div></div><button class="button button-dark" type="submit"${configured ? "" : " disabled"}>Send your enquiry ↗</button></form></div></div></div></section>`;
  }

  const faqs = [
    ["How do I reserve a vehicle?", "Choose your vehicle, travel dates and pick-up location, then submit a reservation request. Our team will check availability and contact you to confirm the details. A request is not a confirmed reservation until you receive confirmation from VINI."],
    ["What does the displayed price include?", "The daily rate is shown clearly for each vehicle. Your quote calculates the rental subtotal and applicable service fee before you submit. Any taxes, deposits, delivery charges or other terms will be explained by our team before your reservation is confirmed."],
    ["Can I change or cancel my reservation?", "Please contact our team as soon as possible. Changes depend on vehicle availability and the cancellation terms communicated with your confirmed reservation."],
    ["What do I need to rent a car?", "A valid driving licence and identity documents are required. Eligibility, minimum age and any international licence requirements depend on the vehicle and location; our team will confirm these before accepting a reservation."],
    ["Is the car available as soon as I submit a request?", "Not automatically. Requests are checked by our team. Availability is confirmed only when the booking status is updated to confirmed and VINI contacts you."],
    ["Can I request delivery or a chauffeur?", "Let us know your preference in the booking notes or contact our team. Delivery locations, chauffeur service and additional fees depend on availability and the specific journey."],
    ["How can I check my booking status?", "Use the booking reference shown after submitting your request in the status-check form on the booking page. Keep the reference private; it is the key to viewing the status of your request."]
  ];
  function faqPage() {
    return `${pageHero("A LITTLE CLARITY", "The details, made simple.", "Straightforward answers to help you feel at ease before your first mile.")}
      <section class="section section-tight"><div class="content-narrow">${faqs.map(([question, answer], index) => `<div class="faq-item"><button class="faq-question" type="button" aria-expanded="false" aria-controls="faq-answer-${index}"><span>${escapeHtml(question)}</span><span aria-hidden="true">+</span></button><div class="faq-answer" id="faq-answer-${index}" hidden>${escapeHtml(answer)}</div></div>`).join("")}<div class="notice">Need a little more help? <a class="text-link" href="#contact">Talk to our team <span>↗</span></a></div></div></section>`;
  }

  function adminPage() {
    if (!configured) return `${pageHero("VINI OPERATIONS", "Admin dashboard", "Connect Supabase to manage reservations, enquiries and your vehicle collection.")}<section class="section">${infoBar()}</section>`;
    if (!adminUser) return `${pageHero("VINI OPERATIONS", "Welcome back.", "Sign in with an administrator account to manage the VINI collection.")}<section class="section section-tight"><div class="content-narrow form-card"><form id="admin-login"><div class="page-heading"><span class="eyebrow">SECURE ADMINISTRATION</span><h1 style="font-size:34px">Team sign in.</h1></div><div class="form-grid"><div class="form-field full"><label for="admin-email">Email</label><input id="admin-email" name="email" type="email" autocomplete="username" required></div><div class="form-field full"><label for="admin-password">Password</label><input id="admin-password" name="password" type="password" autocomplete="current-password" required></div></div><p class="form-note">Admin access is granted to specific accounts using the Supabase SQL setup instructions. There is no public admin sign-up.</p><button class="button button-dark" type="submit">Sign in ↗</button><div id="admin-login-message"></div></form></div></section>`;
    return `<section class="admin-shell"><div class="admin-top"><div><span class="eyebrow">VINI OPERATIONS</span><h1>Dashboard</h1></div><button class="button button-outline button-small" id="admin-signout">Sign out</button></div><div class="admin-tabs">${[["bookings", "Bookings"], ["vehicles", "Vehicles"], ["enquiries", "Enquiries"]].map(([key, title]) => `<button class="admin-tab${adminTab === key ? " active" : ""}" data-admin-tab="${key}">${title}</button>`).join("")}</div><div class="admin-panel" id="admin-panel"><div class="loading">Loading dashboard…</div></div></section>`;
  }

  function render() {
    menuOpen = false;
    document.body.classList.remove("menu-open");
    document.querySelector(".menu-toggle").setAttribute("aria-expanded", "false");
    const route = readRoute();
    const pages = { home: homePage, fleet: () => fleetPage(route.params), car: () => detailsPage(route.id, route.params), booking: () => bookingPage(route.params), about: aboutPage, contact: contactPage, faq: faqPage, admin: adminPage };
    app.innerHTML = (pages[route.page] || homePage)();
    document.title = `${({ home: "Drive your journey", fleet: "Our fleet", car: "Vehicle details", booking: "Reserve a car", about: "Our story", contact: "Contact", faq: "FAQs", admin: "Admin" })[route.page] || "Drive your journey"} | VINI CAR RENTAL`;
    bindPage(route);
    if (dataLoadError && route.page !== "home" && route.page !== "fleet" && route.page !== "booking" && route.page !== "contact") {
      app.insertAdjacentHTML("afterbegin", `<div class="section section-tight">${notice(dataLoadError, true)}</div>`);
    }
    if (route.page === "admin" && configured && adminUser) loadAdmin();
    if (route.page === "booking") updateQuote();
  }

  function bindPage(route) {
    const bookingSearch = document.querySelector("#search-booking");
    if (bookingSearch) {
      const pickup = bookingSearch.elements.pickup;
      const returnDate = bookingSearch.elements.return;
      pickup.addEventListener("change", () => { returnDate.min = pickup.value || isoToday; });
      bookingSearch.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!bookingSearch.reportValidity()) return;
        if (returnDate.value <= pickup.value) { toast("Return date must be after pick-up date.", true); return; }
        const values = new FormData(bookingSearch);
        const query = new URLSearchParams();
        if (values.get("category")) query.set("category", values.get("category"));
        query.set("pickup", values.get("pickup"));
        query.set("return", values.get("return"));
        if (values.get("location")) query.set("location", values.get("location"));
        go(`fleet?${query}`);
      });
    }

    if (route.page === "fleet") bindFleet(route.params);
    if (route.page === "car") {
      document.querySelectorAll("[data-gallery-image]").forEach((thumb) => thumb.addEventListener("click", () => {
        document.querySelector("#details-main-image").src = thumb.dataset.galleryImage;
      }));
    }
    if (route.page === "booking") bindBooking(route.params);
    if (route.page === "contact") bindContact();
    if (route.page === "faq") document.querySelectorAll(".faq-question").forEach((button) => button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      button.querySelector("span:last-child").textContent = expanded ? "+" : "−";
      document.getElementById(button.getAttribute("aria-controls")).hidden = expanded;
    }));
    if (route.page === "admin") bindAdmin();
  }

  function bindFleet(params) {
    let activeCategory = params.get("category") || "";
    let sort = "featured";
    let updateSequence = 0;
    const grid = document.querySelector("#fleet-grid");
    const empty = document.querySelector("#fleet-empty");
    async function update() {
      const currentSequence = ++updateSequence;
      let list = vehicles.filter((car) => car.is_available);
      if (activeCategory) list = list.filter((car) => slug(car.categories?.slug || car.category?.slug || car.categories?.name || car.category?.name || car.category || car.category_id) === activeCategory);
      if (sort === "price-low") list.sort((a, b) => Number(a.daily_rate) - Number(b.daily_rate));
      if (sort === "price-high") list.sort((a, b) => Number(b.daily_rate) - Number(a.daily_rate));
      if (sort === "featured") list.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
      const pickupDate = params.get("pickup");
      const returnDate = params.get("return");
      if (pickupDate && returnDate && configured) {
        if (returnDate <= pickupDate || pickupDate < isoToday) {
          grid.innerHTML = "";
          empty.innerHTML = notice("Choose valid future pick-up and return dates to check availability.", true);
          return;
        }
        const checks = await Promise.all(list.map(async (car) => {
          const { data, error } = await db.rpc("check_vehicle_availability", {
            p_vehicle_id: car.id,
            p_pickup_date: pickupDate,
            p_return_date: returnDate
          });
          return { car, available: data, error };
        }));
        if (currentSequence !== updateSequence) return;
        const failedCheck = checks.find((check) => check.error);
        if (failedCheck) {
          grid.innerHTML = "";
          empty.innerHTML = notice(`Could not check vehicle availability: ${failedCheck.error.message}`, true);
          return;
        }
        list = checks.filter((check) => check.available).map((check) => check.car);
      }
      if (currentSequence !== updateSequence) return;
      grid.innerHTML = list.map((car) => vehicleCard(car, params)).join("");
      empty.innerHTML = list.length ? "" : `<div class="empty-state">${pickupDate && returnDate ? "No vehicles are available for those dates. Try different dates or contact our team." : "No vehicles found in this collection. Try another category."}</div>`;
      document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.toggle("active", chip.dataset.category === activeCategory));
    }
    document.querySelector("#fleet-filters").addEventListener("click", (event) => {
      const button = event.target.closest("[data-category]");
      if (!button) return;
      activeCategory = button.dataset.category;
      update();
    });
    document.querySelector("#fleet-sort").addEventListener("change", (event) => { sort = event.target.value; update(); });
    update();
  }

  function getQuote(car, pickup, returnDate) {
    if (!car || !pickup || !returnDate || returnDate <= pickup) return null;
    const days = Math.round((Date.parse(`${returnDate}T00:00:00`) - Date.parse(`${pickup}T00:00:00`)) / 86400000);
    const subtotal = days * Number(car.daily_rate || 0);
    const serviceFee = Math.round(subtotal * serviceFeePercent / 100);
    return { days, subtotal, serviceFee, total: subtotal + serviceFee };
  }

  function updateQuote() {
    const form = document.querySelector("#booking-form");
    const box = document.querySelector("#booking-quote");
    if (!form || !box) return;
    const car = vehicles.find((vehicle) => vehicle.id === form.elements.vehicle.value);
    const quote = getQuote(car, form.elements.pickup.value, form.elements.return.value);
    if (!quote) {
      box.innerHTML = '<div class="quote-line"><span>Select your dates and vehicle to see your quote</span><span>—</span></div>';
      return;
    }
    box.innerHTML = `<div class="quote-line"><span>${quote.days} day${quote.days === 1 ? "" : "s"} × ${money.format(Number(car.daily_rate))}</span><span>${money.format(quote.subtotal)}</span></div><div class="quote-line"><span>Service fee (${serviceFeePercent}%)</span><span>${money.format(quote.serviceFee)}</span></div><div class="quote-line quote-total"><span>Estimated total</span><span>${money.format(quote.total)}</span></div>`;
  }

  function bindBooking() {
    const form = document.querySelector("#booking-form");
    const pickup = form.elements.pickup;
    const returnDate = form.elements.return;
    const availabilityMessage = document.querySelector("#availability-message");
    let availabilitySequence = 0;
    async function checkAvailability() {
      updateQuote();
      const request = ++availabilitySequence;
      const car = vehicles.find((vehicle) => vehicle.id === form.elements.vehicle.value);
      if (!db || !car || !pickup.value || !returnDate.value || returnDate.value <= pickup.value) {
        availabilityMessage.innerHTML = "";
        return;
      }
      availabilityMessage.innerHTML = '<div class="notice">Checking availability…</div>';
      const { data, error } = await db.rpc("check_vehicle_availability", {
        p_vehicle_id: car.id,
        p_pickup_date: pickup.value,
        p_return_date: returnDate.value
      });
      if (request !== availabilitySequence) return;
      if (error) {
        availabilityMessage.innerHTML = notice(`Could not check availability: ${error.message}`, true);
        return;
      }
      availabilityMessage.innerHTML = data
        ? notice("This vehicle is available for your selected dates. Final confirmation is subject to review.")
        : notice("This vehicle is not available for those dates. Please choose another date or car.", true);
    }
    pickup.addEventListener("change", () => { returnDate.min = pickup.value || isoToday; checkAvailability(); });
    returnDate.addEventListener("change", checkAvailability);
    form.elements.vehicle.addEventListener("change", checkAvailability);
    checkAvailability();
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (returnDate.value <= pickup.value) { toast("Return date must be after pick-up date.", true); return; }
      const data = new FormData(form);
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      submit.textContent = configured ? "Preparing your request…" : "Opening WhatsApp…";
      let bookingId = "";
      if (configured) {
        const { data: result, error } = await db.rpc("create_booking", {
          p_vehicle_id: data.get("vehicle"),
          p_pickup_date: data.get("pickup"),
          p_return_date: data.get("return"),
          p_location: data.get("location"),
          p_full_name: data.get("name"),
          p_email: data.get("email"),
          p_phone: data.get("phone"),
          p_notes: data.get("notes") || ""
        });
        if (error) {
          submit.disabled = false;
          submit.innerHTML = 'Continue to WhatsApp <span aria-hidden="true">↗</span>';
          return toast(error.message || "Your reservation could not be saved. Please try again.", true);
        }
        const booking = Array.isArray(result) ? result[0] : result;
        if (!booking?.booking_id) {
          submit.disabled = false;
          submit.innerHTML = 'Continue to WhatsApp <span aria-hidden="true">↗</span>';
          return toast("Your reservation could not be saved. Please try again.", true);
        }
        bookingId = booking.booking_id;
      }

      const car = vehicles.find((vehicle) => vehicle.id === data.get("vehicle"));
      const quote = getQuote(car, data.get("pickup"), data.get("return"));
      const message = [
        "Hello VINI CAR RENTAL, I would like to request a reservation.",
        "",
        `Vehicle: ${car ? `${car.year} ${car.make} ${car.model}` : "Please advise"}`,
        `Pick-up: ${data.get("pickup")} at ${data.get("location")}`,
        `Return: ${data.get("return")}`,
        `Name: ${data.get("name")}`,
        `Email: ${data.get("email")}`,
        `Phone: ${data.get("phone")}`,
        ...(quote ? [`Estimated total (${quote.days} days, including ${serviceFeePercent}% service fee): ${money.format(quote.total)}`] : []),
        ...(bookingId ? [`Booking reference: ${bookingId}`] : []),
        ...(data.get("notes") ? [`Notes: ${data.get("notes")}`] : [])
      ].join("\n");
      window.location.assign(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`);
    });
    document.querySelector("#status-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const code = new FormData(event.currentTarget).get("code").trim();
      const target = document.querySelector("#status-result");
      target.innerHTML = "";
      if (!db) return target.innerHTML = notice("Connect Supabase to check live booking status.");
      const { data, error } = await db.rpc("get_booking_status", { p_booking_id: code });
      if (error) return target.innerHTML = notice(error.message || "Could not check this reference. Please try again.", true);
      const result = Array.isArray(data) ? data[0] : data;
      if (!result) return target.innerHTML = notice("No booking was found for that reference.", true);
      target.innerHTML = `<div class="success-panel"><strong>${escapeHtml(result.make)} ${escapeHtml(result.model)}</strong><p>Status: <b>${escapeHtml(result.status)}</b></p><p>${escapeHtml(result.pickup_date)} to ${escapeHtml(result.return_date)} · ${money.format(Number(result.total))}</p></div>`;
    });
  }

  function bindContact() {
    const form = document.querySelector("#contact-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (!db) return toast("Connect Supabase before accepting live enquiries.", true);
      const values = new FormData(form);
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      const { error } = await db.rpc("create_enquiry", {
        p_full_name: values.get("name"),
        p_email: values.get("email"),
        p_phone: values.get("phone") || "",
        p_subject: values.get("subject"),
        p_message: values.get("message")
      });
      button.disabled = false;
      if (error) return toast(error.message || "Your enquiry could not be sent.", true);
      form.reset();
      toast("Thank you. Your message has reached the VINI team.");
    });
  }

  function bindAdmin() {
    const login = document.querySelector("#admin-login");
    if (login) login.addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = new FormData(login);
      const { data, error } = await db.auth.signInWithPassword({ email: values.get("email"), password: values.get("password") });
      if (error) {
        document.querySelector("#admin-login-message").innerHTML = notice(error.message, true);
        return;
      }
      adminUser = data.user;
      const { data: isAdmin, error: roleError } = await db.rpc("is_admin");
      if (roleError || !isAdmin) {
        await db.auth.signOut();
        adminUser = null;
        document.querySelector("#admin-login-message").innerHTML = notice(roleError?.message || "This account does not have administrator access.", true);
        return;
      }
      render();
    });
    document.querySelector("#admin-signout")?.addEventListener("click", async () => {
      const { error } = await db.auth.signOut();
      if (error) return toast(error.message, true);
      adminUser = null;
      render();
    });
    document.querySelectorAll("[data-admin-tab]").forEach((button) => button.addEventListener("click", () => { adminTab = button.dataset.adminTab; render(); }));
  }

  async function loadAdmin() {
    const panel = document.querySelector("#admin-panel");
    if (!panel) return;
    const [bookingResult, vehicleResult, enquiryResult] = await Promise.all([
      db.from("bookings").select("id, pickup_date, return_date, pickup_location, status, total, created_at, customers(full_name,email,phone), vehicles(make,model)").order("created_at", { ascending: false }).limit(100),
      db.from("vehicles").select("*, categories(name,slug)").order("created_at", { ascending: false }),
      db.from("enquiries").select("id, full_name, email, phone, subject, message, status, created_at").order("created_at", { ascending: false }).limit(100)
    ]);
    const failure = bookingResult.error || vehicleResult.error || enquiryResult.error;
    if (failure) { panel.innerHTML = notice(failure.message, true); return; }
    adminBookings = bookingResult.data || [];
    adminVehicles = vehicleResult.data || [];
    adminEnquiries = enquiryResult.data || [];
    if (adminTab === "bookings") renderAdminBookings(panel);
    if (adminTab === "vehicles") renderAdminVehicles(panel);
    if (adminTab === "enquiries") renderAdminEnquiries(panel);
  }

  function renderAdminBookings(panel) {
    panel.innerHTML = adminBookings.length ? `<table class="admin-list"><thead><tr><th>Guest & vehicle</th><th>Dates / location</th><th>Total</th><th>Status</th><th>Action</th></tr></thead><tbody>${adminBookings.map((booking) => `<tr><td><strong>${escapeHtml(booking.customers?.full_name || "Guest")}</strong><br>${escapeHtml(booking.customers?.email || "")}<br>${escapeHtml(booking.vehicles?.make || "")} ${escapeHtml(booking.vehicles?.model || "")}</td><td>${escapeHtml(booking.pickup_date)} → ${escapeHtml(booking.return_date)}<br>${escapeHtml(booking.pickup_location)}</td><td>${money.format(Number(booking.total))}</td><td>${escapeHtml(booking.status)}</td><td><div class="admin-actions">${booking.status === "pending" ? `<button data-booking-status="confirmed" data-id="${booking.id}">Confirm</button>` : ""}${booking.status !== "cancelled" ? `<button data-booking-status="cancelled" data-id="${booking.id}">Cancel</button>` : ""}</div></td></tr>`).join("")}</tbody></table>` : '<div class="empty-state">No reservation requests yet.</div>';
    panel.querySelectorAll("[data-booking-status]").forEach((button) => button.addEventListener("click", async () => {
      const { error } = await db.from("bookings").update({ status: button.dataset.bookingStatus }).eq("id", button.dataset.id);
      if (error) return toast(error.message, true);
      toast(button.dataset.bookingStatus === "confirmed" ? "Reservation confirmed." : "Reservation cancelled.");
      loadAdmin();
    }));
  }

  function vehicleFormMarkup(car = {}) {
    const isEdit = Boolean(car.id);
    return `<form class="admin-form" id="vehicle-form" data-id="${escapeHtml(car.id || "")}">
      <div class="form-field"><label for="vehicle-make">Make</label><input id="vehicle-make" name="make" required value="${escapeHtml(car.make || "")}"></div>
      <div class="form-field"><label for="vehicle-model">Model</label><input id="vehicle-model" name="model" required value="${escapeHtml(car.model || "")}"></div>
      <div class="form-field"><label for="vehicle-year">Year</label><input id="vehicle-year" name="year" type="number" min="1990" max="2099" required value="${escapeHtml(car.year || new Date().getFullYear())}"></div>
      <div class="form-field"><label for="vehicle-category">Category</label><select id="vehicle-category" name="category_id" required>${categories.map((category) => `<option value="${escapeHtml(category.id)}"${car.category_id === category.id ? " selected" : ""}>${escapeHtml(category.name)}</option>`).join("")}</select></div>
      <div class="form-field"><label for="vehicle-rate">Daily rate (INR)</label><input id="vehicle-rate" name="daily_rate" type="number" min="1" step="1" required value="${escapeHtml(car.daily_rate || "")}"></div>
      <div class="form-field"><label for="vehicle-seats">Seats</label><input id="vehicle-seats" name="seats" type="number" min="1" max="20" required value="${escapeHtml(car.seats || 5)}"></div>
      <div class="form-field"><label for="vehicle-luggage">Luggage capacity</label><input id="vehicle-luggage" name="luggage" type="number" min="0" max="20" value="${escapeHtml(car.luggage || 2)}"></div>
      <div class="form-field"><label for="vehicle-transmission">Transmission</label><input id="vehicle-transmission" name="transmission" value="${escapeHtml(car.transmission || "Automatic")}"></div>
      <div class="form-field"><label for="vehicle-fuel">Fuel</label><input id="vehicle-fuel" name="fuel" value="${escapeHtml(car.fuel || "Petrol")}"></div>
      <div class="form-field"><label for="vehicle-photos">Photographs ${isEdit ? "(optional replacement)" : ""}</label><input id="vehicle-photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple${isEdit ? "" : " required"}></div>
      <div class="form-field full"><label for="vehicle-gallery">Additional gallery photo URLs (one per line)</label><textarea id="vehicle-gallery" name="gallery_urls" placeholder="https://…">${escapeHtml((car.gallery_urls || []).join("\n"))}</textarea></div>
      <div class="form-field full"><label for="vehicle-description">Description</label><textarea id="vehicle-description" name="description" required>${escapeHtml(car.description || "")}</textarea></div>
      <div class="form-field full"><label for="vehicle-features">Features (one per line)</label><textarea id="vehicle-features" name="features">${escapeHtml((car.features || []).join("\n"))}</textarea></div>
      <div class="form-field full"><label><input name="is_featured" type="checkbox"${car.is_featured ? " checked" : ""} style="min-height:auto;width:auto"> Feature this vehicle</label> <label><input name="is_available" type="checkbox"${car.is_available !== false ? " checked" : ""} style="min-height:auto;width:auto"> Available for new requests</label></div>
      <div class="form-field full" style="display:flex;flex-direction:row;gap:10px"><button class="button button-dark button-small" type="submit">${isEdit ? "Save changes" : "Add vehicle"}</button>${isEdit ? '<button class="button button-outline button-small" type="button" id="vehicle-cancel-edit">Cancel</button>' : ""}</div>
    </form>`;
  }

  function renderAdminVehicles(panel) {
    panel.innerHTML = `<h2 style="color:var(--navy);font:400 25px var(--serif)">Your collection</h2><p class="form-note">Changes are live immediately. Uploaded vehicle photos are stored in the private-to-admin, public-read vehicle-photos bucket.</p><div id="vehicle-editor">${vehicleFormMarkup()}</div><div style="overflow-x:auto"><table class="admin-list"><thead><tr><th>Vehicle</th><th>Category</th><th>Rate / day</th><th>Availability</th><th>Actions</th></tr></thead><tbody>${adminVehicles.map((car) => `<tr><td>${escapeHtml(car.make)} ${escapeHtml(car.model)} (${escapeHtml(car.year)})</td><td>${escapeHtml(car.categories?.name || "")}</td><td>${money.format(Number(car.daily_rate))}</td><td>${car.is_available ? "Available" : "Hidden"}</td><td><div class="admin-actions"><button data-edit-vehicle="${car.id}">Edit</button><button data-toggle-vehicle="${car.id}" data-next="${!car.is_available}">${car.is_available ? "Hide" : "Show"}</button></div></td></tr>`).join("")}</tbody></table></div>`;
    panel.querySelectorAll("[data-edit-vehicle]").forEach((button) => button.addEventListener("click", () => {
      const car = adminVehicles.find((item) => item.id === button.dataset.editVehicle);
      document.querySelector("#vehicle-editor").innerHTML = vehicleFormMarkup(car);
      bindVehicleForm();
    }));
    panel.querySelectorAll("[data-toggle-vehicle]").forEach((button) => button.addEventListener("click", async () => {
      const { error } = await db.from("vehicles").update({ is_available: button.dataset.next === "true" }).eq("id", button.dataset.toggleVehicle);
      if (error) return toast(error.message, true);
      loadAdmin();
    }));
    bindVehicleForm();
  }

  function bindVehicleForm() {
    const form = document.querySelector("#vehicle-form");
    if (!form) return;
    document.querySelector("#vehicle-cancel-edit")?.addEventListener("click", () => renderAdminVehicles(document.querySelector("#admin-panel")));
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      const id = form.dataset.id;
      const existing = adminVehicles.find((car) => car.id === id);
      let imageUrl = existing?.image_url || "";
      const uploadedUrls = [];
      for (const photo of values.getAll("photos")) {
        if (!(photo instanceof File) || !photo.size) continue;
        const extension = photo.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const objectPath = `${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await db.storage.from("vehicle-photos").upload(objectPath, photo, { contentType: photo.type, upsert: false });
        if (uploadError) return toast(uploadError.message, true);
        const { data } = db.storage.from("vehicle-photos").getPublicUrl(objectPath);
        uploadedUrls.push(data.publicUrl);
      }
      if (uploadedUrls.length) imageUrl = uploadedUrls[0];
      const galleryUrls = values.get("gallery_urls").split("\n").map((url) => url.trim()).filter(Boolean);
      const finalGalleryUrls = [...new Set([
        ...uploadedUrls.slice(1),
        ...(uploadedUrls.length && existing?.image_url ? [existing.image_url] : []),
        ...galleryUrls
      ])];
      const payload = {
        make: values.get("make").trim(),
        model: values.get("model").trim(),
        year: Number(values.get("year")),
        category_id: values.get("category_id"),
        daily_rate: Number(values.get("daily_rate")),
        seats: Number(values.get("seats")),
        luggage: Number(values.get("luggage") || 0),
        transmission: values.get("transmission").trim(),
        fuel: values.get("fuel").trim(),
        description: values.get("description").trim(),
        features: values.get("features").split("\n").map((item) => item.trim()).filter(Boolean),
        is_featured: values.get("is_featured") === "on",
        is_available: values.get("is_available") === "on",
        image_url: imageUrl,
        gallery_urls: finalGalleryUrls
      };
      const response = id ? await db.from("vehicles").update(payload).eq("id", id) : await db.from("vehicles").insert(payload);
      if (response.error) return toast(response.error.message, true);
      toast(id ? "Vehicle updated." : "Vehicle added.");
      loadAdmin();
    });
  }

  function renderAdminEnquiries(panel) {
    panel.innerHTML = adminEnquiries.length ? `<table class="admin-list"><thead><tr><th>From</th><th>Message</th><th>Status</th><th>Action</th></tr></thead><tbody>${adminEnquiries.map((item) => `<tr><td><strong>${escapeHtml(item.full_name)}</strong><br><a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a>${item.phone ? `<br>${escapeHtml(item.phone)}` : ""}<br>${escapeHtml(new Date(item.created_at).toLocaleDateString())}</td><td><strong>${escapeHtml(item.subject)}</strong><br>${escapeHtml(item.message)}</td><td>${escapeHtml(item.status)}</td><td><div class="admin-actions">${item.status === "new" ? `<button data-enquiry-status="read" data-id="${item.id}">Mark read</button>` : ""}<a href="mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent(`Re: ${item.subject}`)}">Reply</a></div></td></tr>`).join("")}</tbody></table>` : '<div class="empty-state">No enquiries yet.</div>';
    panel.querySelectorAll("[data-enquiry-status]").forEach((button) => button.addEventListener("click", async () => {
      const { error } = await db.from("enquiries").update({ status: button.dataset.enquiryStatus }).eq("id", button.dataset.id);
      if (error) return toast(error.message, true);
      loadAdmin();
    }));
  }

  async function initializeData() {
    if (!db) return;
    const [vehicleResult, categoryResult, pricingResult, sessionResult] = await Promise.all([
      db.from("vehicles").select("*, categories(id,name,slug)").eq("is_available", true).order("is_featured", { ascending: false }).order("make"),
      db.from("categories").select("id,name,slug").eq("is_active", true).order("name"),
      db.from("pricing").select("code,amount").eq("code", "service_fee_percent").eq("is_active", true).maybeSingle(),
      db.auth.getSession()
    ]);
    const loadErrors = [];
    if (vehicleResult.error) { loadErrors.push(`Could not load the vehicle catalogue: ${vehicleResult.error.message}`); vehicles = []; }
    else vehicles = vehicleResult.data || [];
    if (categoryResult.error) loadErrors.push(`Could not load vehicle categories: ${categoryResult.error.message}`);
    else if (categoryResult.data) categories = categoryResult.data;
    if (pricingResult.error) loadErrors.push(`Could not load current pricing: ${pricingResult.error.message}`);
    else if (pricingResult.data) serviceFeePercent = Number(pricingResult.data.amount);
    if (sessionResult.error) { console.error("Could not restore admin session:", sessionResult.error.message); loadErrors.push(`Could not restore the signed-in session: ${sessionResult.error.message}`); }
    else if (sessionResult.data.session) {
      const { data: isAdmin, error } = await db.rpc("is_admin");
      if (error) console.error("Could not verify admin role:", error.message);
      else if (isAdmin) adminUser = sessionResult.data.session.user;
      else await db.auth.signOut();
    }
    dataLoadError = loadErrors.join(" ");
    render();
  }

  document.querySelector(".menu-toggle").addEventListener("click", (event) => {
    menuOpen = !menuOpen;
    document.body.classList.toggle("menu-open", menuOpen);
    event.currentTarget.setAttribute("aria-expanded", String(menuOpen));
    event.currentTarget.setAttribute("aria-label", menuOpen ? "Close navigation" : "Open navigation");
  });
  document.querySelector(".main-nav").addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      menuOpen = false;
      document.body.classList.remove("menu-open");
      document.querySelector(".menu-toggle").setAttribute("aria-expanded", "false");
    }
  });
  window.addEventListener("hashchange", render);
  document.querySelector("#year").textContent = String(new Date().getFullYear());

  if (db) {
    db.auth.onAuthStateChange((_event, session) => {
      if (!session) adminUser = null;
    });
    initializeData();
  } else render();
})();
