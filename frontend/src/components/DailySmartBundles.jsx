import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { addToCart } from '../slices/cartSlice';
import { formatINR } from '../utils/format';

const DailySmartBundles = ({ products }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [bundles, setBundles] = useState([]);
  const [timeLeft, setTimeLeft] = useState('');

  // Auto titling logic based on fuzzy string matching
  const determineBundleName = (items) => {
    let names = items.map(i => i.name.toLowerCase());
    let combined = names.join(" ");
    
    if (/milk|bread|egg|butter|paneer/i.test(combined)) return "🥞 Breakfast Essentials";
    if (/rice|dal|flour|onion|tomato|potato|oil|spice/i.test(combined)) return "🍛 Daily Cooking Kit";
    if (/apple|banana|mango|fruit|healthy|organic|veg|salad/i.test(combined)) return "🥗 Healthy Combo";
    if (/tea|coffee|snack|biscuit|chips|chocolate/i.test(combined)) return "☕ Tea Time Pack";
    return "✨ Super Saver Pack";
  };

  useEffect(() => {
    if (!products || products.length === 0) return;

    const CACHE_KEY = 'smart_bundles_cache';
    const cachedData = localStorage.getItem(CACHE_KEY);
    const todayStr = new Date().toDateString();

    const startTimer = () => {
      const updateTime = () => {
         const now = new Date();
         const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
         const diff = tomorrow - now;
         
         const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
         const m = Math.floor((diff / 1000 / 60) % 60);
         setTimeLeft(`${h}h ${m}m`);
      };
      updateTime(); // fire immediately
      const interval = setInterval(updateTime, 60000);
      return () => clearInterval(interval);
    };

    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      // Validate date validity
      if (parsed.date === todayStr && parsed.bundles && parsed.bundles.length > 0) {
        setBundles(parsed.bundles);
        const clearTimer = startTimer();
        return () => clearTimer && clearTimer(); // cleanup timer
      }
    }

    // Generator execution block
    const generateBundles = () => {
      // 1. Shallow copy array and heavily randomize distribution
      let shuffled = [...products].sort(() => 0.5 - Math.random());
      let newBundles = [];
      let productIndex = 0;
      let bundleCount = Math.floor(Math.random() * 3) + 3; // RNG 3 to 5 bundles max

      for (let i = 0; i < bundleCount; i++) {
        let itemsCount = Math.floor(Math.random() * 3) + 2; // RNG 2, 3, or 4 items per stack
        let bundleItems = [];

        for (let j = 0; j < itemsCount; j++) {
           if (productIndex < shuffled.length) {
              bundleItems.push(shuffled[productIndex]);
              productIndex++;
           }
        }

        // Failsafe exit
        if (bundleItems.length < 2) break; 

        // Calculation algorithms
        let rawPrice = bundleItems.reduce((acc, curr) => acc + (curr.discountInfo?.finalPrice ?? (curr.pricingOptions?.[0]?.price || 0)), 0);
        let discountPercent = (Math.floor(Math.random() * 16) + 5) / 100; // RNG 0.05 - 0.20
        let discountValue = rawPrice * discountPercent;
        let finalBundlePrice = rawPrice - discountValue;

        newBundles.push({
          id: `bundle-24h-${Date.now()}-${i}`,
          title: determineBundleName(bundleItems),
          products: bundleItems,
          originalPrice: rawPrice,
          discountedPrice: finalBundlePrice,
          savings: discountValue
        });
      }

      setBundles(newBundles);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayStr, bundles: newBundles }));
      startTimer();
    };

    generateBundles();

  }, [products]);

  const addBundle = (bundledProducts, discountValue, originalPrice) => {
    // Distribute discount uniformly across items
    const discountRatio = (originalPrice - discountValue) / originalPrice;
    
    bundledProducts.forEach(item => {
      const rawP = item.discountInfo?.finalPrice ?? (item.pricingOptions?.[0]?.price || 0);
      const variantWeight = item.pricingOptions?.[0]?.weight || 'pc';
      const bundledPrice = +(rawP * discountRatio).toFixed(2);
      dispatch(addToCart({ 
         ...item, 
         qty: 1,
         price: bundledPrice,
         originalPrice: rawP,
         weight: variantWeight,
         unit: variantWeight,
         isSmartBundle: true
      }));
    });
    navigate('/cart');
  };

  if (bundles.length === 0) return null;

  return (
    <section className="container-fluid py-5 border-bottom border-top" style={{ background: '#f0fdf4' }}>
      <div className="container-fluid">
         <div className="d-flex align-items-center justify-content-between mb-2">
            <h2 className="section-title m-0">
              🧺 Smart Bundles
              <span className="title-badge text-white" style={{ background: '#f5a623' }}>🔥 Today&apos;s Deals</span>
            </h2>
            {timeLeft && (
              <span className="badge bg-dark rounded-pill px-3 py-2 border shadow-sm">
                 ⏱️ New bundles in {timeLeft}
              </span>
            )}
         </div>
         <p className="text-muted fw-bold mb-4" style={{ paddingLeft: '17px' }}>Curated packs dropping the cost down.</p>
         
         <div className="d-flex overflow-auto gap-4 pb-3 pt-2 hide-scrollbar ps-3">
            {bundles.map((bundle) => (
              <div key={bundle.id} className="bundle-card border rounded-4 p-4 bg-white d-flex flex-column justify-content-between position-relative overflow-hidden flex-shrink-0" style={{ transition: 'all 0.3s ease', width: '380px' }}>
                 <div>
                   <h4 className="fw-bolder mb-2" style={{ color: '#1a1a2e' }}>{bundle.title}</h4>
                   <p className="text-secondary small fw-bold mb-3">Handpicked daily essentials bundled just for you.</p>
                   
                   <div className="d-flex flex-wrap gap-2 mb-4">
                     {bundle.products.map((item, idx) => (
                       <div key={idx} className="rounded-circle overflow-hidden border border-2 border-light shadow-sm bg-white" style={{ width: '65px', height: '65px' }}>
                          <img src={item.image} alt={item.name} className="w-100 h-100 object-fit-contain p-1" title={item.name} />
                       </div>
                     ))}
                   </div>
                 </div>
                 
                 <div className="d-flex align-items-center justify-content-between mt-auto pt-2 border-top">
                   <div className="d-flex flex-column">
                     <span className="badge bg-danger ms-1 mb-1 align-self-start shadow-sm tracking-wide">Save {formatINR(bundle.savings)}</span>
                     <div className="d-flex align-items-center gap-2 mt-1">
                        <div className="fw-bold fs-4 text-success m-0 lh-1">
                           {formatINR(bundle.discountedPrice)}
                        </div>
                        <span className="fw-bold text-muted text-decoration-line-through" style={{ fontSize: '0.9rem' }}>
                           {formatINR(bundle.originalPrice)}
                        </span>
                     </div>
                   </div>
                   <button 
                     className="btn btn-dark shadow-sm fw-bold rounded-pill px-4 scale-on-hover"
                     onClick={() => addBundle(bundle.products, bundle.savings, bundle.originalPrice)}
                   >
                      Add Bundle
                   </button>
                 </div>
              </div>
            ))}
         </div>
      </div>
    </section>
  );
};

export default DailySmartBundles;
