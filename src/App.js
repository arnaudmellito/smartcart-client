import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, ChefHat, Store, ArrowRight, Check, X, User, MapPin, Truck, RefreshCw, CreditCard, Lock, LogOut, Loader, Sparkles, Maximize, Minimize, Bell } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, signInWithCustomToken, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

// ==============================================================================
// 🔧 CONFIGURATION
// ==============================================================================

const firebaseConfig = {
  apiKey: "AIzaSyBpo62Cj827jOc9VNiwI8hM-BCk_25YWP4",
  authDomain: "smartcart-5181a.firebaseapp.com",
  projectId: "smartcart-5181a",
  storageBucket: "smartcart-5181a.firebasestorage.app",
  messagingSenderId: "574885240540",
  appId: "1:574885240540:web:eed58a6a0ffe7af8419e19"
};

const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY; 

// ==============================================================================
// 🛠 INITIALISATION
// ==============================================================================

let auth, db;
try {
  const isConfigured = firebaseConfig.apiKey !== "VOTRE_API_KEY_ICI";
  const configToUse = isConfigured ? firebaseConfig : (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : firebaseConfig);
  const app = initializeApp(configToUse);
  auth = getAuth(app);
  db = getFirestore(app);
  setPersistence(auth, browserLocalPersistence).catch(console.error);
} catch (e) {
  if (e.code !== 'app/duplicate-app') console.warn("Mode Démo actif");
}

// ==============================================================================
// 🧠 DATA & INTELLIGENCE
// ==============================================================================

const PRODUCT_DB_FALLBACK = {
  "soupe de poisson": { name: "Soupe de Poissons", brand: "Liebig", weight: "1L", img: "https://images.openfoodfacts.org/images/products/303/681/135/8070/front_fr.35.400.jpg", prices: { leclerc: 3.50, carrefour: 3.80, auchan: 3.70 } },
  "rouille": { name: "Sauce Rouille", brand: "Bénédicta", weight: "90g", img: "https://images.openfoodfacts.org/images/products/303/361/000/2361/front_fr.45.400.jpg", prices: { leclerc: 1.80, carrefour: 1.95, auchan: 1.90 } },
  "croutons": { name: "Croûtons à l'Ail", brand: "Tipiak", weight: "200g", img: "https://images.openfoodfacts.org/images/products/316/544/000/0332/front_fr.56.400.jpg", prices: { leclerc: 1.50, carrefour: 1.70, auchan: 1.60 } },
  "filet de poisson": { name: "Filets de Cabillaud", brand: "Findus", weight: "400g", img: "https://images.openfoodfacts.org/images/products/359/671/034/7819/front_fr.175.400.jpg", prices: { leclerc: 6.50, carrefour: 6.90, auchan: 6.80 } },
  "pates": { name: "Pâtes Penne", brand: "Barilla", weight: "500g", img: "https://images.openfoodfacts.org/images/products/807/680/951/3753/front_fr.187.400.jpg", prices: { leclerc: 1.15, carrefour: 1.25, auchan: 1.20 } },
  "sauce tomate": { name: "Sauce Bolo", brand: "Panzani", weight: "400g", img: "https://images.openfoodfacts.org/images/products/303/835/900/2144/front_fr.63.400.jpg", prices: { leclerc: 1.80, carrefour: 1.95, auchan: 1.90 } },
  "viande hachee": { name: "Steak Haché", brand: "Charal", weight: "2x125g", img: "https://images.openfoodfacts.org/images/products/318/123/212/0332/front_fr.129.400.jpg", prices: { leclerc: 3.50, carrefour: 3.80, auchan: 3.65 } },
  "creme fraiche": { name: "Crème Fraîche", brand: "Isigny", weight: "20cl", img: "https://images.openfoodfacts.org/images/products/325/622/332/0026/front_fr.45.400.jpg", prices: { leclerc: 1.60, carrefour: 1.75, auchan: 1.70 } },
  "lait": { name: "Lait Demi-Écrémé", brand: "Lactel", weight: "1L", img: "https://images.openfoodfacts.org/images/products/314/135/000/0019/front_fr.146.400.jpg", prices: { leclerc: 0.99, carrefour: 1.10, auchan: 1.05 } },
  "oeufs": { name: "Oeufs Plein Air", brand: "Loué", weight: "x6", img: "https://images.openfoodfacts.org/images/products/326/385/000/0317/front_fr.164.400.jpg", prices: { leclerc: 2.10, carrefour: 2.30, auchan: 2.20 } },
  "fromage": { name: "Emmental", brand: "Président", weight: "200g", img: "https://images.openfoodfacts.org/images/products/322/802/020/0103/front_fr.220.400.jpg", prices: { leclerc: 1.90, carrefour: 2.10, auchan: 2.00 } },
  "pommes de terre": { name: "Pommes de Terre", brand: "Bio", weight: "2.5kg", img: "https://images.openfoodfacts.org/images/products/327/019/002/3021/front_fr.44.400.jpg", prices: { leclerc: 2.99, carrefour: 3.20, auchan: 3.10 } },
  "lardons": { name: "Lardons Fumés", brand: "Herta", weight: "200g", img: "https://images.openfoodfacts.org/images/products/303/349/000/4642/front_fr.175.400.jpg", prices: { leclerc: 1.80, carrefour: 1.95, auchan: 1.90 } },
  "reblochon": { name: "Reblochon", brand: "Pochat", weight: "450g", img: "https://images.openfoodfacts.org/images/products/329/298/010/0015/front_fr.56.400.jpg", prices: { leclerc: 5.50, carrefour: 5.90, auchan: 5.80 } }
};

const fetchRealProducts = async (keyword) => {
  try {
    const response = await fetch(`https://fr.openfoodfacts.org/cgi/search.pl?search_terms=${keyword}&search_simple=1&action=process&json=1&page_size=5`);
    const data = await response.json();
    if (data.products && data.products.length > 0) {
      const validProduct = data.products.find(p => p.image_front_small_url) || data.products[0];
      return {
        id: validProduct.code,
        name: validProduct.product_name_fr || validProduct.product_name,
        brand: validProduct.brands?.split(',')[0] || "Marque inconnue",
        weight: validProduct.quantity || "Standard",
        img: validProduct.image_front_small_url || "https://placehold.co/100x100?text=Image",
        category: keyword,
        prices: generateRealisticPrices()
      };
    }
    return null;
  } catch (err) { return null; }
};

const generateRealisticPrices = () => {
  const base = (Math.random() * (8 - 2) + 2);
  return {
    Leclerc: parseFloat((base * 0.95).toFixed(2)),
    Carrefour: parseFloat(base.toFixed(2)),
    Auchan: parseFloat((base * 1.02).toFixed(2))
  };
};

// ==============================================================================
// 🧱 COMPOSANTS
// ==============================================================================

const AuthView = ({ email, setEmail, pass, setPass, isLogin, setIsLogin, onAuth, error }) => (
  <div className="max-w-md mx-auto px-4 py-16 animate-fade-in">
    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900">{isLogin ? 'Connexion' : 'Inscription'}</h2>
        <p className="text-gray-500 mt-2">Accédez à votre espace SmartCart.</p>
      </div>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 text-center">{error}</div>}
      <form onSubmit={onAuth} className="space-y-4">
        <input type="email" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none" placeholder="Mot de passe" value={pass} onChange={e => setPass(e.target.value)} />
        <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg">{isLogin ? 'Se connecter' : "S'inscrire"}</button>
      </form>
      <div className="mt-6 text-center">
        <button onClick={() => setIsLogin(!isLogin)} className="text-green-600 font-bold hover:underline text-sm">{isLogin ? "Pas de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}</button>
      </div>
    </div>
  </div>
);

const CheckoutView = ({ data, setData, onSubmit, total }) => (
  <div className="max-w-4xl mx-auto px-4 py-10 animate-fade-in">
     <h2 className="text-3xl font-bold text-slate-900 mb-8">Paiement</h2>
     <form onSubmit={onSubmit} className="space-y-6">
       <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
         <h3 className="font-bold mb-4 flex gap-2 text-slate-800"><MapPin className="text-green-600"/> Adresse de livraison</h3>
         <div className="grid grid-cols-2 gap-4">
           <input required type="text" className="col-span-2 w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-green-500" placeholder="Adresse complète" value={data.address} onChange={e => setData({...data, address: e.target.value})} />
           <input required type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-green-500" placeholder="Ville" value={data.city} onChange={e => setData({...data, city: e.target.value})} />
           <input required type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-green-500" placeholder="CP" />
         </div>
       </div>
       <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
         <h3 className="font-bold mb-4 flex gap-2 text-slate-800"><CreditCard className="text-green-600"/> Paiement sécurisé</h3>
         <input required type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 outline-none focus:border-green-500" placeholder="Numéro de carte" />
         <div className="grid grid-cols-2 gap-4">
           <input required type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-green-500" placeholder="MM/AA" />
           <input required type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-green-500" placeholder="CVC" />
         </div>
       </div>
       <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98] flex justify-center items-center gap-2">
         <Lock className="w-5 h-5" /> Payer {total}€
       </button>
     </form>
  </div>
);

// ==============================================================================
// 🚀 APP LOGIC
// ==============================================================================

export default function SmartCartLive() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); 
  const [currentView, setCurrentView] = useState('home'); 
  const [prompt, setPrompt] = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [cart, setCart] = useState([]);
  const [storeFilter, setStoreFilter] = useState('best'); 
  const [logs, setLogs] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Notification State
  const [notification, setNotification] = useState(null);

  // Typing Effect
  const [typedText1, setTypedText1] = useState('');
  const [typedText2, setTypedText2] = useState('');
  const [typedText3, setTypedText3] = useState('');
  const fullText1 = "Demandez.";
  const fullText2 = "On choisit.";
  const fullText3 = "Une nouvelle façon de faire vos courses";

  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [checkoutData, setCheckoutData] = useState({ address: '', city: '', cardName: '', cardNumber: '', expiry: '', cvc: '' });
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [itemToSwap, setItemToSwap] = useState(null);
  const [alternatives, setAlternatives] = useState([]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {
        window.open(window.location.href, '_blank');
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // --- LISTENER DES COMMANDES (NOTIFICATION TEMPS REEL) ---
  useEffect(() => {
    if (!db || !user) return;

    // On écoute uniquement la dernière commande de l'utilisateur
    const q = query(
        collection(db, 'artifacts', 'smartcart-app', 'users', user.uid, 'orders'),
        orderBy("date", "desc"),
        limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            // Si une commande existante est modifiée (par le livreur)
            if (change.type === "modified") {
                const data = change.doc.data();
                if (data.status === 'accepted') {
                    setNotification({ title: "Commande acceptée !", msg: "Votre SmartShopper commence les courses 🛒" });
                    // Auto-hide après 5s
                    setTimeout(() => setNotification(null), 5000);
                }
                if (data.status === 'delivered') {
                    setNotification({ title: "Livraison terminée", msg: "Vos courses sont arrivées 🏠" });
                    setTimeout(() => setNotification(null), 5000);
                }
            }
        });
    });

    return () => unsubscribe();
  }, [user]);

  // --- TYPEWRITER EFFECT ---
  useEffect(() => {
    if (currentView === 'home') {
        let i1 = 0, i2 = 0, i3 = 0;
        setTypedText1(''); setTypedText2(''); setTypedText3('');

        const typeWriter1 = setInterval(() => {
            if (i1 < fullText1.length) {
                setTypedText1(fullText1.substring(0, i1 + 1));
                i1++;
            } else {
                clearInterval(typeWriter1);
                setTimeout(() => {
                    const typeWriter2 = setInterval(() => {
                        if (i2 < fullText2.length) {
                            setTypedText2(fullText2.substring(0, i2 + 1));
                            i2++;
                        } else {
                            clearInterval(typeWriter2);
                            setTimeout(() => {
                                const typeWriter3 = setInterval(() => {
                                    if (i3 < fullText3.length) {
                                        setTypedText3(fullText3.substring(0, i3 + 1));
                                        i3++;
                                    } else {
                                        clearInterval(typeWriter3);
                                    }
                                }, 50);
                            }, 300);
                        }
                    }, 100);
                }, 300);
            }
        }, 100);
        return () => clearInterval(typeWriter1);
    }
  }, [currentView]);

  useEffect(() => {
    if (!auth) { setAuthLoading(false); return; }
    const tryCustomToken = async () => {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            try { await signInWithCustomToken(auth, __initial_auth_token); } catch(e) {}
        }
    };
    tryCustomToken();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const calculateTotal = (store) => {
    return cart.reduce((total, item) => {
      const price = store === 'best' ? Math.min(...Object.values(item.prices)) : item.prices[store];
      return total + price;
    }, 0).toFixed(2);
  };

  const getBestStoreForItem = (item) => Object.keys(item.prices).reduce((a, b) => item.prices[a] < item.prices[b] ? a : b);

  const callOpenAI = async (userPrompt) => {
    if (OPENAI_API_KEY === "VOTRE_CLE_OPENAI_SK_...") return localAnalyze(userPrompt);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "system",
            content: "Tu es un expert culinaire. Extrait le nom de la recette et une liste précise des ingrédients (sans quantités). Format JSON: { \"recipe\": \"Nom Recette\", \"ingredients\": [\"ingredient1\", \"ingredient2\"] }"
          }, { role: "user", content: userPrompt }]
        })
      });
      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      return localAnalyze(userPrompt);
    }
  };

  const localAnalyze = (text) => {
    const p = text.toLowerCase();
    if (p.includes("bouillabaisse")) return { recipe: "Bouillabaisse Marseillaise", ingredients: ["soupe de poisson", "rouille", "croutons", "pommes de terre", "filet de poisson"] };
    if (p.includes("tartiflette")) return { recipe: "Tartiflette Savoyarde", ingredients: ["pommes de terre", "lardons", "reblochon", "creme fraiche"] };
    if (p.includes("lasagne") || p.includes("pates")) return { recipe: "Lasagnes à la Bolognaise", ingredients: ["pates", "sauce tomate", "viande hachee", "fromage"] };
    if (p.includes("crêpe") || p.includes("gâteau")) return { recipe: "Crêpes Maison", ingredients: ["lait", "oeufs", "farine", "beurre"] };
    return { recipe: "Panier Standard", ingredients: ["pates", "sauce tomate"] }; 
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!prompt) return;
    setCurrentView('processing');
    setLogs([]);
    
    const sequence = [
      { msg: "🧠 Analyse de la recette...", delay: 500 },
      { msg: "🐟 Sélection du poisson frais...", delay: 1500 },
      { msg: "🔍 Recherche des meilleurs produits...", delay: 3000 },
      { msg: "💶 Comparaison des prix...", delay: 4500 }
    ];
    let timer = 0;
    sequence.forEach(({ msg, delay }) => {
        timer = delay;
        setTimeout(() => setLogs(prev => [...prev, msg]), delay);
    });

    const aiResult = await callOpenAI(prompt);
    setRecipeName(aiResult.recipe); 
    
    const cartPromises = aiResult.ingredients.map(async (keyword) => {
        const realProduct = await fetchRealProducts(keyword);
        if (realProduct) return realProduct;
        if (PRODUCT_DB_FALLBACK[keyword]) {
            return { 
                ...PRODUCT_DB_FALLBACK[keyword], 
                id: Math.random().toString(), 
                category: keyword 
            };
        }
        return null;
    });
    
    const results = await Promise.all(cartPromises);
    const finalCart = results.filter(Boolean);

    setTimeout(() => {
      setCart(finalCart);
      setCurrentView('results');
    }, timer + 500);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!auth) { setAuthError("Erreur: Firebase non configuré."); return; }
    try {
      if (isLoginMode) await signInWithEmailAndPassword(auth, authEmail, authPass);
      else await createUserWithEmailAndPassword(auth, authEmail, authPass);
      if (cart.length > 0) setCurrentView('checkout');
      else setCurrentView('home');
    } catch (err) {
      setAuthError(err.code === 'auth/invalid-email' ? "Email invalide" : err.message);
    }
  };

  const handleLogout = async () => { if (auth) await signOut(auth); setCurrentView('home'); };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (db && user) {
        try {
            await addDoc(collection(db, 'artifacts', 'smartcart-app', 'users', user.uid, 'orders'), {
                items: cart, total: calculateTotal(storeFilter), recipe: recipeName, address: checkoutData.address, date: serverTimestamp(), status: 'pending'
            });
        } catch (err) { console.error(err); }
    }
    setTimeout(() => setCurrentView('success'), 2000);
  };

  const openSwapModal = async (item) => {
    setItemToSwap(item);
    setSwapModalOpen(true);
    setAlternatives([]);
    const realAlts = await fetchRealProducts(item.category); 
    if (realAlts) {
        setAlternatives([realAlts]);
    } else {
        setAlternatives([]);
    }
  };

  const confirmSwap = (newItem) => {
    const newCart = cart.map(item => item.id === itemToSwap.id ? newItem : item);
    setCart(newCart); setSwapModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 flex flex-col relative">
      
      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-full shadow-2xl z-50 flex items-center gap-4 animate-fade-in-up">
            <div className="bg-green-500 p-2 rounded-full">
                <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
                <h4 className="font-bold text-sm">{notification.title}</h4>
                <p className="text-xs text-slate-300">{notification.msg}</p>
            </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
            <div className="bg-green-600 p-2.5 rounded-xl shadow-lg shadow-green-100">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">SmartCart<span className="text-green-600">.ai</span></span>
          </div>
          <div className="flex items-center gap-4">
            {authLoading ? (
               <Loader className="w-5 h-5 animate-spin text-green-600" />
            ) : user ? (
              <div className="flex items-center gap-3">
                 <span className="hidden md:block text-sm font-medium text-gray-600">{user.email}</span>
                 <button onClick={handleLogout} className="text-gray-400 hover:text-red-500" title="Se déconnecter"><LogOut className="w-5 h-5" /></button>
              </div>
            ) : (
              currentView !== 'auth' && (
                <button onClick={() => setCurrentView('auth')} className="bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold text-sm hover:bg-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4" /> <span>Connexion</span>
                </button>
              )
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow">
        
        {currentView === 'auth' && (
          <AuthView email={authEmail} setEmail={setAuthEmail} pass={authPass} setPass={setAuthPass} isLogin={isLoginMode} setIsLogin={setIsLoginMode} onAuth={handleAuth} error={authError} />
        )}

        {currentView === 'checkout' && (
          <CheckoutView data={checkoutData} setData={setCheckoutData} onSubmit={handleCheckoutSubmit} total={calculateTotal(storeFilter)} />
        )}
        
        {currentView === 'home' && (
          <div className="relative overflow-hidden">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-green-50 rounded-full blur-3xl -z-10 opacity-60"></div>
            <div className="max-w-4xl mx-auto px-4 pt-20 pb-32 text-center">
              
              <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 min-h-[160px]">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-400">
                  {typedText1}
                  {typedText1.length < fullText1.length && (
                    <span className="inline-block w-1 h-10 md:h-16 bg-green-500 ml-1 animate-pulse align-middle"></span>
                  )}
                </span>
                <br/>
                <span className="text-slate-900">
                  {typedText2}
                  {typedText1.length === fullText1.length && typedText2.length < fullText2.length && (
                    <span className="inline-block w-1 h-10 md:h-16 bg-slate-900 ml-1 animate-pulse align-middle"></span>
                  )}
                </span>
              </h1>
              
              <p className="text-xl text-gray-500 mb-12 max-w-2xl mx-auto h-8">
                 {typedText3}
                 {typedText1.length === fullText1.length && typedText2.length === fullText2.length && typedText3.length < fullText3.length && (
                    <span className="inline-block w-0.5 h-5 bg-gray-400 ml-1 animate-pulse align-middle"></span>
                 )}
              </p>
              
              <div className="max-w-2xl mx-auto relative group animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                <form onSubmit={handleSearch} className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                    <ChefHat className="h-7 w-7 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                  </div>
                  <input type="text" className="block w-full pl-16 pr-36 py-5 bg-white border-2 border-gray-100 rounded-2xl shadow-xl text-lg md:text-xl placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:outline-none transition-all" placeholder="Ex: Bouillabaisse pour 4 personnes..." value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                  <div className="absolute right-2.5 top-2.5 bottom-2.5">
                    <button type="submit" className="h-full bg-green-600 hover:bg-green-700 text-white px-8 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                      <span>Go</span> <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {currentView === 'processing' && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center">
             <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-green-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center"><Store className="w-10 h-10 text-green-600" /></div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-6">Traitement en cours...</h3>
              <div className="space-y-3 text-left">
                {logs.map((log, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-gray-600 animate-fade-in-up p-2 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div><span className="text-sm font-medium">{log}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentView === 'results' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Recette identifiée
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-slate-900">Ingrédients pour : <span className="text-green-600">{recipeName || "Votre demande"}</span></h2>
              </div>
              <button onClick={() => { setCurrentView('home'); setPrompt(''); }} className="text-gray-500 hover:text-green-600 font-medium flex items-center gap-2">
                <Search className="w-4 h-4" /> Nouvelle recherche
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2 space-y-4">
                {cart.map((item) => {
                  const bestStore = getBestStoreForItem(item);
                  const displayPrice = storeFilter === 'best' ? item.prices[bestStore] : item.prices[storeFilter];
                  return (
                    <div key={item.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-6 group relative">
                      <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center p-2 border border-gray-50">
                         <img src={item.img} alt={item.name} className="w-full h-full object-contain" onError={(e) => {e.target.onerror = null; e.target.src="https://placehold.co/100x100?text=?"}} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-lg text-slate-900 truncate">{item.name}</h4>
                            <p className="text-gray-500 text-sm">{item.brand} • {item.weight}</p>
                          </div>
                          <span className="block font-bold text-xl text-green-700">{displayPrice.toFixed(2)}€</span>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                           <span className={`px-3 py-1 rounded-lg text-sm font-bold uppercase tracking-wide flex items-center gap-2
                            ${storeFilter === 'best' ? getBestStoreForItem(item) === 'Leclerc' ? 'bg-blue-50 text-blue-700' : getBestStoreForItem(item) === 'Carrefour' ? 'bg-sky-50 text-sky-700' : 'bg-red-50 text-red-700' : ''}
                            ${storeFilter === 'Leclerc' ? 'bg-blue-50 text-blue-700' : ''}
                            ${storeFilter === 'Carrefour' ? 'bg-sky-50 text-sky-700' : ''}
                            ${storeFilter === 'Auchan' ? 'bg-red-50 text-red-700' : ''}
                          `}>
                            <Store className="w-4 h-4" /> {storeFilter === 'best' ? getBestStoreForItem(item) : storeFilter}
                          </span>
                          <button onClick={() => openSwapModal(item)} className="text-sm font-bold text-slate-700 hover:text-green-600 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-green-200">
                            <RefreshCw className="w-4 h-4" /> Changer
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="lg:col-span-1 lg:sticky lg:top-24">
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                   <div className="p-5 bg-slate-50 border-b border-gray-200">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <div className="bg-green-500 w-2 h-6 rounded-full"></div> Optimisation
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {[{ id: 'best', label: 'Proposition IA', icon: '✨' }, { id: 'Leclerc', label: 'Leclerc', icon: '🔵' }, { id: 'Carrefour', label: 'Carrefour', icon: '🔴' }, { id: 'Auchan', label: 'Auchan', icon: '🟢' }].map((option) => (
                       <button key={option.id} onClick={() => setStoreFilter(option.id)} className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${storeFilter === option.id ? 'border-green-500 bg-green-50/30' : 'border-transparent hover:bg-gray-50'}`}>
                          <div className="flex justify-between items-center z-10">
                            <div className="flex items-center gap-3"><span className="text-2xl">{option.icon}</span> <span className="font-bold text-slate-700">{option.label}</span></div>
                            <span className="font-bold text-lg text-green-700">{calculateTotal(option.id)}€</span>
                          </div>
                        </button>
                    ))}
                  </div>
                  <div className="p-6 bg-gray-50 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-6"><span className="font-bold text-slate-900 text-lg">Total</span><span className="font-extrabold text-3xl text-slate-900">{calculateTotal(storeFilter)}€</span></div>
                    <button onClick={() => setCurrentView(user ? 'checkout' : 'auth')} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-slate-800 flex items-center justify-center gap-3">
                      <span>{user ? 'Payer' : 'Se connecter'}</span> <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'success' && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6"><Check className="w-12 h-12 text-green-600" /></div>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Commande Validée !</h2>
            <p className="text-xl text-gray-500 mb-8">Votre commande a été enregistrée.</p>
            <button onClick={() => {setCart([]); setPrompt(''); setCurrentView('home');}} className="text-green-600 font-bold hover:underline">Retour à l'accueil</button>
          </div>
        )}

        {swapModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSwapModalOpen(false)}></div>
            <div className="bg-white rounded-2xl w-full max-w-lg z-10 p-6">
              <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl">Alternatives</h3><button onClick={() => setSwapModalOpen(false)}><X /></button></div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {alternatives.length > 0 ? alternatives.map((alt, idx) => (
                  <div key={idx} onClick={() => confirmSwap(alt)} className="flex items-center gap-4 p-4 border rounded-xl hover:bg-green-50 cursor-pointer">
                    <div className="w-12 h-12 flex-shrink-0">
                        <img src={alt.img} className="w-full h-full object-contain" alt={alt.name} onError={(e) => {e.target.onerror = null; e.target.src="https://placehold.co/100x100?text=?"}} />
                    </div>
                    <div className="flex-1"><h4 className="font-bold">{alt.name}</h4><div className="text-sm text-gray-500">{alt.brand}</div></div>
                    <div className="font-bold text-green-700">{(storeFilter === 'best' ? alt.prices[getBestStoreForItem(alt)] : alt.prices[storeFilter]).toFixed(2)}€</div>
                  </div>
                )) : (
                    <p className="text-center text-gray-500 py-4">Aucune alternative trouvée.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BOUTON PLEIN ECRAN (AVEC FONCTION) */}
        <button 
            onClick={toggleFullscreen}
            className="fixed bottom-4 right-4 bg-slate-900 text-white p-3 rounded-full shadow-xl hover:bg-green-600 transition-colors z-50"
            title={isFullscreen ? "Quitter le plein écran" : "Ouvrir en plein écran"}
        >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
      </main>
    </div>
  );
}
